import fs from 'fs';
let content = fs.readFileSync('server.js', 'utf8');
content = content.replace(/\r\n/g, '\n');

// 1. 서버 인메모리 캐시 전역 선언 추가
const cacheDecl = `// --- Vercel Serverless & In-Memory Performance Caches ---
const academyListServerCache = new Map();
const realestatePinsServerCache = new Map();
const ACADEMY_CACHE_TTL = 30 * 60 * 1000; // 30분
const REALESTATE_CACHE_TTL = 60 * 60 * 1000; // 60분
`;

if (!content.includes('const academyListServerCache')) {
    content = cacheDecl + content;
}

// 2. /api/academies/list 최적화
const origAcadList = `// 9. GET /api/academies/list - Fetch ALL academy pages across multi-grid points and return sorted full list
app.get('/api/academies/list', async (req, res) => {
    const { x, y } = req.query;
    const radius = parseInt(req.query.radius, 10) || 1000;
    if (!x || !y) return res.status(400).json({ error: '좌표가 없습니다.' });`;

const newAcadList = `// 9. GET /api/academies/list - Fetch ALL academy pages across multi-grid points and return sorted full list (Ultra Fast & Cached)
app.get('/api/academies/list', async (req, res) => {
    const { x, y } = req.query;
    const radius = parseInt(req.query.radius, 10) || 1000;
    if (!x || !y) return res.status(400).json({ error: '좌표가 없습니다.' });

    // 🌟 Vercel Edge CDN 캐시 헤더 (첫 방문 후 Vercel 엣지에서 수십 ms 내 즉각 서빙)
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');

    // 🌟 서버 인메모리 캐시 확인 (약 10m 단위 좌표 반올림)
    const acadCacheKey = \`\${parseFloat(x).toFixed(4)}_\${parseFloat(y).toFixed(4)}_\${radius}\`;
    const cachedAcad = academyListServerCache.get(acadCacheKey);
    if (cachedAcad && (Date.now() - cachedAcad.timestamp < ACADEMY_CACHE_TTL)) {
        res.setHeader('X-Cache', 'HIT-SERVER');
        return res.json(cachedAcad.data);
    }`;

content = content.replace(origAcadList, newAcadList);

// 학원 응답 직전에 캐시 저장
const origAcadRes = `        res.json({ items: finalItems, total_count: finalItems.length });
    } catch (err) {`;

const newAcadRes = `        const responsePayload = { items: finalItems, total_count: finalItems.length };
        if (academyListServerCache.size > 150) {
            academyListServerCache.delete(academyListServerCache.keys().next().value);
        }
        academyListServerCache.set(acadCacheKey, { timestamp: Date.now(), data: responsePayload });

        res.json(responsePayload);
    } catch (err) {`;

content = content.replace(origAcadRes, newAcadRes);

// 3. /api/realestate/pins 최적화
const origRePins = `app.get('/api/realestate/pins', async (req, res) => {
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
    }`;

const newRePins = `app.get('/api/realestate/pins', async (req, res) => {
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

    // 🌟 Vercel Edge CDN 캐시 헤더 설정 (실거래 데이터 1시간 동안 엣지에서 즉각 응답)
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400');

    // 🌟 서버 인메모리 캐시 확인 (1ms 즉시 반환)
    const reCacheKey = \`\${centerX.toFixed(4)}_\${centerY.toFixed(4)}_\${radius}_\${typeList.sort().join(',')}\`;
    const cachedRe = realestatePinsServerCache.get(reCacheKey);
    if (cachedRe && (Date.now() - cachedRe.timestamp < REALESTATE_CACHE_TTL)) {
        res.setHeader('X-Cache', 'HIT-SERVER');
        return res.json(cachedRe.data);
    }`;

content = content.replace(origRePins, newRePins);

// 주택 응답 직전에 캐시 저장
const origReRes = `    res.json({ items: validItems, total: validItems.length });
});

// 12.6. POST /api/admin/sync-realestate`;

const newReRes = `    const responsePayload = { items: validItems, total: validItems.length };
    if (realestatePinsServerCache.size > 200) {
        realestatePinsServerCache.delete(realestatePinsServerCache.keys().next().value);
    }
    realestatePinsServerCache.set(reCacheKey, { timestamp: Date.now(), data: responsePayload });

    res.json(responsePayload);
});

// 12.6. POST /api/admin/sync-realestate`;

content = content.replace(origReRes, newReRes);

fs.writeFileSync('server.js', content, 'utf8');
console.log('server.js: pins performance optimization applied');
