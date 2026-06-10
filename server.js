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
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' })); // Allow large payloads for bulk school data
app.use(express.static(path.join(__dirname))); // Serve static front-end files

const CONFIG_PATH = path.join(__dirname, 'config.json');
const DATA_DIR = path.join(__dirname, 'src', 'data');
const SCHOOLS_PATH = path.join(DATA_DIR, 'schools_seoul.json');

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
        safemap_key: config.safemap_key || '8N7ELUCO-8N7E-8N7E-8N7E-8N7ELUCOQY'
    });
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

// 8. GET /api/academies/count - Fetch true academy count bypassing JS SDK limit
app.get('/api/academies/count', async (req, res) => {
    const { x, y } = req.query;
    if (!x || !y) return res.status(400).json({ error: '좌표가 없습니다.' });

    const config = await readConfig();
    const appkey = config.kakao_app_key;
    if (!appkey) return res.status(500).json({ error: '카카오 앱 키가 없습니다.' });

    try {
        const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=AC5&x=${x}&y=${y}&radius=1000`;
        const data = await httpsGet(url, {
            'Authorization': `KakaoAK ${appkey}`,
            'KA': 'sdk/1.25.3 os/javascript lang/en-US device/Win32 origin/http%3A%2F%2Flocalhost%3A5173'
        });
        res.json({ total_count: data.meta ? data.meta.total_count : 0 });
    } catch (err) {
        console.error('Kakao Fetch Error:', err);
        res.status(500).json({ error: '카카오 검색 API 호출에 실패했습니다.' });
    }
});

// 9. GET /api/academies/list - Fetch ALL academy pages and return sorted full list
app.get('/api/academies/list', async (req, res) => {
    const { x, y } = req.query;
    if (!x || !y) return res.status(400).json({ error: '좌표가 없습니다.' });

    const config = await readConfig();
    const appkey = config.kakao_app_key;
    if (!appkey) return res.status(500).json({ error: '카카오 앱 키가 없습니다.' });

    const headers = {
        'Authorization': `KakaoAK ${appkey}`,
        'KA': 'sdk/1.25.3 os/javascript lang/en-US device/Win32 origin/http%3A%2F%2Flocalhost%3A5173'
    };

    try {
        // 1페이지 먼저 호출해서 total_count 파악 (학원 카테고리 + 교습소 키워드)
        const ac5Url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=AC5&x=${x}&y=${y}&radius=1000&size=15&page=1`;
        const gyoUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent('교습소')}&x=${x}&y=${y}&radius=1000&size=15&page=1`;
        
        const [ac5First, gyoFirst] = await Promise.all([
            httpsGet(ac5Url, headers),
            httpsGet(gyoUrl, headers)
        ]);

        const ac5Total = ac5First.meta ? ac5First.meta.total_count : 0;
        const gyoTotal = gyoFirst.meta ? gyoFirst.meta.total_count : 0;
        
        const ac5Pages = Math.min(Math.ceil(ac5Total / 15), 3); // 최대 3페이지
        const gyoPages = Math.min(Math.ceil(gyoTotal / 15), 2); // 최대 2페이지

        let allItems = [...(ac5First.documents || []), ...(gyoFirst.documents || [])];

        const pageRequests = [];
        
        // 학원 나머지 페이지
        for (let page = 2; page <= ac5Pages; page++) {
            pageRequests.push(httpsGet(`https://dapi.kakao.com/v2/local/search/category.json?category_group_code=AC5&x=${x}&y=${y}&radius=1000&size=15&page=${page}`, headers));
        }
        // 교습소 나머지 페이지
        for (let page = 2; page <= gyoPages; page++) {
            pageRequests.push(httpsGet(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent('교습소')}&x=${x}&y=${y}&radius=1000&size=15&page=${page}`, headers));
        }

        if (pageRequests.length > 0) {
            const results = await Promise.all(pageRequests);
            results.forEach(result => {
                allItems = allItems.concat(result.documents || []);
            });
        }

        // 중복 제거 (id 기준)
        const uniqueMap = new Map();
        allItems.forEach(item => {
            if (!uniqueMap.has(item.id)) {
                uniqueMap.set(item.id, item);
            }
        });
        
        const finalItems = Array.from(uniqueMap.values());
        // totalCount는 두 결과를 합친 값으로 하되 정확하지 않을 수 있으므로 finalItems.length 또는 원래 값으로
        const totalCount = finalItems.length > (ac5Total + gyoTotal) ? finalItems.length : (ac5Total + gyoTotal);

        res.json({ items: finalItems, total_count: totalCount });
    } catch (err) {
        console.error('Kakao List Fetch Error:', err);
        res.status(500).json({ error: '카카오 검색 API 호출에 실패했습니다.' });
    }
});

// 10. GET /api/academies/search - Keyword search around a location
app.get('/api/academies/search', async (req, res) => {
    const { query, x, y } = req.query;
    if (!query || !x || !y) return res.status(400).json({ error: '파라미터가 부족합니다.' });

    const config = await readConfig();
    const appkey = config.kakao_app_key;
    if (!appkey) return res.status(500).json({ error: '카카오 앱 키가 없습니다.' });

    const headers = {
        'Authorization': `KakaoAK ${appkey}`,
        'KA': 'sdk/1.25.3 os/javascript lang/en-US device/Win32 origin/http%3A%2F%2Flocalhost%3A5173'
    };

    try {
        const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=AC5&x=${x}&y=${y}&radius=1000&size=15&page=1`;
        const firstData = await httpsGet(url, headers);
        const totalCount = firstData.meta ? firstData.meta.total_count : 0;
        const totalPages = Math.min(Math.ceil(totalCount / 15), 3); // 최대 3페이지 제한

        let allItems = [...(firstData.documents || [])];

        if (totalPages > 1) {
            const pageRequests = [];
            for (let page = 2; page <= totalPages; page++) {
                const pUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=AC5&x=${x}&y=${y}&radius=1000&size=15&page=${page}`;
                pageRequests.push(httpsGet(pUrl, headers));
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
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('Academy Fees API Error:', err);
        res.status(500).json({ error: '학원비 API 호출에 실패했습니다.' });
    }
});

// 12. GET /api/realestate - Fetch real estate data from MOLIT API
app.get('/api/realestate', async (req, res) => {
    const { lawd_cd, deal_ymd } = req.query;
    if (!lawd_cd || !deal_ymd) return res.status(400).json({ error: '법정동코드(lawd_cd)와 거래년월(deal_ymd)이 필요합니다.' });

    const config = await readConfig();
    const serviceKey = config.data_go_kr_key;
    if (!serviceKey) return res.status(500).json({ error: '공공데이터포털 API 키가 설정되지 않았습니다.' });

    try {
        const url = `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=${lawd_cd}&DEAL_YMD=${deal_ymd}`;
        const responseText = await httpsGet(url);
        res.type('application/xml').send(responseText);
    } catch (err) {
        console.error('Real Estate API Error:', err);
        res.status(500).json({ error: '국토교통부 실거래가 API 호출에 실패했습니다.' });
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
