import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

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

// Helper to read configuration
function readConfig() {
    let config = { 
        kakao_app_key: process.env.KAKAO_APP_KEY || '', 
        neis_api_key: process.env.NEIS_API_KEY || '',
        naver_client_id: process.env.NAVER_CLIENT_ID || '',
        naver_client_secret: process.env.NAVER_CLIENT_SECRET || ''
    };
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            // 환경 변수가 비어있는 경우에만 파일 설정 적용
            if (fileConfig.kakao_app_key) config.kakao_app_key = fileConfig.kakao_app_key;
            if (fileConfig.neis_api_key) config.neis_api_key = fileConfig.neis_api_key;
            if (fileConfig.naver_client_id) config.naver_client_id = fileConfig.naver_client_id;
            if (fileConfig.naver_client_secret) config.naver_client_secret = fileConfig.naver_client_secret;
        }
    } catch (e) {
        console.error('Error reading config:', e);
    }
    return config;
}

// Helper to save configuration
function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error writing config:', e);
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
app.get('/api/config/map-key', (req, res) => {
    const config = readConfig();
    return res.json({ kakao_app_key: config.kakao_app_key || '' });
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
app.get('/api/admin/config', (req, res) => {
    const token = req.headers.authorization;
    if (token !== 'session_token_example_12345') {
        return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
    }
    const config = readConfig();
    return res.json(config);
});

// 5. POST /api/admin/config - Update Kakao/NEIS keys
app.post('/api/admin/config', (req, res) => {
    const token = req.headers.authorization;
    if (token !== 'session_token_example_12345') {
        return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
    }

    const { kakao_app_key, neis_api_key, naver_client_id, naver_client_secret } = req.body;
    const config = readConfig();
    config.kakao_app_key = kakao_app_key;
    config.neis_api_key = neis_api_key;
    config.naver_client_id = naver_client_id;
    config.naver_client_secret = naver_client_secret;

    if (saveConfig(config)) {
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
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
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

// 7. GET /api/community - Fetch Naver Search API
app.get('/api/community', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: '검색어가 없습니다.' });

    const config = readConfig();
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
            const blogUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(query)}&display=25&sort=sim`;
            const cafeUrl = `https://openapi.naver.com/v1/search/cafearticle.json?query=${encodeURIComponent(query)}&display=25&sort=sim`;
            
            const [blogData, cafeData] = await Promise.all([
                httpsGet(blogUrl, headers),
                httpsGet(cafeUrl, headers)
            ]);

            const blogItems = (blogData.items || []).map(item => ({ ...item, _source: 'blog' }));
            const cafeItems = (cafeData.items || []).map(item => ({ ...item, _source: 'cafe' }));
            const items = [...blogItems, ...cafeItems];
            res.json({ items, total: items.length });
        } else if (type === 'cafe') {
            const url = `https://openapi.naver.com/v1/search/cafearticle.json?query=${encodeURIComponent(query)}&display=50&sort=sim`;
            const data = await httpsGet(url, headers);
            const items = (data.items || []).map(item => ({ ...item, _source: 'cafe' }));
            res.json({ ...data, items });
        } else {
            const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(query)}&display=50&sort=sim`;
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

    const config = readConfig();
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

    const config = readConfig();
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

    const config = readConfig();
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

// --- 찐후기 기능 (메모리 기반 저장소, 서버 재시작 시 초기화됨) ---
const realReviewsData = [];

app.use(express.json()); // JSON 바디 파싱

app.post('/api/reviews', (req, res) => {
    const { academyName, rating, content } = req.body;
    if (!academyName || !rating || !content) return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
    
    const newReview = {
        id: Date.now().toString(),
        academyName,
        rating: parseInt(rating, 10),
        content,
        createdAt: new Date().toISOString()
    };
    realReviewsData.push(newReview);
    res.json({ success: true, review: newReview });
});

app.get('/api/reviews', (req, res) => {
    const { academyName } = req.query;
    if (!academyName) return res.status(400).json({ error: '학원명이 누락되었습니다.' });
    
    const matched = realReviewsData.filter(r => r.academyName === academyName).sort((a, b) => b.id - a.id);
    res.json({ items: matched, total: matched.length });
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
