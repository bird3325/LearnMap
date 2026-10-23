const fs = require('fs');
const path = require('path');
const https = require('https');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));

const serviceKey = config.data_go_kr_key;
const agent = new https.Agent({ rejectUnauthorized: false });

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { agent }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', err => reject(err));
    });
}

async function fetchExposAreaForEstate(estate, key) {
    if (!key) return null;
    let bun = estate.bun;
    let ji = estate.ji;

    if ((!bun || !estate.bjdongCd) && estate.pnu && estate.pnu.length === 19) {
        if (!estate.lawdCd) estate.lawdCd = estate.pnu.substring(0, 5);
        if (!estate.bjdongCd) estate.bjdongCd = estate.pnu.substring(5, 10);
        if (!bun) bun = String(parseInt(estate.pnu.substring(11, 15), 10) || 0);
        if (!ji) ji = String(parseInt(estate.pnu.substring(15, 19), 10) || 0);
    }

    const lawdCd = estate.lawdCd || (estate.pnu ? estate.pnu.substring(0, 5) : '41281');
    const bjdongCd = estate.bjdongCd || (estate.pnu ? estate.pnu.substring(5, 10) : '');

    if (!lawdCd || !bjdongCd || !bun || bun === '0') return null;

    const candidates = [];
    const pBun = String(parseInt(bun, 10) || 0).padStart(4, '0');
    const pJi = String(parseInt(ji, 10) || 0).padStart(4, '0');
    candidates.push(pJi);
    if (pJi !== '0000') candidates.push('0000');

    for (const testJi of candidates) {
        const areaCollector = new Map();
        try {
            for (let page = 1; page <= 2; page++) {
                const exposUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(key)}&sigunguCd=${lawdCd}&bjdongCd=${bjdongCd}&bun=${pBun}&ji=${testJi}&numOfRows=100&pageNo=${page}`;
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
            console.warn(`[Fetch error] ${estate.name}:`, err.message);
        }
    }

    return null;
}

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/realestate_seoul.json'), 'utf8'));
const missingTargets = data.filter(item => {
    const isComplex = item.type === 'apt' || item.type === 'rh' || item.type === 'offi';
    const noArea = (!item.area || item.area === '-') && (!item.areaList || item.areaList.length === 0);
    return isComplex && noArea;
});

console.log('Total missing complex targets:', missingTargets.length);

// Test on first 5 missing targets
(async () => {
    for (let i = 0; i < Math.min(5, missingTargets.length); i++) {
        const item = missingTargets[i];
        console.log(`Testing ${i + 1}: ${item.name} (${item.type}) bun: ${item.bun}, ji: ${item.ji}, dong: ${item.dong}`);
        const res = await fetchExposAreaForEstate(item, serviceKey);
        console.log(`=> Result:`, res ? `area: ${res.area}, count: ${res.areaList.length}` : 'null');
    }
})();
