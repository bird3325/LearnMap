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

(async () => {
    const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=10300&bun=0600&ji=0000&numOfRows=100&pageNo=1`;
    const xml = await httpsGet(url);
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

    // Group by dongNm + hoNm
    const units = new Map();
    items.forEach(it => {
        const getTag = tag => {
            const m = it.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
            return m ? m[1].trim() : '';
        };
        const key = `${getTag('dongNm')}_${getTag('hoNm')}`;
        if (!units.has(key)) {
            units.set(key, { dong: getTag('dongNm'), ho: getTag('hoNm'), jeon: 0, gong: [] });
        }
        const u = units.get(key);
        const gb = getTag('exposPubuseGbCdNm');
        const area = parseFloat(getTag('area')) || 0;
        if (gb.includes('전유')) {
            u.jeon = area;
        } else {
            u.gong.push(area);
        }
    });

    console.log('Sample units:');
    let shown = 0;
    for (const [k, u] of units.entries()) {
        if (u.jeon > 0 && shown < 6) {
            const sumGong = u.gong.reduce((a, b) => a + b, 0);
            // Residential common area vs other common area
            // typically stair/corridor common area + jeon = supply area
            console.log(`호실: ${k} | 전용면적: ${u.jeon}㎡ | 공용면적합계: ${sumGong.toFixed(2)}㎡ | 세부공용:`, u.gong);
            shown++;
        }
    }
})();
