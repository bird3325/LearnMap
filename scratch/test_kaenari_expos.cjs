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

async function testExposForKaenari() {
    const estate = {
        name: '개나리아파트',
        bun: '0415',
        ji: '0000',
        lawdCd: '41281',
        bjdongCd: '10600',
        pnu: '4128110600104150000'
    };

    const paddedBun = String(parseInt(estate.bun, 10) || 0).padStart(4, '0');
    const paddedJi = String(parseInt(estate.ji, 10) || 0).padStart(4, '0');
    const lawdCd = estate.lawdCd;

    const areaCollector = new Map();

    for (let page = 1; page <= 2; page++) {
        const exposUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${lawdCd}&bjdongCd=${estate.bjdongCd}&bun=${paddedBun}&ji=${paddedJi}&numOfRows=100&pageNo=${page}`;
        console.log(`Fetching page ${page}:`, exposUrl);
        const exposXml = await httpsGet(exposUrl);
        const exposItems = (typeof exposXml === 'string' ? exposXml.match(/<item>[\s\S]*?<\/item>/g) : null) || [];
        console.log(`Page ${page} expos items count:`, exposItems.length);
        if (exposItems.length === 0) break;

        for (const itemXml of exposItems) {
            const getTag = tag => {
                const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                return m ? m[1].trim() : '';
            };
            const exposGb = getTag('exposPubuseGbCdNm');
            if (exposGb && !exposGb.includes('전유')) continue; // 공용면적 제외

            const areaStr = getTag('area');
            const areaNum = parseFloat(areaStr);
            if (isNaN(areaNum) || areaNum <= 8 || areaNum > 600) continue;

            const areaKey = areaNum.toFixed(1);
            const existingA = areaCollector.get(areaKey) || {
                area: `${areaKey}㎡`,
                pyeong: `${(areaNum / 3.3058).toFixed(1)}평형`,
                rawArea: areaNum,
                householdCount: 0
            };
            existingA.householdCount++;
            areaCollector.set(areaKey, existingA);
        }
    }

    console.log('\nCollected areas:');
    areaCollector.forEach((v, k) => {
        console.log(`- ${v.area} (${v.pyeong}): ${v.householdCount}세대`);
    });
}

testExposForKaenari();
