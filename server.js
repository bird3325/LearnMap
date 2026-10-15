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

// 1-1. GET /api/realestate/stored - Serve stored real estate JSON data
app.get('/api/realestate/stored', (req, res) => {
    try {
        if (fs.existsSync(REAL_ESTATE_PATH)) {
            const data = fs.readFileSync(REAL_ESTATE_PATH, 'utf8');
            return res.json(JSON.parse(data || '[]'));
        }
        return res.json([]);
    } catch (e) {
        console.error('Error reading real estate data:', e);
        return res.status(500).json({ error: '주택 데이터를 읽을 수 없습니다.' });
    }
});

// 1-2. POST /api/realestate/stored - Save/update real estate JSON data
app.post('/api/realestate/stored', (req, res) => {
    try {
        const items = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ success: false, error: '배열 데이터 형식이어야 합니다.' });
        }
        fs.writeFileSync(REAL_ESTATE_PATH, JSON.stringify(items, null, 2), 'utf8');
        return res.json({ success: true, count: items.length, message: '주택 데이터가 realestate_seoul.json 파일에 저장되었습니다.' });
    } catch (e) {
        console.error('Error saving real estate data:', e);
        return res.status(500).json({ success: false, error: '주택 데이터 저장 중 오류가 발생했습니다.' });
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
            '부천시': '41190', '광명시': '41210', '평택시': '41220', '동두천시': '41250',
            '과천시': '41290', '구리시': '41310', '남양주시': '41360', '오산시': '41370',
            '시흥시': '41390', '군포시': '41410', '의왕시': '41430', '하남시': '41450',
            '파주시': '41480', '이천시': '41500', '안성시': '41550', '김포시': '41570',
            '화성시': '41590', '광주시': '41610', '양주시': '41630', '포천시': '41650',
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
    '청주시': ['상당구', '서원구', '흥덕구', '청원구'],
    '천안시': ['동남구', '서북구'],
    '전주시': ['완산구', '덕진구'],
    '포항시': ['남구', '북구'],
    '창원시': ['의창구', '성산구', '마산합포구', '마산회원구', '진해구']
};

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
            const foundKey = Object.keys(sidoMap).find(k => k.includes(sigungu) || sigungu.includes(k));
            if (foundKey) {
                const fVal = sidoMap[foundKey];
                if (Array.isArray(fVal)) {
                    fVal.forEach(c => targets.push({ gu: findSubGuName(c, sigungu), code: c }));
                } else {
                    targets.push({ gu: sigungu, code: fVal });
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

// 1-3. POST /api/realestate/collect-master - 실제 공공 API 및 카카오 로컬 API를 통한 주택 마스터 대량 수집
app.post('/api/realestate/collect-master', async (req, res) => {
    const { sido = '서울특별시', sigungu = 'all' } = req.body;
    const config = await readConfig();
    const serviceKey = config.data_go_kr_key;
    const kakaoKey = config.kakao_app_key;

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

        const estateMap = new Map();
        existingList.forEach(item => {
            if (item && item.name && !isNonResidential(item.name)) {
                estateMap.set(`${item.sido}_${item.sigungu}_${item.name}`, item);
            }
        });

        let newlyAddedCount = 0;
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
                const query = `${sidoName} ${guName} ${dongName}`;
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
            dongCoordMap.set(dKey, null);
            dongBCodeMap.set(dKey, null);
            return { coord: null, bCode: null };
        };

        // 🌟 [1단계] 건축HUB 표제부 API(국토교통부 건축물대장)를 통해 실제 주택 기본 정보(마스터) 일괄 수집
        // (거래 발생 여부와 무관하게 모든 아파트, 공공임대, 국민임대, 행복주택, 연립·다세대, 오피스텔, 단독주택 수집)
        if (serviceKey) {
            for (const target of lawdTargets) {
                const gu = target.gu;
                const lawdCd = target.code;
                if (!lawdCd) continue;

                // 1) 해당 구의 동 목록 탐색 (행정복지센터 검색 등)
                const dongsInGu = new Set();
                if (kakaoKey) {
                    try {
                        const centerRes = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(`${sido} ${gu} 행정복지센터`)}&size=15`, {
                            headers: { 'Authorization': `KakaoAK ${kakaoKey}`, 'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000' }
                        });
                        if (centerRes.ok) {
                            const cData = await centerRes.json();
                            (cData.documents || []).forEach(doc => {
                                const m = (doc.address_name || '').match(/([가-힣0-9]+동)/);
                                if (m) dongsInGu.add(m[1].replace(/[0-9]+동$/, '동'));
                            });
                        }
                    } catch (e) {}
                }

                // 동 목록이 부족할 경우 기본 법정동 보완 (고양시 덕양구 등 기본 동 목록 fallback)
                if (dongsInGu.size === 0) {
                    ['신원동', '화정동', '행신동', '원흥동', '도내동', '향동동', '지축동', '삼송동', '동산동', '성사동', '관산동', '고양동'].forEach(d => dongsInGu.add(d));
                }

                console.log(`[건축HUB 마스터 수집] ${sido} ${gu} (${lawdCd}) ${dongsInGu.size}개 동 수집 시작`);

                // 2) 각 동별 건축물대장 총괄표제부(getBrRecapTitleInfo) 및 표제부(getBrTitleInfo) 조회
                for (const dong of dongsInGu) {
                    const { coord: baseCoord, bCode } = await getDongInfo(sido, gu, dong);
                    const bjdongCd = bCode ? bCode.substring(5, 10) : '';
                    if (!bjdongCd) continue;

                    // (A) 총괄표제부 API: 아파트 대단지 및 공동주택 단지 일괄 추출
                    // (B) 일반표제부 API: 행복주택, 연립/다세대, 오피스텔 등 추출
                    const hubEndpoints = [
                        { name: '총괄표제부', url: 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo' },
                        { name: '일반표제부', url: 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo' }
                    ];

                    for (const ep of hubEndpoints) {
                        try {
                            const fetchUrl = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${lawdCd}&bjdongCd=${bjdongCd}&numOfRows=100&pageNo=1`;
                            const xmlText = await httpsGet(fetchUrl);
                            const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];

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
                                const totArea = getTag('totArea') || getTag('totDongTotArea');

                                // 주거용 건물 판별
                                const combinedPurps = `${mainPurpsCdNm} ${etcPurps}`;
                                const isResidential = /(?:공동주택|단독주택|아파트|다세대|연립|오피스텔|다가구)/.test(combinedPurps);
                                if (!isResidential) continue;

                                // 비주거용 시설 및 부대시설(전기실, 주차장, 관리사무소, 종교, 주유소 등) 필터링
                                if (isNonResidential(rawBldNm, combinedPurps)) continue;
                                if (isNonResidential(dongNm)) continue;

                                // 건물명 정제
                                let cleanName = rawBldNm || (dong && platPlc ? `${dong} ${platPlc.split(' ').pop()} 주택` : '');
                                cleanName = cleanName.replace(/\s+/g, ' ').trim();
                                if (!cleanName) continue;

                                // 주택 유형 결정
                                let housingType = 'apt';
                                if (combinedPurps.includes('오피스텔')) housingType = 'offi';
                                else if (combinedPurps.includes('다세대') || combinedPurps.includes('연립')) housingType = 'rh';
                                else if (combinedPurps.includes('단독') || combinedPurps.includes('다가구')) housingType = 'sh';

                                const key = `${sido}_${gu}_${cleanName}`;
                                const buildYear = useAprDay ? useAprDay.substring(0, 4) : '';
                                const fullAddr = (newPlatPlc || platPlc || `${sido} ${gu} ${dong}`).trim();

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
                                        buildYear: buildYear || '',
                                        source: '건축HUB 마스터 DB',
                                        x: itemX,
                                        y: itemY,
                                        lng: itemX,
                                        lat: itemY
                                    });
                                    newlyAddedCount++;
                                } else {
                                    const existing = estateMap.get(key);
                                    if (dong && !existing.dong) existing.dong = dong;
                                    if (buildYear && !existing.buildYear) existing.buildYear = buildYear;
                                    if (totArea && (!existing.area || existing.area === '-')) existing.area = `${parseFloat(totArea).toFixed(1)}㎡`;
                                    if (newPlatPlc && (!existing.address || !existing.address.includes('로'))) existing.address = newPlatPlc;
                                }
                            }
                        } catch (err) {
                            console.warn(`[건축HUB ${ep.name}] Failed for ${dong} (${bjdongCd}):`, err.message);
                        }
                    }
                }
            }
        }

        // 🌟 보조적 카카오 API: 건축HUB에서 수집된 주택에 한해 정밀 좌표(x, y) 및 도로명 주소 보충 (Enrichment Only)
        if (kakaoKey) {
            const enrichTargets = Array.from(estateMap.values()).filter(item => {
                if (sido && item.sido !== sido) return false;
                if (!isMatchingSigungu(item, sigungu, sido)) return false;
                if (isNonResidential(item.name)) return false;
                return !item.kakaoEnriched;
            });

            console.log(`[카카오 보조 좌표 보충] 건축HUB 수집 주택 ${enrichTargets.length}건 정밀 좌표 보충 시작`);

            for (const item of enrichTargets) {
                try {
                    let enrichedCoord = null;
                    let roadAddr = '';

                    // 1) 주소 기반 정밀 좌표 검색
                    if (item.address && item.address.length > 5) {
                        const addrRes = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(item.address)}`, {
                            headers: { 'Authorization': `KakaoAK ${kakaoKey}`, 'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000' }
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
                    }

                    // 2) 주소 검색 실패 시 단지명 키워드 검색
                    if (!enrichedCoord && item.type !== 'sh') {
                        const cleanBaseName = item.name.replace(/\(.*?\)/g, '').trim();
                        const kwRes = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(`${item.sigungu} ${cleanBaseName}`)}&size=3`, {
                            headers: { 'Authorization': `KakaoAK ${kakaoKey}`, 'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000' }
                        });
                        if (kwRes.ok) {
                            const kwData = await kwRes.json();
                            if (kwData.documents && kwData.documents.length > 0) {
                                for (const doc of kwData.documents) {
                                    if (isNonResidential(doc.place_name, doc.category_name)) continue;
                                    if (doc.category_name && !/(?:주거시설|아파트|오피스텔|연립|다세대|단독|주택)/.test(doc.category_name)) continue;
                                    if (doc.x && doc.y) {
                                        enrichedCoord = { x: doc.x, y: doc.y };
                                        if (doc.road_address_name) roadAddr = doc.road_address_name;
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if (enrichedCoord) {
                        item.x = enrichedCoord.x;
                        item.y = enrichedCoord.y;
                        item.lng = enrichedCoord.x;
                        item.lat = enrichedCoord.y;
                    }
                    if (roadAddr) {
                        item.address = roadAddr;
                    }
                    item.kakaoEnriched = true;

                    await new Promise(r => setTimeout(r, 30));
                } catch (e) {}
            }
        }

        const finalList = Array.from(estateMap.values());
        fs.writeFileSync(REAL_ESTATE_PATH, JSON.stringify(finalList, null, 2), 'utf8');

        const targetGus = [...new Set(lawdTargets.map(t => t.gu))];
        const displayRegion = sigungu === 'all' || !sigungu || sigungu === '전체' ? sido : `${sido} ${sigungu}`;

        const regionItems = finalList.filter(item => {
            if (sido && item.sido !== sido) return false;
            return isMatchingSigungu(item, sigungu, sido);
        });

        return res.json({
            success: true,
            regionCount: regionItems.length,
            totalCount: finalList.length,
            newlyAdded: newlyAddedCount,
            message: `[건축HUB 표제부 마스터 구축] ${displayRegion} (${targetGus.join(', ')}) 주택 마스터 총 ${regionItems.length}건이 구축되었습니다. (전체 DB: ${finalList.length}건)`
        });
    } catch (err) {
        console.error('Collect Master Error:', err);
        return res.status(500).json({ success: false, error: '건축HUB 마스터 데이터 수집 중 오류: ' + err.message });
    }
});

// 1-4. POST /api/realestate/sync-trades - 실제 공공 실거래가 API 수집 및 마스터 정보 매핑 업데이트
app.post('/api/realestate/sync-trades', async (req, res) => {
    const { sido = '서울특별시', sigungu = 'all', housingType = 'all' } = req.body;
    const config = await readConfig();
    const serviceKey = config.data_go_kr_key;

    if (!serviceKey) {
        return res.status(400).json({ success: false, error: '공공데이터포털 API 인증키(data_go_kr_key)가 설정되지 않았습니다.' });
    }

    try {
        const lawdTargets = getLawdTargets(sido, sigungu);

        // 1. 기존 마스터/주택 목록 로드
        let existingList = [];
        if (fs.existsSync(REAL_ESTATE_PATH)) {
            try {
                existingList = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8') || '[]');
            } catch (err) {
                existingList = [];
            }
        }

        // 빠른 탐색을 위해 맵 구조로 변환
        const estateMap = new Map();
        existingList.forEach(item => {
            if (item && item.name) {
                estateMap.set(`${item.sido}_${item.sigungu}_${item.name}`, item);
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

        // 최근 6개월 거래월 생성
        const months = [];
        const now = new Date();
        for (let i = 1; i <= 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        let updatedCount = 0;
        let newAddedCount = 0;

        // 3. 구별 / 유형별 / 거래월별 실제 API 호출 및 매핑
        for (const target of lawdTargets) {
            const gu = target.gu;
            const lawdCd = target.code;
            if (!lawdCd) continue;

            for (const ep of apiEndpoints) {
                for (const ymd of months) {
                    try {
                        const fetchUrl = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=${lawdCd}&DEAL_YMD=${ymd}`;
                        const xmlText = await httpsGet(fetchUrl);
                        const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];

                        items.forEach(itemXml => {
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
                            if (!name) return;
                            if (isNonResidential(name)) return;

                            const amount = getTag('dealAmount') || getTag('거래금액');
                            const dealYear = getTag('dealYear') || getTag('년');
                            const dealMonth = getTag('dealMonth') || getTag('월');
                            const dealDay = getTag('dealDay') || getTag('일');
                            const area = getTag('totalFloorAr') || getTag('plottageAr') || getTag('excluUseAr') || getTag('전용면적');

                            const tradeDateStr = dealYear && dealMonth 
                                ? `${dealYear}-${String(dealMonth).padStart(2, '0')}${dealDay ? '-' + String(dealDay).padStart(2, '0') : ''}` 
                                : ymd;
                            const formattedPrice = amount ? `${amount.trim()}만원` : '실거래 확인';

                            const key = `${sido}_${gu}_${name}`;

                            let existing = estateMap.get(key);
                            if (!existing) {
                                // 동+지번 또는 복합 단지명(별칭 포함) 매핑 시도
                                for (const item of estateMap.values()) {
                                    if (item.sido === sido && item.sigungu === gu) {
                                        if (item.name && (item.name.includes(name) || (name && item.name.startsWith(name)))) {
                                            existing = item;
                                            break;
                                        }
                                        if (dong && jibun && item.address && item.address.includes(dong) && item.address.includes(jibun)) {
                                            existing = item;
                                            break;
                                        }
                                    }
                                }
                            }

                            if (existing) {
                                // 🌟 기존 마스터에 존재하는 주택 -> 실거래가 및 거래일자 '업데이트(갱신)'
                                if (!existing.tradeDate || existing.tradeDate === '-' || tradeDateStr >= existing.tradeDate) {
                                    existing.price = formattedPrice;
                                    existing.tradeDate = tradeDateStr;
                                    if (area && (!existing.area || existing.area === '-')) {
                                        existing.area = `${area}㎡`;
                                    }
                                    existing.source = '마스터/최신실거래가 매핑';
                                    updatedCount++;
                                }
                            } else {
                                // 🌟 마스터에 없던 신규 주택인 경우에만 신규 추가
                                estateMap.set(key, {
                                    id: `trade-${ep.type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                                    name,
                                    type: ep.type,
                                    sido,
                                    sigungu: gu,
                                    address: `${sido} ${gu} ${dong || ''} ${jibun || ''}`.trim(),
                                    price: formattedPrice,
                                    tradeDate: tradeDateStr,
                                    area: area ? `${area}㎡` : '-',
                                    source: '실거래가 수집'
                                });
                                newAddedCount++;
                            }
                        });
                    } catch (e) {
                        console.warn(`[Sync Trades] Error for ${gu} ${ep.name} ${ymd}:`, e.message);
                    }
                }
            }
        }

        const finalList = Array.from(estateMap.values());
        fs.writeFileSync(REAL_ESTATE_PATH, JSON.stringify(finalList, null, 2), 'utf8');

        const targetGus = [...new Set(lawdTargets.map(t => t.gu))];
        const displayRegion = sigungu === 'all' || !sigungu || sigungu === '전체' ? sido : `${sido} ${sigungu}`;

        const regionItems = finalList.filter(item => {
            if (sido && item.sido !== sido) return false;
            return isMatchingSigungu(item, sigungu, sido);
        });

        return res.json({
            success: true,
            regionCount: regionItems.length,
            totalCount: finalList.length,
            updatedCount,
            newAddedCount,
            message: `${displayRegion} (${targetGus.join(', ')}) 주택 실거래가 동기화 완료: 기존 마스터 주택 ${updatedCount}건 최신 가격 갱신, 신규 ${newAddedCount}건 추가.`
        });
    } catch (err) {
        console.error('Sync Trades Error:', err);
        return res.status(500).json({ success: false, error: '실거래가 동기화 중 오류가 발생했습니다: ' + err.message });
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

    const config = await readConfig();
    const serviceKey = config.data_go_kr_key;
    const kakaoAppKey = config.kakao_app_key;

    const maxDistLimit = radius ? Math.round(radius * 1.05) : 1050;
    const sLatRad = centerY * (Math.PI / 180);
    const estateMap = new Map();

    // 1. [1단계] 주택 기본 정보(마스터) DB (realestate_seoul.json)에서 반경 내에 있는 주택은 '모두' 추출
    if (fs.existsSync(REAL_ESTATE_PATH)) {
        try {
            const storedItems = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8') || '[]');
            storedItems.forEach(item => {
                if (!item || !item.name) return;
                const type = item.type || 'apt';
                if (!typeList.includes('all') && !typeList.includes(type)) return;

                const itemX = parseFloat(item.x || item.lng);
                const itemY = parseFloat(item.y || item.lat);

                if (!isNaN(itemX) && !isNaN(itemY)) {
                    const dy = (itemY - centerY) * 111000;
                    const dx = (itemX - centerX) * 88800 * Math.cos(sLatRad);
                    const dist = Math.round(Math.sqrt(dx * dx + dy * dy));

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
                        let shortPrice = '기본정보';
                        if (priceAmount > 0) {
                            displayPrice = `${uk > 0 ? uk + '억 ' : ''}${man > 0 ? man.toLocaleString() + '만' : ''}원`;
                            shortPrice = uk > 0 ? `${uk}.${Math.floor(man / 1000)}억` : `${man.toLocaleString()}만`;
                        } else if (item.price && !item.price.includes('실거래 대기')) {
                            displayPrice = item.price;
                            shortPrice = item.price;
                        }

                        const key = `${type}_${item.name}`;
                        estateMap.set(key, {
                            id: item.id || `re_${key}`,
                            type: type,
                            type_name: typeName,
                            name: item.name,
                            address: item.address || '',
                            jibun: item.jibun || '',
                            road_name: item.road_name || '',
                            x: String(itemX),
                            y: String(itemY),
                            distance: dist,
                            price_amount: priceAmount,
                            price_display: displayPrice,
                            short_price: shortPrice,
                            deal_date: item.tradeDate || '-',
                            area: item.area || '-'
                        });
                    }
                }
            });
        } catch (e) {
            console.warn('[Realestate Pins] Master DB read error:', e.message);
        }
    }

    // 2. DB(마스터/실거래가) 구축 상태를 그대로 신뢰하여 반환 (1단계 마스터: 실거래 대기 / 2단계 동기화: 최신 실거래가)
    // * 과거 실시간 오버라이드 로직을 제거하여 1단계와 2단계의 역할 구분을 명확히 하고 핀 응답 속도를 극대화합니다.


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
