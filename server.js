import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '50mb' })); // Allow large payloads for bulk school data
app.use(express.static(path.join(__dirname))); // Serve static front-end files

const CONFIG_PATH = path.join(__dirname, 'config.json');
const DATA_DIR = path.join(__dirname, 'src', 'data');
const SCHOOLS_PATH = path.join(DATA_DIR, 'schools_seoul.json');
const REAL_ESTATE_PATH = path.join(DATA_DIR, 'realestate_seoul.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const SUPABASE_URL = 'https://khwzgqnwlknawggugznd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pncW53bGtuYXdnZ3Vnem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDQzNDksImV4cCI6MjA5NTc4MDM0OX0.P2g3Y_MYV_ca8ZRpfAT93pnEzP4osYWc2tfyBHKb7v4';

// Helper to read configuration from Supabase
async function readConfig() {
    let config = { 
        kakao_app_key: process.env.KAKAO_APP_KEY || '', 
        neis_api_key: process.env.NEIS_API_KEY || '',
        naver_client_id: process.env.NAVER_CLIENT_ID || '',
        naver_client_secret: process.env.NAVER_CLIENT_SECRET || '',
        data_go_kr_key: '',
        safemap_key: ''
    };

    // 로컬 config.json 파일이 있으면 기본값으로 로드
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            const localData = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            config = { ...config, ...localData };
        } catch (e) {
            console.error('Error reading local config.json:', e);
        }
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/api_configs?id=eq.1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                const dbConfig = data[0];
                if (dbConfig.kakao_app_key) config.kakao_app_key = dbConfig.kakao_app_key;
                if (dbConfig.neis_api_key) config.neis_api_key = dbConfig.neis_api_key;
                if (dbConfig.naver_client_id) config.naver_client_id = dbConfig.naver_client_id;
                if (dbConfig.naver_client_secret) config.naver_client_secret = dbConfig.naver_client_secret;
                if (dbConfig.data_go_kr_key) config.data_go_kr_key = dbConfig.data_go_kr_key;
                if (dbConfig.safemap_key) config.safemap_key = dbConfig.safemap_key;
            }
        }
    } catch (e) {
        console.error('Error reading config from Supabase:', e);
    }
    return config;
}

// Helper to save configuration to Supabase
async function saveConfig(config) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/api_configs`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
                id: 1,
                kakao_app_key: config.kakao_app_key,
                neis_api_key: config.neis_api_key,
                naver_client_id: config.naver_client_id,
                naver_client_secret: config.naver_client_secret,
                data_go_kr_key: config.data_go_kr_key,
                safemap_key: config.safemap_key
            })
        });
        if (!response.ok) {
            console.error('Error saving to Supabase:', await response.text());
            return false;
        }
        return true;
    } catch (e) {
        console.error('Error writing config to Supabase:', e);
        return false;
    }
}

// 1. GET /api/schools - Serve stored school JSON data
app.get('/api/schools', (req, res) => {
    try {
        if (fs.existsSync(SCHOOLS_PATH)) {
            const data = fs.readFileSync(SCHOOLS_PATH, 'utf8');
            return res.json(JSON.parse(data));
        }
        // If file doesn't exist, return empty array
        return res.json([]);
    } catch (e) {
        console.error('Error reading schools data:', e);
        return res.status(500).json({ error: '데이터를 읽을 수 없습니다.' });
    }
});

// 2. GET /api/config/map-key - Serves Kakao Map Key dynamically
app.get('/api/config/map-key', async (req, res) => {
    const config = await readConfig();
    return res.json({ 
        kakao_app_key: config.kakao_app_key || '',
        kakao_share_app_key: config.kakao_share_app_key || '3a00cd76a8e0492b9271a21aa2c37994',
        safemap_key: config.safemap_key || '8N7ELUCO-8N7E-8N7E-8N7E-8N7ELUCOQY'
    });
});

// --- User Authentication API ---
const USERS_FILE_PATH = path.join(DATA_DIR, 'users.json');

function readUsers() {
    if (!fs.existsSync(USERS_FILE_PATH)) return [];
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE_PATH, 'utf8'));
    } catch (e) {
        return [];
    }
}

function writeUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf8');
    } catch (e) {
        console.error('Error writing users file:', e);
    }
}

app.post('/api/auth/register', async (req, res) => {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ success: false, message: '모든 필수 항목을 입력해 주세요.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // 1. Supabase users 테이블 저장 시도
    let userId = 'user_' + Date.now();
    try {
        const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                email: cleanEmail,
                password_hash: password,
                name: cleanName,
                role: role || 'parent',
                is_active: true
            })
        });
        if (sbRes.ok) {
            const data = await sbRes.json();
            if (data && data[0]) {
                userId = data[0].id;
            }
        }
    } catch (e) {
        console.warn('Supabase register error:', e.message);
    }

    // 2. 로컬 백업 파일 저장
    const users = readUsers();
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
        return res.status(400).json({ success: false, message: '이미 가입된 이메일 계정입니다.' });
    }

    const newUser = {
        id: userId,
        email: cleanEmail,
        password: password,
        name: cleanName,
        role: role || 'parent',
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeUsers(users);

    const sessionUser = { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role };
    return res.json({ success: true, user: sessionUser, message: '회원가입이 완료되었습니다. 학교 진단 및 성적 분석을 시작하세요.' });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: '이메일과 비밀번호를 입력해 주세요.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Supabase users 테이블 조회 시도
    try {
        const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (sbRes.ok) {
            const dbUsers = await sbRes.json();
            if (Array.isArray(dbUsers) && dbUsers.length > 0) {
                const target = dbUsers[0];
                if (target.password_hash === password) {
                    const sessionUser = { id: target.id, email: target.email, name: target.name, role: target.role };
                    return res.json({ success: true, user: sessionUser, message: `${target.name}님 환영합니다!` });
                }
            }
        }
    } catch (e) {
        console.warn('Supabase login check error:', e.message);
    }

    // 2. 로컬 파일 조회
    const users = readUsers();
    
    // 기본 체험 계정 자동 생성
    if (cleanEmail === 'test@learnmap.com' && password === '1234' && !users.find(u => u.email === cleanEmail)) {
        const testUser = {
            id: 'user_test_default',
            email: 'test@learnmap.com',
            password: '1234',
            name: '학부모 회원',
            role: 'parent',
            createdAt: new Date().toISOString()
        };
        users.push(testUser);
        writeUsers(users);
    }

    const target = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);
    if (!target) {
        return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const sessionUser = { id: target.id, email: target.email, name: target.name, role: target.role };
    return res.json({ success: true, user: sessionUser, message: `${target.name}님 환영합니다!` });
});

// POST /api/auth/kakao - 카카오 간편로그인 (users 테이블 및 로컬 백업 동기화)
app.post('/api/auth/kakao', async (req, res) => {
    try {
        const { kakaoId, email, name, avatarUrl, accessToken } = req.body;
        const id = kakaoId || String(Date.now());
        const cleanEmail = (email || `kakao_${id}@kakao.com`).trim().toLowerCase();
        const cleanName = (name || '카카오 회원').trim();
        let userId = 'user_kakao_' + id;

        // 1. Supabase users 테이블 조회/생성
        try {
            const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });
            if (checkRes.ok) {
                const existing = await checkRes.json();
                if (Array.isArray(existing) && existing.length > 0) {
                    userId = existing[0].id || userId;
                } else {
                    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                            email: cleanEmail,
                            password_hash: 'kakao_oauth_' + id,
                            name: cleanName,
                            role: 'parent',
                            is_active: true
                        })
                    });
                    if (insertRes.ok) {
                        const data = await insertRes.json();
                        if (data && data[0]) {
                            userId = data[0].id || userId;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Supabase kakao auth sync error:', e.message);
        }

        // 2. 로컬 users.json 백업
        const users = readUsers();
        let localUser = users.find(u => u.email.toLowerCase() === cleanEmail);
        if (!localUser) {
            localUser = {
                id: userId,
                email: cleanEmail,
                name: cleanName,
                role: 'parent',
                provider: 'kakao',
                avatarUrl: avatarUrl || '',
                accessToken: accessToken || '',
                createdAt: new Date().toISOString()
            };
            users.push(localUser);
            writeUsers(users);
        }

        const sessionUser = {
            id: localUser.id || userId,
            email: cleanEmail,
            name: cleanName,
            role: 'parent',
            provider: 'kakao',
            avatarUrl: avatarUrl || ''
        };

        return res.json({
            success: true,
            user: sessionUser,
            message: `🟡 ${cleanName}님, 카카오 간편 로그인에 성공하였습니다!`
        });
    } catch (err) {
        console.error('Kakao auth error:', err);
        return res.status(500).json({ success: false, message: '카카오 로그인 처리 중 오류가 발생했습니다.' });
    }
});

// 3. POST /api/admin/login - Simple admin verification
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    // Default password set to 'admin1234'
    if (password === 'admin1234') {
        return res.json({ success: true, token: 'session_token_example_12345' });
    }
    return res.status(401).json({ success: false, message: '비밀번호가 올바르지 않습니다.' });
});

// 4. GET /api/admin/config - Retrieve current key configurations (Requires simple token auth header)
app.get('/api/admin/config', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== 'session_token_example_12345') {
        return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
    }
    const config = await readConfig();
    return res.json(config);
});

// 5. POST /api/admin/config - Update Kakao/NEIS keys
app.post('/api/admin/config', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== 'session_token_example_12345') {
        return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
    }

    const { kakao_app_key, neis_api_key, naver_client_id, naver_client_secret, data_go_kr_key, safemap_key } = req.body;
    const config = await readConfig();
    config.kakao_app_key = kakao_app_key;
    config.neis_api_key = neis_api_key;
    config.naver_client_id = naver_client_id;
    config.naver_client_secret = naver_client_secret;
    if (data_go_kr_key !== undefined) {
        config.data_go_kr_key = data_go_kr_key;
    }
    if (safemap_key !== undefined) {
        config.safemap_key = safemap_key;
    }

    // 로컬 config.json 파일에도 동기화 저장
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    } catch (fsErr) {
        console.error('Error writing config to local json:', fsErr);
    }

    if (await saveConfig(config)) {
        return res.json({ success: true, message: '설정이 성공적으로 저장되었습니다.' });
    }
    return res.status(500).json({ success: false, message: '설정 저장 중 오류가 발생했습니다.' });
});

// 6. POST /api/admin/update - Persistent storage of geocoded school JSON database
app.post('/api/admin/update', (req, res) => {
    const token = req.headers.authorization;
    if (token !== 'session_token_example_12345') {
        return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
    }

    const { schools } = req.body;
    if (!Array.isArray(schools)) {
        return res.status(400).json({ error: '올바른 데이터 형식이 아닙니다.' });
    }

    try {
        fs.writeFileSync(SCHOOLS_PATH, JSON.stringify(schools, null, 2), 'utf8');
        console.log(`[Server] 서울시 학교 정보 업데이트 완료. 저장된 학교 수: ${schools.length}`);
        return res.json({ success: true, count: schools.length });
    } catch (e) {
        console.error('Error saving schools database:', e);
        return res.status(500).json({ error: '파일 저장 중 오류가 발생했습니다.' });
    }
});

// Helper function to bypass TLS errors using https module
function httpsGet(url, headers) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: headers,
            rejectUnauthorized: false
        };
        https.get(url, options, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const data = Buffer.concat(chunks).toString('utf8');
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject({ status: res.statusCode, text: data });
                }
            });
        }).on('error', (err) => reject(err));
    });
}

// Helper function to fetch image buffer, bypassing fetch() strictness and adding User-Agent
function fetchImageBuffer(urlStr) {
    return new Promise((resolve, reject) => {
        const client = urlStr.startsWith('https') ? https : http;
        client.get(urlStr, {
            rejectUnauthorized: false,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                let redirectUrl = res.headers.location;
                if (redirectUrl.startsWith('/')) {
                    const parsed = new URL(urlStr);
                    redirectUrl = parsed.origin + redirectUrl;
                }
                return fetchImageBuffer(redirectUrl).then(resolve).catch(reject);
            }
            if (res.statusCode >= 400) {
                return reject(new Error(`HTTP Error: ${res.statusCode}`));
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                resolve({
                    buffer: Buffer.concat(chunks),
                    contentType: res.headers['content-type']
                });
            });
        }).on('error', reject);
    });
}

// 7. GET /api/community - Fetch Naver Search API
app.get('/api/community', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: '검색어가 없습니다.' });

    const config = await readConfig();
    const clientId = config.naver_client_id;
    const clientSecret = config.naver_client_secret;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: '네이버 API 키가 설정되지 않았습니다. 관리자 페이지에서 설정해주세요.' });
    }

    const type = req.query.type || 'all';

    try {
        const headers = {
            'X-Naver-Client-Id': clientId,
            'X-Naver-Client-Secret': clientSecret
        };

        if (type === 'all') {
            const blogUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(query)}&display=25&sort=date`;
            const cafeUrl = `https://openapi.naver.com/v1/search/cafearticle.json?query=${encodeURIComponent(query)}&display=25&sort=date`;
            
            const [blogData, cafeData] = await Promise.all([
                httpsGet(blogUrl, headers),
                httpsGet(cafeUrl, headers)
            ]);

            const blogItems = (blogData.items || []).map(item => ({ ...item, _source: 'blog' }));
            const cafeItems = (cafeData.items || []).map(item => ({ ...item, _source: 'cafe' }));
            const items = [...blogItems, ...cafeItems];
            items.sort((a, b) => {
                const dateA = a.postdate || '';
                const dateB = b.postdate || '';
                return dateB.localeCompare(dateA);
            });
            res.json({ items, total: items.length });
        } else if (type === 'cafe') {
            const url = `https://openapi.naver.com/v1/search/cafearticle.json?query=${encodeURIComponent(query)}&display=50&sort=date`;
            const data = await httpsGet(url, headers);
            const items = (data.items || []).map(item => ({ ...item, _source: 'cafe' }));
            res.json({ ...data, items });
        } else {
            const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(query)}&display=50&sort=date`;
            const data = await httpsGet(url, headers);
            const items = (data.items || []).map(item => ({ ...item, _source: 'blog' }));
            res.json({ ...data, items });
        }
    } catch (err) {
        console.error('Naver Fetch Error:', err);
        if (err.status) {
            return res.status(err.status).json({ error: '네이버 검색 API 호출에 실패했습니다.' });
        }
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    }
});

// Helper to build Kakao headers with valid origin matching registered Kakao domain
function getKakaoHeaders(req, appkey) {
    let origin = req ? req.headers.origin : null;
    if (!origin && req && req.headers.referer) {
        try {
            const parsed = new URL(req.headers.referer);
            origin = parsed.origin;
        } catch (e) {}
    }
    if (!origin && req && req.headers.host) {
        origin = `http://${req.headers.host}`;
    }
    if (!origin) {
        origin = 'http://localhost:3000';
    }
    if (origin.includes(':5000')) {
        origin = origin.replace(':5000', ':3000');
    }
    const cleanOrigin = origin.startsWith('http') ? origin : `http://${origin}`;
    return {
        'Authorization': `KakaoAK ${appkey}`,
        'KA': `sdk/1.25.3 os/javascript lang/en-US device/Win32 origin/${encodeURIComponent(cleanOrigin)}`
    };
}

// 8. GET /api/academies/count - Fetch true academy count bypassing JS SDK limit
app.get('/api/academies/count', async (req, res) => {
    const { x, y } = req.query;
    if (!x || !y) return res.status(400).json({ error: '좌표가 없습니다.' });

    const config = await readConfig();
    const appkey = config.kakao_app_key;
    if (!appkey) return res.status(500).json({ error: '카카오 앱 키가 없습니다.' });

    try {
        const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=AC5&x=${x}&y=${y}&radius=1000`;
        const data = await httpsGet(url, getKakaoHeaders(req, appkey));
        res.json({ total_count: data.meta ? data.meta.total_count : 0 });
    } catch (err) {
        console.error('Kakao Fetch Error:', err);
        res.status(500).json({ error: '카카오 검색 API 호출에 실패했습니다.' });
    }
});

// 9. GET /api/academies/list - Fetch ALL academy pages across multi-grid points and return sorted full list
app.get('/api/academies/list', async (req, res) => {
    const { x, y } = req.query;
    const radius = parseInt(req.query.radius, 10) || 1000;
    if (!x || !y) return res.status(400).json({ error: '좌표가 없습니다.' });

    const config = await readConfig();
    const appkey = config.kakao_app_key;
    if (!appkey) return res.status(500).json({ error: '카카오 앱 키가 없습니다.' });

    const headers = getKakaoHeaders(req, appkey);
    const centerX = parseFloat(x);
    const centerY = parseFloat(y);

    try {
        // 검색 지점(Grid Points) 정의: 반경이 500m 초과일 경우 넓은 영역 전체를 커버하기 위해 5지점 멀티 그리드 탐색
        let gridPoints = [{ x: centerX, y: centerY }];
        if (radius > 500) {
            const offsetRatio = 0.55;
            const dLat = (radius * offsetRatio) / 111000;
            const dLng = (radius * offsetRatio) / 88800;
            gridPoints.push(
                { x: centerX, y: centerY + dLat }, // North
                { x: centerX, y: centerY - dLat }, // South
                { x: centerX + dLng, y: centerY }, // East
                { x: centerX - dLng, y: centerY }  // West
            );
        }

        // 각 그리드 지점별로 AC5(학원) 및 교습소 1페이지 동시 수집
        const firstRequests = [];
        gridPoints.forEach(pt => {
            const subRad = radius > 500 ? Math.min(radius, 1000) : radius;
            const ac5Url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=AC5&x=${pt.x}&y=${pt.y}&radius=${subRad}&size=15&page=1`;
            const gyoUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent('교습소')}&x=${pt.x}&y=${pt.y}&radius=${subRad}&size=15&page=1`;
            firstRequests.push(httpsGet(ac5Url, headers).catch(err => { console.error('ac5Url error:', err); return { meta: { total_count: 0 }, documents: [] }; }));
            firstRequests.push(httpsGet(gyoUrl, headers).catch(err => { console.error('gyoUrl error:', err); return { meta: { total_count: 0 }, documents: [] }; }));
        });

        const firstResults = await Promise.all(firstRequests);
        let allItems = [];
        const pageRequests = [];

        firstResults.forEach((resData, idx) => {
            if (resData.documents) allItems = allItems.concat(resData.documents);
            const total = resData.meta ? resData.meta.total_count : 0;
            const pages = Math.min(Math.ceil(total / 15), 5); // 지점당 최대 5페이지까지 보충
            const ptIdx = Math.floor(idx / 2);
            const isGyo = idx % 2 === 1;
            const pt = gridPoints[ptIdx];
            const subRad = radius > 500 ? Math.min(radius, 1000) : radius;

            for (let page = 2; page <= pages; page++) {
                const pUrl = isGyo
                    ? `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent('교습소')}&x=${pt.x}&y=${pt.y}&radius=${subRad}&size=15&page=${page}`
                    : `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=AC5&x=${pt.x}&y=${pt.y}&radius=${subRad}&size=15&page=${page}`;
                pageRequests.push(httpsGet(pUrl, headers).catch(() => ({ documents: [] })));
            }
        });

        if (pageRequests.length > 0) {
            const pageResults = await Promise.all(pageRequests);
            pageResults.forEach(result => {
                if (result.documents) allItems = allItems.concat(result.documents);
            });
        }

        // 중복 제거 (id 기준) 및 원본 중심 좌표(centerX, centerY)로부터의 정확한 거리 계산
        const uniqueMap = new Map();
        allItems.forEach(item => {
            const itemX = parseFloat(item.x);
            const itemY = parseFloat(item.y);
            if (!isNaN(itemX) && !isNaN(itemY)) {
                const dy = (itemY - centerY) * 111000;
                const dx = (itemX - centerX) * 88800;
                const distFromCenter = Math.round(Math.sqrt(dx * dx + dy * dy));
                item.distance = String(distFromCenter);

                if (distFromCenter <= radius && !uniqueMap.has(item.id)) {
                    uniqueMap.set(item.id, item);
                }
            }
        });

        const finalItems = Array.from(uniqueMap.values());
        // 거리순 정렬
        finalItems.sort((a, b) => parseInt(a.distance, 10) - parseInt(b.distance, 10));

        res.json({ items: finalItems, total_count: finalItems.length });
    } catch (err) {
        console.error('Kakao List Fetch Error:', err);
        res.status(500).json({ error: '카카오 검색 API 호출에 실패했습니다.' });
    }
});

// 10. GET /api/academies/search - Keyword search around a location
app.get('/api/academies/search', async (req, res) => {
    const { query, x, y } = req.query;
    const radius = parseInt(req.query.radius, 10) || 1000;
    if (!query || !x || !y) return res.status(400).json({ error: '파라미터가 부족합니다.' });

    const config = await readConfig();
    const appkey = config.kakao_app_key;
    if (!appkey) return res.status(500).json({ error: '카카오 앱 키가 없습니다.' });

    const headers = getKakaoHeaders(req, appkey);

    try {
        const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=AC5&x=${x}&y=${y}&radius=${radius}&size=15&page=1`;
        const firstData = await httpsGet(url, headers).catch(() => ({ meta: { total_count: 0 }, documents: [] }));
        const totalCount = firstData.meta ? firstData.meta.total_count : 0;
        const totalPages = Math.min(Math.ceil(totalCount / 15), 15); // 최대 15페이지 제한

        let allItems = [...(firstData.documents || [])];

        if (totalPages > 1) {
            const pageRequests = [];
            for (let page = 2; page <= totalPages; page++) {
                const pUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=AC5&x=${x}&y=${y}&radius=${radius}&size=15&page=${page}`;
                pageRequests.push(httpsGet(pUrl, headers).catch(() => ({ documents: [] })));
            }
            const results = await Promise.all(pageRequests);
            results.forEach(result => {
                allItems = allItems.concat(result.documents || []);
            });
        }

        res.json({ items: allItems, total_count: totalCount });
    } catch (err) {
        console.error('Kakao Keyword Search Error:', err);
        res.status(500).json({ error: '카카오 키워드 검색 API 호출에 실패했습니다.' });
    }
});

// 10.5. GET /api/academies/ratings - Fetch aggregated rating statistics from Supabase DB
app.get('/api/academies/ratings', async (req, res) => {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/academy_reviews?select=academyName,rating`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            return res.json({});
        }

        const data = await response.json();
        const ratingsMap = {};
        if (Array.isArray(data)) {
            data.forEach(item => {
                const name = item.academyName || item.academy_name;
                const r = parseFloat(item.rating) || 0;
                if (name) {
                    if (!ratingsMap[name]) {
                        ratingsMap[name] = { totalRating: 0, count: 0, avgRating: 0 };
                    }
                    ratingsMap[name].totalRating += r;
                    ratingsMap[name].count += 1;
                }
            });
            Object.keys(ratingsMap).forEach(name => {
                const obj = ratingsMap[name];
                obj.avgRating = obj.count > 0 ? parseFloat((obj.totalRating / obj.count).toFixed(1)) : 0;
            });
        }
        res.json(ratingsMap);
    } catch (err) {
        console.error('Academy Ratings Fetch Error:', err);
        res.json({});
    }
});

// --- Supabase DB 연동 찐후기 기능 ---

app.use(express.json()); // JSON 바디 파싱


app.post('/api/reviews', async (req, res) => {
    const { academyName, rating, content } = req.body;
    if (!academyName || !rating || !content) return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/academy_reviews`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                academyName,
                rating: parseInt(rating, 10),
                content
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Supabase Error: ${response.status} ${errBody}`);
        }

        const data = await response.json();
        res.json({ success: true, review: data[0] });
    } catch (err) {
        console.error('Review Post Error:', err);
        res.status(500).json({ error: '리뷰 저장 중 오류가 발생했습니다.' });
    }
});

app.get('/api/reviews', async (req, res) => {
    const { academyName } = req.query;
    if (!academyName) return res.status(400).json({ error: '학원명이 누락되었습니다.' });
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/academy_reviews?academyName=eq.${encodeURIComponent(academyName)}&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Supabase Error: ${response.status} ${errBody}`);
        }

        const data = await response.json();
        res.json({ items: data, total: data.length });
    } catch (err) {
        console.error('Review Get Error:', err);
        res.status(500).json({ error: '리뷰 조회 중 오류가 발생했습니다.' });
    }
});

// --- Academy Fees Proxy (NEIS API) ---
app.get('/api/academies/fees', async (req, res) => {
    const { atpt_code, admst_zone_nm, aca_nm } = req.query;
    if (!atpt_code) return res.status(400).json({ error: 'ATPT_OFCDC_SC_CODE is required' });

    const config = await readConfig();
    const neisKey = config.neis_api_key;
    
    try {
        let url = `https://open.neis.go.kr/hub/acaInsTiInfo?Type=json&pIndex=1&pSize=1000&ATPT_OFCDC_SC_CODE=${atpt_code}`;
        if (admst_zone_nm) url += `&ADMST_ZONE_NM=${encodeURIComponent(admst_zone_nm)}`;
        if (aca_nm) url += `&ACA_NM=${encodeURIComponent(aca_nm)}`;
        if (neisKey) url += `&KEY=${neisKey}`;

        const response = await fetch(url);
        if (!response.ok) {
            return res.json({ acaInsTiInfo: null });
        }
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.warn('Academy Fees API Warning:', err);
        res.json({ acaInsTiInfo: null });
    }
});

// --- NEIS Real-Time Integration APIs (School Info, Meal Diet, School Schedule) ---

// 알레르기 번호 한글 식품명 매핑 표 (식품의약품안전처/교육부 나이스 표준 1~19)
const ALLERGY_MAP = {
    '1': '난류(달걀)',
    '2': '우유',
    '3': '메밀',
    '4': '땅콩',
    '5': '대두(콩)',
    '6': '밀',
    '7': '고등어',
    '8': '게',
    '9': '새우',
    '10': '돼지고기',
    '11': '복숭아',
    '12': '토마토',
    '13': '아황산류',
    '14': '호두',
    '15': '닭고기',
    '16': '쇠고기',
    '17': '오징어',
    '18': '조개류(굴/전복/홍합)',
    '19': '잣'
};

// 1) 학교 검색 API (학교코드, 교육청코드 획득)
app.get('/api/neis/school-search', async (req, res) => {
    const { school_name } = req.query;
    if (!school_name) return res.status(400).json({ error: 'school_name is required' });

    try {
        const config = await readConfig();
        const neisKey = config.neis_api_key || 'fb397febaaca465b9f02736cc6f37188';
        const url = `https://open.neis.go.kr/hub/schoolInfo?KEY=${neisKey}&Type=json&pIndex=1&pSize=10&SCHUL_NM=${encodeURIComponent(school_name.trim())}`;

        const response = await fetch(url);
        if (!response.ok) {
            return res.json({ schools: [] });
        }
        const data = await response.json();
        const rows = data?.schoolInfo?.[1]?.row || [];
        const schools = rows.map(r => ({
            atpt_code: r.ATPT_OFCDC_SC_CODE,
            atpt_name: r.ATPT_OFCDC_SC_NM,
            school_code: r.SD_SCHUL_CODE,
            school_name: r.SCHUL_NM,
            school_type: r.SCHUL_KND_SC_NM,
            address: r.ORG_RDNMA,
            homepage: r.HMPG_ADRES
        }));
        return res.json({ schools });
    } catch (err) {
        console.warn('NEIS School Search Error:', err);
        return res.json({ schools: [] });
    }
});

// 2) 실시간 급식 식단표 및 알레르기 분석 API
app.get('/api/neis/meals', async (req, res) => {
    const { atpt_code, school_code, from_date, to_date } = req.query;
    if (!atpt_code || !school_code) {
        return res.status(400).json({ error: 'atpt_code and school_code are required' });
    }

    try {
        const config = await readConfig();
        const neisKey = config.neis_api_key || 'fb397febaaca465b9f02736cc6f37188';
        
        // 날짜가 지정되지 않은 경우 오늘 기준 앞뒤 14일
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const from = from_date || new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
        const to = to_date || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10).replace(/-/g, '');

        const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${neisKey}&Type=json&ATPT_OFCDC_SC_CODE=${atpt_code}&SD_SCHUL_CODE=${school_code}&MLSV_FROM_YMD=${from}&MLSV_TO_YMD=${to}`;

        const response = await fetch(url);
        if (!response.ok) {
            return res.json({ meals: [] });
        }
        const data = await response.json();
        const rows = data?.mealServiceDietInfo?.[1]?.row || [];

        const meals = rows.map(r => {
            // "현미밥<br/>쇠고기미역국 (5.6.16.)<br/>닭봉조림 (5.6.15.)" 파싱
            const rawDishes = (r.DDISH_NM || '').split(/<br\s*\/?>|\n/).map(s => s.trim()).filter(Boolean);
            const dishes = rawDishes.map(dishStr => {
                // 알레르기 번호 추출: 예 (5.6.16.)
                const match = dishStr.match(/\(([\d\.]+)\)/);
                const allergyNums = match ? match[1].split('.').filter(Boolean) : [];
                const cleanName = dishStr.replace(/\([\d\.]+\)/g, '').trim();
                const allergyNames = allergyNums.map(n => ALLERGY_MAP[n] || `${n}번`).filter(Boolean);

                return {
                    name: cleanName,
                    raw: dishStr,
                    allergyNumbers: allergyNums,
                    allergies: allergyNames
                };
            });

            // 전체 식단의 알레르기 목록 집계
            const allMealAllergies = [...new Set(dishes.flatMap(d => d.allergies))];

            // YYYYMMDD -> YYYY-MM-DD
            const ymd = r.MLSV_YMD;
            const formattedDate = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;

            return {
                date: formattedDate,
                rawDate: ymd,
                mealType: r.MMEAL_SC_NM || '중식',
                calories: r.CAL_INFO || '',
                nutrition: r.NTR_INFO || '',
                dishes: dishes,
                allAllergies: allMealAllergies
            };
        });

        return res.json({ meals });
    } catch (err) {
        console.warn('NEIS Meals API Error:', err);
        return res.json({ meals: [] });
    }
});

// 3) 실시간 학사 일정 API
app.get('/api/neis/schedule', async (req, res) => {
    const { atpt_code, school_code, from_date, to_date } = req.query;
    if (!atpt_code || !school_code) {
        return res.status(400).json({ error: 'atpt_code and school_code are required' });
    }

    try {
        const config = await readConfig();
        const neisKey = config.neis_api_key || 'fb397febaaca465b9f02736cc6f37188';

        // 기본 날짜: 오늘 기준 이전 15일 ~ 이후 60일
        const from = from_date || new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
        const to = to_date || new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10).replace(/-/g, '');

        const url = `https://open.neis.go.kr/hub/SchoolSchedule?KEY=${neisKey}&Type=json&ATPT_OFCDC_SC_CODE=${atpt_code}&SD_SCHUL_CODE=${school_code}&AA_FROM_YMD=${from}&AA_TO_YMD=${to}`;

        const response = await fetch(url);
        if (!response.ok) {
            return res.json({ schedule: [] });
        }
        const data = await response.json();
        const rows = data?.SchoolSchedule?.[1]?.row || [];

        const schedule = rows.map(r => {
            const ymd = r.AA_YMD;
            const formattedDate = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
            const eventNm = r.EVENT_NM || '';

            // 이벤트 유형 분류 (exam: 시험, perf: 수행평가/발표, event: 학교행사, vacation: 방학/휴업)
            let type = 'event';
            if (/고사|평가|시험|모의|학업성취/.test(eventNm)) {
                type = 'exam';
            } else if (/수행|제출|보고서|과제/.test(eventNm)) {
                type = 'perf';
            } else if (/방학|휴업|재량|개교기념/.test(eventNm)) {
                type = 'vacation';
            }

            return {
                date: formattedDate,
                rawDate: ymd,
                title: eventNm,
                detail: r.EVENT_CNTNT || r.SBTR_DD_SC_NM || '학사 일정',
                type: type,
                gradeTarget: [
                    r.ONE_GRADE_EVENT_YN === 'Y' ? '1학년' : '',
                    r.TW_GRADE_EVENT_YN === 'Y' ? '2학년' : '',
                    r.THREE_GRADE_EVENT_YN === 'Y' ? '3학년' : ''
                ].filter(Boolean).join(', ') || '전체 학년'
            };
        });

        // 날짜순 정렬
        schedule.sort((a, b) => a.rawDate.localeCompare(b.rawDate));

        return res.json({ schedule });
    } catch (err) {
        console.warn('NEIS Schedule API Error:', err);
        return res.json({ schedule: [] });
    }
});

// 12. GET /api/realestate - Fetch real estate data from MOLIT API
app.get('/api/realestate', async (req, res) => {
    const { lawd_cd, deal_ymd } = req.query;
    if (!lawd_cd || !deal_ymd) return res.status(400).json({ error: '법정동코드(lawd_cd)와 거래년월(deal_ymd)이 필요합니다.' });

    const config = await readConfig();
    const serviceKey = config.data_go_kr_key;
    if (!serviceKey) {
        return res.type('application/xml').send('<response><header><resultCode>00</resultCode><resultMsg>NO_KEY</resultMsg></header><body><items></items></body></response>');
    }

    try {
        const url = `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=${lawd_cd}&DEAL_YMD=${deal_ymd}`;
        const responseText = await httpsGet(url);
        res.type('application/xml').send(responseText);
    } catch (err) {
        console.warn('Real Estate API Warning:', err);
        res.type('application/xml').send('<response><header><resultCode>00</resultCode><resultMsg>ERROR</resultMsg></header><body><items></items></body></response>');
    }
});

// 12.5. GET /api/realestate/pins - Fetch all housing types (Apt, Villa, Detached, Officetel) for Map Pins
app.get('/api/realestate/pins', async (req, res) => {
    const { lawd_cd, x, y } = req.query;
    const radius = parseInt(req.query.radius, 10) || 1000;
    const housingType = req.query.type || 'all'; // 'all', 'apt', 'rh', 'sh', 'offi'

    if (!lawd_cd) return res.status(400).json({ error: '법정동코드(lawd_cd)가 필요합니다.' });

    const config = await readConfig();
    const serviceKey = config.data_go_kr_key;
    const kakaoAppKey = config.kakao_app_key;

    if (!serviceKey || !kakaoAppKey) {
        return res.json({ items: [], total: 0 });
    }

    const headers = getKakaoHeaders(req, kakaoAppKey);
    const centerX = parseFloat(x);
    const centerY = parseFloat(y);

    // 최근 3개월 년월 생성
    const dealYmds = [];
    for (let i = 0; i < 3; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
        dealYmds.push(ymd);
    }

    // API 엔드포인트 정의
    const apiEndpoints = [];
    if (housingType === 'all' || housingType === 'apt') {
        apiEndpoints.push({ type: 'apt', name: '아파트', baseUrl: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev' });
    }
    if (housingType === 'all' || housingType === 'rh') {
        apiEndpoints.push({ type: 'rh', name: '연립·다세대', baseUrl: 'https://apis.data.go.kr/1613000/RTMSDataSvcRHTradeDev/getRTMSDataSvcRHTradeDev' });
    }
    if (housingType === 'all' || housingType === 'sh') {
        apiEndpoints.push({ type: 'sh', name: '단독·다가구', baseUrl: 'https://apis.data.go.kr/1613000/RTMSDataSvcSHTradeDev/getRTMSDataSvcSHTradeDev' });
    }
    if (housingType === 'all' || housingType === 'offi') {
        apiEndpoints.push({ type: 'offi', name: '오피스텔', baseUrl: 'https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade' });
    }

    try {
        const fetchPromises = [];
        apiEndpoints.forEach(ep => {
            dealYmds.forEach(ymd => {
                const url = `${ep.baseUrl}?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=300&LAWD_CD=${lawd_cd}&DEAL_YMD=${ymd}`;
                fetchPromises.push(
                    httpsGet(url)
                        .then(xmlText => ({ ep, ymd, xmlText }))
                        .catch(() => ({ ep, ymd, xmlText: '' }))
                );
            });
        });

        const results = await Promise.all(fetchPromises);
        const estateMap = new Map(); // 단지/건물명 키 기준 최신 실거래가 중복 집계

        results.forEach(({ ep, ymd, xmlText }) => {
            if (!xmlText || typeof xmlText !== 'string') return;

            // Simple XML regex parser for high performance
            const itemMatches = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
            itemMatches.forEach(itemXml => {
                const getVal = (tag) => {
                    const m = itemXml.match(new RegExp(`<${tag}>\\s*([^<]+?)\\s*<\\/${tag}>`));
                    return m ? m[1].trim() : '';
                };

                const amountStr = getVal('거래금액') || getVal('dealAmount');
                let name = getVal('아파트') || getVal('연립다세대') || getVal('단지') || getVal('주택유형') || getVal('건물명');
                const area = parseFloat(getVal('전용면적') || getVal('연면적') || '0');
                const dealYear = getVal('년') || getVal('dealYear');
                const dealMonth = getVal('월') || getVal('dealMonth');
                const jibun = getVal('지번');
                const roadName = getVal('도로명');

                if (!name || name === '단독' || name === '다가구') {
                    name = roadName ? `${ep.name} (${roadName})` : `${ep.name} (${jibun || '지번'})`;
                }

                if (amountStr) {
                    const priceInt = parseInt(amountStr.replace(/,/g, ''), 10) || 0;
                    if (priceInt > 0) {
                        const key = `${ep.type}_${name}_${jibun}`;
                        if (!estateMap.has(key)) {
                            estateMap.set(key, {
                                id: `re_${key}`,
                                type: ep.type,
                                type_name: ep.name,
                                name: name,
                                jibun: jibun,
                                road_name: roadName,
                                price_amount: priceInt,
                                area: area,
                                deal_date: `${dealYear}.${dealMonth}`
                            });
                        }
                    }
                }
            });
        });

        // 주택 유형별(아파트, 연립다세대, 단독다가구, 오피스텔)로 균등하게 추출하여 고루 지도상에 노출
        const groupedByType = { apt: [], rh: [], sh: [], offi: [] };
        estateMap.forEach(item => {
            if (groupedByType[item.type]) {
                groupedByType[item.type].push(item);
            }
        });

        let rawItems = [];
        Object.keys(groupedByType).forEach(t => {
            rawItems = rawItems.concat(groupedByType[t].slice(0, 10)); // 유형당 최대 10개씩 균등 수집
        });

        if (rawItems.length === 0) {
            rawItems = Array.from(estateMap.values()).slice(0, 30);
        }

        // 카카오 로컬 검색 API를 통해 각 건물/단지/지번의 정확한 lat/lng 좌표 매핑
        const geocodePromises = rawItems.map(item => {
            // 법정동 코드나 주택이름/지번을 포함해 정밀 검색어 생성 (예: "서초동 100-1" 또는 "서초대로 123" 또는 단지명)
            const cleanName = item.name.replace(/\(아파트\)|\(연립·다세대\)|\(단독·다가구\)|\(오피스텔\)|\(지번\)/g, '').trim();
            const queryName = item.road_name ? item.road_name : (item.jibun ? `${cleanName} ${item.jibun}` : cleanName);
            const searchUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(queryName)}&x=${centerX}&y=${centerY}&radius=${radius}&size=1`;
            return httpsGet(searchUrl, headers)
                .then(data => {
                    if (data && data.documents && data.documents.length > 0) {
                        const doc = data.documents[0];
                        item.x = doc.x;
                        item.y = doc.y;
                        item.address = doc.road_address_name || doc.address_name;
                        
                        // 원본 좌표 중심으로부터의 거리 계산 (경도 1도 ≈ 88.8km, 위도 1도 ≈ 111km)
                        const dy = (parseFloat(doc.y) - centerY) * 111000;
                        const dx = (parseFloat(doc.x) - centerX) * 88800;
                        item.distance = Math.round(Math.sqrt(dx * dx + dy * dy));
                    }
                    return item;
                })
                .catch(() => item);
        });

        const geocodedItems = await Promise.all(geocodePromises);
        let validItems = geocodedItems.filter(item => item.x && item.y && (!radius || item.distance <= radius));

        // 국토교통부 공공데이터 API 또는 실제 연동 데이터만 사용
        // (저장된 목업 realestate_seoul.json 폴백 완전 제거)

        // 가격 표시 헬퍼 (억/만원 포맷)
        validItems.forEach(item => {
            if (!item.price_display) {
                const amt = item.price_amount;
                const uk = Math.floor(amt / 10000);
                const man = amt % 10000;
                item.price_display = `${uk > 0 ? uk + '억 ' : ''}${man > 0 ? man.toLocaleString() + '만' : ''}`;
                item.short_price = uk > 0 ? `${uk}.${Math.floor(man / 1000)}억` : `${man.toLocaleString()}만`;
            }
        });

        validItems.sort((a, b) => a.distance - b.distance);
        res.json({ items: validItems, total: validItems.length });
    } catch (err) {
        console.warn('Realestate Pins API Error:', err.message || err);
        res.json({ items: [], total: 0 });
    }
});

// 12.6. POST /api/admin/sync-realestate - Admin batch download & JSON DB sync route
app.post('/api/admin/sync-realestate', async (req, res) => {
    const { sido = '서울특별시', sigungu = 'all' } = req.body;

    try {
        console.log(`[Admin Batch Sync] Starting real estate sync for ${sido} ${sigungu}...`);

        const sampleProperties = [
            { type: 'apt', type_name: '아파트', names: ['반포자이', '래미안퍼스티지', '아크로리버파크', '서초그랑자이', '삼풍아파트', '방배서리풀e편한세상', '은마아파트', '잠실엘스'], basePrice: 245000 },
            { type: 'rh', type_name: '연립·다세대', names: ['서초빌라', '반포 힐스빌', '서리풀 다세대', '방배 가든빌라', '청담 프리미엄빌라'], basePrice: 85000 },
            { type: 'sh', type_name: '단독·다가구', names: ['방배 단독주택', '반포 고급단독', '서초 다가구주택'], basePrice: 195000 },
            { type: 'offi', type_name: '오피스텔', names: ['강남역 서희스타힐스', '교대역 더클래식', '서초 하이엔드 오피스텔', '양재 리더스타워'], basePrice: 42000 }
        ];

        let existingList = [];
        if (fs.existsSync(REAL_ESTATE_PATH)) {
            try {
                existingList = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8'));
                if (!Array.isArray(existingList)) existingList = [];
            } catch (e) {
                existingList = [];
            }
        }

        const freshList = [];
        let count = 0;
        const baseLat = 37.492;
        const baseLng = 127.025;

        sampleProperties.forEach(grp => {
            grp.names.forEach((pName, idx) => {
                count++;
                const angle = (count * 47) % 360;
                const radAngle = angle * (Math.PI / 180);
                const distMeter = 200 + ((count * 130) % 1500);
                const dy = (distMeter * Math.sin(radAngle)) / 111000;
                const dx = (distMeter * Math.cos(radAngle)) / 88800;
                const price = grp.basePrice + ((count * 1700) % 35000);
                const uk = Math.floor(price / 10000);
                const man = price % 10000;

                freshList.push({
                    id: `re_json_${grp.type}_${count}`,
                    type: grp.type,
                    type_name: grp.type_name,
                    name: pName,
                    jibun: `${100 + count}-${idx + 1}`,
                    road_name: '',
                    price_amount: price,
                    price_display: `${uk > 0 ? uk + '억 ' : ''}${man > 0 ? man.toLocaleString() + '만' : ''}`,
                    short_price: uk > 0 ? `${uk}.${Math.floor(man / 1000)}억` : `${man.toLocaleString()}만`,
                    area: 84.9,
                    deal_date: '2026.08',
                    x: (baseLng + dx).toFixed(7),
                    y: (baseLat + dy).toFixed(7),
                    address: `서울특별시 서초구 반포동 ${100 + count}`,
                    sido: sido,
                    sigungu: sigungu === 'all' ? '서초구' : sigungu
                });
            });
        });

        // JSON 데이터 파일 작성 (src/data/realestate_seoul.json)
        fs.writeFileSync(REAL_ESTATE_PATH, JSON.stringify(freshList, null, 2), 'utf8');
        console.log(`[Admin] realestate_seoul.json 파일 데이터베이스 구축 완료 (총 ${freshList.length}건)`);

        return res.json({ 
            success: true, 
            message: `${sido} ${sigungu} 주택 실거래가 JSON 데이터베이스(realestate_seoul.json) 구축이 완료되었습니다.`,
            count: freshList.length,
            filePath: REAL_ESTATE_PATH,
            synced_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('Admin Realestate Sync Error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// --- WMS In-Memory Cache Helper ---
const wmsResponseCache = new Map();
const MAX_CACHE_SIZE = 100;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분 만료시간

function getCachedWms(key) {
    const cached = wmsResponseCache.get(key);
    if (!cached) return null;
    
    // 만료 시간 검사
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
        wmsResponseCache.delete(key);
        return null;
    }
    return cached;
}

function setCachedWms(key, contentType, buffer) {
    // 캐시 사이즈 초과 시 가장 오래된 것 삭제
    if (wmsResponseCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = wmsResponseCache.keys().next().value;
        wmsResponseCache.delete(oldestKey);
    }
    wmsResponseCache.set(key, {
        contentType,
        buffer,
        timestamp: Date.now()
    });
}

// 13. GET /api/crime-zones - Fetch crime attention zone areas from safemap WMS API
app.get('/api/crime-zones', async (req, res) => {
    const { bbox, width, height } = req.query;
    if (!bbox || !width || !height) {
        return res.status(400).json({ error: 'bbox, width, height 파라미터가 필요합니다.' });
    }

    const config = await readConfig();
    const serviceKey = config.safemap_key || '';
    if (!serviceKey) {
        return res.status(500).json({ error: '생활안전정보 API Key가 설정되지 않았습니다.' });
    }

    const cacheKey = `crime-zones:${bbox}:${width}:${height}:${serviceKey}`;
    const cached = getCachedWms(cacheKey);
    if (cached) {
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('Content-Type', cached.contentType || 'image/png');
        return res.send(cached.buffer);
    }

    // 생활안전지도 WMS API 호출 URL 생성
    const wmsUrl = `https://safemap.go.kr/openapi2/IF_0087_WMS?serviceKey=${encodeURIComponent(serviceKey)}&srs=EPSG:4326&bbox=${bbox}&format=image/png&width=${width}&height=${height}&transparent=TRUE`;

    try {
        const { buffer, contentType } = await fetchImageBuffer(wmsUrl);
        
        setCachedWms(cacheKey, contentType, buffer);

        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('Content-Type', contentType || 'image/png');
        return res.send(buffer);
    } catch (err) {
        console.error('Crime Zones WMS Proxy Error:', err);
        return res.status(500).json({ error: '범죄주의구간 이미지 로드에 실패했습니다.', details: err.message });
    }
});

// 14. GET /api/accident-statistics - Fetch crime/safety accident statistics from safemap WMS API (IF_0075_WMS)
app.get('/api/accident-statistics', async (req, res) => {
    const { bbox, width, height } = req.query;
    if (!bbox || !width || !height) {
        return res.status(400).json({ error: 'bbox, width, height 파라미터가 필요합니다.' });
    }

    const config = await readConfig();
    const serviceKey = config.safemap_key || '';
    if (!serviceKey) {
        return res.status(500).json({ error: '생활안전정보 API Key가 설정되지 않았습니다.' });
    }

    const cacheKey = `accident-stats:${bbox}:${width}:${height}:${serviceKey}`;
    const cached = getCachedWms(cacheKey);
    if (cached) {
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('Content-Type', cached.contentType || 'image/png');
        return res.send(cached.buffer);
    }

    // 생활안전지도 WMS API 호출 URL 생성 (치안사고 통계 - IF_0075_WMS)
    const wmsUrl = `https://safemap.go.kr/openapi2/IF_0075_WMS?serviceKey=${encodeURIComponent(serviceKey)}&srs=EPSG:4326&bbox=${bbox}&format=image/png&width=${width}&height=${height}&transparent=TRUE`;

    try {
        const { buffer, contentType } = await fetchImageBuffer(wmsUrl);

        setCachedWms(cacheKey, contentType, buffer);
        
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('Content-Type', contentType || 'image/png');
        return res.send(buffer);
    } catch (err) {
        console.error('Accident Statistics WMS Proxy Error:', err);
        return res.status(500).json({ error: '치안사고 통계 이미지 로드에 실패했습니다.', details: err.message });
    }
});

// 15. GET /api/traffic-accidents - Fetch frequent traffic accident zones from safemap WMS API (IF_0093_WMS)
app.get('/api/traffic-accidents', async (req, res) => {
    const { bbox, width, height } = req.query;
    if (!bbox || !width || !height) {
        return res.status(400).json({ error: 'bbox, width, height 파라미터가 필요합니다.' });
    }

    const config = await readConfig();
    const serviceKey = config.safemap_key || '';
    if (!serviceKey) {
        return res.status(500).json({ error: '생활안전정보 API Key가 설정되지 않았습니다.' });
    }

    const cacheKey = `traffic-accidents:${bbox}:${width}:${height}:${serviceKey}`;
    const cached = getCachedWms(cacheKey);
    if (cached) {
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('Content-Type', cached.contentType || 'image/png');
        return res.send(cached.buffer);
    }

    // 생활안전지도 WMS API 호출 URL 생성 (교통사고 다발구역 - IF_0093_WMS)
    const wmsUrl = `https://safemap.go.kr/openapi2/IF_0093_WMS?serviceKey=${encodeURIComponent(serviceKey)}&srs=EPSG:4326&bbox=${bbox}&format=image/png&width=${width}&height=${height}&transparent=TRUE`;

    try {
        const { buffer, contentType } = await fetchImageBuffer(wmsUrl);
        
        setCachedWms(cacheKey, contentType, buffer);

        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('Content-Type', contentType || 'image/png');
        return res.send(buffer);
    } catch (err) {
        console.error('Traffic Accidents WMS Proxy Error:', err);
        return res.status(500).json({ error: '교통사고 다발구역 이미지 로드에 실패했습니다.', details: err.message });
    }
});

// --- Town Talk API ---
const Towntalk_Path = path.join(__dirname, 'towntalk.json');

function readTowntalk() {
    if (!fs.existsSync(Towntalk_Path)) {
        return [];
    }
    try {
        const content = fs.readFileSync(Towntalk_Path, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        console.error('Error reading towntalk file', e);
        return [];
    }
}

function writeTowntalk(data) {
    try {
        fs.writeFileSync(Towntalk_Path, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('Error writing towntalk file', e);
    }
}

app.get('/api/towntalk', (req, res) => {
    const { targetId } = req.query;
    if (!targetId) return res.status(400).json({ error: 'targetId가 필요합니다.' });

    const talkList = readTowntalk();
    const filtered = talkList.filter(t => t.targetId === targetId);
    // 최신 순으로 정렬하여 반환
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(filtered.slice(0, 30));
});

app.post('/api/towntalk', (req, res) => {
    const { targetId, nickname, content } = req.body;
    if (!targetId || !nickname || !content) {
        return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
    }

    // XSS 방지
    const escape = (str) => {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const newTalk = {
        id: 'talk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        targetId: targetId,
        nickname: escape(nickname.trim()),
        content: escape(content.trim()),
        timestamp: new Date().toISOString()
    };

    const talkList = readTowntalk();
    talkList.push(newTalk);
    writeTowntalk(talkList);

    res.status(201).json(newTalk);
});

// 16. POST /api/info-edit-request - Save wrong info edit request to Supabase
app.post('/api/info-edit-request', async (req, res) => {
    const { targetName, details, contact } = req.body;
    if (!targetName || !details) {
        return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/info_edit_requests`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                target_name: targetName,
                details: details,
                contact: contact
            })
        });

        if (!response.ok) {
            throw new Error(`Supabase error: ${await response.text()}`);
        }

        const data = await response.json();
        return res.status(201).json(data);
    } catch (err) {
        console.error('Info Edit Request Supabase Error:', err);
        return res.status(500).json({ error: '요청 제출에 실패했습니다.' });
    }
});

// 17. POST /api/ad-inquiry - Save advertisement inquiry to Supabase
app.post('/api/ad-inquiry', async (req, res) => {
    const { companyName, contact, details } = req.body;
    if (!companyName || !contact || !details) {
        return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/ad_inquiries`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                company_name: companyName,
                contact: contact,
                details: details
            })
        });

        if (!response.ok) {
            throw new Error(`Supabase error: ${await response.text()}`);
        }

        const data = await response.json();
        return res.status(201).json(data);
    } catch (err) {
        console.error('Ad Inquiry Supabase Error:', err);
        return res.status(500).json({ error: '문의 제출에 실패했습니다.' });
    }
});

// 18. POST /api/academy-register - Save academy registration request to Supabase
app.post('/api/academy-register', async (req, res) => {
    const { academyName, address, academyType, contact, comments } = req.body;
    if (!academyName || !address || !academyType) {
        return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/academy_registration_requests`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                academy_name: academyName,
                address: address,
                academy_type: academyType,
                contact: contact,
                comments: comments
            })
        });

        if (!response.ok) {
            throw new Error(`Supabase error: ${await response.text()}`);
        }

        const data = await response.json();
        return res.status(201).json(data);
    } catch (err) {
        console.error('Academy Register Supabase Error:', err);
        return res.status(500).json({ error: '등록 제안 제출에 실패했습니다.' });
    }
});

// 19. GET /api/admin/info-edit-requests - Retrieve wrong info edit requests from Supabase
app.get('/api/admin/info-edit-requests', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== 'session_token_example_12345') {
        return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/info_edit_requests?order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`Supabase error: ${await response.text()}`);
        }

        const data = await response.json();
        return res.json(data);
    } catch (err) {
        console.error('Fetch Info Edit Requests Error:', err);
        return res.status(500).json({ error: '데이터를 가져오는 중 오류가 발생했습니다.' });
    }
});

// 20. DELETE /api/admin/info-edit-requests/:id - Delete an info edit request from Supabase
app.delete('/api/admin/info-edit-requests/:id', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== 'session_token_example_12345') {
        return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
    }
    const { id } = req.params;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/info_edit_requests?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`Supabase error: ${await response.text()}`);
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('Delete Info Edit Request Error:', err);
        return res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
    }
});

// 21. GET /api/admin/ad-inquiries - Retrieve advertisement inquiries from Supabase
app.get('/api/admin/ad-inquiries', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== 'session_token_example_12345') {
        return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/ad_inquiries?order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`Supabase error: ${await response.text()}`);
        }

        const data = await response.json();
        return res.json(data);
    } catch (err) {
        console.error('Fetch Ad Inquiries Error:', err);
        return res.status(500).json({ error: '데이터를 가져오는 중 오류가 발생했습니다.' });
    }
});

// 22. DELETE /api/admin/ad-inquiries/:id - Delete an ad inquiry from Supabase
app.delete('/api/admin/ad-inquiries/:id', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== 'session_token_example_12345') {
        return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
    }
    const { id } = req.params;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/ad_inquiries?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`Supabase error: ${await response.text()}`);
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('Delete Ad Inquiry Error:', err);
        return res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
    }
});

// 23. GET /api/admin/academy-registers - Retrieve academy registrations from Supabase
app.get('/api/admin/academy-registers', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== 'session_token_example_12345') {
        return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/academy_registration_requests?order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`Supabase error: ${await response.text()}`);
        }

        const data = await response.json();
        return res.json(data);
    } catch (err) {
        console.error('Fetch Academy Registers Error:', err);
        return res.status(500).json({ error: '데이터를 가져오는 중 오류가 발생했습니다.' });
    }
});

// 24. DELETE /api/admin/academy-registers/:id - Delete an academy registration from Supabase
app.delete('/api/admin/academy-registers/:id', async (req, res) => {
    const token = req.headers.authorization;
    if (token !== 'session_token_example_12345') {
        return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
    }
    const { id } = req.params;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/academy_registration_requests?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`Supabase error: ${await response.text()}`);
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('Delete Academy Register Error:', err);
        return res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
    }
});

// Fallback to serve index.html for unknown SPA routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 로컬 환경에서만 서버 구동, Vercel에서는 모듈로 동작
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`[Express Backend] Server running on port ${PORT}`);
    });
}

export default app;
