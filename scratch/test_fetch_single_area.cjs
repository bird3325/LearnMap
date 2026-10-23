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

// Function to fetch expos area for a single estate
async function fetchExposAreaForEstate(estate) {
    let bun = estate.bun;
    let ji = estate.ji;

    // Address/PNU recovery for bun and ji if needed
    if ((!ji || ji === '0000') && estate.address) {
        const m = estate.address.match(/(\d+)(?:-(\d+))?번지/) || estate.address.match(/(\d+)-(\d+)/);
        if (m && m[2]) {
            ji = m[2];
        }
    }

    const paddedBun = String(parseInt(bun, 10) || 0).padStart(4, '0');
    const paddedJi = String(parseInt(ji, 10) || 0).padStart(4, '0');
    const lawdCd = estate.lawdCd || (estate.pnu ? estate.pnu.substring(0, 5) : '41281');
    const bjdongCd = estate.bjdongCd || (estate.pnu ? estate.pnu.substring(5, 10) : '');

    if (!bjdongCd || !bun || bun === '0') return null;

    const areaCollector = new Map();

    for (let page = 1; page <= 2; page++) {
        const exposUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${lawdCd}&bjdongCd=${bjdongCd}&bun=${paddedBun}&ji=${paddedJi}&numOfRows=100&pageNo=${page}`;
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

    return null;
}

// Test with 미도아파트5차
const testEstate = {
    name: '미도아파트5차',
    address: '경기 고양시 덕양구 마상로 200-18 (성사동 404-7)',
    bun: '0404',
    ji: '0000',
    lawdCd: '41281',
    bjdongCd: '10600'
};

fetchExposAreaForEstate(testEstate).then(res => {
    console.log('Result for 미도아파트5차:');
    console.log(res);
});
