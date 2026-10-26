const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const serviceKey = config.data_go_kr_key;

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

async function findAptAndOffi(dong, bjdongCd) {
    console.log(`\n=== Scanning ${dong} (${bjdongCd}) pages for Apt & Officetel ===`);
    for (let page = 1; page <= 5; page++) {
        const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41285&bjdongCd=${bjdongCd}&numOfRows=100&pageNo=${page}`;
        const xml = await httpsGet(url);
        const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        if (items.length === 0) break;
        
        let apts = [];
        let offis = [];
        items.forEach(item => {
            const bldNm = (item.match(/<bldNm>(.*?)<\/bldNm>/) || [])[1] || '';
            const main = (item.match(/<mainPurpsCdNm>(.*?)<\/mainPurpsCdNm>/) || [])[1] || '';
            const etc = (item.match(/<etcPurps>(.*?)<\/etcPurps>/) || [])[1] || '';
            const comb = `${main} ${etc}`;
            if (comb.includes('아파트') || bldNm.includes('아파트') || bldNm.includes('마을') || bldNm.includes('단지')) {
                apts.push(bldNm || comb);
            }
            if (comb.includes('오피스텔') || bldNm.includes('오피스텔')) {
                offis.push(bldNm || comb);
            }
        });
        console.log(`[총괄표제부 Page ${page}] apts: ${apts.length}, offis: ${offis.length}`);
        if (apts.length > 0) console.log('  sample apts:', apts.slice(0, 3));
        if (offis.length > 0) console.log('  sample offis:', offis.slice(0, 3));
    }
}

async function run() {
    await findAptAndOffi('장항동', '10400');
    await findAptAndOffi('식사동', '10100');
}

run();
