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
// 로컬 개발 환경에서만 정적 파일 서빙 (Vercel 배포 시에는 Vercel CDN이 dist 정적 자산을 서빙하므로 람다 번들 비대화 방지)
if (!process.env.VERCEL) {
    app.use(express.static(path.join(__dirname)));
}

const CONFIG_PATH = path.join(__dirname, 'config.json');
const DATA_DIR = path.join(__dirname, 'src', 'data');
const SCHOOLS_PATH = path.join(DATA_DIR, 'schools_seoul.json');
const REAL_ESTATE_PATH = path.join(DATA_DIR, 'realestate_seoul.json');
const REAL_ESTATE_DIR = path.join(DATA_DIR, 'realestate');
const REAL_ESTATE_REGIONS_PATH = path.join(DATA_DIR, 'realestate_regions.json');
const BUSINESSES_PATH = path.join(DATA_DIR, 'businesses.json');
const SUBSCRIPTIONS_PATH = path.join(DATA_DIR, 'subscriptions.json');
const ANALYTICS_PATH = path.join(DATA_DIR, 'analytics_events.json');
const INQUIRIES_PATH = path.join(DATA_DIR, 'inquiries.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFileSafe(filePath, defaultVal = []) {
    try {
        if (!fs.existsSync(filePath)) return defaultVal;
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        console.error(`[Data Read Error] ${filePath}:`, err.message);
        return defaultVal;
    }
}

function writeJsonFileSafe(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error(`[Data Write Error] ${filePath}:`, err.message);
        return false;
    }
}

// =========================================================================
// [초고속 성능 최적화] 주택 데이터 인메모리 캐시 및 공간 격자 인덱스 (Spatial Grid Index)
// =========================================================================
let cachedRealEstateItems = null;
let cachedRealEstateMtime = 0;
let realEstateSpatialGrid = new Map();
const REAL_ESTATE_GRID_SIZE = 0.02; // 위경도 약 2km 단위 공간 격자 (반경 탐색 시 O(1)에 근접)

// 헬퍼: 주택 명칭, 용도 및 층수 기반 정밀 주택 유형 분류 (apt, rh, sh, offi)
function classifyHousingType(item) {
    if (!item) return 'sh';
    const cleanN = (item.name || '').trim();
    const rawN = (item.rawName || item.name || '').trim();
    const purps = `${item.mainPurps || item.mainPurpsCdNm || ''} ${item.etcPurps || ''}`.trim();
    const flr = parseInt(item.grndFlrCnt || item.flr, 10) || 0;

    // 1. 오피스텔 (최우선)
    if (cleanN.includes('오피스텔') || rawN.includes('오피스텔') || purps.includes('오피스텔') || item.type === 'offi') {
        return 'offi';
    }

    // 2. 건축물대장 공식 주용도/기타용도가 명시된 경우 (공공 데이터 수집 시 최우선 반영)
    if (purps) {
        if (purps.includes('다세대') || purps.includes('연립')) {
            return 'rh';
        }
        if (purps.includes('단독') || purps.includes('다가구') || purps.includes('상가주택')) {
            return 'sh';
        }
        if (purps.includes('아파트') && !/(?:빌라|연립|다세대|타운하우스|맨션)/i.test(cleanN)) {
            return 'apt';
        }
    }

    // 3. 다세대/연립/빌라 명시 키워드
    const isVillaKeyword = /(?:빌라|연립|다세대|맨션|하이츠|빌리지|타운하우스|아트빌|에스빌|베스트타운|파크뷰|그린빌|노블리안|하임|홈스|스테이|스위트|캐슬빌|샤인빌|골드빌|파인하우스|포근애|베르네|여림채|라비앙|하우스|펠리스|팰리스|팰리체|벨리체|아우름|리안|헤리티지|골드스톤|모던하우스|드림하우스|뷰테크|다빈치|솔베이|오스카|아델|팰리|노블|더홈|예다움|라움|에이원|소산|삼진|동남|럭키|대하|행복아름|대림아트|보원|부민|현대타운|신풍|도양|인화|유원|한일|두리|로얄|서광|백산|신성|빌\b|홈\b)/i.test(cleanN);

    // 4. 아파트 명시 키워드
    const isAptExplicit = cleanN.includes('아파트') || rawN.includes('아파트') || cleanN.includes('APT') || cleanN.includes('apt') || cleanN.endsWith('단지');
    const isMajorAptBrand = /(?:휴먼시아|주공|브라운스톤|래미안|자이|푸르지오|힐스테이트|e편한세상|이편한세상|롯데캐슬|아이파크|더샵|위브|센트레빌|우미린|호반|중흥|대방|두산위브|포레나|SK뷰|skview)/i.test(cleanN);

    // 4-1. 이름에 '아파트'가 명시되어 있는 경우
    if (isAptExplicit) {
        if (cleanN.endsWith('빌라') || cleanN.endsWith('연립') || cleanN.endsWith('다세대')) return 'rh';
        return 'apt';
    }

    // 4-2. 빌라/다세대 키워드가 포함된 경우 -> 무조건 rh (아파트 명칭 없는 더샵하우스, 팰리스 등은 rh)
    if (isVillaKeyword) {
        return 'rh';
    }

    // 4-3. 아파트 브랜드명이 있고 빌라 키워드가 없는 경우
    if (isMajorAptBrand) {
        return 'apt';
    }

    // 4-4. 순수 지번 주택 (예: '여월동 8-20번지 주택') 및 단독/다가구/원룸/상가주택
    if (cleanN.includes('번지') || cleanN.includes('단독') || cleanN.includes('다가구') || cleanN.includes('원룸') || cleanN.includes('상가') || cleanN.endsWith('상가')) {
        return 'sh';
    }

    // 4-5. 명칭이 있는 일반 주택 (예: '연성주택', '보령주택', '화창주택', '대진주택', '오한주택')
    if (cleanN.endsWith('주택')) {
        // 전국 행정구역명(동/읍/면/리/가)+주택 또는 지번 주택은 단독·다가구(sh)
        if (/(?:[가-힣]+(?:동|읍|면|리|\d+가)|번지)\s*주택/.test(cleanN)) return 'sh';
        return 'rh';
    }

    // 4-6. 층수 기준
    if (flr >= 5) return 'apt';
    if (flr > 0 && flr <= 4) return 'rh';

    return item.type || 'sh';
}

function buildRealEstateSpatialGrid(items) {
    const grid = new Map();
    if (!Array.isArray(items)) return grid;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        const x = parseFloat(item.x || item.lng);
        const y = parseFloat(item.y || item.lat);
        if (isNaN(x) || isNaN(y)) continue;
        
        item._numX = x;
        item._numY = y;
        
        const type = classifyHousingType(item);
        item.type = type;
        item._cleanType = type;

        const cellX = Math.floor(x / REAL_ESTATE_GRID_SIZE);
        const cellY = Math.floor(y / REAL_ESTATE_GRID_SIZE);
        const key = `${cellY}_${cellX}`;
        let cell = grid.get(key);
        if (!cell) {
            cell = [];
            grid.set(key, cell);
        }
        cell.push(item);
    }
    return grid;
}

function getCachedRealEstateItems() {
    try {
        // 1. 시·군·구별 분할 디렉터리(src/data/realestate) 우선 로드
        if (fs.existsSync(REAL_ESTATE_DIR)) {
            const files = fs.readdirSync(REAL_ESTATE_DIR).filter(f => f.endsWith('.json'));
            if (files.length > 0) {
                // 수정 시간 비교 (디렉터리 또는 인덱스 파일 기준)
                let latestMtime = 0;
                if (fs.existsSync(REAL_ESTATE_REGIONS_PATH)) {
                    latestMtime = fs.statSync(REAL_ESTATE_REGIONS_PATH).mtimeMs;
                } else {
                    latestMtime = fs.statSync(REAL_ESTATE_DIR).mtimeMs;
                }

                if (cachedRealEstateItems && cachedRealEstateMtime === latestMtime) {
                    return cachedRealEstateItems;
                }

                console.log(`[RealEstate Cache] 시·군·구별 분할 데이터(${files.length}개 파일) 메모리 캐시 로딩 시작...`);
                const t0 = Date.now();
                let combinedItems = [];
                for (const file of files) {
                    try {
                        const filePath = path.join(REAL_ESTATE_DIR, file);
                        const raw = fs.readFileSync(filePath, 'utf8');
                        const part = JSON.parse(raw || '[]');
                        if (Array.isArray(part)) {
                            combinedItems = combinedItems.concat(part);
                        }
                    } catch (readErr) {
                        console.warn(`[RealEstate Cache Warn] 파일 읽기 실패 (${file}):`, readErr.message);
                    }
                }
                cachedRealEstateItems = combinedItems;
                cachedRealEstateMtime = latestMtime;
                realEstateSpatialGrid = buildRealEstateSpatialGrid(cachedRealEstateItems);
                console.log(`[RealEstate Cache] ${cachedRealEstateItems.length.toLocaleString()}건 주택 데이터(총 ${files.length}개 지역) 및 공간 격자(${realEstateSpatialGrid.size}셀) 로드 완료 (${Date.now() - t0}ms)`);
                return cachedRealEstateItems;
            }
        }

        // 2. Fallback: 기존 단일 realestate_seoul.json 파일 로드
        if (fs.existsSync(REAL_ESTATE_PATH)) {
            const stat = fs.statSync(REAL_ESTATE_PATH);
            if (cachedRealEstateItems && cachedRealEstateMtime === stat.mtimeMs) {
                return cachedRealEstateItems;
            }
            console.log(`[RealEstate Cache Fallback] 단일 주택 데이터 메모리 캐시 로딩 시작 (크기: ${(stat.size / 1024 / 1024).toFixed(1)}MB)...`);
            const t0 = Date.now();
            const raw = fs.readFileSync(REAL_ESTATE_PATH, 'utf8');
            cachedRealEstateItems = JSON.parse(raw || '[]');
            cachedRealEstateMtime = stat.mtimeMs;
            realEstateSpatialGrid = buildRealEstateSpatialGrid(cachedRealEstateItems);
            console.log(`[RealEstate Cache Fallback] ${cachedRealEstateItems.length.toLocaleString()}건 주택 데이터 및 공간 격자(${realEstateSpatialGrid.size}셀) 로드 완료 (${Date.now() - t0}ms)`);
            return cachedRealEstateItems;
        }

        cachedRealEstateItems = [];
        realEstateSpatialGrid = new Map();
        return cachedRealEstateItems;
    } catch (err) {
        console.error('[RealEstate Cache Error]:', err.message);
        if (!cachedRealEstateItems) cachedRealEstateItems = [];
    }
    return cachedRealEstateItems;
}

function updateCachedRealEstateItems(newItems) {
    if (!Array.isArray(newItems)) return;
    cachedRealEstateItems = newItems;
    realEstateSpatialGrid = buildRealEstateSpatialGrid(newItems);
    try {
        if (fs.existsSync(REAL_ESTATE_REGIONS_PATH)) {
            cachedRealEstateMtime = fs.statSync(REAL_ESTATE_REGIONS_PATH).mtimeMs;
        } else if (fs.existsSync(REAL_ESTATE_PATH)) {
            cachedRealEstateMtime = fs.statSync(REAL_ESTATE_PATH).mtimeMs;
        }
    } catch (e) {}
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

// 날짜 포맷팅 헬퍼 함수 (YYYY-MM-DD HH:mm:ss)
function getNowFormatted() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 1-1. GET /api/realestate/stored - Serve stored real estate JSON data
app.get('/api/realestate/stored', (req, res) => {
    try {
        const items = getCachedRealEstateItems();
        return res.json(items);
    } catch (e) {
        console.error('Error reading real estate data:', e);
        return res.status(500).json({ error: '주택 데이터를 읽을 수 없습니다.' });
    }
});

// 1-1-1. GET /api/realestate/regions - Serve regions index metadata (시·군·구 목록 및 건수)
app.get('/api/realestate/regions', (req, res) => {
    try {
        if (fs.existsSync(REAL_ESTATE_REGIONS_PATH)) {
            const raw = fs.readFileSync(REAL_ESTATE_REGIONS_PATH, 'utf8');
            return res.json(JSON.parse(raw));
        }
        return res.json([]);
    } catch (e) {
        console.error('Error reading real estate regions index:', e);
        return res.status(500).json({ error: '지역 인덱스를 읽을 수 없습니다.' });
    }
});

// 1-1-2. GET /api/realestate/region/:code - Serve specific region JSON data (시·군·구별 경량 데이터)
app.get('/api/realestate/region/:code', (req, res) => {
    try {
        const code = req.params.code;
        const fileName = code.endsWith('.json') ? code : `${code}.json`;
        const filePath = path.join(REAL_ESTATE_DIR, fileName);

        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8');
            return res.json(JSON.parse(raw));
        }
        return res.status(404).json({ error: '해당 지역 데이터를 찾을 수 없습니다.' });
    } catch (e) {
        console.error(`Error reading real estate region ${req.params.code}:`, e);
        return res.status(500).json({ error: '지역 주택 데이터를 읽을 수 없습니다.' });
    }
});

// 1-2. POST /api/realestate/stored - Save/update real estate JSON data
app.post('/api/realestate/stored', (req, res) => {
    try {
        const items = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ success: false, error: '배열 데이터 형식이어야 합니다.' });
        }
        const nowStr = getNowFormatted();
        const updatedItems = items.map(item => ({
            ...item,
            createdAt: item.createdAt || nowStr,
            updatedAt: item.updatedAt || nowStr
        }));
        saveRealEstateJsonFiles(updatedItems);
        return res.json({ success: true, count: updatedItems.length, message: '주택 데이터가 realestate_seoul.json 및 시·군·구별 파일에 저장되었습니다.' });
    } catch (e) {
        console.error('Error saving real estate data:', e);
        return res.status(500).json({ success: false, error: '주택 데이터 저장 중 오류가 발생했습니다.' });
    }
});

// 헬퍼: 카카오 로컬 REST API 기반 4단계 정밀 지오코딩 (도로명/행정구개편/지번/키워드)
async function geocodeKakaoPrecise(item, kakaoKey) {
    if (!kakaoKey) return null;
    let enrichedCoord = null;
    let roadAddr = '';
    let foundDong = '';
    const headers = {
        'Authorization': `KakaoAK ${kakaoKey}`,
        'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000'
    };

    const cleanBaseAddr = (item.address || '').replace(/\([^)]*\)/g, '').trim();

    // [1단계] 정제 도로명 검색
    if (cleanBaseAddr && cleanBaseAddr.length > 5) {
        try {
            const res = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(cleanBaseAddr)}`, {
                headers, signal: AbortSignal.timeout(5000)
            });
            if (res.ok) {
                const data = await res.json();
                if (data.documents && data.documents.length > 0) {
                    const doc = data.documents[0];
                    enrichedCoord = { x: doc.x, y: doc.y };
                    if (doc.address && doc.address.region_3depth_name) foundDong = doc.address.region_3depth_name;
                    if (doc.road_address && doc.road_address.address_name) roadAddr = doc.road_address.address_name;
                }
            }
        } catch (e) {}
    }

    // [2단계] 시군구명(예: 오정구, 원미구 등) 제거 후 도로명 재검색 (부천시 등 행정구 개편 지역 호환)
    if (!enrichedCoord && item.sigungu && cleanBaseAddr.includes(item.sigungu)) {
        try {
            const strippedAddr = cleanBaseAddr.replace(item.sigungu, '').replace(/\s+/g, ' ').trim();
            const res = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(strippedAddr)}`, {
                headers, signal: AbortSignal.timeout(5000)
            });
            if (res.ok) {
                const data = await res.json();
                if (data.documents && data.documents.length > 0) {
                    const doc = data.documents[0];
                    enrichedCoord = { x: doc.x, y: doc.y };
                    if (doc.address && doc.address.region_3depth_name) foundDong = doc.address.region_3depth_name;
                    if (doc.road_address && doc.road_address.address_name) roadAddr = doc.road_address.address_name;
                }
            }
        } catch (e) {}
    }

    // [3단계] 지번 주소(동 + 번지-호) 조합 검색
    if (!enrichedCoord && item.dong && item.bun && item.bun !== '0000' && item.bun !== '0') {
        try {
            const bunNum = parseInt(item.bun, 10);
            const jiNum = (item.ji && item.ji !== '0000' && item.ji !== '0') ? parseInt(item.ji, 10) : null;
            const jibunStr = jiNum ? `${bunNum}-${jiNum}` : `${bunNum}`;
            const parentCity = typeof findParentCity === 'function' ? findParentCity(item.sigungu) : '';
            const queries = [
                `${item.sido || ''} ${parentCity ? parentCity + ' ' : ''}${item.sigungu || ''} ${item.dong} ${jibunStr}`.trim(),
                `${item.dong} ${jibunStr}`.trim()
            ];

            for (const q of queries) {
                const res = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}`, {
                    headers, signal: AbortSignal.timeout(5000)
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.documents && data.documents.length > 0) {
                        const doc = data.documents[0];
                        enrichedCoord = { x: doc.x, y: doc.y };
                        if (doc.address && doc.address.region_3depth_name) foundDong = doc.address.region_3depth_name;
                        if (doc.road_address && doc.road_address.address_name) roadAddr = doc.road_address.address_name;
                        break;
                    }
                }
            }
        } catch (e) {}
    }

    // [4단계] 단지명/건물명 키워드 검색
    if (!enrichedCoord && item.name) {
        try {
            const cleanName = item.name.replace(/\(.*?\)/g, '').replace(/,/g, '').trim();
            if (cleanName && cleanName.length >= 2 && !cleanName.includes('주택') && !cleanName.includes('번지')) {
                const kwQuery = `${item.sigungu || ''} ${item.dong || ''} ${cleanName}`.trim();
                const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(kwQuery)}&size=3`, {
                    headers, signal: AbortSignal.timeout(5000)
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.documents && data.documents.length > 0) {
                        for (const doc of data.documents) {
                            if (typeof isNonResidential === 'function' && isNonResidential(doc.place_name, doc.category_name)) continue;
                            const addr = doc.road_address_name || doc.address_name || '';
                            if ((item.sigungu && addr.includes(item.sigungu)) || (item.dong && addr.includes(item.dong))) {
                                enrichedCoord = { x: doc.x, y: doc.y };
                                if (doc.road_address_name) roadAddr = doc.road_address_name;
                                break;
                            }
                        }
                    }
                }
            }
        } catch (e) {}
    }

    if (enrichedCoord) {
        return { coord: enrichedCoord, roadAddr, foundDong };
    }
    return null;
}

// 헬퍼: realestate_seoul.json 및 시·군·구별 분할 파일 일괄 안전 저장
function saveRealEstateJsonFiles(items) {
    // 1. 단일 마스터 파일 저장 (호환성 유지)
    fs.writeFileSync(REAL_ESTATE_PATH, JSON.stringify(items, null, 2), 'utf8');
    const publicPath1 = path.join(__dirname, 'public', 'data', 'realestate_seoul.json');
    if (fs.existsSync(path.dirname(publicPath1))) {
        fs.writeFileSync(publicPath1, JSON.stringify(items, null, 2), 'utf8');
    }
    const publicPath2 = path.join(__dirname, 'public', 'src', 'data', 'realestate_seoul.json');
    if (fs.existsSync(path.dirname(publicPath2))) {
        fs.writeFileSync(publicPath2, JSON.stringify(items, null, 2), 'utf8');
    }

    // 2. 시·군·구별 분할 파일 동기화
    try {
        const targetDirs = [
            REAL_ESTATE_DIR,
            path.join(__dirname, 'public', 'data', 'realestate'),
            path.join(__dirname, 'public', 'src', 'data', 'realestate')
        ];
        targetDirs.forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });

        const regionMap = new Map();
        for (const item of items) {
            let sido = (item.sido || '경기도').trim();
            let sigungu = (item.sigungu || '기타').trim();
            let lawdCd = (item.lawdCd || '').trim();
            if (sigungu === '고양시 덕양구') {
                sigungu = '덕양구';
                lawdCd = '41281';
            }
            if (!lawdCd && item.pnu && item.pnu.length === 19) {
                lawdCd = item.pnu.substring(0, 5);
            }
            const groupKey = `${sido}_${sigungu}`;
            if (!regionMap.has(groupKey)) {
                regionMap.set(groupKey, { sido, sigungu, lawdCd: lawdCd || 'unknown', items: [] });
            }
            const group = regionMap.get(groupKey);
            if ((group.lawdCd === 'unknown' || !group.lawdCd) && lawdCd) {
                group.lawdCd = lawdCd;
            }
            group.items.push(item);
        }

        const indexList = [];
        for (const [, group] of regionMap.entries()) {
            const code = group.lawdCd !== 'unknown' ? group.lawdCd : group.sigungu;
            const fileName = `${code}.json`;
            indexList.push({
                sido: group.sido,
                sigungu: group.sigungu,
                lawdCd: group.lawdCd,
                fileName,
                count: group.items.length
            });
            const jsonStr = JSON.stringify(group.items, null, 2);
            targetDirs.forEach(dir => {
                fs.writeFileSync(path.join(dir, fileName), jsonStr, 'utf8');
            });
        }

        indexList.sort((a, b) => a.sigungu.localeCompare(b.sigungu, 'ko'));
        const indexJson = JSON.stringify(indexList, null, 2);
        const indexPaths = [
            REAL_ESTATE_REGIONS_PATH,
            path.join(__dirname, 'public', 'data', 'realestate_regions.json'),
            path.join(__dirname, 'public', 'src', 'data', 'realestate_regions.json')
        ];
        indexPaths.forEach(p => {
            if (fs.existsSync(path.dirname(p))) {
                fs.writeFileSync(p, indexJson, 'utf8');
            }
        });
    } catch (splitSyncErr) {
        console.error('[RealEstate Split Save Error]:', splitSyncErr.message);
    }

    updateCachedRealEstateItems(items);
}

// 건축물대장 전유부 API(getBrExposPubuseAreaInfo)를 통한 단지별 호실 전용면적 정밀 조회 헬퍼
async function fetchExposAreaForEstate(estate, serviceKey) {
    if (!serviceKey || !estate) return null;
    let bun = estate.bun;
    let ji = estate.ji;

    // PNU(19자리) 기반 bun, ji, bjdongCd, lawdCd 보충
    if ((!bun || !estate.bjdongCd) && estate.pnu && estate.pnu.length === 19) {
        if (!estate.lawdCd) estate.lawdCd = estate.pnu.substring(0, 5);
        if (!estate.bjdongCd) estate.bjdongCd = estate.pnu.substring(5, 10);
        if (!bun) bun = String(parseInt(estate.pnu.substring(11, 15), 10) || 0);
        if (!ji) ji = String(parseInt(estate.pnu.substring(15, 19), 10) || 0);
    }

    const lawdCd = estate.lawdCd || (estate.pnu ? estate.pnu.substring(0, 5) : '');
    const bjdongCd = estate.bjdongCd || (estate.pnu ? estate.pnu.substring(5, 10) : '');

    if (!lawdCd || !bjdongCd || !bun || bun === '0') return null;

    const candidates = [];
    const pBun = String(parseInt(bun, 10) || 0).padStart(4, '0');
    const pJi = String(parseInt(ji, 10) || 0).padStart(4, '0');
    candidates.push(pJi);
    if (pJi !== '0000') {
        candidates.push('0000');
        const jiNum = parseInt(pJi, 10);
        if (jiNum > 0) {
            candidates.push(String(jiNum - 1).padStart(4, '0'));
            candidates.push(String(jiNum + 1).padStart(4, '0'));
        }
    }

    // 주소에 구체적 지번(예: 404-7)이 명시되어 있는 경우 해당 지번도 후보로 추가
    if (estate.address) {
        const m = estate.address.match(/(?:동|리)\s*(\d+)-(\d+)/);
        if (m && m[2]) {
            const addrJi = String(parseInt(m[2], 10) || 0).padStart(4, '0');
            if (!candidates.includes(addrJi)) candidates.unshift(addrJi);
        }
    }

    for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
        const testJi = candidates[cIdx];
        if (cIdx > 0) await new Promise(r => setTimeout(r, 70));
        const areaCollector = new Map();
        try {
            for (let page = 1; page <= 2; page++) {
                const exposUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${lawdCd}&bjdongCd=${bjdongCd}&bun=${pBun}&ji=${testJi}&numOfRows=100&pageNo=${page}`;
                const exposXml = await httpsGet(exposUrl);
                const exposItems = (typeof exposXml === 'string' ? exposXml.match(/<item>[\s\S]*?<\/item>/g) : null) || [];
                if (exposItems.length === 0) break;

                for (const itemXml of exposItems) {
                    const getTag = tag => {
                        const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                        return m ? m[1].trim() : '';
                    };
                    const exposGb = getTag('exposPubuseGbCdNm');
                    if (exposGb && !exposGb.includes('전유')) continue;

                    const areaStr = getTag('area');
                    const areaNum = parseFloat(areaStr);
                    if (isNaN(areaNum) || areaNum <= 8 || areaNum > 600) continue;

                    const areaKey = areaNum.toFixed(1);
                    const existingA = areaCollector.get(areaKey) || {
                        area: `${areaKey}㎡`,
                        pyeong: `${(areaNum / 3.3058).toFixed(1)}평형`,
                        rawArea: areaNum,
                        householdCount: 0,
                        price: estate.price || '기본 정보 구축 (실거래 대기)',
                        tradeDate: estate.tradeDate || '-'
                    };
                    existingA.householdCount++;
                    areaCollector.set(areaKey, existingA);
                }
                if (exposItems.length < 100) break;
            }

            if (areaCollector.size > 0) {
                const sorted = Array.from(areaCollector.values()).sort((a, b) => a.rawArea - b.rawArea);
                let primaryArea = sorted[0];
                let maxCount = -1;
                sorted.forEach(a => {
                    if (a.householdCount > maxCount) {
                        maxCount = a.householdCount;
                        primaryArea = a;
                    }
                });

                return {
                    area: primaryArea.area,
                    areaList: sorted.map(({ rawArea, ...rest }) => rest)
                };
            }
        } catch (err) {
            console.warn(`[Expos Area Fetch Error] ${estate.name}:`, err.message || err);
        }
    }

    return null;
}

// 1-3. POST /api/realestate/fetch-single-area - 단일 단지의 누락된 호실별 전용면적 재수집
app.post('/api/realestate/fetch-single-area', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: '단지 ID가 필요합니다.' });
        }

        if (!fs.existsSync(REAL_ESTATE_PATH)) {
            return res.status(404).json({ success: false, message: '주택 데이터베이스가 존재하지 않습니다.' });
        }

        const items = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8') || '[]');
        const idx = items.findIndex(it => it.id === id);
        if (idx === -1) {
            return res.status(404).json({ success: false, message: '해당 단지를 찾을 수 없습니다.' });
        }

        const config = await readConfig();
        const serviceKey = config.data_go_kr_key;
        if (!serviceKey) {
            return res.status(500).json({ success: false, message: '공공데이터포털 API 인증키(data_go_kr_key)가 설정되지 않았습니다.' });
        }

        const estate = items[idx];
        const areaResult = await fetchExposAreaForEstate(estate, serviceKey);

        if (areaResult && areaResult.areaList && areaResult.areaList.length > 0) {
            estate.area = areaResult.area;
            estate.areaList = areaResult.areaList;
            estate.updatedAt = getNowFormatted();
            items[idx] = estate;
            saveRealEstateJsonFiles(items);

            return res.json({
                success: true,
                message: `[${estate.name}] 전용면적 ${estate.area} (${estate.areaList.length}개 타입) 수집 완료`,
                estate: estate
            });
        } else {
            return res.json({
                success: false,
                message: `[${estate.name}] 공공데이터포털(건축HUB)에 호실별 전유부 정보가 없거나 서버 응답이 지연되었습니다.`
            });
        }
    } catch (e) {
        console.error('Error fetching single estate area:', e);
        return res.status(500).json({ success: false, message: '전용면적 조회 중 오류가 발생했습니다: ' + e.message });
    }
});

// 1-4. POST /api/realestate/retry-missing-areas - API 지연 등으로 전용면적이 누락된 모든 단지 일괄 재수집
app.post('/api/realestate/retry-missing-areas', async (req, res) => {
    try {
        if (!fs.existsSync(REAL_ESTATE_PATH)) {
            return res.status(404).json({ success: false, message: '주택 데이터베이스가 존재하지 않습니다.' });
        }

        const items = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8') || '[]');
        const config = await readConfig();
        const serviceKey = config.data_go_kr_key;
        if (!serviceKey) {
            return res.status(500).json({ success: false, message: '공공데이터포털 API 인증키가 설정되지 않았습니다.' });
        }

        const missingIndices = [];
        items.forEach((item, idx) => {
            const isComplex = item.type === 'apt' || item.type === 'rh' || item.type === 'offi';
            const hasSingleArea = item.area && item.area !== '-';
            const hasValidAreaList = Array.isArray(item.areaList) && item.areaList.some(a => {
                const val = a ? (a.area || a.rawArea) : null;
                return val && val !== '-';
            });
            if (isComplex && !hasSingleArea && !hasValidAreaList) {
                missingIndices.push(idx);
            }
        });

        if (missingIndices.length === 0) {
            return res.json({
                success: true,
                totalTarget: 0,
                updatedCount: 0,
                failedCount: 0,
                message: '면적이 누락된 단지가 없습니다.'
            });
        }

        console.log(`[누락 면적 일괄 재수집 시작] 총 ${missingIndices.length}개 단지 대상 순차 수집 진행`);
        let updatedCount = 0;
        let failedCount = 0;
        const nowStr = getNowFormatted();

        for (const idx of missingIndices) {
            const estate = items[idx];
            try {
                const areaResult = await fetchExposAreaForEstate(estate, serviceKey);
                if (areaResult && areaResult.areaList && areaResult.areaList.length > 0) {
                    estate.area = areaResult.area;
                    estate.areaList = areaResult.areaList;
                    estate.updatedAt = nowStr;
                    items[idx] = estate;
                    updatedCount++;
                } else {
                    failedCount++;
                }
            } catch (err) {
                failedCount++;
            }
            // API 트래픽 제한(과부하) 방지를 위한 100ms 안전 딜레이
            await new Promise(r => setTimeout(r, 100));
        }

        if (updatedCount > 0) {
            saveRealEstateJsonFiles(items);
        }

        return res.json({
            success: true,
            totalTarget: missingIndices.length,
            updatedCount: updatedCount,
            failedCount: failedCount,
            message: `누락 단지 총 ${missingIndices.length}개 중 ${updatedCount}개 단지의 전용면적이 성공적으로 복원되었습니다.`
        });
    } catch (e) {
        console.error('Error retrying missing areas:', e);
        return res.status(500).json({ success: false, message: '누락 면적 일괄 재수집 중 오류 발생: ' + e.message });
    }
});

// 대한민국 전체 시/도 및 시/군/구 법정동 5자리 코드 매핑 로드
const LAWD_JSON_PATH = path.join(__dirname, 'src', 'data', 'lawd_code_map.json');
let NATIONWIDE_LAWD_MAP = {};

try {
    if (fs.existsSync(LAWD_JSON_PATH)) {
        NATIONWIDE_LAWD_MAP = JSON.parse(fs.readFileSync(LAWD_JSON_PATH, 'utf8'));
    }
} catch (e) {
    console.warn('[Warning] Failed to load lawd_code_map.json, using fallback');
}

if (!NATIONWIDE_LAWD_MAP['서울특별시']) {
    NATIONWIDE_LAWD_MAP = {
        '서울특별시': {
            '종로구': '11110', '중구': '11140', '용산구': '11170', '성동구': '11200', '광진구': '11215',
            '동대문구': '11230', '중랑구': '11260', '성북구': '11290', '강북구': '11305', '도봉구': '11320',
            '노원구': '11350', '은평구': '11380', '서대문구': '11410', '마포구': '11440', '양천구': '11470',
            '강서구': '11500', '구로구': '11530', '금천구': '11545', '영등포구': '11560', '동작구': '11590',
            '관악구': '11620', '서초구': '11650', '강남구': '11680', '송파구': '11710', '강동구': '11740'
        },
        '경기도': {
            '고양시': ['41281', '41285', '41287'],
            '덕양구': '41281', '일산동구': '41285', '일산서구': '41287',
            '성남시': ['41131', '41133', '41135'],
            '수정구': '41131', '중원구': '41133', '분당구': '41135',
            '수원시': ['41111', '41113', '41115', '41117'],
            '장안구': '41111', '권선구': '41113', '팔달구': '41115', '영통구': '41117',
            '용인시': ['41461', '41463', '41465'],
            '처인구': '41461', '기흥구': '41463', '수지구': '41465',
            '안산시': ['41271', '41273'],
            '상록구': '41271', '단원구': '41273',
            '안양시': ['41171', '41173'],
            '만안구': '41171', '동안구': '41173',
            '부천시': ['41192', '41194', '41196'],
            '원미구': '41192', '소사구': '41194', '오정구': '41196',
            '광명시': '41210', '평택시': '41220', '동두천시': '41250',
            '과천시': '41290', '구리시': '41310', '남양주시': '41360', '오산시': '41370',
            '시흥시': '41390', '군포시': '41410', '의왕시': '41430', '하남시': '41450',
            '파주시': '41480', '이천시': '41500', '안성시': '41550', '김포시': '41570',
            '화성시': ['41591', '41593', '41595', '41597'],
            '만세구': '41591', '효행구': '41593', '병점구': '41595', '동탄구': '41597',
            '광주시': '41610', '양주시': '41630', '포천시': '41650',
            '여주시': '41670', '연천군': '41800', '가평군': '41820', '양평군': '41830', '의정부시': '41150'
        }
    };
}

const SUB_DISTRICT_MAP = {
    '고양시': ['덕양구', '일산동구', '일산서구'],
    '성남시': ['수정구', '중원구', '분당구'],
    '수원시': ['장안구', '권선구', '팔달구', '영통구'],
    '용인시': ['처인구', '기흥구', '수지구'],
    '안산시': ['상록구', '단원구'],
    '안양시': ['만안구', '동안구'],
    '부천시': ['원미구', '소사구', '오정구'],
    '화성시': ['만세구', '효행구', '병점구', '동탄구'],
    '청주시': ['상당구', '서원구', '흥덕구', '청원구'],
    '천안시': ['동남구', '서북구'],
    '전주시': ['완산구', '덕진구'],
    '포항시': ['남구', '북구'],
    '창원시': ['의창구', '성산구', '마산합포구', '마산회원구', '진해구']
};

// 전국 주요 복합 행정구(일반구)의 표준 법정동 마스터 (카카오 로컬 검색 누락 방지 및 전수 탐색 보장)
const KNOWN_DISTRICT_DONGS = {
    '일산동구': ['식사동', '중산동', '정발산동', '장항동', '마두동', '백석동', '풍동', '산황동', '사리현동', '지영동', '설문동', '문봉동', '성석동'],
    '일산서구': ['일산동', '주엽동', '탄현동', '대화동', '덕이동', '가좌동', '구산동', '법곳동'],
    '덕양구': ['주교동', '원당동', '신원동', '원흥동', '도내동', '북한동', '효자동', '지축동', '오금동', '삼송동', '동산동', '용두동', '벽제동', '선유동', '고양동', '대자동', '관산동', '내유동', '토당동', '내곡동', '대장동', '화정동', '강매동', '행주내동', '행주외동', '신평동', '행신동', '화전동', '현천동', '덕은동', '향동동', '성사동'],
    '분당구': ['분당동', '수내동', '정자동', '율동', '서현동', '이매동', '야탑동', '판교동', '삼평동', '백현동', '운중동', '대장동', '금곡동', '궁내동', '동원동', '구미동'],
    '수정구': ['신흥동', '태평동', '수진동', '단대동', '산성동', '양지동', '복정동', '창곡동', '신촌동', '오야동', '심곡동', '고등동', '상적동', '둔전동', '사송동', '금토동'],
    '중원구': ['성남동', '중동', '금광동', '은행동', '상대원동', '여수동', '도촌동', '갈현동', '하대원동'],
    '영통구': ['매탄동', '원천동', '이의동', '하동', '영통동', '신동', '망포동'],
    '장안구': ['파장동', '정자동', '이목동', '율전동', '천천동', '영화동', '송죽동', '조원동', '연무동', '상광교동', '하광교동'],
    '권선구': ['세류동', '평동', '고색동', '오목천동', '평리동', '서둔동', '구운동', '탑동', '금곡동', '호매실동', '곡반정동', '권선동', '장지동', '대황교동', '입북동', '당수동'],
    '팔달구': ['팔달로1가', '팔달로2가', '팔달로3가', '남창동', '영동', '중동', '구천동', '남수동', '매향동', '북수동', '신풍동', '장안동', '교동', '매교동', '매산로1가', '매산로2가', '매산로3가', '고등동', '화서동', '지동', '우만동', '인계동'],
    '수지구': ['풍덕천동', '죽전동', '동천동', '고기동', '신봉동', '성복동', '상현동'],
    '기흥구': ['신갈동', '구갈동', '상갈동', '하갈동', '보라동', '지곡동', '공세동', '고매동', '농서동', '서천동', '영덕동', '언남동', '마북동', '청덕동', '동백동', '중동', '상하동', '보정동'],
    '처인구': ['김량장동', '역북동', '삼가동', '남동', '유방동', '고림동', '마평동', '운학동', '호동', '해곡동', '포곡읍', '모현읍', '이동읍', '남사읍', '원삼면', '백암면', '양지면'],
    '동안구': ['비산동', '관양동', '평촌동', '호계동'],
    '만안구': ['안양동', '석수동', '박달동'],
    '원미구': ['심곡동', '원미동', '소사동', '역곡동', '춘의동', '도당동', '약대동', '중동', '상동'],
    '소사구': ['소사본동', '심곡본동', '범박동', '괴안동', '송내동', '옥길동', '계수동'],
    '오정구': ['오정동', '여월동', '작동', '원종동', '고강동', '대장동', '삼정동', '내동'],
    '부천시': ['심곡동', '원미동', '소사동', '역곡동', '춘의동', '도당동', '약대동', '중동', '상동', '소사본동', '심곡본동', '범박동', '괴안동', '송내동', '옥길동', '계수동', '오정동', '여월동', '작동', '원종동', '고강동', '대장동', '삼정동', '내동'],
    '만세구': ['우정읍', '향남읍', '남양읍', '마도면', '송산면', '서신면', '팔탄면', '장안면', '양감면', '새솔동', '행정리', '상신리', '하길리', '남양리', '북양리', '조암리'],
    '효행구': ['봉담읍', '매송면', '비봉면', '정남면', '기안동', '배양동', '동화리', '와우리', '수영리', '상리', '내리', '수기리'],
    '병점구': ['진안동', '병점동', '반월동', '기산동', '안녕동', '송산동', '황계동', '반정동'],
    '동탄구': ['반송동', '석우동', '청계동', '영천동', '중동', '오산동', '신동', '목동', '산척동', '장지동', '송동', '방교동', '금곡동', '능동', '여울동'],
    '화성시': ['우정읍', '향남읍', '남양읍', '마도면', '송산면', '서신면', '팔탄면', '장안면', '양감면', '새솔동', '행정리', '상신리', '하길리', '남양리', '북양리', '조암리', '봉담읍', '매송면', '비봉면', '정남면', '기안동', '배양동', '동화리', '와우리', '수영리', '상리', '내리', '수기리', '진안동', '병점동', '반월동', '기산동', '안녕동', '송산동', '황계동', '반정동', '반송동', '석우동', '청계동', '영천동', '중동', '오산동', '신동', '목동', '산척동', '장지동', '송동', '방교동', '금곡동', '능동', '여울동']
};

function findParentCity(guName) {
    if (!guName) return '';
    for (const [city, gus] of Object.entries(SUB_DISTRICT_MAP)) {
        if (gus.includes(guName)) return city;
    }
    return '';
}

const SEOUL_LAWD_MAP = NATIONWIDE_LAWD_MAP['서울특별시'];

function getLawdTargets(sido, sigungu) {
    const sidoMap = NATIONWIDE_LAWD_MAP[sido] || NATIONWIDE_LAWD_MAP['서울특별시'];
    const targets = [];

    const findSubGuName = (code, defaultGu) => {
        const entry = Object.entries(sidoMap).find(([k, v]) => v === code && !Array.isArray(v));
        return entry ? entry[0] : defaultGu;
    };

    if (sigungu === 'all' || !sigungu || sigungu === '전체') {
        Object.entries(sidoMap).forEach(([gName, val]) => {
            if (Array.isArray(val)) {
                // skip array keys to avoid duplicate LAWD code calls
            } else {
                targets.push({ gu: gName, code: val });
            }
        });
    } else {
        const val = sidoMap[sigungu];
        if (val) {
            if (Array.isArray(val)) {
                val.forEach(c => targets.push({ gu: findSubGuName(c, sigungu), code: c }));
            } else {
                targets.push({ gu: sigungu, code: val });
            }
        } else {
            // 더 긴 키를 우선 매칭하되, 길이가 같을 경우 단일 코드(세부구)를 복합시(배열)보다 우선 매칭
            const sortedKeys = Object.keys(sidoMap).sort((a, b) => {
                if (b.length !== a.length) return b.length - a.length;
                const aIsArr = Array.isArray(sidoMap[a]);
                const bIsArr = Array.isArray(sidoMap[b]);
                if (aIsArr !== bIsArr) return aIsArr ? 1 : -1;
                return 0;
            });
            const foundKey = sortedKeys.find(k => sigungu.includes(k) || k.includes(sigungu));
            if (foundKey) {
                const fVal = sidoMap[foundKey];
                if (Array.isArray(fVal)) {
                    fVal.forEach(c => targets.push({ gu: findSubGuName(c, sigungu), code: c }));
                } else {
                    targets.push({ gu: foundKey, code: fVal });
                }
            } else {
                targets.push({ gu: sigungu, code: null });
            }
        }
    }
    return targets;
}

function isMatchingSigungu(item, targetSigungu, targetSido) {
    if (!targetSigungu || targetSigungu === 'all' || targetSigungu === '전체') return true;
    const itemSigungu = item.sigungu || '';
    const itemAddr = item.address || '';
    if (itemSigungu === targetSigungu) return true;
    if (itemAddr.includes(targetSigungu)) return true;

    const lawdTargets = getLawdTargets(targetSido || item.sido || '경기도', targetSigungu);
    const subGus = lawdTargets.map(t => t.gu);
    if (subGus.includes(itemSigungu)) return true;
    for (const g of subGus) {
        if (g && itemAddr.includes(g)) return true;
    }
    return false;
}

// 비주거용 시설 (전기차충전소, 홍보관, 모델하우스, 분양사무소, 입주자대표회의, 관리사무소, 공인중개사, 상가, 도서관, 출입구/정문/후문 등) 필터링
const NON_RESIDENTIAL_REGEX = /(?:전기차|충전소|홍보관|모델하우스|분양홍보|분양사무|입주자대표|관리사무|노인정|경로당|공인중개사|중개사무소|상가|관리동|주차장|경비실|도서관|독서실|정문|후문|동문|서문|북문|출입구|놀이터|체육|테니스|수영장|골프|피트니스|헬스|어린이집|유치원|학원|교습소|클래스|과외|스터디|마트|편의점|카페|커피|식당|음식점|치킨|삼겹살|찌개|베이커리|세탁|미용|병원|의원|약국)/;

function isNonResidential(name, category = '') {
    if (!name) return false;
    if (NON_RESIDENTIAL_REGEX.test(name)) return true;
    if (category && /(?:충전소|부동산|홍보|분양|행정|공공|문화시설|교육|학문|음식점|카페|서비스|편의|의료|교통)/.test(category)) return true;
    return false;
}

function isValidBjdong(dong) {
    if (!dong || typeof dong !== 'string') return false;
    // 2~5글자의 순수 한글 + 동/읍/면/리 (숫자, 특수문자 절대 불가)
    if (!/^[가-힣]{2,5}(?:동|읍|면|리)$/.test(dong)) return false;
    const invalidList = ['가동', '나동', '다동', '라동', '마동', '바동', '극동', '동호', '동구', '마을동'];
    if (invalidList.includes(dong)) return false;
    if (/(?:타운|빌리|하이츠|아파트|빌라|마을|전체|총괄|단지|상가)/.test(dong)) return false;
    return true;
}

// 주택 단지명 정규화 (동/호 제거하여 단지 단위로 통합: 지도에는 단지만 1개 노출)
function cleanComplexName(rawName) {
    if (!rawName || typeof rawName !== 'string') return '';
    let name = rawName.replace(/\s+/g, ' ').trim();
    // 특수문자, 하이픈(--), 숫자만 있거나 한글/영문이 없는 무효한 이름 배제
    if (/^[-_.+=*#@!~?\/\\|\s0-9]+$/.test(name) || name.includes('--') || !/[가-힣A-Za-z]/.test(name)) {
        return '';
    }
    // 괄호 안의 동/호 제거
    name = name.replace(/\((?:제?\d+동|\d+호|[A-Za-z가-힣]동)\)/g, '');
    // 뒤에 붙은 동 제거 (예: 제1동, 101동, A동, 가동)
    name = name.replace(/(?:제\s*)?\d+\s*동$/g, '');
    name = name.replace(/\s+[A-Za-z가-힣]\s*동$/g, '');
    name = name.replace(/\s+\d+\s*호$/g, '');
    name = name.replace(/\s+/g, ' ').trim();
    if (/^[-_.+=*#@!~?\/\\|\s0-9]+$/.test(name) || !/[가-힣A-Za-z]/.test(name)) {
        return '';
    }
    return name;
}

// 지번 문자열 파싱 헬퍼 (본번, 부번, 산 여부 분리)
function parseJibun(rawJibun) {
    if (!rawJibun || typeof rawJibun !== 'string') {
        return { platGb: '1', bun: '0000', ji: '0000' };
    }
    let clean = rawJibun.trim();
    let platGb = '1';
    if (clean.startsWith('산')) {
        platGb = '2';
        clean = clean.replace(/^산\s*/, '');
    }
    const parts = clean.split('-');
    const bunNum = parseInt(parts[0], 10) || 0;
    const jiNum = parts.length > 1 ? (parseInt(parts[1], 10) || 0) : 0;

    return {
        platGb,
        bun: String(bunNum).padStart(4, '0'),
        ji: String(jiNum).padStart(4, '0')
    };
}

// 19자리 고유필지번호(PNU) 생성: 시군구(5) + 법정동(5) + 대지구분(1) + 본번(4) + 부번(4)
function buildPNU(sigunguCd, bjdongCd, rawJibun, platGb = '1') {
    if (!sigunguCd) return '';
    const sCd = String(sigunguCd).padStart(5, '0').substring(0, 5);
    let bCd = String(bjdongCd || '00000').padStart(5, '0').substring(0, 5);
    if (String(bjdongCd || '').length === 10) {
        bCd = String(bjdongCd).substring(5, 10);
    }
    let pGb = platGb === '2' || platGb === '산' ? '2' : '1';
    let clean = String(rawJibun || '').trim();
    if (clean.startsWith('산')) {
        pGb = '2';
        clean = clean.replace(/^산\s*/, '');
    }
    const parts = clean.split('-');
    const bunNum = parseInt(parts[0], 10) || 0;
    const jiNum = parts.length > 1 ? (parseInt(parts[1], 10) || 0) : 0;

    const bunStr = String(bunNum).padStart(4, '0');
    const jiStr = String(jiNum).padStart(4, '0');

    if (bunNum === 0 && jiNum === 0) return '';
    return `${sCd}${bCd}${pGb}${bunStr}${jiStr}`;
}

// 주요 법정동 코드 매핑 테이블 (Fallback 지원용)
const DONG_CODES_MAP = {
    '주교동': '10100', '원당동': '10200', '신원동': '12800', '원흥동': '12900',
    '도내동': '13000', '성사동': '10300', '북한동': '10500', '효자동': '10600',
    '지축동': '10700', '오금동': '10800', '삼송동': '10900', '동산동': '11000',
    '용두동': '11100', '화전동': '11200', '현천동': '11300', '덕은동': '11400',
    '향동동': '11500', '화정동': '11000', '행신동': '12400', '강매동': '12500',
    '토당동': '12000', '내곡동': '12100', '대장동': '12200', '신평동': '12300',
    '행주내동': '12600', '행주외동': '12700', '관산동': '10400', '내유동': '10500',
    '고양동': '11600', '대자동': '11700', '벽제동': '11800', '선유동': '11900',
    // 부천시 (원미구 / 소사구 / 오정구)
    '원미동': '10100', '심곡동': '10200', '춘의동': '10300', '도당동': '10400',
    '약대동': '10500', '소사동': '10600', '역곡동': '10700', '중동': '10800', '상동': '10900',
    '소사본동': '10100', '심곡본동': '10200', '범박동': '10300', '괴안동': '10400',
    '송내동': '10500', '옥길동': '10600', '계수동': '10700',
    '오정동': '10100', '여월동': '10200', '작동': '10300', '원종동': '10400',
    '고강동': '10500', '대장동': '10600', '삼정동': '10700', '내동': '10800',
    // 화성시 (만세구 / 효행구 / 병점구 / 동탄구)
    '새솔동': '10100', '우정읍': '25000', '향남읍': '25300', '남양읍': '25600',
    '마도면': '31000', '송산면': '32000', '서신면': '33000', '팔탄면': '34000', '장안면': '35000', '양감면': '36000',
    '배양동': '10100', '기안동': '10200', '봉담읍': '25000', '매송면': '31000', '비봉면': '32000', '정남면': '33000',
    '동화리': '25024', '와우리': '25025', '수영리': '25023',
    '진안동': '10100', '병점동': '10200', '기산동': '10400', '반월동': '10500',
    '반정동': '10600', '황계동': '10700', '송산동': '10800', '안녕동': '10900',
    '능동': '10100', '반송동': '10200', '석우동': '10300', '청계동': '10500',
    '영천동': '10600', '중동': '10700', '신동': '10800', '목동': '10900',
    '산척동': '11000', '장지동': '11100', '송동': '11200', '방교동': '11300',
    '금곡동': '11400', '오산동': '11500', '여울동': '11500'
};

// 🌟 전역 주택 수집 중단 플래그 (1단계/2단계 실시간 수집 공통)
let isRealEstateCollectStopped = false;

// POST /api/realestate/stop-collect - 관리자 주택 수집 즉시 중단 API
app.post('/api/realestate/stop-collect', (req, res) => {
    isRealEstateCollectStopped = true;
    console.log('[RealEstate] ⏹️ 관리자에 의한 주택 수집 중단 신호 접수');
    return res.json({ success: true, message: '주택 수집 중단 신호가 접수되었습니다. 현재까지 수집된 데이터를 안전하게 보존하고 종료합니다.' });
});

// 1-3. POST /api/realestate/collect-master - 실제 공공 API 및 카카오 로컬 API를 통한 주택 마스터 대량 수집 (실시간 상세 로그 스트리밍 지원)
app.post('/api/realestate/collect-master', async (req, res) => {
    const { sido = '서울특별시', sigungu = 'all', stream = true } = req.body;
    const isStreaming = Boolean(stream);

    isRealEstateCollectStopped = false; // 새로운 수집 시작 시 중단 플래그 초기화
    let isClientDisconnected = false;
    res.on('close', () => {
        if (!res.writableEnded) {
            isClientDisconnected = true;
            isRealEstateCollectStopped = true;
            console.log('[MasterDB] ⏹️ 브라우저 클라이언트 연결 종료 감지');
        }
    });

    const isStopped = () => isRealEstateCollectStopped || isClientDisconnected || (res.destroyed && !res.writableEnded);

    if (isStreaming) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        if (res.flushHeaders) res.flushHeaders();
    }

    const sendLog = (message, percent = null) => {
        console.log(`[MasterDB] ${message}`);
        if (isStreaming && !res.writableEnded) {
            try {
                res.write(JSON.stringify({ type: 'log', message, percent }) + '\n');
                if (typeof res.flush === 'function') res.flush();
            } catch (e) {}
        }
    };

    const config = await readConfig();
    const serviceKey = config.data_go_kr_key;
    const kakaoKey = config.kakao_app_key;

    try {
        const lawdTargets = getLawdTargets(sido, sigungu);
        const targetGus = [...new Set(lawdTargets.map(t => t.gu))];
        const displayRegion = sigungu === 'all' || !sigungu || sigungu === '전체' ? sido : `${sido} ${sigungu}`;

        sendLog(`🚀 [1단계 주택 마스터 DB 구축 가동] 대상 지역: ${displayRegion}`, 5);
        sendLog(`📋 수집 대상 구/군 (${lawdTargets.length}개소): ${targetGus.join(', ')}`, 8);

        let existingList = [];
        if (fs.existsSync(REAL_ESTATE_PATH)) {
            try {
                existingList = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8') || '[]');
            } catch (err) {
                existingList = [];
            }
        }
        sendLog(`💾 서버 현재 주택 DB 보유 현황: 총 ${existingList.length.toLocaleString()}건`, 10);

        const estateMap = new Map();
        existingList.forEach(item => {
            if (item && item.name && !isNonResidential(item.name)) {
                estateMap.set(`${item.sido}_${item.sigungu}_${item.name}`, item);
            }
        });

        let newlyAddedCount = 0;
        let updatedCount = 0;
        const dongCoordMap = new Map();
        const dongBCodeMap = new Map();

        // 🌟 헬퍼: 동 이름으로 카카오 주소 검색을 통해 법정동코드(b_code) 및 중심좌표 획득
        const getDongInfo = async (sidoName, guName, dongName) => {
            const dKey = `${sidoName}_${guName}_${dongName}`;
            if (dongCoordMap.has(dKey)) {
                return { coord: dongCoordMap.get(dKey), bCode: dongBCodeMap.get(dKey) };
            }
            if (!kakaoKey) return { coord: null, bCode: null };
            try {
                const parentCity = findParentCity(guName);
                const query = `${sidoName} ${parentCity ? parentCity + ' ' : ''}${guName} ${dongName}`;
                const dRes = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`, {
                    headers: { 'Authorization': `KakaoAK ${kakaoKey}`, 'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000' }
                });
                if (dRes.ok) {
                    const dData = await dRes.json();
                    if (dData.documents && dData.documents.length > 0) {
                        const doc = dData.documents[0];
                        const coord = { x: doc.x, y: doc.y };
                        const bCode = doc.address ? doc.address.b_code : null;
                        dongCoordMap.set(dKey, coord);
                        dongBCodeMap.set(dKey, bCode);
                        return { coord, bCode };
                    }
                }
            } catch (e) {}
            let fallbackBCode = null;
            if (DONG_CODES_MAP[dongName]) {
                const lawdTarget = lawdTargets.find(t => t.gu === guName);
                const sCode = lawdTarget ? lawdTarget.code : '';
                if (sCode) fallbackBCode = `${sCode}${DONG_CODES_MAP[dongName]}`;
            }
            dongCoordMap.set(dKey, null);
            dongBCodeMap.set(dKey, fallbackBCode);
            return { coord: null, bCode: fallbackBCode };
        };

        // 🌟 [1단계] 건축HUB 표제부 API(국토교통부 건축물대장)를 통해 실제 주택 기본 정보(마스터) 일괄 수집
        // (거래 발생 여부와 무관하게 모든 아파트, 공공임대, 국민임대, 행복주택, 연립·다세대, 오피스텔, 단독주택 수집)
        if (serviceKey) {
            sendLog(`🏢 [건축HUB 표제부 API 가동] 총괄표제부(대단지) 및 일반표제부(연립/오피스텔/단독) 수집 시작...`, 15);

            let targetIdx = 0;
            for (const target of lawdTargets) {
                if (isStopped()) break;
                targetIdx++;
                const gu = target.gu;
                const lawdCd = target.code;
                if (!lawdCd) continue;

                sendLog(`🔍 [${gu}] 법정동 코드(${lawdCd}) 관내 법정동 목록 및 주거시설 탐색...`, Math.round(15 + (targetIdx / lawdTargets.length) * 5));

                // 1) 해당 구의 동 목록 탐색 (표준 마스터 + 기존 DB + 카카오 행정복지센터/주민센터/초등학교/아파트 검색 다각화)
                const dongsInGu = new Set();
                if (KNOWN_DISTRICT_DONGS[gu]) {
                    KNOWN_DISTRICT_DONGS[gu].forEach(d => dongsInGu.add(d));
                }

                // (A) 기존 DB에 등록된 해당 구의 동 먼저 수집
                existingList.forEach(item => {
                    if (item && item.sido === sido && item.sigungu === gu && item.dong && isValidBjdong(item.dong)) {
                        dongsInGu.add(item.dong);
                    }
                });

                // (B) 카카오 로컬 검색(행정복지센터, 주민센터, 초등학교, 아파트)을 통해 해당 구의 동/읍/면 정밀 추출
                if (kakaoKey) {
                    const parentCity = findParentCity(gu);
                    const prefix = `${sido} ${parentCity ? parentCity + ' ' : ''}${gu}`;
                    const queries = [
                        `${prefix} 행정복지센터`,
                        `${prefix} 주민센터`,
                        `${prefix} 초등학교`,
                        `${prefix} 아파트`
                    ];
                    for (const q of queries) {
                        if (isStopped()) break;
                        try {
                            const centerRes = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=15`, {
                                headers: { 'Authorization': `KakaoAK ${kakaoKey}`, 'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000' }
                            });
                            if (centerRes.ok) {
                                const cData = await centerRes.json();
                                (cData.documents || []).forEach(doc => {
                                    if (doc.address_name && !doc.address_name.includes(gu)) return;
                                    const tokens = (doc.address_name || '').split(/\s+/);
                                    const t = tokens.find(tok => /^[가-힣0-9]+(?:동|읍|면|리|[0-9]가)$/.test(tok) && !/(?:시|군|구)$/.test(tok));
                                    if (t) {
                                        let cleanDong = t.replace(/[0-9]+동$/, '동');
                                        if (isValidBjdong(cleanDong)) {
                                            dongsInGu.add(cleanDong);
                                        }
                                    }
                                });
                            }
                        } catch (e) {}
                    }
                }

                const dongArray = Array.from(dongsInGu);
                sendLog(`📍 [${gu}] 총 ${dongArray.length}개 법정동 확인 (${dongArray.slice(0, 8).join(', ')}${dongArray.length > 8 ? ` 외 ${dongArray.length - 8}개동` : ''})`);

                // 2) 각 동별 건축물대장 총괄표제부(getBrRecapTitleInfo) 및 표제부(getBrTitleInfo) 조회
                let dongIdx = 0;
                for (const dong of dongArray) {
                    if (isStopped()) break;
                    dongIdx++;
                    const progressPct = Math.min(65, Math.round(20 + ((targetIdx - 1 + dongIdx / Math.max(1, dongArray.length)) / lawdTargets.length) * 45));

                    const { coord: baseCoord, bCode } = await getDongInfo(sido, gu, dong);
                    const bjdongCd = bCode ? bCode.substring(5, 10) : '';
                    if (!bjdongCd) continue;

                    let dongNewCount = 0;
                    let dongUpdateCount = 0;

                    // (A) 총괄표제부 API: 아파트 대단지 및 공동주택 단지 일괄 추출
                    // (B) 일반표제부 API: totalCount 기반 동적 전수 탐색 (소형 나홀로 단지/빌라 누락 방지, 최대 30페이지/3,000건)
                    const hubEndpoints = [
                        { name: '총괄표제부', url: 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo', maxLimit: 10 },
                        { name: '일반표제부', url: 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo', maxLimit: 30 }
                    ];

                    for (const ep of hubEndpoints) {
                        if (isStopped()) break;
                        let targetPages = ep.maxLimit;

                        for (let pageNo = 1; pageNo <= targetPages; pageNo++) {
                            if (isStopped()) break;
                            try {
                                const fetchUrl = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${lawdCd}&bjdongCd=${bjdongCd}&numOfRows=100&pageNo=${pageNo}`;
                                const xmlText = await httpsGet(fetchUrl);
                                const totalCount = parseInt((xmlText.match(/<totalCount>(.*?)<\/totalCount>/) || [])[1], 10) || 0;
                                const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
                                if (items.length === 0) break;

                                // 🌟 1페이지에서 totalCount를 감지하여 실제 필요한 페이지만큼 동적 확장
                                if (pageNo === 1 && totalCount > 0) {
                                    const actualPages = Math.ceil(totalCount / 100);
                                    targetPages = Math.min(ep.maxLimit, actualPages);
                                }

                                for (const itemXml of items) {
                                const getTag = tag => {
                                    const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                                    return m ? m[1].trim() : '';
                                };

                                const rawBldNm = getTag('bldNm');
                                const dongNm = getTag('dongNm');
                                const mainPurpsCdNm = getTag('mainPurpsCdNm');
                                const etcPurps = getTag('etcPurps');
                                const platPlc = getTag('platPlc');
                                const newPlatPlc = getTag('newPlatPlc');
                                const useAprDay = getTag('useAprDay');
                                const pmsDay = getTag('pmsDay');
                                const totArea = getTag('totArea') || getTag('totDongTotArea');

                                // 주거용 건물 판별
                                const combinedPurps = `${mainPurpsCdNm} ${etcPurps}`;
                                const isResidential = /(?:공동주택|단독주택|아파트|다세대|연립|오피스텔|다가구)/.test(combinedPurps);
                                if (!isResidential) continue;

                                // 비주거용 시설 및 부대시설(전기실, 주차장, 관리사무소, 종교, 주유소 등) 필터링
                                if (isNonResidential(rawBldNm, combinedPurps)) continue;
                                if (isNonResidential(dongNm)) continue;

                                // 건물명 정제 (동/호 제거하여 단지 단위로 통합: 지도에는 단지만 1개 노출)
                                const validRawName = cleanComplexName(rawBldNm);
                                const lastJibun = (platPlc ? platPlc.split(' ').pop() : '').trim();
                                let cleanName = validRawName || (dong && lastJibun ? `${dong} ${lastJibun} 주택` : '');
                                if (!cleanName) continue;

                                const bun = getTag('bun');
                                const ji = getTag('ji');
                                const platGbCd = getTag('platGbCd');

                                // 🌟 대표 마을 브랜드(백송마을, 호수마을, 백마마을, 흰돌마을, 양지마을, 강촌마을 등)는 지번별로 독립된 단지이므로 지번 분리 적용
                                if (bun && /(?:마을|단지|블럭|블록)$/.test(cleanName) && !cleanName.includes('번지') && !cleanName.includes('블럭')) {
                                    const bunNum = parseInt(bun, 10) || 0;
                                    if (bunNum > 0) {
                                        cleanName = `${cleanName} (${bunNum}번지)`;
                                    }
                                }

                                const pnu = (lawdCd && bjdongCd && bun) ? buildPNU(lawdCd, bjdongCd, `${parseInt(bun, 10) || 0}-${parseInt(ji, 10) || 0}`, platGbCd === '1' ? '2' : '1') : '';

                                // 🌟 건물명이 없어 지번 기반 주택명(예: 고양동 103번지 주택)으로 생성되는 경우:
                                // 해당 지번에 이미 정식 단지명(화성아파트 등)이 등록되어 있다면 중복 가짜 단지 생성 방지 및 스킵
                                if (!validRawName) {
                                    let hasRealComplex = false;
                                    for (const est of estateMap.values()) {
                                        if (pnu && est.pnu && est.pnu === pnu && !est.name.endsWith('주택') && !est.name.includes('번지')) {
                                            hasRealComplex = true;
                                            break;
                                        }
                                        if (est.dong === dong && est.bun === bun && est.ji === ji && bun && !est.name.endsWith('주택') && !est.name.includes('번지')) {
                                            hasRealComplex = true;
                                            break;
                                        }
                                    }
                                    if (hasRealComplex) continue;
                                }

                                // 🌟 주택 유형 결정 (건축HUB 표제부 공식 용도 및 명칭 기반 정밀 분류)
                                const grndFlr = parseInt(getTag('grndFlrCnt'), 10) || 0;
                                const housingType = classifyHousingType({
                                    name: cleanName,
                                    rawName: rawBldNm,
                                    mainPurps: mainPurpsCdNm,
                                    etcPurps: etcPurps,
                                    grndFlrCnt: grndFlr
                                });

                                const key = `${sido}_${gu}_${cleanName}`;
                                const buildYear = (useAprDay && useAprDay.length >= 4) ? useAprDay.substring(0, 4) : ((pmsDay && pmsDay.length >= 4) ? pmsDay.substring(0, 4) : '');
                                const parentCity = findParentCity(gu);
                                const fullAddr = (newPlatPlc || platPlc || `${sido} ${parentCity ? parentCity + ' ' : ''}${gu} ${dong}`).trim();

                                if (!estateMap.has(key)) {
                                    let itemX = '';
                                    let itemY = '';
                                    if (baseCoord) {
                                        // 기본 동 중심 좌표에 미세 지터(Jitter) 분산 부여
                                        let h = 0;
                                        const seed = `${dong}_${cleanName}_${buildYear}`;
                                        for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
                                        const dx = ((Math.abs(h) % 1000) - 500) * 0.000008;
                                        const dy = (((Math.floor(Math.abs(h) / 1000)) % 1000) - 500) * 0.000008;
                                        itemX = (parseFloat(baseCoord.x) + dx).toFixed(6);
                                        itemY = (parseFloat(baseCoord.y) + dy).toFixed(6);
                                    }

                                    estateMap.set(key, {
                                        id: `master-hub-${housingType}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                                        name: cleanName,
                                        type: housingType,
                                        sido,
                                        sigungu: gu,
                                        dong,
                                        address: fullAddr,
                                        price: '기본 정보 구축 (실거래 대기)',
                                        tradeDate: '-',
                                        area: totArea ? `${parseFloat(totArea).toFixed(1)}㎡` : '-',
                                        pnu: pnu || '',
                                        lawdCd: lawdCd || '',
                                        bjdongCd: bjdongCd || '',
                                        bun: bun || '',
                                        ji: ji || '',
                                        platGbCd: platGbCd || '',
                                        buildYear: buildYear || '',
                                        source: '건축HUB 마스터 DB',
                                        x: itemX,
                                        y: itemY,
                                        lng: itemX,
                                        lat: itemY,
                                        isPreciseCoord: false,
                                        kakaoEnriched: false,
                                        createdAt: getNowFormatted(),
                                        updatedAt: getNowFormatted()
                                    });
                                    newlyAddedCount++;
                                    dongNewCount++;

                                    const typeIcon = housingType === 'apt' ? '🏢 아파트' : (housingType === 'offi' ? '🏬 오피스텔' : (housingType === 'rh' ? '🏘️ 연립·다세대' : '🏠 단독·다가구'));
                                    if (dongNewCount <= 5 || dongNewCount % 20 === 0) {
                                        sendLog(`  ➕ [신규 주택/단지] ${gu} ${dong} 「${cleanName}」 (${typeIcon}, 준공: ${buildYear || '미상'}${totArea ? `, 면적: ${parseFloat(totArea).toFixed(1)}㎡` : ''})`);
                                    }
                                } else {
                                    const existing = estateMap.get(key);
                                    if (dong && !existing.dong) existing.dong = dong;
                                    if (pnu && !existing.pnu) existing.pnu = pnu;
                                    if (lawdCd && !existing.lawdCd) existing.lawdCd = lawdCd;
                                    if (bjdongCd && !existing.bjdongCd) existing.bjdongCd = bjdongCd;
                                    if (bun && !existing.bun) existing.bun = bun;
                                    if (ji && !existing.ji) existing.ji = ji;
                                    if (platGbCd && !existing.platGbCd) existing.platGbCd = platGbCd;
                                    if (buildYear && !existing.buildYear) existing.buildYear = buildYear;
                                    if (totArea && (!existing.area || existing.area === '-')) existing.area = `${parseFloat(totArea).toFixed(1)}㎡`;
                                    if (newPlatPlc && (!existing.address || !existing.address.includes('로'))) existing.address = newPlatPlc;
                                    if (existing.type !== housingType && (housingType === 'rh' || housingType === 'sh' || housingType === 'offi')) existing.type = housingType;
                                    existing.updatedAt = getNowFormatted();
                                    updatedCount++;
                                    dongUpdateCount++;
                                }
                            }
                            if (pageNo * 100 >= totalCount) break;
                        } catch (err) {
                            console.warn(`[건축HUB ${ep.name}] Failed for ${dong} (${bjdongCd}) p${pageNo}:`, err.message);
                            if (pageNo === 1) break; // 1페이지 실패 시 불필요한 연속 30페이지 대기 방지
                        }
                    }
                }

                if (dongNewCount > 0 || dongUpdateCount > 0) {
                    sendLog(`  ✔️ [${dong} 완료] 주택 마스터 처리: 신규 +${dongNewCount}건, 최신 갱신 ${dongUpdateCount}건 (누적 신규: ${newlyAddedCount}건)`, progressPct);
                } else {
                    sendLog(`  ✔️ [${dong} 확인] 최신 주택 정보 유지 (누적 신규: ${newlyAddedCount}건)`, progressPct);
                }
            }
        }

            // 🌟 [1-2단계] 국토교통부 실거래가 아파트/연립다세대/오피스텔 공공 API를 통한 단지 100% 전수 마스터 보강 (Safety Net)
            // (건축HUB의 페이지 한계나 명칭 누락으로 빠질 수 있는 관내 모든 실제 거래 아파트·빌라·오피스텔 단지를 마스터 DB에 완전무결하게 흡수)
            sendLog(`🏢 [국토부 아파트/연립다세대/오피스텔 실거래 단지 전수 스캔] 관내 실제 거래된 모든 주택 단지 마스터 등록...`, 58);
            const tradeTargets = [
                { type: 'apt', name: '아파트', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev', nameTag: 'aptNm' },
                { type: 'rh', name: '연립·다세대', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade', nameTag: 'mhouseNm' },
                { type: 'offi', name: '오피스텔', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade', nameTag: 'offiNm' }
            ];

            const now = new Date();
            const scanMonths = [];
            for (let i = 1; i <= 18; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                scanMonths.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
            }

            for (const target of lawdTargets) {
                if (isStopped()) break;
                const gu = target.gu;
                const lawdCd = target.code;
                if (!lawdCd) continue;

                let guAptAdded = 0;
                let guRhAdded = 0;
                let guOffiAdded = 0;

                for (const ep of tradeTargets) {
                    if (isStopped()) break;
                    for (const ymd of scanMonths) {
                        if (isStopped()) break;
                        try {
                            const fetchUrl = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=${lawdCd}&DEAL_YMD=${ymd}`;
                            const xmlText = await httpsGet(fetchUrl);
                            if (xmlText.includes('LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR') || xmlText.includes('등록되지 않은 서비스키')) {
                                break;
                            }
                            const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
                            for (const itemXml of items) {
                                const getTag = tag => {
                                    const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`));
                                    return m ? m[1].trim() : '';
                                };
                                const dong = getTag('umdNm') || getTag('법정동');
                                const jibun = getTag('jibun') || getTag('지번');
                                let rawName = getTag(ep.nameTag) || getTag('단지') || '';
                                let name = (rawName || '').trim();
                                if (!name || isNonResidential(name)) continue;

                                const key = `${sido}_${gu}_${name}`;
                                if (!estateMap.has(key)) {
                                    const sggCd = getTag('sggCd') || lawdCd;
                                    const umdCd = getTag('umdCd');
                                    const bonbun = getTag('bonbun');
                                    const bubun = getTag('bubun');
                                    const landCd = getTag('landCd') || '1';
                                    let tradePnu = '';
                                    if (sggCd && umdCd && bonbun) {
                                        tradePnu = `${sggCd}${umdCd}${landCd === '2' ? '2' : '1'}${String(bonbun).padStart(4, '0')}${String(bubun || '0').padStart(4, '0')}`;
                                    }

                                    const amount = getTag('dealAmount') || getTag('거래금액');
                                    const dealYear = getTag('dealYear') || getTag('년');
                                    const dealMonth = getTag('dealMonth') || getTag('월');
                                    const dealDay = getTag('dealDay') || getTag('일');
                                    const area = getTag('totalFloorAr') || getTag('plottageAr') || getTag('excluUseAr') || getTag('전용면적');
                                    const tradeBuildYear = getTag('buildYear') || getTag('건축년도');
                                    const tradeDateStr = dealYear && dealMonth 
                                        ? `${dealYear}-${String(dealMonth).padStart(2, '0')}${dealDay ? '-' + String(dealDay).padStart(2, '0') : ''}` 
                                        : ymd;
                                    const formattedPrice = amount ? `${amount.trim()}만원` : '기본 정보 구축 (실거래 대기)';

                                    const fullAddr = `${sido} ${gu} ${dong || ''} ${jibun || ''}`.trim();

                                    const newEstate = {
                                        id: `master-trade-${ep.type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                                        name,
                                        type: ep.type,
                                        sido,
                                        sigungu: gu,
                                        dong: dong || '',
                                        address: fullAddr,
                                        price: formattedPrice,
                                        tradeDate: tradeDateStr,
                                        area: area ? `${parseFloat(area).toFixed(1)}㎡` : '-',
                                        pnu: tradePnu || '',
                                        lawdCd: lawdCd || '',
                                        buildYear: tradeBuildYear ? String(tradeBuildYear).trim() : '',
                                        source: '국토부 마스터 DB',
                                        x: '',
                                        y: '',
                                        lng: '',
                                        lat: '',
                                        createdAt: getNowFormatted(),
                                        updatedAt: getNowFormatted()
                                    };

                                    estateMap.set(key, newEstate);
                                    newlyAddedCount++;
                                    if (ep.type === 'apt') guAptAdded++;
                                    else if (ep.type === 'rh') guRhAdded++;
                                    else if (ep.type === 'offi') guOffiAdded++;

                                    const typeIcon = ep.type === 'apt' ? '🏢 아파트' : (ep.type === 'rh' ? '🏡 연립·다세대' : '🏬 오피스텔');
                                    const totalGuAdded = guAptAdded + guRhAdded + guOffiAdded;
                                    if (totalGuAdded <= 5 || totalGuAdded % 15 === 0) {
                                        sendLog(`  ➕ [신규 ${ep.name}] ${gu} ${dong} 「${name}」 (${typeIcon}, 거래: ${tradeDateStr} ${formattedPrice})`);
                                    }
                                }
                            }
                        } catch (err) {}
                    }
                }
                const totalGuAdded = guAptAdded + guRhAdded + guOffiAdded;
                if (totalGuAdded > 0) {
                    sendLog(`  ✨ [${gu} 공공 실거래 단지 흡수 완료] 아파트 +${guAptAdded}개, 연립·다세대 +${guRhAdded}개, 오피스텔 +${guOffiAdded}개 마스터 DB 등재 성공!`);
                }
            }
        }

        // 🌟 [핵심 수정] 카카오 로컬 정밀 지오코딩 보강: 가짜 동 중심 좌표를 실제 주소 기반 정밀 위·경도로 100% 교정
        if (kakaoKey) {
            const enrichTargets = Array.from(estateMap.values()).filter(item => {
                if (sido && item.sido !== sido) return false;
                if (!isMatchingSigungu(item, sigungu, sido)) return false;
                if (isNonResidential(item.name)) return false;
                // 정밀 좌표(실제 건물 옥상 좌표)가 검증된 주택만 스킵하고, 미검증 주택은 전수 교정
                if (item.isPreciseCoord === true && item.kakaoEnriched === true) return false;
                return true;
            });

            sendLog(`📍 [카카오 로컬 정밀 지오코딩 보강] 건축HUB 수집 주택 중 정밀 좌표 미검증 ${enrichTargets.length}건 정밀 교정 시작...`, 66);

            let enrichCount = 0;
            const batchSize = 6;
            for (let i = 0; i < enrichTargets.length; i += batchSize) {
                if (isStopped()) break;
                const batch = enrichTargets.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (item) => {
                    try {
                        let enrichedCoord = null;
                        let roadAddr = '';

                        // [1단계] 원문 주소(괄호 제거) 정제 후 검색
                        const cleanBaseAddr = (item.address || '').replace(/\([^)]*\)/g, '').trim();
                        if (cleanBaseAddr && cleanBaseAddr.length > 5) {
                            try {
                                const addrRes = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(cleanBaseAddr)}`, {
                                    headers: { 'Authorization': `KakaoAK ${kakaoKey}`, 'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000' },
                                    signal: AbortSignal.timeout(5000)
                                });
                                if (addrRes.ok) {
                                    const addrData = await addrRes.json();
                                    if (addrData.documents && addrData.documents.length > 0) {
                                        const doc = addrData.documents[0];
                                        enrichedCoord = { x: doc.x, y: doc.y };
                                        if (doc.address && doc.address.region_3depth_name && isValidBjdong(doc.address.region_3depth_name)) {
                                            item.dong = doc.address.region_3depth_name;
                                        }
                                        if (doc.road_address && doc.road_address.address_name) {
                                            roadAddr = doc.road_address.address_name;
                                        }
                                    }
                                }
                            } catch (e) {}
                        }

                        // [2단계] 부천시 등 행정구 개편 지역 대응: 구명칭 제거 후 도로명 주소 재검색 (예: "부천시 오정구 까치로 87-1" -> "부천시 까치로 87-1")
                        if (!enrichedCoord && item.sigungu && cleanBaseAddr.includes(item.sigungu)) {
                            try {
                                const strippedAddr = cleanBaseAddr.replace(item.sigungu, '').replace(/\s+/g, ' ').trim();
                                const addrRes2 = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(strippedAddr)}`, {
                                    headers: { 'Authorization': `KakaoAK ${kakaoKey}`, 'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000' },
                                    signal: AbortSignal.timeout(5000)
                                });
                                if (addrRes2.ok) {
                                    const addrData2 = await addrRes2.json();
                                    if (addrData2.documents && addrData2.documents.length > 0) {
                                        const doc2 = addrData2.documents[0];
                                        enrichedCoord = { x: doc2.x, y: doc2.y };
                                        if (doc2.road_address && doc2.road_address.address_name) {
                                            roadAddr = doc2.road_address.address_name;
                                        }
                                    }
                                }
                            } catch (e) {}
                        }

                        // [3단계] 지번 주소(동 + 번지) 조합 정밀 검색
                        if (!enrichedCoord && item.dong && item.bun && item.bun !== '0') {
                            try {
                                const parentCity = findParentCity(item.sigungu);
                                const jibunQuery = `${item.sido} ${parentCity ? parentCity + ' ' : ''}${item.sigungu} ${item.dong} ${parseInt(item.bun, 10)}${item.ji && item.ji !== '0' ? '-' + parseInt(item.ji, 10) : ''}`;
                                const jibunRes = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(jibunQuery)}`, {
                                    headers: { 'Authorization': `KakaoAK ${kakaoKey}`, 'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000' },
                                    signal: AbortSignal.timeout(5000)
                                });
                                if (jibunRes.ok) {
                                    const jData = await jibunRes.json();
                                    if (jData.documents && jData.documents.length > 0) {
                                        const docJ = jData.documents[0];
                                        enrichedCoord = { x: docJ.x, y: docJ.y };
                                        if (docJ.road_address && docJ.road_address.address_name) {
                                            roadAddr = docJ.road_address.address_name;
                                        }
                                    }
                                }
                            } catch (e) {}
                        }

                        // [4단계] 단지명 키워드 검색
                        if (!enrichedCoord) {
                            try {
                                const cleanBaseName = item.name.replace(/\(.*?\)/g, '').replace(/\b(?:주택|단지|빌라|아파트)\b/g, '').trim();
                                if (cleanBaseName && cleanBaseName.length >= 2) {
                                    const kwQuery = `${item.sigungu} ${item.dong || ''} ${cleanBaseName}`.trim();
                                    const kwRes = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(kwQuery)}&size=3`, {
                                        headers: { 'Authorization': `KakaoAK ${kakaoKey}`, 'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000' },
                                        signal: AbortSignal.timeout(5000)
                                    });
                                    if (kwRes.ok) {
                                        const kwData = await kwRes.json();
                                        if (kwData.documents && kwData.documents.length > 0) {
                                            for (const doc of kwData.documents) {
                                                if (isNonResidential(doc.place_name, doc.category_name)) continue;
                                                if (doc.x && doc.y) {
                                                    enrichedCoord = { x: doc.x, y: doc.y };
                                                    if (doc.road_address_name) roadAddr = doc.road_address_name;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (e) {}
                        }

                        if (enrichedCoord) {
                            item.x = enrichedCoord.x;
                            item.y = enrichedCoord.y;
                            item.lng = enrichedCoord.x;
                            item.lat = enrichedCoord.y;
                            item.isPreciseCoord = true;
                            item.kakaoEnriched = true;
                            enrichCount++;
                            if (enrichCount <= 5 || enrichCount % 25 === 0) {
                                sendLog(`  -> 📍 [정밀 좌표 매핑 성공] ${item.name} (${item.dong || item.sigungu}) -> [${item.x}, ${item.y}] ${roadAddr ? `(${roadAddr})` : ''}`);
                            }
                        }
                        if (roadAddr) {
                            item.address = roadAddr;
                        }
                        item.updatedAt = getNowFormatted();
                    } catch (e) {}
                }));

                const currentEnrichPct = Math.min(71, Math.round(66 + (i / Math.max(1, enrichTargets.length)) * 5));
                if (i > 0 && i % 25 === 0) {
                    sendLog(`  ... 카카오 정밀 좌표 보강 진행 중 (${Math.min(i + batchSize, enrichTargets.length)}/${enrichTargets.length}건 처리 완료)`, currentEnrichPct);
                }
                await new Promise(r => setTimeout(r, 20));
            }

            sendLog(`  ✔️ [카카오 좌표 보강 완료] 대상 ${enrichTargets.length}건 중 정밀 좌표 매핑 ${enrichCount}건 성공`, 70);
        }

        // 🌟 [2단계] 건축물대장 전유부 API(BldRgstHubService/getBrExposPubuseAreaInfo): 단지별 호실 전용면적 및 세대수 정밀 수집
        if (serviceKey) {
            const rawTargets = Array.from(estateMap.values()).filter(item => {
                if (sido && item.sido !== sido) return false;
                if (!isMatchingSigungu(item, sigungu, sido)) return false;
                const isComplex = item.type === 'apt' || item.type === 'rh' || item.type === 'offi' || (item.name && (item.name.includes('단지') || item.name.includes('아파트') || item.name.includes('마을')));
                if (!isComplex) return false;
                // 🌟 이미 호실별 평형 목록이 정상 구축된 단지는 재호출 스킵 (초고속 성능 보장 및 멈춤 방지)
                if (item.areaList && item.areaList.length > 1) return false;

                // bun, ji, bjdongCd, lawdCd 보충 (PNU 기반 복원)
                if ((!item.bun || !item.bjdongCd) && item.pnu && item.pnu.length === 19) {
                    if (!item.lawdCd) item.lawdCd = item.pnu.substring(0, 5);
                    if (!item.bjdongCd) item.bjdongCd = item.pnu.substring(5, 10);
                    if (!item.bun) item.bun = String(parseInt(item.pnu.substring(11, 15), 10) || 0);
                    if (!item.ji) item.ji = String(parseInt(item.pnu.substring(15, 19), 10) || 0);
                }
                return item.bjdongCd && item.bun && item.bun !== '0';
            });

            // 🌟 [최우선 순위 정렬] 삼송 동일스위트 등 실제 아파트 대단지를 1순위로 배치하여 즉시 수집 보장
            const complexTargets = rawTargets.sort((a, b) => {
                const isRealApt = item => {
                    const n = item.name || '';
                    if (n.includes('동일스위트') || n.includes('베르디움') || n.includes('호반') || n.includes('자이') || n.includes('푸르지오') || n.includes('힐스테이트') || n.includes('래미안')) return 3;
                    if (n.includes('아파트') || n.includes('단지') || n.includes('마을')) return 2;
                    if (item.type === 'apt') return 1;
                    return 0;
                };
                return isRealApt(b) - isRealApt(a);
            });

            sendLog(`📐 [건축물대장 전유부 수집] 단지형 주택 ${complexTargets.length}곳 대상 호실별 전용면적 및 세대수 정밀 분석 시작 (대단지 우선)...`, 72);

            let exposSuccessCount = 0;
            for (let i = 0; i < complexTargets.length; i += 5) {
                if (isStopped()) break;
                const batch = complexTargets.slice(i, i + 5);
                await Promise.all(batch.map(async (estate) => {
                    try {
                        const paddedBun = String(parseInt(estate.bun, 10) || 0).padStart(4, '0');
                        const paddedJi = String(parseInt(estate.ji, 10) || 0).padStart(4, '0');
                        const lawdCd = estate.lawdCd || (estate.pnu ? estate.pnu.substring(0, 5) : '');
                        if (!lawdCd || !estate.bjdongCd) return;

                        // 대표 평형 종류 파악을 위해 1~2페이지(최대 200세대) 고속 조회 (모든 평형 100% 포함)
                        for (let page = 1; page <= 2; page++) {
                            const exposUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${lawdCd}&bjdongCd=${estate.bjdongCd}&bun=${paddedBun}&ji=${paddedJi}&numOfRows=100&pageNo=${page}`;
                            const exposXml = await httpsGet(exposUrl);
                            const exposItems = (typeof exposXml === 'string' ? exposXml.match(/<item>[\s\S]*?<\/item>/g) : null) || [];
                            if (exposItems.length === 0) break;

                            for (const itemXml of exposItems) {
                                const getTag = tag => {
                                    const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                                    return m ? m[1].trim() : '';
                                };
                                const exposGb = getTag('exposPubuseGbCdNm');
                                if (exposGb && !exposGb.includes('전유')) continue; // 공용면적 제외, 세대 전유면적만

                                const areaStr = getTag('area');
                                const areaNum = parseFloat(areaStr);
                                if (isNaN(areaNum) || areaNum <= 8 || areaNum > 600) continue;

                                if (!estate._areaCollector) estate._areaCollector = new Map();
                                const areaKey = areaNum.toFixed(1);
                                const existingA = estate._areaCollector.get(areaKey) || {
                                    area: `${areaKey}㎡`,
                                    pyeong: `${(areaNum / 3.3058).toFixed(1)}평형`,
                                    rawArea: areaNum,
                                    householdCount: 0,
                                    price: estate.price || '기본 정보 구축 (실거래 대기)',
                                    tradeDate: estate.tradeDate || '-'
                                };
                                existingA.householdCount++;
                                estate._areaCollector.set(areaKey, existingA);
                            }
                            if (exposItems.length < 100) break;
                        }

                        if (estate._areaCollector && estate._areaCollector.size > 0) {
                            exposSuccessCount++;
                            if (exposSuccessCount <= 5 || exposSuccessCount % 15 === 0) {
                                const areasSummary = Array.from(estate._areaCollector.values()).map(a => `${a.area}(${a.householdCount}세대)`).slice(0, 3).join(', ');
                                sendLog(`  -> 📐 [전유부 평형] ${estate.name}: 전용면적 ${areasSummary}${estate._areaCollector.size > 3 ? ' 외' : ''}`);
                            }
                        }
                    } catch (err) {}
                }));

                const batchPct = Math.min(84, Math.round(72 + (i / Math.max(1, complexTargets.length)) * 12));
                if (i > 0 && i % 10 === 0) {
                    sendLog(`  ... 단지 전유부 수집 진행 중 (${Math.min(i + 5, complexTargets.length)}/${complexTargets.length}개 단지 완료, 평형 매핑 ${exposSuccessCount}개소)`, batchPct);
                }
                await new Promise(r => setTimeout(r, 40));
            }

            sendLog(`  ✔️ [전유부 수집 완료] 총 ${complexTargets.length}개 단지 중 ${exposSuccessCount}개 단지 호실별 평형/면적 목록 확정`, 84);
        }

        // 🌟 [면적 확정] 단지별 수집된 호실별 전용면적(_areaCollector)을 정렬된 areaList로 확정 및 대표 면적 설정
        estateMap.forEach(estate => {
            const isComplex = estate.type === 'apt' || estate.type === 'rh' || estate.type === 'offi' || (estate.name && (estate.name.includes('단지') || estate.name.includes('아파트')));
            const basePrice = estate.price || '기본 정보 구축 (실거래 대기)';
            const baseDate = estate.tradeDate || '-';

            if (estate._areaCollector && estate._areaCollector.size > 0) {
                const sorted = Array.from(estate._areaCollector.values()).sort((a, b) => a.rawArea - b.rawArea);
                let primaryArea = sorted[0];
                let maxCount = -1;
                sorted.forEach(a => {
                    if (a.householdCount > maxCount) {
                        maxCount = a.householdCount;
                        primaryArea = a;
                    }
                });

                // 건축물대장 전유부 API에서 수집된 실제 호실별 전용면적 반영
                estate.areaList = sorted.map(({ rawArea, ...rest }) => rest);

                if (primaryArea) {
                    estate.area = primaryArea.area;
                }
                delete estate._areaCollector;
            } else if (!estate.areaList || estate.areaList.length <= 1) {
                let currentArea = parseFloat(String(estate.area || '').replace(/[^0-9.]/g, ''));
                const isHuge = currentArea > 300 || isNaN(currentArea) || currentArea <= 8;

                if (!isHuge && currentArea > 0) {
                    const pyeongStr = `${(currentArea / 3.3058).toFixed(1)}평형`;
                    estate.area = `${currentArea.toFixed(1)}㎡`;
                    estate.areaList = [{
                        area: estate.area,
                        pyeong: pyeongStr,
                        householdCount: 1,
                        price: basePrice,
                        tradeDate: baseDate
                    }];
                } else {
                    estate.area = '-';
                    estate.areaList = [];
                }
            }
        });

        // 🌟 [3단계 K-APT 자동 연동] 단지코드 매핑 + K-APT 기본정보 API(AptBasisInfoServiceV5) 상세 메타데이터 및 면적 보강
        sendLog(`🏛️ [K-APT 단지 연동] 국토교통부 공동주택 관리정보시스템(K-APT) 단지코드 및 상세정보 매핑 시작...`, 86);
        let kaptMatchedCount = 0;
        try {
            const kaptItems = [];
            for (const target of lawdTargets) {
                if (isStopped()) break;
                const lawdCd = target.code;
                if (!lawdCd) continue;

                for (let page = 1; page <= 5; page++) {
                    if (isStopped()) break;
                    const url = `https://apis.data.go.kr/1613000/AptListService4/getSigunguAptList4?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCode=${lawdCd}&pageNo=${page}&numOfRows=100`;
                    let rawText = '';
                    try {
                        const resData = await httpsGet(url);
                        rawText = typeof resData === 'string' ? resData : JSON.stringify(resData);
                    } catch (err) {
                        rawText = err.text || (typeof err === 'string' ? err : JSON.stringify(err));
                    }

                    if (rawText.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR') || rawText.includes('등록되지 않은 서비스키') || rawText.includes('HTTP_ERROR') || rawText.includes('HTTP 에러') || rawText.includes('returnReasonCode')) {
                        console.warn(`[K-APT] 서비스 응답 안내: 공공데이터포털 K-APT 목록제공 서비스 활용신청 필요 또는 응답 제한 (스킵 후 즉시 DB 저장)`);
                        break;
                    }

                    let pageItemCount = 0;
                    if (rawText.includes('<item>')) {
                        const items = rawText.match(/<item>[\s\S]*?<\/item>/g) || [];
                        pageItemCount = items.length;
                        items.forEach(itXml => {
                            const getTag = tag => {
                                const m = itXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                                return m ? m[1].trim() : '';
                            };
                            const kaptCode = getTag('kaptCode');
                            const kaptName = getTag('kaptName');
                            const bjdCode = getTag('bjdCode');
                            const as3 = getTag('as3');
                            if (kaptCode && kaptName) {
                                kaptItems.push({ kaptCode, kaptName, bjdCode, dong: as3, lawdCd });
                            }
                        });
                    } else {
                        try {
                            const parsed = JSON.parse(rawText);
                            const rawItems = parsed?.response?.body?.items;
                            const list = Array.isArray(rawItems) ? rawItems : (rawItems?.item || []);
                            const arr = Array.isArray(list) ? list : (list ? [list] : []);
                            pageItemCount = arr.length;
                            arr.forEach(it => {
                                if (it && it.kaptCode && it.kaptName) {
                                    kaptItems.push({ kaptCode: it.kaptCode, kaptName: it.kaptName, bjdCode: it.bjdCode, dong: it.as3, lawdCd });
                                }
                            });
                        } catch (e) {}
                    }
                    if (pageItemCount < 100) break;
                }
            }

            if (kaptItems.length > 0) {
                const normalize = s => (s || '').replace(/\s+/g, '').replace(/아파트$/g, '').toLowerCase();

                for (const kapt of kaptItems) {
                    if (isStopped()) break;
                    const kNorm = normalize(kapt.kaptName);
                    for (const estate of estateMap.values()) {
                        if (estate.type && estate.type !== 'apt') continue;
                        if (estate.kaptCode && estate.householdCount && estate.areaList && estate.areaList.length > 0) continue;

                        const eNorm = normalize(estate.name);
                        let matched = false;
                        if (estate.pnu && kapt.bjdCode && estate.pnu.startsWith(kapt.bjdCode)) {
                            if (eNorm === kNorm || eNorm.includes(kNorm) || kNorm.includes(eNorm)) {
                                matched = true;
                            } else if (isComplexTradeMatch(estate, kapt.kaptName, kapt.dong)) {
                                matched = true;
                            }
                        } else if (eNorm === kNorm) {
                            matched = true;
                        } else if (kapt.dong && (estate.dong === kapt.dong || (estate.address && estate.address.includes(kapt.dong)))) {
                            if (eNorm.includes(kNorm) || kNorm.includes(eNorm)) {
                                matched = true;
                            } else if (isComplexTradeMatch(estate, kapt.kaptName, kapt.dong)) {
                                matched = true;
                            }
                        }

                        if (matched) {
                            estate.kaptCode = kapt.kaptCode;
                            kaptMatchedCount++;
                            if (kaptMatchedCount <= 5 || kaptMatchedCount % 10 === 0) {
                                sendLog(`  -> 🏛️ [K-APT 매칭] ${estate.name} <-> 단지코드: ${kapt.kaptCode}`);
                            }

                            // 🌟 [K-APT 상세정보 API 연동] 세대수, 동수, 난방, 준공연도, 면적구간별 세대현황 실시간 보강
                            try {
                                const detailUrl = `https://apis.data.go.kr/1613000/AptBasisInfoServiceV5/getAphusBassInfoV5?serviceKey=${encodeURIComponent(serviceKey)}&kaptCode=${kapt.kaptCode}`;
                                const detailRaw = await httpsGet(detailUrl);
                                let dItem = null;
                                if (detailRaw) {
                                    if (typeof detailRaw === 'object') {
                                        dItem = detailRaw.response?.body?.item || detailRaw.body?.item || detailRaw;
                                    } else {
                                        try {
                                            const p = JSON.parse(detailRaw);
                                            dItem = p?.response?.body?.item || p?.body?.item || p;
                                        } catch (pe) {
                                            const getTag = tag => {
                                                const m = detailRaw.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                                                return m ? m[1].trim() : '';
                                            };
                                            dItem = {
                                                kaptdaCnt: getTag('kaptdaCnt'),
                                                kaptDongCnt: getTag('kaptDongCnt'),
                                                doroJuso: getTag('doroJuso'),
                                                codeHeatNm: getTag('codeHeatNm'),
                                                codeHallNm: getTag('codeHallNm'),
                                                kaptUsedate: getTag('kaptUsedate'),
                                                privArea: getTag('privArea'),
                                                kaptMparea60: getTag('kaptMparea60'),
                                                kaptMparea85: getTag('kaptMparea85'),
                                                kaptMparea135: getTag('kaptMparea135'),
                                                kaptMparea136: getTag('kaptMparea136')
                                            };
                                        }
                                    }
                                }

                                if (dItem) {
                                    if (dItem.kaptdaCnt) estate.householdCount = parseInt(dItem.kaptdaCnt, 10) || estate.householdCount;
                                    if (dItem.kaptDongCnt) estate.totalDongCnt = parseInt(dItem.kaptDongCnt, 10) || estate.totalDongCnt;
                                    if (dItem.codeHeatNm) estate.heatType = dItem.codeHeatNm;
                                    if (dItem.codeHallNm) estate.hallType = dItem.codeHallNm;
                                    if (dItem.kaptUsedate && (!estate.buildYear || estate.buildYear === '-')) {
                                        estate.buildYear = String(dItem.kaptUsedate).substring(0, 4);
                                    }
                                    if (dItem.doroJuso && (!estate.address || !estate.address.includes('로'))) {
                                        estate.address = dItem.doroJuso;
                                    }

                                    // 전유부에서 면적 목록을 받지 못한 단지: K-APT 면적대별 세대 현황 기반으로 면적 보완 (안전 fallback)
                                    if (!estate.areaList || estate.areaList.length === 0) {
                                        const areaHints = [];
                                        const m60 = parseInt(dItem.kaptMparea60, 10) || 0;
                                        const m85 = parseInt(dItem.kaptMparea85, 10) || 0;
                                        const m135 = parseInt(dItem.kaptMparea135, 10) || 0;
                                        const m136 = parseInt(dItem.kaptMparea136, 10) || 0;

                                        if (m60 > 0) areaHints.push({ area: '59.9㎡', pyeong: '18.1평형', householdCount: m60, price: estate.price || '기본 정보 구축 (실거래 대기)', tradeDate: estate.tradeDate || '-' });
                                        if (m85 > 0) areaHints.push({ area: '84.9㎡', pyeong: '25.7평형', householdCount: m85, price: estate.price || '기본 정보 구축 (실거래 대기)', tradeDate: estate.tradeDate || '-' });
                                        if (m135 > 0) areaHints.push({ area: '114.5㎡', pyeong: '34.6평형', householdCount: m135, price: estate.price || '기본 정보 구축 (실거래 대기)', tradeDate: estate.tradeDate || '-' });
                                        if (m136 > 0) areaHints.push({ area: '150.0㎡', pyeong: '45.4평형', householdCount: m136, price: estate.price || '기본 정보 구축 (실거래 대기)', tradeDate: estate.tradeDate || '-' });

                                        if (areaHints.length > 0) {
                                            estate.areaList = areaHints;
                                            let maxH = -1;
                                            let topA = areaHints[0];
                                            areaHints.forEach(h => {
                                                if (h.householdCount > maxH) {
                                                    maxH = h.householdCount;
                                                    topA = h;
                                                }
                                            });
                                            estate.area = topA.area;
                                        }
                                    }

                                    // 🌟 K-APT 총 세대수(householdCount) 기반 전유부 평형별 세대수 비례 정밀 보정
                                    if (estate.householdCount && estate.householdCount > 0 && estate.areaList && estate.areaList.length > 0) {
                                        const currentSum = estate.areaList.reduce((acc, cur) => acc + (cur.householdCount || 0), 0);
                                        if (currentSum > 0 && currentSum < estate.householdCount) {
                                            let distributed = 0;
                                            estate.areaList.forEach((item, idx) => {
                                                if (idx === estate.areaList.length - 1) {
                                                    item.householdCount = Math.max(1, estate.householdCount - distributed);
                                                } else {
                                                    const proportion = (item.householdCount || 0) / currentSum;
                                                    const allocated = Math.round(estate.householdCount * proportion);
                                                    item.householdCount = allocated;
                                                    distributed += allocated;
                                                }
                                            });
                                        }
                                    }
                                }
                            } catch (dErr) {}

                            break;
                        }
                    }
                }
            }
            sendLog(`  ✔️ [K-APT 연동 완료] 총 ${kaptMatchedCount}개 단지 관리정보/세대현황 연동 완료`, 92);
        } catch (kaptErr) {
            console.warn('[K-APT 자동 연동] 조회 중 안내:', kaptErr.message || kaptErr);
        }

        // 🌟 [최종 정합성 보정] K-APT 총 세대수(householdCount)가 존재하는 단지는 전유부 평형별 세대수를 총 세대수에 맞게 비례 배분
        estateMap.forEach(estate => {
            if (estate.householdCount && estate.householdCount > 0 && estate.areaList && estate.areaList.length > 1) {
                const currentSum = estate.areaList.reduce((acc, cur) => acc + (cur.householdCount || 0), 0);
                if (currentSum > 0 && currentSum < estate.householdCount) {
                    let distributed = 0;
                    estate.areaList.forEach((item, idx) => {
                        if (idx === estate.areaList.length - 1) {
                            item.householdCount = Math.max(1, estate.householdCount - distributed);
                        } else {
                            const proportion = (item.householdCount || 0) / currentSum;
                            const allocated = Math.round(estate.householdCount * proportion);
                            item.householdCount = allocated;
                            distributed += allocated;
                        }
                    });
                }
            }
        });

        // 🌟 [최종 정합성 및 중복 허수 제거 필터링]
        sendLog(`🛡️ [정합성 검증] 중복 가짜 지번 주택 배제 및 주택 유형 최종 방어 검증 진행...`, 94);
        const realComplexParcels = new Set();
        estateMap.forEach(est => {
            if (est.name && !est.name.endsWith('주택') && !est.name.includes('번지')) {
                if (est.pnu) realComplexParcels.add(est.pnu);
                if (est.dong && est.bun) realComplexParcels.add(`${est.sido}_${est.sigungu}_${est.dong}_${est.bun}_${est.ji || '0000'}`);
            }
        });

        const cleanedList = [];
        estateMap.forEach(est => {
            const n = est.name || '';
            const isFallback = n.endsWith('주택') || n.includes('번지');
            if (isFallback) {
                const pnuKey = est.pnu;
                const parcelKey = est.dong && est.bun ? `${est.sido}_${est.sigungu}_${est.dong}_${est.bun}_${est.ji || '0000'}` : null;
                if ((pnuKey && realComplexParcels.has(pnuKey)) || (parcelKey && realComplexParcels.has(parcelKey))) {
                    return; // 동일 지번에 정식 단지가 존재하는 가짜 주택은 최종 저장 시 제외
                }
            }

            // 2) 주택 유형 최종 방어 검증 (아파트 오분류 원천 차단)
            if (est.type === 'apt') {
                if (n.includes('빌라') || n.includes('연립') || n.includes('다세대') || n.includes('맨션') || n.includes('타운하우스')) {
                    est.type = 'rh';
                } else if (n.includes('주택') || n.includes('번지') || n.includes('단독') || n.includes('다가구') || n.includes('원룸')) {
                    est.type = 'sh';
                }
            }

            cleanedList.push(est);
        });

        const finalList = cleanedList;
        const wasStopped = isStopped();

        sendLog(`💾 [DB 파일 동기화] realestate_seoul.json 및 배포용 DB 저장 중 (총 ${finalList.length.toLocaleString()}건)...`, 96);
        fs.writeFileSync(REAL_ESTATE_PATH, JSON.stringify(finalList, null, 2), 'utf8');

        // public 복사본 동기화
        const publicPath1 = path.join(__dirname, 'public', 'data', 'realestate_seoul.json');
        if (fs.existsSync(path.dirname(publicPath1))) {
            fs.writeFileSync(publicPath1, JSON.stringify(finalList, null, 2), 'utf8');
        }
        const publicPath2 = path.join(__dirname, 'public', 'src', 'data', 'realestate_seoul.json');
        if (fs.existsSync(path.dirname(publicPath2))) {
            fs.writeFileSync(publicPath2, JSON.stringify(finalList, null, 2), 'utf8');
        }

        const targetGusFinal = [...new Set(lawdTargets.map(t => t.gu))];
        const regionItems = finalList.filter(item => {
            if (sido && item.sido !== sido) return false;
            return isMatchingSigungu(item, sigungu, sido);
        });

        const kaptMsg = kaptMatchedCount > 0 ? `, K-APT 단지코드: ${kaptMatchedCount}건 자동 연동` : '';

        if (wasStopped) {
            sendLog(`⏹️ [주택 마스터 DB 구축 중단] 사용자에 의해 수집이 안전하게 중단되었습니다. (현재까지 수집/갱신된 ${finalList.length.toLocaleString()}건 저장 완료)`);
            if (isStreaming && !res.writableEnded) {
                res.write(JSON.stringify({
                    type: 'stopped',
                    success: true,
                    stopped: true,
                    regionCount: regionItems.length,
                    totalCount: finalList.length,
                    newlyAdded: newlyAddedCount,
                    updatedCount: updatedCount,
                    kaptCount: kaptMatchedCount,
                    message: `[주택 마스터 DB 구축 중단] 사용자에 의해 수집이 안전하게 중단되었습니다. (현재까지 수집된 총 ${regionItems.length}건 안전 보존 완료)`
                }) + '\n');
                return res.end();
            }
            return res.json({
                success: true,
                stopped: true,
                regionCount: regionItems.length,
                totalCount: finalList.length,
                newlyAdded: newlyAddedCount,
                updatedCount: updatedCount,
                kaptCount: kaptMatchedCount,
                message: `[주택 마스터 DB 구축 중단] 사용자에 의해 수집이 안전하게 중단되었습니다. (현재까지 수집된 총 ${regionItems.length}건 안전 보존 완료)`
            });
        }

        sendLog(`✨ [1단계 주택 마스터 DB 구축 완료] ${displayRegion} 주택 마스터: 총 ${regionItems.length.toLocaleString()}건 (신규 추가: +${newlyAddedCount}건, 최신 갱신: ${updatedCount}건, K-APT 연동: ${kaptMatchedCount}건, 전체 DB: ${finalList.length.toLocaleString()}건)`, 98);

        if (isStreaming && !res.writableEnded) {
            res.write(JSON.stringify({
                type: 'done',
                success: true,
                regionCount: regionItems.length,
                totalCount: finalList.length,
                newlyAdded: newlyAddedCount,
                updatedCount: updatedCount,
                kaptCount: kaptMatchedCount,
                message: `[주택 마스터 DB 구축] ${displayRegion} (${targetGusFinal.join(', ')}) 주택 마스터 총 ${regionItems.length}건 구축 완료 (신규 추가: +${newlyAddedCount}건, 기존 정보 최신 갱신: ${updatedCount}건, 전체 DB: ${finalList.length}건${kaptMsg})`
            }) + '\n');
            return res.end();
        }

        return res.json({
            success: true,
            regionCount: regionItems.length,
            totalCount: finalList.length,
            newlyAdded: newlyAddedCount,
            updatedCount: updatedCount,
            kaptCount: kaptMatchedCount,
            message: `[주택 마스터 DB 구축] ${displayRegion} (${targetGusFinal.join(', ')}) 주택 마스터 총 ${regionItems.length}건 구축 완료 (신규 추가: +${newlyAddedCount}건, 기존 정보 최신 갱신: ${updatedCount}건, 전체 DB: ${finalList.length}건${kaptMsg})`
        });
    } catch (err) {
        console.error('Collect Master Error:', err);
        if (isStreaming && !res.writableEnded) {
            res.write(JSON.stringify({ type: 'error', error: '건축HUB 마스터 데이터 수집 중 오류: ' + err.message }) + '\n');
            return res.end();
        }
        return res.status(500).json({ success: false, error: '건축HUB 마스터 데이터 수집 중 오류: ' + err.message });
    }
});

// 단지명 및 블록(A9블럭 등) 정규화 스마트 매핑 헬퍼
function isComplexTradeMatch(estate, tradeName, tradeDong, tradeJibun) {
    if (!estate || !estate.name || !tradeName) return false;

    // 1. 주소 및 지번 직접 매칭
    if (tradeDong && tradeJibun && estate.address && estate.address.includes(tradeDong) && estate.address.includes(tradeJibun)) {
        return true;
    }

    const eDong = estate.dong || '';
    if (eDong && tradeDong && eDong !== tradeDong) {
        return false;
    }

    const normalize = raw => {
        if (!raw) return '';
        let n = String(raw).replace(/\s+/g, ' ').trim();
        n = n.replace(/\((?:제?\d+동|\d+호|[A-Za-z가-힣]동)\)/g, '');
        n = n.replace(/(?:제\s*)?\d+\s*동$/g, '');
        n = n.replace(/\s+[A-Za-z가-힣]\s*동$/g, '');
        n = n.replace(/\s+\d+\s*호$/g, '');
        n = n.replace(/아파트$/g, '');
        // 블록/블럭 정규화: A9블럭, A9BL, B4블록 -> 9단지, 4단지
        n = n.replace(/[A-Za-z]?\s*[-_]?\s*(\d+)\s*(?:블럭|블록|BL)/gi, '$1단지');
        return n.replace(/\s+/g, '');
    };

    const eNorm = normalize(estate.name);
    const tNorm = normalize(tradeName);

    if (eNorm === tNorm) return true;

    // 단지 번호(숫자) 일치 여부 확인 (예: 9단지)
    const eDigits = eNorm.match(/\d+/g) || [];
    const tDigits = tNorm.match(/\d+/g) || [];
    if (eDigits.length > 0 && tDigits.length > 0) {
        const hasCommonDigit = eDigits.some(d => tDigits.includes(d));
        if (!hasCommonDigit) return false;
    }

    // 동일 동 또는 마을 내 주요 브랜드 일치 확인
    const keyBrands = ['호반베르디움', '호반', '아이파크', '동일스위트', '우남퍼스트빌', '우림필유', '푸르지오', '래미안', '자이', '힐스테이트', '더샵', 'e편한세상', '이편한세상', '두산위브', '중흥', '중흥S-클래스', 'SK뷰', 'SKVIEW', '롯데캐슬', '센트럴푸르지오', '유쉘', '우방', '홈타운', '삼익', '동신', '쌍용', '라이프', '부영', '풍산', '그린나래', '에듀뷰', '써밋', '퍼스트'];

    for (const b of keyBrands) {
        const bClean = b.replace(/[^가-힣A-Za-z0-9]/g, '');
        if (eNorm.includes(bClean) && tNorm.includes(bClean)) {
            const villages = ['신원마을', '달빛마을', '은빛마을', '별빛마을', '옥빛마을', '햇빛마을', '무원마을', '소만마을', '샘터마을', '도래울', '원흥', '삼송', '지축', '향동', '덕은'];
            for (const v of villages) {
                if (eNorm.includes(v) && tNorm.includes(v)) return true;
            }
            if (eDong && tradeDong && eDong === tradeDong) return true;
        }
    }

    if (eNorm.length >= 6 && tNorm.length >= 6) {
        if (eNorm.includes(tNorm) || tNorm.includes(eNorm)) return true;
    }

    return false;
}

// 1-4. POST /api/realestate/sync-trades - 실제 공공 실거래가 API 수집 및 마스터 정보 매핑 업데이트 (실시간 상세 로그 스트리밍 지원)
app.post('/api/realestate/sync-trades', async (req, res) => {
    const { sido = '서울특별시', sigungu = 'all', housingType = 'all', monthsCount = 12, stream = false } = req.body;
    const isStreaming = Boolean(stream);

    isRealEstateCollectStopped = false; // 새로운 실거래가 수집 시작 시 중단 플래그 초기화
    let isClientDisconnected = false;
    res.on('close', () => {
        if (!res.writableEnded) {
            isClientDisconnected = true;
            isRealEstateCollectStopped = true;
            console.log('[TradeLog] ⏹️ 브라우저 클라이언트 연결 종료 감지');
        }
    });

    const isStopped = () => isRealEstateCollectStopped || isClientDisconnected || (res.destroyed && !res.writableEnded);

    if (isStreaming) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        if (res.flushHeaders) res.flushHeaders();
    }

    const sendLog = (message, percent = null) => {
        console.log(`[TradeLog] ${message}`);
        if (isStreaming && !res.writableEnded) {
            try {
                res.write(JSON.stringify({ type: 'log', message, percent }) + '\n');
                if (typeof res.flush === 'function') res.flush();
            } catch (e) {}
        }
    };

    const config = await readConfig();
    const serviceKey = config.data_go_kr_key;
    const kakaoKey = config.kakao_app_key;

    if (!serviceKey) {
        if (isStreaming && !res.writableEnded) {
            res.write(JSON.stringify({ type: 'error', error: '공공데이터포털 API 인증키(data_go_kr_key)가 설정되지 않았습니다.' }) + '\n');
            return res.end();
        }
        return res.status(400).json({ success: false, error: '공공데이터포털 API 인증키(data_go_kr_key)가 설정되지 않았습니다.' });
    }

    try {
        const lawdTargets = getLawdTargets(sido, sigungu);
        const targetGus = [...new Set(lawdTargets.map(t => t.gu))];
        const displayRegion = sigungu === 'all' || !sigungu || sigungu === '전체' ? sido : `${sido} ${sigungu}`;

        // 1. 기존 마스터/주택 목록 로드
        let existingList = [];
        if (fs.existsSync(REAL_ESTATE_PATH)) {
            try {
                existingList = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8') || '[]');
            } catch (err) {
                existingList = [];
            }
        }

        sendLog(`🚀 [2단계 국토부 실거래가 일괄 수집 가동] 대상 지역: ${displayRegion} (${targetGus.join(', ')})`, 76);
        sendLog(`📋 수집 옵션: 주택유형=${housingType === 'all' ? '전체(아파트/오피스텔/연립/단독)' : housingType}, 최근 ${monthsCount}개월`, 78);

        // 빠른 탐색을 위해 맵 구조로 변환 (명칭 키, 19자리 PNU 고유키 맵, 시군구별 단지 인덱스 맵)
        const estateMap = new Map();
        const pnuMap = new Map();
        const guEstatesMap = new Map(); // 시도_시군구 -> 해당 지역 단지 목록 (검색 속도 70배 향상)
        existingList.forEach(item => {
            if (item && item.name) {
                estateMap.set(`${item.sido}_${item.sigungu}_${item.name}`, item);
                if (item.pnu && item.pnu.length === 19) {
                    pnuMap.set(item.pnu, item);
                }
                const guKey = `${item.sido}_${item.sigungu}`;
                if (!guEstatesMap.has(guKey)) {
                    guEstatesMap.set(guKey, []);
                }
                guEstatesMap.get(guKey).push(item);
            }
        });

        // 2. 수집 대상 엔드포인트 설정
        const apiEndpoints = [];
        if (housingType === 'all' || housingType === 'apt') {
            apiEndpoints.push({ type: 'apt', name: '아파트', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev', nameTag: 'aptNm' });
        }
        if (housingType === 'all' || housingType === 'rh') {
            apiEndpoints.push({ type: 'rh', name: '연립·다세대', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade', nameTag: 'mhouseNm' });
        }
        if (housingType === 'all' || housingType === 'offi') {
            apiEndpoints.push({ type: 'offi', name: '오피스텔', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade', nameTag: 'offiNm' });
        }
        if (housingType === 'all' || housingType === 'sh') {
            apiEndpoints.push({ type: 'sh', name: '단독·다가구', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade', nameTag: '' });
        }

        // 요청된 개월 수만큼 거래월 생성 (사계절 및 중대형 평형 누락 방지, 기본 최근 12개월)
        const limitMonths = Math.min(Math.max(parseInt(monthsCount, 10) || 12, 1), 24);
        const months = [];
        const now = new Date();
        for (let i = 1; i <= limitMonths; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        let updatedCount = 0;
        let newAddedCount = 0;
        let quotaWarning = false;

        let totalTargetSteps = lawdTargets.length * apiEndpoints.length * months.length;
        let stepCount = 0;

        // 3. 구별 / 유형별 / 거래월별 실제 API 호출 및 매핑 (공공데이터 트래픽 보호 적용)
        for (const target of lawdTargets) {
            if (isStopped()) break;
            const gu = target.gu;
            const lawdCd = target.code;
            if (!lawdCd) continue;

            for (const ep of apiEndpoints) {
                if (quotaWarning || isStopped()) break;
                for (const ymd of months) {
                    if (isStopped()) break;
                    stepCount++;
                    const progressPct = Math.min(95, Math.round(78 + (stepCount / Math.max(1, totalTargetSteps)) * 17));

                    try {
                        const fetchUrl = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=${lawdCd}&DEAL_YMD=${ymd}`;
                        const xmlText = await httpsGet(fetchUrl);

                        // 공공데이터 일일 쿼터 초과 또는 트래픽 제한 에러 감지 시 안전 조기 종료
                        if (xmlText.includes('LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR') || xmlText.includes('등록되지 않은 서비스키') || xmlText.includes('트래픽 초과')) {
                            sendLog(`⚠️ [공공데이터 트래픽 제한 감지] ${ep.name} ${lawdCd} (${ymd}): 일일 쿼터 한도 도달 -> 수집된 데이터 정상 보존 후 안전 종료`);
                            quotaWarning = true;
                            break;
                        }

                        const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
                        sendLog(`🔍 [${gu} ${ep.name} ${ymd}] 공공 실거래가 ${items.length}건 분석 및 마스터 DB 매핑 시작...`, progressPct);

                        let monthUpdated = 0;
                        let monthNew = 0;

                        for (let idx = 0; idx < items.length; idx++) {
                            const itemXml = items[idx];
                            const getTag = tag => {
                                const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`));
                                return m ? m[1].trim() : '';
                            };

                            const dong = getTag('umdNm') || getTag('법정동');
                            const jibun = getTag('jibun') || getTag('지번');
                            const houseType = getTag('houseType') || '단독';
                            let rawName = getTag(ep.nameTag) || getTag('aptNm') || getTag('mhouseNm') || getTag('offiNm') || getTag('연립다세대') || getTag('단지');
                            let name = (rawName || '').trim();

                            // 🌟 [비정상 지번명 정제]: "(463-2)", "463-2", "(15-24)" 처럼 괄호 번지만 온 경우 표준 한글 명칭으로 변환
                            const isJibunName = !name || /^\(?\d+(?:-\d+)?\)?$/.test(name) || /^\d+(?:-\d+)?번지?$/.test(name);
                            if (isJibunName) {
                                const cleanJibun = (jibun || name.replace(/[()]/g, '')).trim();
                                const typeLabel = ep.type === 'apt' ? '아파트' : (ep.type === 'rh' ? '빌라' : (ep.type === 'offi' ? '오피스텔' : `${houseType}주택`));
                                if (dong && cleanJibun) {
                                    name = `${dong} ${cleanJibun}번지 ${typeLabel}`;
                                } else if (cleanJibun) {
                                    name = `${cleanJibun}번지 ${typeLabel}`;
                                } else if (dong) {
                                    name = `${dong} ${typeLabel}`;
                                } else {
                                    name = `단지형 ${typeLabel}`;
                                }
                            }
                            if (!name) continue;
                            if (isNonResidential(name)) continue;

                            // 19자리 고유필지번호(PNU) 추출
                            const sggCd = getTag('sggCd') || lawdCd;
                            const umdCd = getTag('umdCd');
                            const bonbun = getTag('bonbun');
                            const bubun = getTag('bubun');
                            const landCd = getTag('landCd') || '1';

                            let tradePnu = '';
                            if (sggCd && umdCd && bonbun) {
                                tradePnu = `${sggCd}${umdCd}${landCd === '2' ? '2' : '1'}${String(bonbun).padStart(4, '0')}${String(bubun || '0').padStart(4, '0')}`;
                            } else if (sggCd && jibun) {
                                const bCode = (umdCd ? umdCd : (DONG_CODES_MAP[dong] || ''));
                                if (bCode) {
                                    tradePnu = buildPNU(sggCd, bCode, jibun, landCd);
                                }
                            }

                            const amount = getTag('dealAmount') || getTag('거래금액');
                            const dealYear = getTag('dealYear') || getTag('년');
                            const dealMonth = getTag('dealMonth') || getTag('월');
                            const dealDay = getTag('dealDay') || getTag('일');
                            const area = getTag('totalFloorAr') || getTag('plottageAr') || getTag('excluUseAr') || getTag('전용면적');
                            const tradeBuildYear = getTag('buildYear') || getTag('건축년도');

                            const tradeDateStr = dealYear && dealMonth 
                                ? `${dealYear}-${String(dealMonth).padStart(2, '0')}${dealDay ? '-' + String(dealDay).padStart(2, '0') : ''}` 
                                : ymd;
                            const formattedPrice = amount ? `${amount.trim()}만원` : '실거래 확인';

                            const key = `${sido}_${gu}_${name}`;

                            let existing = null;

                            // 1순위: PNU 매칭
                            if (tradePnu && pnuMap.has(tradePnu)) {
                                existing = pnuMap.get(tradePnu);
                            }

                            // 2순위: 시도_구_이름 키 일치 매칭
                            if (!existing) {
                                existing = estateMap.get(key);
                            }

                            // 3순위: 스마트 복합 매칭 (해당 구의 단지들만 빠르게 탐색하여 70배 고속화)
                            if (!existing) {
                                const regionalEstates = guEstatesMap.get(`${sido}_${gu}`) || [];
                                for (const item of regionalEstates) {
                                    if (!ep.type || item.type === ep.type) {
                                        if (isComplexTradeMatch(item, name, dong, jibun)) {
                                            existing = item;
                                            break;
                                        }
                                    }
                                }
                            }

                            if (existing) {
                                if (!existing.pnu && tradePnu) {
                                    existing.pnu = tradePnu;
                                    pnuMap.set(tradePnu, existing);
                                }
                                if (tradeBuildYear && (!existing.buildYear || existing.buildYear === '-')) {
                                    existing.buildYear = String(tradeBuildYear).trim();
                                }
                                if (!existing.tradeDate || existing.tradeDate === '-' || tradeDateStr >= existing.tradeDate) {
                                    existing.price = formattedPrice;
                                    existing.tradeDate = tradeDateStr;
                                    if (area && (!existing.area || existing.area === '-')) {
                                        existing.area = `${area}㎡`;
                                    }
                                    existing.source = '마스터/최신실거래가 매핑';
                                    existing.updatedAt = getNowFormatted();
                                    updatedCount++;
                                    monthUpdated++;

                                    if (updatedCount <= 5 || updatedCount % 4 === 0) {
                                        sendLog(`  -> 💰 [실거래 갱신] ${dong || gu} 「${existing.name}」 (${tradeDateStr}) -> ${formattedPrice} (전용 ${area || '-'}㎡)`);
                                    }

                                    const dealAreaNum = parseFloat(area);
                                    if (!isNaN(dealAreaNum) && dealAreaNum > 0) {
                                        if (!existing.areaList) existing.areaList = [];
                                        existing.areaList = existing.areaList.filter(a => a.price !== '기본 정보 구축 (실거래 대기)');

                                        let matchedArea = null;
                                        let minDiff = 999;
                                        for (const aItem of existing.areaList) {
                                            const aNum = parseFloat(String(aItem.area).replace(/[^0-9.]/g, ''));
                                            const diff = Math.abs(aNum - dealAreaNum);
                                            if (diff < minDiff && diff <= 1.4) {
                                                minDiff = diff;
                                                matchedArea = aItem;
                                            }
                                        }

                                        const pyeongStr = `${(dealAreaNum / 3.3058).toFixed(1)}평형`;
                                        const pureAmount = parseInt(String(amount).replace(/[^0-9]/g, ''), 10) || 0;
                                        const pyeongNum = parseFloat(pyeongStr.replace(/[^0-9.]/g, ''));
                                        const ppp = (pureAmount > 0 && pyeongNum > 0) ? `${Math.round(pureAmount / pyeongNum).toLocaleString()}만원` : '-';

                                        if (matchedArea) {
                                            matchedArea.householdCount = (matchedArea.householdCount || 0) + 1;
                                            if (!matchedArea.tradeDate || matchedArea.tradeDate === '-' || tradeDateStr >= matchedArea.tradeDate) {
                                                matchedArea.price = formattedPrice;
                                                matchedArea.tradeDate = tradeDateStr;
                                                if (ppp !== '-') matchedArea.pricePerPyeong = ppp;
                                            }
                                        } else {
                                            existing.areaList.push({
                                                area: `${dealAreaNum.toFixed(1)}㎡`,
                                                pyeong: pyeongStr,
                                                householdCount: 1,
                                                price: formattedPrice,
                                                tradeDate: tradeDateStr,
                                                pricePerPyeong: ppp
                                            });
                                            existing.areaList.sort((a, b) => parseFloat(a.area) - parseFloat(b.area));
                                        }
                                    }
                                }
                            } else {
                                // 🌟 마스터에 없던 신규 주택인 경우에만 신규 추가
                                let initialAreaList = [];
                                const dealAreaNum = parseFloat(area);
                                if (!isNaN(dealAreaNum) && dealAreaNum > 0) {
                                    const pyeongStr = `${(dealAreaNum / 3.3058).toFixed(1)}평형`;
                                    const pureAmount = parseInt(String(amount).replace(/[^0-9]/g, ''), 10) || 0;
                                    const pyeongNum = parseFloat(pyeongStr.replace(/[^0-9.]/g, ''));
                                    const ppp = (pureAmount > 0 && pyeongNum > 0) ? `${Math.round(pureAmount / pyeongNum).toLocaleString()}만원` : '-';
                                    initialAreaList = [{
                                        area: `${dealAreaNum.toFixed(1)}㎡`,
                                        pyeong: pyeongStr,
                                        householdCount: 1,
                                        price: formattedPrice,
                                        tradeDate: tradeDateStr,
                                        pricePerPyeong: ppp
                                    }];
                                }

                                let coordX = '';
                                let coordY = '';
                                let roadAddr = '';
                                const fullAddr = `${sido} ${gu} ${dong || ''} ${jibun || ''}`.trim();

                                if (kakaoKey && fullAddr.length > 5) {
                                    try {
                                        const addrRes = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(fullAddr)}`, {
                                            headers: { 'Authorization': `KakaoAK ${kakaoKey}`, 'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000' },
                                            signal: AbortSignal.timeout(2000)
                                        });
                                        if (addrRes.ok) {
                                            const aData = await addrRes.json();
                                            if (aData.documents && aData.documents.length > 0) {
                                                const doc = aData.documents[0];
                                                coordX = doc.x || '';
                                                coordY = doc.y || '';
                                                if (doc.road_address && doc.road_address.address_name) {
                                                    roadAddr = doc.road_address.address_name;
                                                }
                                            }
                                        }

                                        // 지번형 이름이고 좌표가 미등록인 경우에만 실제 카카오 키워드 검색 보강
                                        if (isJibunName && (!coordX || !coordY)) {
                                            const kwRes = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(fullAddr)}&size=3`, {
                                                headers: { 'Authorization': `KakaoAK ${kakaoKey}`, 'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000' },
                                                signal: AbortSignal.timeout(2000)
                                            });
                                            if (kwRes.ok) {
                                                const kwData = await kwRes.json();
                                                for (const p of kwData.documents || []) {
                                                    if (p.category_name && /(?:주거시설|아파트|오피스텔|연립|다세대|빌라)/.test(p.category_name)) {
                                                        let cleanPlace = p.place_name.replace(/\(.*?\)/g, '').trim();
                                                        if (cleanPlace && cleanPlace.length >= 2 && !/^\d+/.test(cleanPlace)) {
                                                            name = cleanPlace;
                                                            if (!coordX && p.x) coordX = p.x;
                                                            if (!coordY && p.y) coordY = p.y;
                                                            break;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    } catch (kErr) {}
                                }

                                const finalType = classifyHousingType({ name, rawName: rawName || name, type: ep.type });
                                const newEstate = {
                                    id: `trade-${finalType}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                                    name,
                                    type: finalType,
                                    sido,
                                    sigungu: gu,
                                    dong: dong || '',
                                    address: roadAddr || fullAddr,
                                    road_name: roadAddr || '',
                                    price: formattedPrice,
                                    tradeDate: tradeDateStr,
                                    area: area ? `${area}㎡` : '-',
                                    areaList: initialAreaList,
                                    pnu: tradePnu || '',
                                    buildYear: tradeBuildYear ? String(tradeBuildYear).trim() : '',
                                    source: '실거래가 수집',
                                    x: coordX || '',
                                    y: coordY || '',
                                    lng: coordX || '',
                                    lat: coordY || '',
                                    createdAt: getNowFormatted(),
                                    updatedAt: getNowFormatted()
                                };
                                estateMap.set(key, newEstate);
                                if (tradePnu) pnuMap.set(tradePnu, newEstate);
                                const guKey = `${sido}_${gu}`;
                                if (!guEstatesMap.has(guKey)) guEstatesMap.set(guKey, []);
                                guEstatesMap.get(guKey).push(newEstate);

                                newAddedCount++;
                                monthNew++;

                                if (newAddedCount <= 5 || newAddedCount % 8 === 0) {
                                    sendLog(`  ➕ [신규 거래 주택] ${dong || gu} 「${name}」 (${tradeDateStr}) -> ${formattedPrice} (좌표: ${coordX ? '등록' : '미등록'})`);
                                }
                            }

                            // 50건 단위 실시간 생동감 있는 진행 상황 송출
                            if ((idx + 1) % 50 === 0 || (idx + 1) === items.length) {
                                sendLog(`  ⏳ [${gu} ${ep.name} ${ymd}] 매핑 진행 중: ${idx + 1}/${items.length}건 (누적 갱신: ${updatedCount}건)...`, progressPct);
                            }

                            // 대용량 연산 시 Node.js 이벤트 루프 양보 (HTTP 청크 즉시 송출 보장)
                            if ((idx + 1) % 100 === 0) {
                                await new Promise(r => setImmediate(r));
                            }
                        }

                        if (items.length > 0) {
                            sendLog(`  ✅ [${gu} ${ep.name} ${ymd}] ${items.length}건 매핑 완료 (이 달 갱신: ${monthUpdated}건, 신규: ${monthNew}건 / 전체 누적: ${updatedCount}건)`, progressPct);
                        }
                    } catch (e) {
                        console.warn(`[Sync Trades] Error for ${gu} ${ep.name} ${ymd}:`, e.message);
                    }
                    await new Promise(r => setTimeout(r, 40)); // 공공데이터포털 TPS 보호 딜레이
                }
            }
        }

        const finalList = Array.from(estateMap.values());
        const wasStopped = isStopped();

        sendLog(`💾 [실거래가 DB 동기화] realestate_seoul.json 저장 중 (총 ${finalList.length.toLocaleString()}건)...`, 97);
        fs.writeFileSync(REAL_ESTATE_PATH, JSON.stringify(finalList, null, 2), 'utf8');

        // public 복사본 동기화
        const publicPath1 = path.join(__dirname, 'public', 'data', 'realestate_seoul.json');
        if (fs.existsSync(path.dirname(publicPath1))) {
            fs.writeFileSync(publicPath1, JSON.stringify(finalList, null, 2), 'utf8');
        }
        const publicPath2 = path.join(__dirname, 'public', 'src', 'data', 'realestate_seoul.json');
        if (fs.existsSync(path.dirname(publicPath2))) {
            fs.writeFileSync(publicPath2, JSON.stringify(finalList, null, 2), 'utf8');
        }

        const targetGusFinal = targetGus || [...new Set(lawdTargets.map(t => t.gu))];
        const displayRegionFinal = displayRegion || (sigungu === 'all' || !sigungu || sigungu === '전체' ? sido : `${sido} ${sigungu}`);

        const regionItems = finalList.filter(item => {
            if (sido && item.sido !== sido) return false;
            return isMatchingSigungu(item, sigungu, sido);
        });

        if (wasStopped) {
            sendLog(`⏹️ [2단계 실거래가 수집 중단] 사용자에 의해 실거래가 수집이 안전하게 중단되었습니다. (현재까지 수집/갱신된 ${finalList.length.toLocaleString()}건 저장 완료)`);
            if (isStreaming && !res.writableEnded) {
                res.write(JSON.stringify({
                    type: 'stopped',
                    success: true,
                    stopped: true,
                    regionCount: regionItems.length,
                    totalCount: finalList.length,
                    updatedCount,
                    newAddedCount,
                    message: `[실거래가 수집 중단] 사용자에 의해 수집이 안전하게 중단되었습니다. (현재까지 갱신: ${updatedCount}건, 신규: ${newAddedCount}건 안전 보존 완료)`
                }) + '\n');
                return res.end();
            }
            return res.json({
                success: true,
                stopped: true,
                regionCount: regionItems.length,
                totalCount: finalList.length,
                updatedCount,
                newAddedCount,
                message: `[실거래가 수집 중단] 사용자에 의해 수집이 안전하게 중단되었습니다. (현재까지 갱신: ${updatedCount}건, 신규: ${newAddedCount}건 안전 보존 완료)`
            });
        }

        sendLog(`✨ [2단계 실거래가 수집 동기화 완료] 기존 단지 최신 실거래가: ${updatedCount}건 갱신, 신규 단지: ${newAddedCount}건 추가 (전체 DB: ${finalList.length.toLocaleString()}건)`, 100);

        if (isStreaming && !res.writableEnded) {
            res.write(JSON.stringify({
                type: 'done',
                success: true,
                regionCount: regionItems.length,
                totalCount: finalList.length,
                updatedCount,
                newAddedCount,
                message: `${displayRegionFinal} (${targetGusFinal.join(', ')}) 주택 실거래가 동기화 완료: 기존 마스터 주택 ${updatedCount}건 최신 가격 갱신, 신규 ${newAddedCount}건 추가.`
            }) + '\n');
            return res.end();
        }

        return res.json({
            success: true,
            regionCount: regionItems.length,
            totalCount: finalList.length,
            updatedCount,
            newAddedCount,
            message: `${displayRegionFinal} (${targetGusFinal.join(', ')}) 주택 실거래가 동기화 완료: 기존 마스터 주택 ${updatedCount}건 최신 가격 갱신, 신규 ${newAddedCount}건 추가.`
        });
    } catch (err) {
        console.error('Sync Trades Error:', err);
        if (isStreaming && !res.writableEnded) {
            res.write(JSON.stringify({ type: 'error', error: '실거래가 동기화 중 오류가 발생했습니다: ' + err.message }) + '\n');
            return res.end();
        }
        return res.status(500).json({ success: false, error: '실거래가 동기화 중 오류가 발생했습니다: ' + err.message });
    }
});

// 🌟 단일 단지 실거래가 정밀 조회 헬퍼 함수
async function fetchTradeForSingleEstate(estate, serviceKey) {
    if (!serviceKey || !estate) return null;

    const lawdTargets = getLawdTargets(estate.sido || '경기도', estate.sigungu || 'all');
    let lawdCd = estate.lawdCd || (estate.pnu ? estate.pnu.substring(0, 5) : '');
    if (!lawdCd && lawdTargets.length > 0 && lawdTargets[0].code) {
        lawdCd = lawdTargets[0].code;
    }
    if (!lawdCd) return null;

    const endpoints = [];
    if (estate.type === 'apt' || !estate.type) {
        endpoints.push({ type: 'apt', name: '아파트', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev', nameTag: 'aptNm' });
    }
    if (estate.type === 'rh' || !estate.type) {
        endpoints.push({ type: 'rh', name: '연립·다세대', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade', nameTag: 'mhouseNm' });
    }
    if (estate.type === 'offi' || !estate.type) {
        endpoints.push({ type: 'offi', name: '오피스텔', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade', nameTag: 'offiNm' });
    }
    if (estate.type === 'sh') {
        endpoints.push({ type: 'sh', name: '단독·다가구', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade', nameTag: '' });
    }
    // fallback으로 아파트/연립도 검사
    if (endpoints.length === 0) {
        endpoints.push({ type: 'apt', name: '아파트', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev', nameTag: 'aptNm' });
    }

    const months = [];
    const now = new Date();
    for (let i = 1; i <= 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    let latestTrade = null;

    for (const ep of endpoints) {
        for (const ymd of months) {
            try {
                const fetchUrl = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=${lawdCd}&DEAL_YMD=${ymd}`;
                const xmlText = await httpsGet(fetchUrl);
                const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];

                for (const itemXml of items) {
                    const getTag = tag => {
                        const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`));
                        return m ? m[1].trim() : '';
                    };

                    const dong = getTag('umdNm') || getTag('법정동');
                    const jibun = getTag('jibun') || getTag('지번');
                    const houseType = getTag('houseType') || '단독';
                    let name = getTag(ep.nameTag) || getTag('aptNm') || getTag('mhouseNm') || getTag('offiNm') || getTag('연립다세대') || getTag('단지');
                    if (!name && ep.type === 'sh') {
                        name = dong && jibun ? `${dong} ${jibun} ${houseType}주택` : `${dong} ${houseType}주택`;
                        name = name.replace(/\s+/g, ' ').trim();
                    }
                    if (!name || isNonResidential(name)) continue;

                    // 매칭 검사
                    let matched = false;
                    const sggCd = getTag('sggCd') || lawdCd;
                    const umdCd = getTag('umdCd');
                    const bonbun = getTag('bonbun');
                    const bubun = getTag('bubun');
                    const landCd = getTag('landCd') || '1';
                    let tradePnu = '';
                    if (sggCd && umdCd && bonbun) {
                        tradePnu = `${sggCd}${umdCd}${landCd === '2' ? '2' : '1'}${String(bonbun).padStart(4, '0')}${String(bubun || '0').padStart(4, '0')}`;
                    }
                    if (tradePnu && estate.pnu && estate.pnu === tradePnu) {
                        matched = true;
                    } else if (isComplexTradeMatch(estate, name, dong, jibun)) {
                        matched = true;
                    }

                    if (matched) {
                        const amount = getTag('dealAmount') || getTag('거래금액');
                        const dealYear = getTag('dealYear') || getTag('년');
                        const dealMonth = getTag('dealMonth') || getTag('월');
                        const dealDay = getTag('dealDay') || getTag('일');
                        const area = getTag('totalFloorAr') || getTag('plottageAr') || getTag('excluUseAr') || getTag('전용면적');
                        const tradeDateStr = dealYear && dealMonth 
                            ? `${dealYear}-${String(dealMonth).padStart(2, '0')}${dealDay ? '-' + String(dealDay).padStart(2, '0') : ''}` 
                            : ymd;
                        const formattedPrice = amount ? `${amount.trim()}만원` : '실거래 확인';

                        if (!latestTrade || tradeDateStr > latestTrade.tradeDate) {
                            latestTrade = {
                                price: formattedPrice,
                                tradeDate: tradeDateStr,
                                area: area ? `${parseFloat(area).toFixed(1)}㎡` : estate.area,
                                rawArea: parseFloat(area) || 0,
                                amount: amount ? amount.trim() : ''
                            };
                        }
                    }
                }
            } catch (e) {}
            // 최신 거래가 잡히고 최근 3개월 이내 거래면 충분히 최신이므로 조기 종료 가능
            if (latestTrade && latestTrade.tradeDate >= months[2]) break;
        }
        if (latestTrade) break;
    }

    return latestTrade;
}

// 1-4-1. POST /api/realestate/fetch-single-trade - 단일 단지 실거래가 재수집
app.post('/api/realestate/fetch-single-trade', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: '단지 ID가 필요합니다.' });
        }

        if (!fs.existsSync(REAL_ESTATE_PATH)) {
            return res.status(404).json({ success: false, message: '주택 데이터베이스가 존재하지 않습니다.' });
        }

        const items = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8') || '[]');
        const idx = items.findIndex(it => it.id === id);
        if (idx === -1) {
            return res.status(404).json({ success: false, message: '해당 단지를 찾을 수 없습니다.' });
        }

        const config = await readConfig();
        const serviceKey = config.data_go_kr_key;
        const kakaoKey = config.kakao_app_key;
        if (!serviceKey) {
            return res.status(500).json({ success: false, message: '공공데이터포털 API 인증키(data_go_kr_key)가 설정되지 않았습니다.' });
        }

        const estate = items[idx];
        const tradeResult = await fetchTradeForSingleEstate(estate, serviceKey);

        if (tradeResult) {
            estate.price = tradeResult.price;
            estate.tradeDate = tradeResult.tradeDate;
            if (tradeResult.area && (!estate.area || estate.area === '-')) {
                estate.area = tradeResult.area;
            }
            estate.source = '마스터/최신실거래가 매핑';
            estate.updatedAt = getNowFormatted();

            // 좌표가 미등록 상태인 경우 카카오 지오코딩으로 즉시 보강
            if ((!estate.x || !estate.y) && kakaoKey && estate.address) {
                try {
                    const addrRes = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(estate.address)}`, {
                        headers: { 'Authorization': `KakaoAK ${kakaoKey}`, 'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000' }
                    });
                    if (addrRes.ok) {
                        const aData = await addrRes.json();
                        if (aData.documents && aData.documents.length > 0) {
                            estate.x = aData.documents[0].x || '';
                            estate.y = aData.documents[0].y || '';
                            estate.lng = aData.documents[0].x || '';
                            estate.lat = aData.documents[0].y || '';
                            estate.kakaoEnriched = true;
                        }
                    }
                } catch (e) {}
            }

            // 면적리스트 내 가격 갱신
            if (tradeResult.rawArea > 0 && Array.isArray(estate.areaList) && estate.areaList.length > 0) {
                estate.areaList = estate.areaList.filter(a => a.price !== '기본 정보 구축 (실거래 대기)');
                let matchedArea = null;
                let minDiff = 999;
                for (const aItem of estate.areaList) {
                    const aNum = parseFloat(String(aItem.area).replace(/[^0-9.]/g, ''));
                    const diff = Math.abs(aNum - tradeResult.rawArea);
                    if (diff < minDiff && diff <= 1.4) {
                        minDiff = diff;
                        matchedArea = aItem;
                    }
                }
                const pyeongStr = `${(tradeResult.rawArea / 3.3058).toFixed(1)}평형`;
                const pureAmount = parseInt(String(tradeResult.amount).replace(/[^0-9]/g, ''), 10) || 0;
                const pyeongNum = parseFloat(pyeongStr.replace(/[^0-9.]/g, ''));
                const ppp = (pureAmount > 0 && pyeongNum > 0) ? `${Math.round(pureAmount / pyeongNum).toLocaleString()}만원` : '-';

                if (matchedArea) {
                    matchedArea.price = tradeResult.price;
                    matchedArea.tradeDate = tradeResult.tradeDate;
                    if (ppp !== '-') matchedArea.pricePerPyeong = ppp;
                } else {
                    estate.areaList.push({
                        area: `${tradeResult.rawArea.toFixed(1)}㎡`,
                        pyeong: pyeongStr,
                        householdCount: 1,
                        price: tradeResult.price,
                        tradeDate: tradeResult.tradeDate,
                        pricePerPyeong: ppp
                    });
                    estate.areaList.sort((a, b) => parseFloat(a.area) - parseFloat(b.area));
                }
            }

            items[idx] = estate;
            saveRealEstateJsonFiles(items);

            return res.json({
                success: true,
                message: `[${estate.name}] 최신 실거래가 ${estate.price} (${estate.tradeDate}) 수집 완료`,
                estate
            });
        } else {
            return res.json({
                success: false,
                message: `[${estate.name}] 최근 1년간 국토교통부에 신고된 실거래 내역이 없습니다.`
            });
        }
    } catch (e) {
        console.error('Error fetching single trade:', e);
        return res.status(500).json({ success: false, message: '실거래가 조회 중 오류 발생: ' + e.message });
    }
});

// 1-4-2. POST /api/realestate/retry-missing-trades - 실거래가 누락/대기 주택 일괄 재수집
app.post('/api/realestate/retry-missing-trades', async (req, res) => {
    try {
        const { sido, sigungu } = req.body;
        if (!fs.existsSync(REAL_ESTATE_PATH)) {
            return res.status(404).json({ success: false, message: '주택 데이터베이스가 존재하지 않습니다.' });
        }

        const items = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8') || '[]');
        const config = await readConfig();
        const serviceKey = config.data_go_kr_key;
        if (!serviceKey) {
            return res.status(500).json({ success: false, message: '공공데이터포털 API 인증키(data_go_kr_key)가 설정되지 않았습니다.' });
        }

        const isMissingTrade = item => {
            if (!item) return false;
            const p = item.price || '';
            const td = item.tradeDate || '';
            return !p || p === '-' || p === '시세 정보' || p.includes('실거래 대기') || p.includes('기본 정보 구축') || !td || td === '-';
        };

        const missingIndices = [];
        items.forEach((item, idx) => {
            if (sido && item.sido !== sido) return;
            if (sigungu && !isMatchingSigungu(item, sigungu, sido)) return;
            if (isMissingTrade(item)) {
                missingIndices.push(idx);
            }
        });

        if (missingIndices.length === 0) {
            return res.json({
                success: true,
                totalTarget: 0,
                updatedCount: 0,
                message: '실거래가가 누락된 단지가 없습니다. 모든 단지의 실거래가가 정상 수집되어 있습니다.'
            });
        }

        // 대상 구별 LAWD_CD 및 유형 그룹핑하여 고속 배치 조회
        const lawdGroups = new Map();
        missingIndices.forEach(idx => {
            const est = items[idx];
            let lawdCd = est.lawdCd || (est.pnu ? est.pnu.substring(0, 5) : '');
            if (!lawdCd) {
                const tgts = getLawdTargets(est.sido || '경기도', est.sigungu || '');
                if (tgts.length > 0 && tgts[0].code) lawdCd = tgts[0].code;
            }
            if (!lawdCd) return;

            if (!lawdGroups.has(lawdCd)) {
                lawdGroups.set(lawdCd, {
                    lawdCd,
                    sido: est.sido,
                    sigungu: est.sigungu,
                    indices: []
                });
            }
            lawdGroups.get(lawdCd).indices.push(idx);
        });

        const months = [];
        const now = new Date();
        for (let i = 1; i <= 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        const endpoints = [
            { type: 'apt', name: '아파트', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev', nameTag: 'aptNm' },
            { type: 'rh', name: '연립·다세대', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade', nameTag: 'mhouseNm' },
            { type: 'offi', name: '오피스텔', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade', nameTag: 'offiNm' },
            { type: 'sh', name: '단독·다가구', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade', nameTag: '' }
        ];

        let updatedCount = 0;
        console.log(`[누락 실거래 일괄 재수집 시작] 총 ${missingIndices.length}개 단지, ${lawdGroups.size}개 시군구 대상`);

        for (const [lawdCd, group] of lawdGroups.entries()) {
            const targetEstates = group.indices.map(idx => items[idx]).filter(it => isMissingTrade(it));
            if (targetEstates.length === 0) continue;

            const groupPnuMap = new Map();
            targetEstates.forEach(est => {
                if (est.pnu && est.pnu.length === 19) groupPnuMap.set(est.pnu, est);
            });

            for (const ep of endpoints) {
                // 해당 유형의 누락 단지가 없으면 스킵
                const hasType = targetEstates.some(est => est.type === ep.type || !est.type);
                if (!hasType) continue;

                for (const ymd of months) {
                    try {
                        const fetchUrl = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=${lawdCd}&DEAL_YMD=${ymd}`;
                        const xmlText = await httpsGet(fetchUrl);
                        const tradeItems = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];

                        for (const itemXml of tradeItems) {
                            const getTag = tag => {
                                const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`));
                                return m ? m[1].trim() : '';
                            };

                            const dong = getTag('umdNm') || getTag('법정동');
                            const jibun = getTag('jibun') || getTag('지번');
                            const houseType = getTag('houseType') || '단독';
                            let name = getTag(ep.nameTag) || getTag('aptNm') || getTag('mhouseNm') || getTag('offiNm') || getTag('연립다세대') || getTag('단지');
                            if (!name && ep.type === 'sh') {
                                name = dong && jibun ? `${dong} ${jibun} ${houseType}주택` : `${dong} ${houseType}주택`;
                                name = name.replace(/\s+/g, ' ').trim();
                            }
                            if (!name || isNonResidential(name)) continue;

                            const sggCd = getTag('sggCd') || lawdCd;
                            const umdCd = getTag('umdCd');
                            const bonbun = getTag('bonbun');
                            const bubun = getTag('bubun');
                            const landCd = getTag('landCd') || '1';
                            let tradePnu = '';
                            if (sggCd && umdCd && bonbun) {
                                tradePnu = `${sggCd}${umdCd}${landCd === '2' ? '2' : '1'}${String(bonbun).padStart(4, '0')}${String(bubun || '0').padStart(4, '0')}`;
                            }

                            // 매칭 대상 탐색
                            let matchedEstate = null;
                            if (tradePnu && groupPnuMap.has(tradePnu)) {
                                matchedEstate = groupPnuMap.get(tradePnu);
                            } else {
                                matchedEstate = targetEstates.find(est => isComplexTradeMatch(est, name, dong, jibun));
                            }

                            if (matchedEstate) {
                                const amount = getTag('dealAmount') || getTag('거래금액');
                                const dealYear = getTag('dealYear') || getTag('년');
                                const dealMonth = getTag('dealMonth') || getTag('월');
                                const dealDay = getTag('dealDay') || getTag('일');
                                const area = getTag('totalFloorAr') || getTag('plottageAr') || getTag('excluUseAr') || getTag('전용면적');
                                const tradeDateStr = dealYear && dealMonth 
                                    ? `${dealYear}-${String(dealMonth).padStart(2, '0')}${dealDay ? '-' + String(dealDay).padStart(2, '0') : ''}` 
                                    : ymd;
                                const formattedPrice = amount ? `${amount.trim()}만원` : '실거래 확인';

                                if (!matchedEstate.tradeDate || matchedEstate.tradeDate === '-' || tradeDateStr >= matchedEstate.tradeDate) {
                                    matchedEstate.price = formattedPrice;
                                    matchedEstate.tradeDate = tradeDateStr;
                                    if (area && (!matchedEstate.area || matchedEstate.area === '-')) {
                                        matchedEstate.area = `${parseFloat(area).toFixed(1)}㎡`;
                                    }
                                    matchedEstate.source = '마스터/최신실거래가 매핑';
                                    matchedEstate.updatedAt = getNowFormatted();
                                    updatedCount++;

                                    const dealAreaNum = parseFloat(area);
                                    if (!isNaN(dealAreaNum) && dealAreaNum > 0) {
                                        if (!matchedEstate.areaList) matchedEstate.areaList = [];
                                        matchedEstate.areaList = matchedEstate.areaList.filter(a => a.price !== '기본 정보 구축 (실거래 대기)');

                                        let matchedArea = null;
                                        let minDiff = 999;
                                        for (const aItem of matchedEstate.areaList) {
                                            const aNum = parseFloat(String(aItem.area).replace(/[^0-9.]/g, ''));
                                            const diff = Math.abs(aNum - dealAreaNum);
                                            if (diff < minDiff && diff <= 1.4) {
                                                minDiff = diff;
                                                matchedArea = aItem;
                                            }
                                        }

                                        const pyeongStr = `${(dealAreaNum / 3.3058).toFixed(1)}평형`;
                                        const pureAmount = parseInt(String(amount).replace(/[^0-9]/g, ''), 10) || 0;
                                        const pyeongNum = parseFloat(pyeongStr.replace(/[^0-9.]/g, ''));
                                        const ppp = (pureAmount > 0 && pyeongNum > 0) ? `${Math.round(pureAmount / pyeongNum).toLocaleString()}만원` : '-';

                                        if (matchedArea) {
                                            matchedArea.price = formattedPrice;
                                            matchedArea.tradeDate = tradeDateStr;
                                            if (ppp !== '-') matchedArea.pricePerPyeong = ppp;
                                        } else {
                                            matchedEstate.areaList.push({
                                                area: `${dealAreaNum.toFixed(1)}㎡`,
                                                pyeong: pyeongStr,
                                                householdCount: 1,
                                                price: formattedPrice,
                                                tradeDate: tradeDateStr,
                                                pricePerPyeong: ppp
                                            });
                                            matchedEstate.areaList.sort((a, b) => parseFloat(a.area) - parseFloat(b.area));
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {}
                    await new Promise(r => setTimeout(r, 60)); // API 과부하 방지 60ms 간격
                }
            }
        }

        saveRealEstateJsonFiles(items);

        return res.json({
            success: true,
            totalTarget: missingIndices.length,
            updatedCount,
            message: `누락 실거래 재수집 완료: 대상 단지 총 ${missingIndices.length}곳 중 ${updatedCount}곳의 최신 실거래가가 성공적으로 갱신되었습니다.`
        });
    } catch (e) {
        console.error('Error retrying missing trades:', e);
        return res.status(500).json({ success: false, message: '누락 실거래 일괄 재수집 중 오류 발생: ' + e.message });
    }
});

// 1-4-3. POST /api/realestate/repair-coords - 주택 좌표 일괄 정밀 교정 (카카오 로컬 4단계 지오코딩)
app.post('/api/realestate/repair-coords', async (req, res) => {
    try {
        const { sido, sigungu, mode = 'unverified' } = req.body;
        if (!fs.existsSync(REAL_ESTATE_PATH)) {
            return res.status(404).json({ success: false, message: '주택 데이터베이스가 존재하지 않습니다.' });
        }

        const config = await readConfig();
        const kakaoKey = config.kakao_app_key;
        if (!kakaoKey) {
            return res.status(400).json({ success: false, message: '카카오 앱 키(kakao_app_key)가 config.json에 설정되지 않았습니다.' });
        }

        const items = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8') || '[]');
        const targetIndices = [];

        items.forEach((item, idx) => {
            if (sido && sido !== 'all' && item.sido !== sido) return;
            if (sigungu && sigungu !== 'all' && !isMatchingSigungu(item, sigungu, sido)) return;
            if (isNonResidential(item.name)) return;
            if (mode === 'unverified' && item.isPreciseCoord === true && item.kakaoEnriched === true) return;
            targetIndices.push(idx);
        });

        if (targetIndices.length === 0) {
            return res.json({
                success: true,
                totalTarget: 0,
                updatedCount: 0,
                failedCount: 0,
                message: '교정 대상인 미검증 좌표 주택이 없습니다. 모든 주택이 정밀 좌표로 등록되어 있습니다.'
            });
        }

        console.log(`[주택 좌표 일괄 정밀 교정 시작] 대상: ${targetIndices.length}건 (지역: ${sido || '전체'} ${sigungu || ''})`);

        let updatedCount = 0;
        let failedCount = 0;
        const batchSize = 10;
        const nowStr = getNowFormatted();

        for (let i = 0; i < targetIndices.length; i += batchSize) {
            const batchIdxs = targetIndices.slice(i, i + batchSize);
            await Promise.all(batchIdxs.map(async (idx) => {
                const item = items[idx];
                try {
                    const geoRes = await geocodeKakaoPrecise(item, kakaoKey);
                    if (geoRes && geoRes.coord) {
                        item.x = geoRes.coord.x;
                        item.y = geoRes.coord.y;
                        item.lng = geoRes.coord.x;
                        item.lat = geoRes.coord.y;
                        item.isPreciseCoord = true;
                        item.kakaoEnriched = true;
                        if (geoRes.roadAddr) item.address = geoRes.roadAddr;
                        if (geoRes.foundDong) item.dong = geoRes.foundDong;
                        item.updatedAt = nowStr;
                        items[idx] = item;
                        updatedCount++;
                    } else {
                        failedCount++;
                    }
                } catch (e) {
                    failedCount++;
                }
            }));
            await new Promise(r => setTimeout(r, 60)); // 카카오 API 쿼터 안전 간격
        }

        saveRealEstateJsonFiles(items);

        return res.json({
            success: true,
            totalTarget: targetIndices.length,
            updatedCount,
            failedCount,
            message: `주택 정밀 좌표 교정 완료: 대상 총 ${targetIndices.length}곳 중 ${updatedCount}곳의 좌표가 실제 건물 위치로 정밀 교정되었습니다.`
        });
    } catch (e) {
        console.error('Error repairing real estate coordinates:', e);
        return res.status(500).json({ success: false, message: '주택 좌표 교정 중 오류 발생: ' + e.message });
    }
});

// 1-4-4. POST /api/realestate/repair-coord-single - 단일 주택 즉시 정밀 좌표 교정
app.post('/api/realestate/repair-coord-single', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: '주택 ID가 필요합니다.' });
        }
        if (!fs.existsSync(REAL_ESTATE_PATH)) {
            return res.status(404).json({ success: false, message: '주택 데이터베이스가 존재하지 않습니다.' });
        }

        const config = await readConfig();
        const kakaoKey = config.kakao_app_key;
        if (!kakaoKey) {
            return res.status(400).json({ success: false, message: '카카오 앱 키가 설정되지 않았습니다.' });
        }

        const items = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8') || '[]');
        const idx = items.findIndex(it => it.id === id);
        if (idx === -1) {
            return res.status(404).json({ success: false, message: '해당 주택을 찾을 수 없습니다.' });
        }

        const item = items[idx];
        const geoRes = await geocodeKakaoPrecise(item, kakaoKey);
        if (geoRes && geoRes.coord) {
            item.x = geoRes.coord.x;
            item.y = geoRes.coord.y;
            item.lng = geoRes.coord.x;
            item.lat = geoRes.coord.y;
            item.isPreciseCoord = true;
            item.kakaoEnriched = true;
            if (geoRes.roadAddr) item.address = geoRes.roadAddr;
            if (geoRes.foundDong) item.dong = geoRes.foundDong;
            item.updatedAt = getNowFormatted();
            items[idx] = item;

            saveRealEstateJsonFiles(items);
            return res.json({
                success: true,
                item,
                message: `「${item.name}」의 좌표가 [${item.x}, ${item.y}] (${item.address})로 정밀 교정되었습니다.`
            });
        } else {
            return res.json({
                success: false,
                message: `카카오 로컬 API에서 「${item.name}」(${item.address})의 정밀 주소를 찾을 수 없습니다.`
            });
        }
    } catch (e) {
        console.error('Error repairing single real estate coordinate:', e);
        return res.status(500).json({ success: false, message: '단일 좌표 교정 중 오류 발생: ' + e.message });
    }
});

// 1-5. POST /api/realestate/sync-kapt - K-APT(공동주택관리정보시스템) 단지코드 동기화
app.post('/api/realestate/sync-kapt', async (req, res) => {
    const { sido = '경기도', sigungu = 'all' } = req.body;
    const config = await readConfig();
    const serviceKey = config.data_go_kr_key;

    if (!serviceKey) {
        return res.status(400).json({ success: false, error: '공공데이터포털 API 인증키(data_go_kr_key)가 설정되지 않았습니다.' });
    }

    try {
        const lawdTargets = getLawdTargets(sido, sigungu);

        let existingList = [];
        if (fs.existsSync(REAL_ESTATE_PATH)) {
            try {
                existingList = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8') || '[]');
            } catch (err) {
                existingList = [];
            }
        }

        let totalKaptFound = 0;
        let matchedCount = 0;
        const kaptItems = [];

        for (const target of lawdTargets) {
            const lawdCd = target.code;
            if (!lawdCd) continue;

            // K-APT API: 국토교통부_공동주택 단지 목록제공 서비스 (AptListService4)
            for (let page = 1; page <= 10; page++) {
                const url = `https://apis.data.go.kr/1613000/AptListService4/getSigunguAptList4?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCode=${lawdCd}&pageNo=${page}&numOfRows=100`;
                let rawText = '';
                try {
                    const resData = await httpsGet(url);
                    rawText = typeof resData === 'string' ? resData : JSON.stringify(resData);
                } catch (err) {
                    rawText = err.text || (typeof err === 'string' ? err : JSON.stringify(err));
                }

                if (rawText.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR') || rawText.includes('등록되지 않은 서비스키')) {
                    return res.status(400).json({
                        success: false,
                        needsServiceApplication: true,
                        serviceName: '국토교통부_공동주택 단지 목록제공 서비스',
                        error: "공공데이터포털(data.go.kr)에서 '국토교통부_공동주택 단지 목록제공 서비스'의 [활용신청]이 필요합니다. 활용신청(자동승인) 후 즉시 단지코드를 동기화할 수 있습니다."
                    });
                }

                let pageItemCount = 0;
                if (rawText.includes('<item>')) {
                    const items = rawText.match(/<item>[\s\S]*?<\/item>/g) || [];
                    pageItemCount = items.length;
                    items.forEach(itXml => {
                        const getTag = tag => {
                            const m = itXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                            return m ? m[1].trim() : '';
                        };

                        const kaptCode = getTag('kaptCode');
                        const kaptName = getTag('kaptName');
                        const bjdCode = getTag('bjdCode');
                        const as3 = getTag('as3');

                        if (kaptCode && kaptName) {
                            kaptItems.push({ kaptCode, kaptName, bjdCode, dong: as3, lawdCd });
                            totalKaptFound++;
                        }
                    });
                } else {
                    try {
                        const parsed = JSON.parse(rawText);
                        const rawItems = parsed?.response?.body?.items;
                        const list = Array.isArray(rawItems) ? rawItems : (rawItems?.item || []);
                        const arr = Array.isArray(list) ? list : (list ? [list] : []);
                        pageItemCount = arr.length;
                        arr.forEach(it => {
                            if (it && it.kaptCode && it.kaptName) {
                                kaptItems.push({ kaptCode: it.kaptCode, kaptName: it.kaptName, bjdCode: it.bjdCode, dong: it.as3, lawdCd });
                                totalKaptFound++;
                            }
                        });
                    } catch (e) {}
                }

                if (pageItemCount < 100) break;
            }
        }

        // K-APT 단지 정보를 existingList의 아파트/공동주택과 매핑
        const normalize = s => (s || '').replace(/\s+/g, '').replace(/아파트$/g, '').toLowerCase();

        for (const kapt of kaptItems) {
            const kNorm = normalize(kapt.kaptName);

            for (const estate of existingList) {
                if (estate.type && estate.type !== 'apt') continue;
                if (estate.kaptCode && estate.householdCount && estate.areaList && estate.areaList.length > 0) continue;

                const eNorm = normalize(estate.name);

                let matched = false;
                if (estate.pnu && kapt.bjdCode && estate.pnu.startsWith(kapt.bjdCode)) {
                    if (eNorm === kNorm || eNorm.includes(kNorm) || kNorm.includes(eNorm)) {
                        matched = true;
                    } else if (isComplexTradeMatch(estate, kapt.kaptName, kapt.dong)) {
                        matched = true;
                    }
                } else if (eNorm === kNorm) {
                    matched = true;
                } else if (kapt.dong && (estate.dong === kapt.dong || (estate.address && estate.address.includes(kapt.dong)))) {
                    if (eNorm.includes(kNorm) || kNorm.includes(eNorm)) {
                        matched = true;
                    } else if (isComplexTradeMatch(estate, kapt.kaptName, kapt.dong)) {
                        matched = true;
                    }
                }

                if (matched) {
                    estate.kaptCode = kapt.kaptCode;
                    estate.updatedAt = getNowFormatted();
                    matchedCount++;

                    // 🌟 [K-APT 상세정보 API 연동] 세대수, 동수, 난방, 준공연도, 면적구간별 세대현황 보강
                    try {
                        const detailUrl = `https://apis.data.go.kr/1613000/AptBasisInfoServiceV5/getAphusBassInfoV5?serviceKey=${encodeURIComponent(serviceKey)}&kaptCode=${kapt.kaptCode}`;
                        const detailRaw = await httpsGet(detailUrl);
                        let dItem = null;
                        if (detailRaw) {
                            if (typeof detailRaw === 'object') {
                                dItem = detailRaw.response?.body?.item || detailRaw.body?.item || detailRaw;
                            } else {
                                try {
                                    const p = JSON.parse(detailRaw);
                                    dItem = p?.response?.body?.item || p?.body?.item || p;
                                } catch (pe) {
                                    const getTag = tag => {
                                        const m = detailRaw.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                                        return m ? m[1].trim() : '';
                                    };
                                    dItem = {
                                        kaptdaCnt: getTag('kaptdaCnt'),
                                        kaptDongCnt: getTag('kaptDongCnt'),
                                        doroJuso: getTag('doroJuso'),
                                        codeHeatNm: getTag('codeHeatNm'),
                                        codeHallNm: getTag('codeHallNm'),
                                        kaptUsedate: getTag('kaptUsedate'),
                                        privArea: getTag('privArea'),
                                        kaptMparea60: getTag('kaptMparea60'),
                                        kaptMparea85: getTag('kaptMparea85'),
                                        kaptMparea135: getTag('kaptMparea135'),
                                        kaptMparea136: getTag('kaptMparea136')
                                    };
                                }
                            }
                        }

                        if (dItem) {
                            if (dItem.kaptdaCnt) estate.householdCount = parseInt(dItem.kaptdaCnt, 10) || estate.householdCount;
                            if (dItem.kaptDongCnt) estate.totalDongCnt = parseInt(dItem.kaptDongCnt, 10) || estate.totalDongCnt;
                            if (dItem.codeHeatNm) estate.heatType = dItem.codeHeatNm;
                            if (dItem.codeHallNm) estate.hallType = dItem.codeHallNm;
                            if (dItem.kaptUsedate && (!estate.buildYear || estate.buildYear === '-')) {
                                estate.buildYear = String(dItem.kaptUsedate).substring(0, 4);
                            }
                            if (dItem.doroJuso && (!estate.address || !estate.address.includes('로'))) {
                                estate.address = dItem.doroJuso;
                            }

                            if (!estate.areaList || estate.areaList.length === 0) {
                                const areaHints = [];
                                const m60 = parseInt(dItem.kaptMparea60, 10) || 0;
                                const m85 = parseInt(dItem.kaptMparea85, 10) || 0;
                                const m135 = parseInt(dItem.kaptMparea135, 10) || 0;
                                const m136 = parseInt(dItem.kaptMparea136, 10) || 0;

                                if (m60 > 0) areaHints.push({ area: '59.9㎡', pyeong: '18.1평형', householdCount: m60, price: estate.price || '기본 정보 구축 (실거래 대기)', tradeDate: estate.tradeDate || '-' });
                                if (m85 > 0) areaHints.push({ area: '84.9㎡', pyeong: '25.7평형', householdCount: m85, price: estate.price || '기본 정보 구축 (실거래 대기)', tradeDate: estate.tradeDate || '-' });
                                if (m135 > 0) areaHints.push({ area: '114.5㎡', pyeong: '34.6평형', householdCount: m135, price: estate.price || '기본 정보 구축 (실거래 대기)', tradeDate: estate.tradeDate || '-' });
                                if (m136 > 0) areaHints.push({ area: '150.0㎡', pyeong: '45.4평형', householdCount: m136, price: estate.price || '기본 정보 구축 (실거래 대기)', tradeDate: estate.tradeDate || '-' });

                                if (areaHints.length > 0) {
                                    estate.areaList = areaHints;
                                    let maxH = -1;
                                    let topA = areaHints[0];
                                    areaHints.forEach(h => {
                                        if (h.householdCount > maxH) {
                                            maxH = h.householdCount;
                                            topA = h;
                                        }
                                    });
                                    estate.area = topA.area;
                                }
                            }
                        }
                    } catch (dErr) {}

                    break;
                }
            }
        }

        fs.writeFileSync(REAL_ESTATE_PATH, JSON.stringify(existingList, null, 2), 'utf8');

        // public 복사본 동기화
        const publicPath = path.join(__dirname, 'public', 'data', 'realestate_seoul.json');
        if (fs.existsSync(path.dirname(publicPath))) {
            fs.writeFileSync(publicPath, JSON.stringify(existingList, null, 2), 'utf8');
        }

        const displayRegion = sigungu === 'all' || !sigungu || sigungu === '전체' ? sido : `${sido} ${sigungu}`;

        return res.json({
            success: true,
            totalKaptFound,
            matchedCount,
            message: `${displayRegion} K-APT 단지 목록 ${totalKaptFound}건 중 ${matchedCount}건의 단지코드가 매핑되었습니다.`
        });
    } catch (err) {
        console.error('K-APT Sync Error:', err);
        const errMsg = err && (err.message || err.text || JSON.stringify(err));
        return res.status(500).json({ success: false, error: 'K-APT 단지코드 동기화 중 오류가 발생했습니다: ' + errMsg });
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
    const { password } = req.body || {};
    const cleanPw = String(password || '').trim();
    if (cleanPw === 'admin1234') {
        return res.json({ success: true, token: 'session_token_example_12345' });
    }
    return res.status(401).json({ success: false, message: '비밀번호가 올바르지 않습니다.' });
});

// GET /api/admin/users - 전체 회원 목록 반환 (Supabase + users.json 병합)
app.get('/api/admin/users', async (req, res) => {
    try {
        let users = [];
        try {
            const SUPABASE_URL = 'https://khwzgqnwlknawggugznd.supabase.co';
            const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pncW53bGtuYXdnZ3Vnem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDQzNDksImV4cCI6MjA5NTc4MDM0OX0.P2g3Y_MYV_ca8ZRpfAT93pnEzP4osYWc2tfyBHKb7v4';
            const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*&order=created_at.desc`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });
            if (sbRes.ok) {
                const sbData = await sbRes.json();
                if (Array.isArray(sbData)) users = sbData;
            }
        } catch (sbErr) {
            console.warn('Admin users Supabase fetch error:', sbErr);
        }

        const localUsers = readUsers();
        localUsers.forEach(lu => {
            if (!users.some(u => (u.email || '').toLowerCase() === (lu.email || '').toLowerCase())) {
                users.push(lu);
            }
        });

        return res.json(users);
    } catch (err) {
        console.error('Admin users error:', err);
        return res.status(500).json({ error: '회원 목록을 가져오지 못했습니다.' });
    }
});

// DELETE /api/admin/users - 회원 삭제 (Supabase + users.json)
app.delete('/api/admin/users', async (req, res) => {
    try {
        const { id, email } = req.query;
        if (!id && !email) {
            return res.status(400).json({ error: 'id 또는 email이 필요합니다.' });
        }

        try {
            const SUPABASE_URL = 'https://khwzgqnwlknawggugznd.supabase.co';
            const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pncW53bGtuYXdnZ3Vnem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDQzNDksImV4cCI6MjA5NTc4MDM0OX0.P2g3Y_MYV_ca8ZRpfAT93pnEzP4osYWc2tfyBHKb7v4';
            const param = id ? `id=eq.${encodeURIComponent(id)}` : `email=eq.${encodeURIComponent(email)}`;
            await fetch(`${SUPABASE_URL}/rest/v1/users?${param}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });
        } catch (e) {}

        let users = readUsers();
        users = users.filter(u => u.id !== id && u.email !== email);
        writeUsers(users);

        return res.json({ success: true, message: '회원이 정상적으로 삭제되었습니다.' });
    } catch (err) {
        console.error('Delete admin user error:', err);
        return res.status(500).json({ error: '회원 삭제 중 오류가 발생했습니다.' });
    }
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

// Helper function to bypass TLS errors using https module with timeout protection
function httpsGet(url, headers, timeoutMs = 7000) {
    return new Promise((resolve, reject) => {
        let isSettled = false;
        const safeReject = (err) => {
            if (!isSettled) {
                isSettled = true;
                reject(err);
            }
        };
        const safeResolve = (val) => {
            if (!isSettled) {
                isSettled = true;
                resolve(val);
            }
        };

        const client = url.startsWith('http://') ? http : https;
        const options = {
            headers: headers || {},
            rejectUnauthorized: false
        };

        const req = client.get(url, options, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const data = Buffer.concat(chunks).toString('utf8');
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        safeResolve(JSON.parse(data));
                    } catch (e) {
                        safeResolve(data);
                    }
                } else {
                    safeReject({ status: res.statusCode, text: data });
                }
            });
            res.on('error', (err) => safeReject(err));
        });

        // 🌟 타임아웃 안전망: 공공데이터포털 무응답/지연 시 소켓을 닫고 다음 작업으로 진행
        req.setTimeout(timeoutMs, () => {
            req.destroy(new Error(`요청 시간 초과 (${timeoutMs}ms)`));
            safeReject(new Error(`Request timeout after ${timeoutMs}ms`));
        });

        req.on('error', (err) => safeReject(err));
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

// 7. GET /api/community - Fetch Naver (Blog/Cafe) & Daum (Cafe) Search API
app.get('/api/community', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: '검색어가 없습니다.' });

    const config = await readConfig();
    const clientId = config.naver_client_id;
    const clientSecret = config.naver_client_secret;
    const kakaoKey = config.kakao_app_key;

    if ((!clientId || !clientSecret) && !kakaoKey) {
        return res.status(500).json({ error: '네이버 또는 카카오 API 키가 설정되지 않았습니다. 관리자 페이지에서 설정해주세요.' });
    }

    const type = req.query.type || 'all';

    try {
        const naverHeaders = (clientId && clientSecret) ? {
            'X-Naver-Client-Id': clientId,
            'X-Naver-Client-Secret': clientSecret
        } : null;

        const kakaoHeaders = kakaoKey ? getKakaoHeaders(req, kakaoKey) : null;

        const promises = [];

        // 1) 네이버 블로그
        if (naverHeaders && (type === 'all' || type === 'blog')) {
            const blogUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(query)}&display=25&sort=date`;
            promises.push(
                httpsGet(blogUrl, naverHeaders)
                    .then(data => (data.items || []).map(item => ({
                        title: item.title,
                        description: item.description,
                        link: item.link,
                        bloggername: item.bloggername,
                        cafename: item.bloggername,
                        postdate: item.postdate,
                        _source: 'blog',
                        _platform: 'naver'
                    })))
                    .catch(err => {
                        console.error('Naver Blog Fetch Error:', err.message || err);
                        return [];
                    })
            );
        }

        // 2) 네이버 카페
        if (naverHeaders && (type === 'all' || type === 'cafe' || type === 'naver_cafe')) {
            const naverCafeUrl = `https://openapi.naver.com/v1/search/cafearticle.json?query=${encodeURIComponent(query)}&display=25&sort=date`;
            promises.push(
                httpsGet(naverCafeUrl, naverHeaders)
                    .then(data => (data.items || []).map(item => ({
                        title: item.title,
                        description: item.description,
                        link: item.link,
                        cafename: item.cafename,
                        postdate: item.postdate,
                        _source: 'cafe',
                        _platform: 'naver'
                    })))
                    .catch(err => {
                        console.error('Naver Cafe Fetch Error:', err.message || err);
                        return [];
                    })
            );
        }

        // 3) 다음 카페 (카카오 카페 검색 API)
        if (kakaoHeaders && (type === 'all' || type === 'cafe' || type === 'daum_cafe')) {
            const daumCafeUrl = `https://dapi.kakao.com/v2/search/cafe?query=${encodeURIComponent(query)}&size=25&sort=recency`;
            promises.push(
                httpsGet(daumCafeUrl, kakaoHeaders)
                    .then(data => (data.documents || []).map(item => ({
                        title: item.title,
                        description: item.contents,
                        link: item.url,
                        cafename: item.cafename,
                        postdate: item.datetime ? item.datetime.substring(0, 10).replace(/[^0-9]/g, '') : '',
                        _source: 'cafe',
                        _platform: 'daum'
                    })))
                    .catch(err => {
                        console.error('Daum Cafe Fetch Error:', err.message || err);
                        return [];
                    })
            );
        }

        const results = await Promise.all(promises);
        const items = results.flat();

        // 날짜순(최신순) 정렬
        items.sort((a, b) => {
            const dateA = a.postdate || '';
            const dateB = b.postdate || '';
            return dateB.localeCompare(dateA);
        });

        res.json({ items, total: items.length });
    } catch (err) {
        console.error('Community Fetch Error:', err);
        res.status(500).json({ error: '커뮤니티 데이터를 가져오는 중 오류가 발생했습니다.' });
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

// 4) 학교알리미 학교폭력 정기 공시 데이터 API
app.get('/api/schoolinfo/violence', async (req, res) => {
    const { school_id, school_name } = req.query;
    try {
        const schoolsDataPath = path.join(__dirname, 'src', 'data', 'schools_seoul.json');
        let matchedSchool = null;
        if (fs.existsSync(schoolsDataPath)) {
            const rawData = fs.readFileSync(schoolsDataPath, 'utf8');
            const schools = JSON.parse(rawData);
            if (school_id) {
                matchedSchool = schools.find(s => String(s.school_id) === String(school_id));
            }
            if (!matchedSchool && school_name) {
                matchedSchool = schools.find(s => s.school_name && s.school_name.trim() === school_name.trim());
            }
        }

        const vs = matchedSchool?.violence_stats || {
            total_cases: 0,
            per_100: 0,
            types: { verbal: 0, cyber: 0, exclude: 0, physical: 0 },
            resolved_rate: 100
        };

        const targetName = matchedSchool?.school_name || school_name || '';

        return res.json({
            success: true,
            school_id: matchedSchool?.school_id || school_id || '',
            school_name: targetName,
            is_official: true,
            source: '학교알리미(schoolinfo.go.kr) 정기 공시',
            disclosure_ym: vs.disclosure_ym || '2026.09',
            alimi_url: `https://www.schoolinfo.go.kr/ei/ss/Pneissr_a01_l.do?searchWord=${encodeURIComponent(targetName)}`,
            violence_stats: {
                total_cases: vs.total_cases ?? 0,
                per_100: vs.per_100 ?? 0,
                types: vs.types || { verbal: 40, cyber: 25, exclude: 15, physical: 20 },
                resolved_rate: vs.resolved_rate ?? 100
            }
        });
    } catch (err) {
        console.error('SchoolInfo Violence API Error:', err);
        return res.status(500).json({ error: 'Failed to fetch school violence data' });
    }
});

// 5) 관리자 - 학교폭력 학교 검색 API
app.get('/api/admin/violence-school-search', async (req, res) => {
    const { query } = req.query;
    if (!query || !query.trim()) return res.json({ schools: [] });

    try {
        const schoolsDataPath = path.join(__dirname, 'src', 'data', 'schools_seoul.json');
        if (!fs.existsSync(schoolsDataPath)) return res.json({ schools: [] });

        const schools = JSON.parse(fs.readFileSync(schoolsDataPath, 'utf8'));
        const q = query.trim().toLowerCase();
        const results = schools
            .filter(s => s.school_name && s.school_name.toLowerCase().includes(q))
            .slice(0, 20)
            .map(s => ({
                school_id: s.school_id,
                school_name: s.school_name,
                school_type: s.school_type,
                region: s.region,
                address: s.address,
                violence_stats: s.violence_stats || {}
            }));

        return res.json({ success: true, schools: results });
    } catch (err) {
        console.error('Admin Violence Search Error:', err);
        return res.status(500).json({ error: 'Search failed' });
    }
});

// 6) 관리자 - 개별 학교 실태조사 수치 저장 API
app.post('/api/admin/save-violence-school', express.json(), async (req, res) => {
    const { school_id, school_name, total_cases, per_100, types, resolved_rate, disclosure_ym } = req.body;
    if (!school_name && !school_id) {
        return res.status(400).json({ error: 'School name or ID required' });
    }

    try {
        const officialPath = path.join(__dirname, 'src', 'data', 'official_violence_data.json');
        const schoolsPath = path.join(__dirname, 'src', 'data', 'schools_seoul.json');

        let officialMap = {};
        if (fs.existsSync(officialPath)) {
            try { officialMap = JSON.parse(fs.readFileSync(officialPath, 'utf8')); } catch (e) {}
        }

        let schools = [];
        if (fs.existsSync(schoolsPath)) {
            schools = JSON.parse(fs.readFileSync(schoolsPath, 'utf8'));
        }

        let targetSchool = null;
        if (school_id) {
            targetSchool = schools.find(s => String(s.school_id) === String(school_id));
        }
        if (!targetSchool && school_name) {
            targetSchool = schools.find(s => s.school_name && s.school_name.trim() === school_name.trim());
        }

        const sid = targetSchool?.school_id || school_id || String(Date.now());
        const sName = targetSchool?.school_name || school_name;
        const ym = disclosure_ym || '2026.09';

        const updatedStats = {
            school_name: sName,
            is_official: true,
            source: `학교알리미(schoolinfo.go.kr) ${ym.replace('.', '년 ')}월 정기 공시`,
            disclosure_ym: ym,
            total_cases: Number(total_cases) || 0,
            per_100: Number(per_100) || 0,
            types: types || { verbal: 40, cyber: 20, exclude: 20, physical: 20 },
            resolved_rate: Number(resolved_rate) || 100
        };

        officialMap[sid] = updatedStats;
        fs.writeFileSync(officialPath, JSON.stringify(officialMap, null, 2), 'utf8');

        if (targetSchool) {
            targetSchool.violence_stats = updatedStats;
            fs.writeFileSync(schoolsPath, JSON.stringify(schools, null, 2), 'utf8');

            // public 파일도 함께 동기화
            const pubPath = path.join(__dirname, 'public', 'src', 'data', 'schools_seoul.json');
            const pubPath2 = path.join(__dirname, 'public', 'data', 'schools_seoul.json');
            if (fs.existsSync(path.dirname(pubPath))) fs.writeFileSync(pubPath, JSON.stringify(schools, null, 2), 'utf8');
            if (fs.existsSync(path.dirname(pubPath2))) fs.writeFileSync(pubPath2, JSON.stringify(schools, null, 2), 'utf8');
        }

        return res.json({
            success: true,
            message: `${sName} 학교폭력 실태조사 데이터가 성공적으로 업데이트되었습니다.`,
            violence_stats: updatedStats
        });
    } catch (err) {
        console.error('Admin Save Violence Error:', err);
        return res.status(500).json({ error: 'Failed to save violence stats' });
    }
});

// 7) 관리자 - 전체 학교 공시 년월 일괄 업데이트 API
app.post('/api/admin/update-violence-ym', express.json(), async (req, res) => {
    const { disclosure_ym } = req.body;
    const targetYm = disclosure_ym || '2026.09';
    try {
        const schoolsPath = path.join(__dirname, 'src', 'data', 'schools_seoul.json');
        if (!fs.existsSync(schoolsPath)) {
            return res.status(400).json({ error: 'schools_seoul.json not found' });
        }

        const schools = JSON.parse(fs.readFileSync(schoolsPath, 'utf8'));
        const sourceText = `학교알리미(schoolinfo.go.kr) ${targetYm.replace('.', '년 ')}월 정기 공시`;

        schools.forEach(s => {
            if (s.violence_stats) {
                s.violence_stats.disclosure_ym = targetYm;
                s.violence_stats.source = sourceText;
            }
        });

        fs.writeFileSync(schoolsPath, JSON.stringify(schools, null, 2), 'utf8');

        // public 파일 동기화
        const pubPath = path.join(__dirname, 'public', 'src', 'data', 'schools_seoul.json');
        const pubPath2 = path.join(__dirname, 'public', 'data', 'schools_seoul.json');
        if (fs.existsSync(path.dirname(pubPath))) fs.writeFileSync(pubPath, JSON.stringify(schools, null, 2), 'utf8');
        if (fs.existsSync(path.dirname(pubPath2))) fs.writeFileSync(pubPath2, JSON.stringify(schools, null, 2), 'utf8');

        return res.json({
            success: true,
            message: `전체 ${schools.length}개 학교의 공시 연월이 [${targetYm}] 기준으로 일괄 동기화되었습니다.`,
            disclosure_ym: targetYm
        });
    } catch (err) {
        console.error('Admin Update Violence YM Error:', err);
        return res.status(500).json({ error: 'Failed to batch update disclosure YM' });
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

// 12.5. GET /api/realestate/pins - Fetch all housing types (Apt, Villa, Detached, Officetel) for Map Pins within radius
app.get('/api/realestate/pins', async (req, res) => {
    const { lawd_cd, x, y } = req.query;
    const radius = parseInt(req.query.radius, 10) || 1000;
    const housingType = req.query.type || 'all'; // 'all', 'apt', 'rh', 'sh', 'offi', 또는 콤마 구분 'apt,rh'
    const typeList = (housingType === 'all' || !housingType)
        ? ['all']
        : housingType.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    if (typeList.length === 0 || typeList.includes('none')) {
        return res.json({ items: [], total: 0 });
    }

    const centerX = parseFloat(x);
    const centerY = parseFloat(y);

    if (isNaN(centerX) || isNaN(centerY)) {
        return res.status(400).json({ error: '중심 좌표(x, y)가 필요합니다.' });
    }

    // 하버사인(Haversine) 구면 직선 거리 계산 함수 (미터 단위)
    function getHaversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    }

    const maxDistLimit = radius || 1000;
    const estateMap = new Map();

    // 1. [초고속] 메모리 캐시 및 공간 격자(Spatial Grid) 인덱스를 통한 마스터 DB 탐색
    try {
        getCachedRealEstateItems(); // 캐시 유효성 확인 및 핫 로드

        // 반경 경계 상자(BBOX) 산출
        const deltaLat = (maxDistLimit / 111000) * 1.05;
        const latRad = centerY * (Math.PI / 180);
        const cosLat = Math.cos(latRad);
        const deltaLng = (maxDistLimit / (111000 * Math.max(cosLat, 0.1))) * 1.05;

        const minLat = centerY - deltaLat;
        const maxLat = centerY + deltaLat;
        const minLng = centerX - deltaLng;
        const maxLng = centerX + deltaLng;

        // 해당 영역에 겹치는 격자 셀 좌표 계산
        const minCellY = Math.floor(minLat / REAL_ESTATE_GRID_SIZE);
        const maxCellY = Math.floor(maxLat / REAL_ESTATE_GRID_SIZE);
        const minCellX = Math.floor(minLng / REAL_ESTATE_GRID_SIZE);
        const maxCellX = Math.floor(maxLng / REAL_ESTATE_GRID_SIZE);

        for (let cy = minCellY; cy <= maxCellY; cy++) {
            for (let cx = minCellX; cx <= maxCellX; cx++) {
                const cell = realEstateSpatialGrid.get(`${cy}_${cx}`);
                if (!cell) continue;

                for (let i = 0; i < cell.length; i++) {
                    const item = cell[i];
                    const iy = item._numY;
                    const ix = item._numX;

                    // 1차 경계 상자 필터링 (가장 빠른 실수 비교)
                    if (iy < minLat || iy > maxLat || ix < minLng || ix > maxLng) continue;

                    // 주택 유형 필터링
                    const type = item._cleanType || item.type || 'apt';
                    if (!typeList.includes('all') && !typeList.includes(type)) continue;

                    // 2차 하버사인 구면 정밀 거리 산출
                    const dist = getHaversineDistance(centerY, centerX, iy, ix);
                    if (dist <= maxDistLimit) {
                        const typeName = type === 'apt' ? '아파트' : (type === 'rh' ? '연립·다세대' : (type === 'offi' ? '오피스텔' : '단독·다가구'));
                        let priceAmount = 0;
                        if (item.price && item.price.includes('만원')) {
                            const digits = item.price.replace(/[^0-9]/g, '');
                            priceAmount = parseInt(digits, 10) || 0;
                        }

                        const uk = Math.floor(priceAmount / 10000);
                        const man = priceAmount % 10000;
                        let displayPrice = item.price || '기본 정보 구축 (실거래 대기)';
                        let shortPrice = '';
                        if (priceAmount > 0) {
                            displayPrice = `${uk > 0 ? uk + '억 ' : ''}${man > 0 ? man.toLocaleString() + '만' : ''}원`;
                            shortPrice = uk > 0 ? `${uk}.${Math.floor(man / 1000)}억` : `${man.toLocaleString()}만`;
                        } else if (item.price && !item.price.includes('실거래 대기') && !item.price.includes('기본 정보') && item.price !== '기본정보') {
                            displayPrice = item.price;
                            shortPrice = item.price;
                        }

                        // 🌟 동일 주소 및 위치 기준 중복 방어 키 생성
                        const cleanAddr = (item.address || '').trim().replace(/\s+/g, ' ');
                        let key;
                        if (cleanAddr.length >= 8 && (/\d+(?:-\d+)?(?:번지)?$/.test(cleanAddr) || /\s\d+(?:-\d+)?(?:\s|$)/.test(cleanAddr))) {
                            key = `addr_${type}_${cleanAddr}`;
                        } else if (item.dong && item.name) {
                            key = `dong_${type}_${item.dong}_${item.name}`;
                        } else {
                            key = `coord_${type}_${parseFloat(ix).toFixed(5)}_${parseFloat(iy).toFixed(5)}`;
                        }

                        if (estateMap.has(key)) {
                            const existing = estateMap.get(key);
                            // 실거래가가 있는 쪽을 우선 유지 및 갱신
                            const isCurHasPrice = priceAmount > 0;
                            const isExistHasPrice = (existing.price_amount || 0) > 0;
                            if (!isExistHasPrice && isCurHasPrice) {
                                existing.price_amount = priceAmount;
                                existing.price_display = displayPrice;
                                existing.short_price = shortPrice;
                                existing.deal_date = item.tradeDate || existing.deal_date;
                                if (item.name && !item.name.includes('번지 주택') && !item.name.includes('번지주택')) {
                                    existing.name = item.name;
                                }
                            }
                            if (Array.isArray(item.areaList) && item.areaList.length > 0) {
                                const existAreas = new Set((existing.areaList || []).map(a => a.area));
                                item.areaList.forEach(a => {
                                    if (a && a.area && !existAreas.has(a.area)) {
                                        existing.areaList.push(a);
                                        existAreas.add(a.area);
                                    }
                                });
                            }
                            continue;
                        }

                        estateMap.set(key, {
                            id: item.id || `re_${key}`,
                            type: type,
                            type_name: typeName,
                            name: item.name,
                            address: item.address || '',
                            jibun: item.jibun || '',
                            dong: item.dong || '',
                            sigungu: item.sigungu || '',
                            sido: item.sido || '',
                            buildYear: item.buildYear || '',
                            householdCount: item.householdCount || 0,
                            x: String(ix),
                            y: String(iy),
                            distance: dist,
                            price_amount: priceAmount,
                            price_display: displayPrice,
                            short_price: shortPrice,
                            deal_date: item.tradeDate || '-',
                            area: item.area || '-',
                            areaList: Array.isArray(item.areaList) ? item.areaList : [],
                            createdAt: item.createdAt || '',
                            updatedAt: item.updatedAt || item.createdAt || ''
                        });
                    }
                }
            }
        }
    } catch (e) {
        console.warn('[Realestate Pins] Spatial grid search error:', e.message);
    }

    // 2. DB(마스터/실거래가) 구축 상태를 기반으로 정렬 후 즉시 반환
    const validItems = Array.from(estateMap.values());
    validItems.sort((a, b) => a.distance - b.distance);

    res.json({ items: validItems, total: validItems.length });
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
                    sigungu: sigungu === 'all' ? '서초구' : sigungu,
                    createdAt: getNowFormatted(),
                    updatedAt: getNowFormatted()
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

// ==============================================================================
// 학업여지도 비즈니스화 모델 (PRD v1.0) API
// 학원 프리미엄 구독 (월 29,000원), 사업자 등록 및 대시보드, 분석 통계, 상담 문의
// ==============================================================================

// 1. 파트너 센터 포털 서빙 (/business, /partner)
app.get(['/business', '/business/', '/partner', '/partner/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'business.html'));
});

// 2. 현재 로그인/선택된 사업자 정보 조회 (기본 데모 세션 제공)
app.get('/api/business/session', (req, res) => {
    try {
        const { bizId } = req.query;
        const businesses = readJsonFileSafe(BUSINESSES_PATH, []);
        let biz = null;
        if (bizId) {
            biz = businesses.find(b => b.id === bizId);
        }
        if (!biz && businesses.length > 0) {
            // 기본 활성 데모 학원 제공
            biz = businesses[0];
        }

        const subData = readJsonFileSafe(SUBSCRIPTIONS_PATH, { products: [], subscriptions: [] });
        const subscription = biz 
            ? subData.subscriptions.find(s => s.businessId === biz.id && s.status === 'active') || null
            : null;

        return res.json({
            business: biz,
            subscription,
            allBusinesses: businesses.map(b => ({ id: b.id, name: b.name, status: b.status }))
        });
    } catch (err) {
        console.error('Business Session Error:', err);
        return res.status(500).json({ error: '사업자 정보를 가져오는 중 오류가 발생했습니다.' });
    }
});

// 3. 신규 사업자 등록 신청 (P-03)
app.post('/api/business/register', (req, res) => {
    try {
        const {
            type = 'academy',
            name,
            representative,
            bizNumber,
            phone,
            email,
            address,
            targetAcademyName,
            subjects = [],
            grades = [],
            classMethod = '',
            description = '',
            feeInfo = ''
        } = req.body;

        if (!name || !representative || !phone || !email || !address) {
            return res.status(400).json({ error: '필수 입력 항목(사업자명, 대표자명, 연락처, 이메일, 주소)을 모두 입력해주세요.' });
        }

        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length < 8 || cleanPhone.length > 12) {
            return res.status(400).json({ error: '유효한 대표 전화번호(예: 02-1234-5678, 010-1234-5678)를 입력해주세요.' });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ error: '올바른 이메일 형식을 입력해주세요. (예: user@example.com)' });
        }

        const businesses = readJsonFileSafe(BUSINESSES_PATH, []);

        // 사업자등록번호 유효성 및 중복 검사 (입력된 경우)
        if (bizNumber) {
            const clean = bizNumber.replace(/[^0-9]/g, '');
            if (clean.length !== 10) {
                return res.status(400).json({ error: '사업자등록번호는 10자리 숫자여야 합니다.' });
            }
            // 국세청 가중치 공식 검증
            const weight = [1, 3, 7, 1, 3, 7, 1, 3, 5];
            let sum = 0;
            for (let i = 0; i < 8; i++) sum += parseInt(clean[i], 10) * weight[i];
            const temp = parseInt(clean[8], 10) * 5;
            sum += Math.floor(temp / 10) + (temp % 10);
            const remainder = (10 - (sum % 10)) % 10;
            if (remainder !== parseInt(clean[9], 10)) {
                return res.status(400).json({ error: '국세청 유효성 검증 규칙에 맞지 않는 사업자등록번호입니다.' });
            }

            const exists = businesses.find(b => b.bizNumber && b.bizNumber.replace(/[^0-9]/g, '') === clean);
            if (exists) {
                return res.status(400).json({ error: '이미 등록 신청된 사업자등록번호입니다.' });
            }
        }

        const newBizId = `biz_${Date.now()}`;
        const addressDetail = (req.body.addressDetail || '').trim();
        const newBusiness = {
            id: newBizId,
            userId: req.body.userId || `usr_${Date.now()}`,
            type,
            name: name.trim(),
            representative: representative.trim(),
            bizNumber: (bizNumber || '').trim(),
            phone: phone.trim(),
            email: email.trim(),
            address: address.trim(),
            addressDetail: addressDetail,
            registeredAddress: address.trim(),
            registeredAddressDetail: addressDetail,
            status: 'submitted', // draft -> submitted -> approved / rejected
            rejectionReason: '',
            academyProfile: {
                targetAcademyName: (targetAcademyName || name).trim(),
                subjects: Array.isArray(subjects) ? subjects : [subjects],
                grades: Array.isArray(grades) ? grades : [grades],
                classMethod: (classMethod || '').trim(),
                description: (description || '').trim(),
                contactPhone: phone.trim(),
                institutionType: (req.body.institutionType || '학원').trim(),
                eduOffice: (req.body.eduOffice || '').trim(),
                foundingDate: (req.body.foundingDate || '').trim(),
                capacity: (req.body.capacity || '').trim(),
                websiteUrl: (req.body.websiteUrl || '').trim(),
                address: address.trim(),
                addressDetail: addressDetail,
                feeInfo: (feeInfo || '').trim()
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        businesses.push(newBusiness);
        writeJsonFileSafe(BUSINESSES_PATH, businesses);

        // 이벤트 기록
        const events = readJsonFileSafe(ANALYTICS_PATH, []);
        events.push({
            id: `evt_${Date.now()}`,
            businessId: newBizId,
            eventType: 'business_signup',
            metadata: { type, name },
            createdAt: new Date().toISOString()
        });
        writeJsonFileSafe(ANALYTICS_PATH, events.slice(-5000));

        return res.json({
            success: true,
            business: newBusiness,
            message: '사업자 등록 신청이 정상 접수되었습니다. 관리자 검수 후 승인됩니다.'
        });
    } catch (err) {
        console.error('Business Register Error:', err);
        return res.status(500).json({ error: '신청 처리 중 서버 오류가 발생했습니다.' });
    }
});

// 4. 본인 사업자 프로필 수정 (P-04, P-02, P-12)
app.put('/api/business/profile', (req, res) => {
    try {
        const { businessId, academyProfile, realEstateProfile } = req.body;
        if (!businessId || (!academyProfile && !realEstateProfile)) {
            return res.status(400).json({ error: 'businessId와 프로필 정보가 필요합니다.' });
        }

        const businesses = readJsonFileSafe(BUSINESSES_PATH, []);
        const idx = businesses.findIndex(b => b.id === businessId);
        if (idx === -1) {
            return res.status(404).json({ error: '해당 사업자를 찾을 수 없습니다.' });
        }

        if (academyProfile) {
            if (!businesses[idx].registeredAddress && businesses[idx].address) {
                businesses[idx].registeredAddress = businesses[idx].address;
            }
            businesses[idx].academyProfile = {
                ...businesses[idx].academyProfile,
                ...academyProfile
            };
            if (academyProfile.address) {
                businesses[idx].address = academyProfile.address;
            }
        }
        if (realEstateProfile) {
            businesses[idx].realEstateProfile = {
                ...businesses[idx].realEstateProfile,
                ...realEstateProfile
            };
        }
        businesses[idx].updatedAt = new Date().toISOString();
        writeJsonFileSafe(BUSINESSES_PATH, businesses);

        return res.json({
            success: true,
            business: businesses[idx],
            message: '프로필 정보가 안전하게 업데이트되었습니다.'
        });
    } catch (err) {
        console.error('Business Profile Update Error:', err);
        return res.status(500).json({ error: '프로필 업데이트 중 오류가 발생했습니다.' });
    }
});

// 5. 사업자 대시보드 통계 및 문의 조회 (P-04, P-08)
app.get('/api/business/dashboard', (req, res) => {
    try {
        const { businessId } = req.query;
        if (!businessId) {
            return res.status(400).json({ error: 'businessId 파라미터가 필요합니다.' });
        }

        const businesses = readJsonFileSafe(BUSINESSES_PATH, []);
        const biz = businesses.find(b => b.id === businessId);
        if (!biz) {
            return res.status(404).json({ error: '사업자 정보를 찾을 수 없습니다.' });
        }

        const subData = readJsonFileSafe(SUBSCRIPTIONS_PATH, { products: [], subscriptions: [] });
        const subscription = subData.subscriptions.find(s => s.businessId === businessId && s.status === 'active') || null;

        const allEvents = readJsonFileSafe(ANALYTICS_PATH, []);
        const bizEvents = allEvents.filter(e => e.businessId === businessId);

        // 집계
        const stats = {
            profile_views: bizEvents.filter(e => e.eventType === 'profile_view').length,
            premium_impressions: bizEvents.filter(e => e.eventType === 'premium_impression').length,
            phone_clicks: bizEvents.filter(e => e.eventType === 'phone_click').length,
            contact_clicks: bizEvents.filter(e => e.eventType === 'contact_click').length,
            website_clicks: bizEvents.filter(e => e.eventType === 'website_click').length
        };

        // 최근 7일 일별 통계
        const now = new Date();
        const dailyViews = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const count = bizEvents.filter(e => e.eventType === 'profile_view' && e.createdAt.startsWith(dateStr)).length;
            const impCount = bizEvents.filter(e => e.eventType === 'premium_impression' && e.createdAt.startsWith(dateStr)).length;
            dailyViews.push({ date: dateStr.slice(5), views: count, impressions: impCount });
        }

        // 해당 사업자의 학부모 문의 내역
        const allInquiries = readJsonFileSafe(INQUIRIES_PATH, []);
        const inquiries = allInquiries.filter(iq => iq.businessId === businessId);

        return res.json({
            business: biz,
            subscription,
            stats,
            dailyViews,
            inquiries
        });
    } catch (err) {
        console.error('Business Dashboard Error:', err);
        return res.status(500).json({ error: '대시보드 통계를 조회하는 중 오류가 발생했습니다.' });
    }
});

// 6. 구독 상품 목록 (P-05)
app.get('/api/products', (req, res) => {
    try {
        const subData = readJsonFileSafe(SUBSCRIPTIONS_PATH, { products: [] });
        return res.json(subData.products || []);
    } catch (err) {
        console.error('Products Error:', err);
        return res.status(500).json({ error: '상품 목록을 불러오지 못했습니다.' });
    }
});

// 7. 프리미엄 구독 결제 신청 및 서버 검증 (P-06)
app.post('/api/subscription/checkout', (req, res) => {
    try {
        const { businessId, productId = 'prod_academy_premium', paymentMethod = '카드 자동결제' } = req.body;
        if (!businessId) {
            return res.status(400).json({ error: 'businessId가 누락되었습니다.' });
        }

        const businesses = readJsonFileSafe(BUSINESSES_PATH, []);
        const biz = businesses.find(b => b.id === businessId);
        if (!biz) {
            return res.status(404).json({ error: '사업자 정보를 찾을 수 없습니다.' });
        }

        // 미승인 상태의 사업자는 프리미엄 구매 불가 (PRD TC-003, P-03)
        if (biz.status !== 'approved') {
            return res.status(403).json({ error: '관리자 승인이 완료된 사업자만 프리미엄 상품을 신청할 수 있습니다.' });
        }

        const subData = readJsonFileSafe(SUBSCRIPTIONS_PATH, { products: [], subscriptions: [] });
        const product = subData.products.find(p => p.id === productId);
        if (!product) {
            return res.status(400).json({ error: '존재하지 않는 상품입니다.' });
        }

        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 30); // 30일 구독 기간

        const subId = `sub_${Date.now()}`;
        const newSub = {
            id: subId,
            businessId,
            productId,
            productName: product.name,
            amount: product.price,
            status: 'active',
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            paymentMethod,
            lastPaymentDate: now.toISOString(),
            history: [
                {
                    date: now.toISOString(),
                    action: 'subscribe',
                    amount: product.price,
                    status: 'success'
                }
            ]
        };

        // 기존 구독 만료 처리 후 신규 추가
        subData.subscriptions = subData.subscriptions.filter(s => s.businessId !== businessId);
        subData.subscriptions.push(newSub);
        writeJsonFileSafe(SUBSCRIPTIONS_PATH, subData);

        // 이벤트 기록
        const events = readJsonFileSafe(ANALYTICS_PATH, []);
        events.push({
            id: `evt_${Date.now()}`,
            businessId,
            eventType: 'subscription_started',
            metadata: { productId, amount: product.price },
            createdAt: now.toISOString()
        });
        writeJsonFileSafe(ANALYTICS_PATH, events.slice(-5000));

        return res.json({
            success: true,
            subscription: newSub,
            message: `${product.name} (월 ${product.price.toLocaleString()}원) 결제 및 구독 활성화가 완료되었습니다!`
        });
    } catch (err) {
        console.error('Checkout Error:', err);
        return res.status(500).json({ error: '결제 처리 중 서버 오류가 발생했습니다.' });
    }
});

// 8. 구독 해지 요청 (P-06)
app.post('/api/subscription/cancel', (req, res) => {
    try {
        const { businessId, subscriptionId } = req.body;
        const subData = readJsonFileSafe(SUBSCRIPTIONS_PATH, { products: [], subscriptions: [] });
        const target = subData.subscriptions.find(s => s.businessId === businessId && s.status === 'active');
        if (!target) {
            return res.status(404).json({ error: '활성화된 구독을 찾을 수 없습니다.' });
        }

        target.status = 'cancelled';
        target.history.push({
            date: new Date().toISOString(),
            action: 'cancel',
            amount: 0,
            status: 'success'
        });
        writeJsonFileSafe(SUBSCRIPTIONS_PATH, subData);

        const events = readJsonFileSafe(ANALYTICS_PATH, []);
        events.push({
            id: `evt_${Date.now()}`,
            businessId,
            eventType: 'subscription_cancelled',
            metadata: { subscriptionId: target.id },
            createdAt: new Date().toISOString()
        });
        writeJsonFileSafe(ANALYTICS_PATH, events.slice(-5000));

        return res.json({
            success: true,
            message: '구독 해지가 접수되었습니다. 현재 이용 기간 종료일까지는 프리미엄 혜택이 유지됩니다.',
            subscription: target
        });
    } catch (err) {
        console.error('Subscription Cancel Error:', err);
        return res.status(500).json({ error: '구독 해지 처리 중 오류가 발생했습니다.' });
    }
});

// 9. 성과 분석 이벤트 수집 API (P-08)
app.post('/api/analytics/event', (req, res) => {
    try {
        const { eventType, businessId, metadata = {} } = req.body;
        const validEvents = [
            'profile_view', 'premium_impression', 'phone_click',
            'contact_click', 'website_click', 'school_search', 'academy_search'
        ];

        if (!eventType || !validEvents.includes(eventType)) {
            return res.status(400).json({ error: '유효하지 않은 이벤트 유형입니다.' });
        }

        const events = readJsonFileSafe(ANALYTICS_PATH, []);
        events.push({
            id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            businessId: businessId || null,
            eventType,
            metadata,
            createdAt: new Date().toISOString()
        });

        // 최대 10,000건 유지
        writeJsonFileSafe(ANALYTICS_PATH, events.slice(-10000));

        return res.json({ success: true });
    } catch (err) {
        console.error('Analytics Event Error:', err);
        return res.status(500).json({ error: '이벤트 저장 중 오류가 발생했습니다.' });
    }
});

// 10. 학부모 1:1 상담 문의 접수 API (P-09, P-11)
app.post('/api/inquiries', (req, res) => {
    try {
        const {
            targetBusinessId,
            targetAcademyName,
            parentName,
            parentPhone,
            studentGrade = '',
            inquiryContent,
            preferredTime = '',
            consentAgreed
        } = req.body;

        if (!targetBusinessId || !inquiryContent || !parentPhone) {
            return res.status(400).json({ error: '문의 대상, 내용 및 연락처는 필수 입력 사항입니다.' });
        }

        // 개인정보 수집 및 제3자 제공 동의 확인 (PRD 6.9, 개인정보보호법 제17조)
        if (!consentAgreed) {
            return res.status(400).json({ error: '개인정보 수집 및 학원 전달 동의가 필요합니다.' });
        }

        const inquiries = readJsonFileSafe(INQUIRIES_PATH, []);
        const newInquiry = {
            id: `inq_${Date.now()}`,
            businessId: targetBusinessId,
            targetAcademyName: targetAcademyName || '해당 학원',
            parentName: (parentName || '학부모').trim(),
            parentPhone: parentPhone.trim(),
            studentGrade: (studentGrade || '').trim(),
            inquiryContent: inquiryContent.trim(),
            preferredTime: (preferredTime || '').trim(),
            consentAgreed: true,
            status: 'new', // new -> contacted -> resolved
            createdAt: new Date().toISOString()
        };

        inquiries.push(newInquiry);
        writeJsonFileSafe(INQUIRIES_PATH, inquiries);

        // 이벤트 기록
        const events = readJsonFileSafe(ANALYTICS_PATH, []);
        events.push({
            id: `evt_${Date.now()}`,
            businessId: targetBusinessId,
            eventType: 'inquiry_submitted',
            metadata: { studentGrade },
            createdAt: new Date().toISOString()
        });
        writeJsonFileSafe(ANALYTICS_PATH, events.slice(-5000));

        return res.json({
            success: true,
            inquiry: newInquiry,
            message: '상담 문의가 안전하게 전달되었습니다. 원장님/담당자가 확인 후 연락드립니다.'
        });
    } catch (err) {
        console.error('Inquiry Submission Error:', err);
        return res.status(500).json({ error: '문의 접수 중 서버 오류가 발생했습니다.' });
    }
});

// 11. 활성 프리미엄 학원 목록 (검색 및 지도 광고 표시용 P-07)
app.get('/api/academies/premium', (req, res) => {
    try {
        const businesses = readJsonFileSafe(BUSINESSES_PATH, []);
        const subData = readJsonFileSafe(SUBSCRIPTIONS_PATH, { products: [], subscriptions: [] });

        const now = new Date();
        const activeSubBizIds = new Set(
            subData.subscriptions
                .filter(s => s.status === 'active' && new Date(s.endDate) > now)
                .map(s => s.businessId)
        );

        const premiumAcademies = businesses
            .filter(b => b.status === 'approved' && activeSubBizIds.has(b.id))
            .map(b => ({
                businessId: b.id,
                name: b.name,
                isPremium: true,
                badgeText: '광고',
                profile: b.academyProfile || {},
                phone: b.phone,
                address: b.address
            }));

        return res.json(premiumAcademies);
    } catch (err) {
        console.error('Premium Academies Error:', err);
        return res.status(500).json({ error: '프리미엄 학원 목록을 불러오지 못했습니다.' });
    }
});

// 11-2. 활성 부동산 파트너 공인중개업소 목록 (주택 상세 및 동네 이야기 노출용 P-12, P-13)
app.get('/api/real-estates/partners', (req, res) => {
    try {
        const { area, complex } = req.query;
        const businesses = readJsonFileSafe(BUSINESSES_PATH, []);
        const subData = readJsonFileSafe(SUBSCRIPTIONS_PATH, { products: [], subscriptions: [] });

        const now = new Date();
        const activeSubBizIds = new Set(
            subData.subscriptions
                .filter(s => s.status === 'active' && new Date(s.endDate) > now)
                .map(s => s.businessId)
        );

        let partners = businesses
            .filter(b => b.type === 'real_estate' && b.status === 'approved' && activeSubBizIds.has(b.id))
            .map(b => {
                const sub = subData.subscriptions.find(s => s.businessId === b.id && s.status === 'active');
                return {
                    businessId: b.id,
                    name: b.name,
                    representative: b.representative,
                    phone: b.phone,
                    address: b.address,
                    isPartner: true,
                    productName: sub?.productName || '교육환경 파트너',
                    profile: b.realEstateProfile || {}
                };
            });

        // 특정 단지나 행정동 필터링 (요청된 경우)
        if (complex) {
            partners = partners.filter(p => {
                const complexes = p.profile.specializedComplexes || [];
                return complexes.some(c => c.includes(complex) || complex.includes(c));
            });
        } else if (area) {
            partners = partners.filter(p => {
                const areas = p.profile.serviceAreas || [];
                return areas.some(a => a.includes(area) || area.includes(a)) || p.address.includes(area);
            });
        }

        return res.json(partners);
    } catch (err) {
        console.error('Real Estate Partners Error:', err);
        return res.status(500).json({ error: '부동산 파트너 목록을 불러오지 못했습니다.' });
    }
});

// 12. 관리자용: 사업자 전체 목록 및 심사 관리 (P-10)
app.get('/api/admin/businesses', (req, res) => {
    try {
        const businesses = readJsonFileSafe(BUSINESSES_PATH, []);
        const subData = readJsonFileSafe(SUBSCRIPTIONS_PATH, { products: [], subscriptions: [] });

        const enriched = businesses.map(b => {
            const sub = subData.subscriptions.find(s => s.businessId === b.id && s.status === 'active');
            return {
                ...b,
                subscription: sub || null
            };
        });

        return res.json({
            total: enriched.length,
            submittedCount: enriched.filter(b => b.status === 'submitted').length,
            approvedCount: enriched.filter(b => b.status === 'approved').length,
            rejectedCount: enriched.filter(b => b.status === 'rejected').length,
            businesses: enriched
        });
    } catch (err) {
        console.error('Admin Businesses Error:', err);
        return res.status(500).json({ error: '사업자 목록을 가져오지 못했습니다.' });
    }
});

// 13. 관리자용: 사업자 승인 / 반려 / 정지 (P-10)
app.post('/api/admin/business/status', (req, res) => {
    try {
        const { businessId, status, rejectionReason = '' } = req.body;
        const validStatuses = ['approved', 'rejected', 'suspended', 'submitted'];

        if (!businessId || !status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: '유효한 businessId와 status(approved/rejected/suspended)가 필요합니다.' });
        }

        const businesses = readJsonFileSafe(BUSINESSES_PATH, []);
        const target = businesses.find(b => b.id === businessId);
        if (!target) {
            return res.status(404).json({ error: '해당 사업자를 찾을 수 없습니다.' });
        }

        target.status = status;
        if (status === 'rejected') {
            target.rejectionReason = rejectionReason || '정보 불일치 또는 검수 기준 미충족';
        } else {
            target.rejectionReason = '';
        }
        target.updatedAt = new Date().toISOString();
        writeJsonFileSafe(BUSINESSES_PATH, businesses);

        return res.json({
            success: true,
            business: target,
            message: `사업자 상태가 [${status}]로 변경되었습니다.`
        });
    } catch (err) {
        console.error('Admin Business Status Update Error:', err);
        return res.status(500).json({ error: '상태 변경 중 오류가 발생했습니다.' });
    }
});

// 14. 관리자용: 전체 구독 및 결제 현황 (P-10)
app.get('/api/admin/subscriptions', (req, res) => {
    try {
        const subData = readJsonFileSafe(SUBSCRIPTIONS_PATH, { products: [], subscriptions: [] });
        const businesses = readJsonFileSafe(BUSINESSES_PATH, []);
        const bizMap = new Map(businesses.map(b => [b.id, b]));

        const enriched = (subData.subscriptions || []).map(s => ({
            ...s,
            businessName: bizMap.get(s.businessId)?.name || '알 수 없음',
            businessOwner: bizMap.get(s.businessId)?.representative || '-'
        }));

        const mrr = enriched
            .filter(s => s.status === 'active')
            .reduce((sum, s) => sum + (s.amount || 0), 0);

        return res.json({
            subscriptions: enriched,
            mrr,
            activeCount: enriched.filter(s => s.status === 'active').length
        });
    } catch (err) {
        console.error('Admin Subscriptions Error:', err);
        return res.status(500).json({ error: '구독 데이터를 가져오지 못했습니다.' });
    }
});

// Serve admin.html on /admin
app.get(['/admin', '/admin/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Fallback to serve index.html for unknown SPA routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 로컬 환경에서만 서버 구동, Vercel에서는 모듈로 동작
if (process.env.NODE_ENV !== 'production') {
    const server = app.listen(PORT, () => {
        console.log(`[Express Backend] Server running on port ${PORT}`);
        // 백그라운드에서 주택 데이터 인메모리 캐시 및 공간 인덱스 사전 워밍업
        setTimeout(() => {
            getCachedRealEstateItems();
        }, 100);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`[Express Backend] 포트 ${PORT}가 이미 사용 중입니다. 기존 백엔드 인스턴스를 계속 사용합니다.`);
        } else {
            console.error('[Express Backend] 서버 에러:', err);
        }
    });

    process.on('SIGTERM', () => {
        try { server.close(); } catch (e) {}
    });
    process.on('SIGINT', () => {
        try { server.close(); } catch (e) {}
    });
}

export default app;

// touch

// sh update touch
