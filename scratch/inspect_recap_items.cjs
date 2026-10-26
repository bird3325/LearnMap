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

async function run() {
    // 백석동 백송마을 총괄표제부
    const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41285&bjdongCd=10600&numOfRows=100&pageNo=1`;
    const xml = await httpsGet(url);
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    console.log('=== 백석동 총괄표제부 아파트 샘플 ===');
    items.forEach(item => {
        const bldNm = (item.match(/<bldNm>(.*?)<\/bldNm>/) || [])[1] || '';
        const dongNm = (item.match(/<dongNm>(.*?)<\/dongNm>/) || [])[1] || '';
        const bun = (item.match(/<bun>(.*?)<\/bun>/) || [])[1] || '';
        const ji = (item.match(/<ji>(.*?)<\/ji>/) || [])[1] || '';
        const platPlc = (item.match(/<platPlc>(.*?)<\/platPlc>/) || [])[1] || '';
        const main = (item.match(/<mainPurpsCdNm>(.*?)<\/mainPurpsCdNm>/) || [])[1] || '';
        const etc = (item.match(/<etcPurps>(.*?)<\/etcPurps>/) || [])[1] || '';
        if (bldNm.includes('백송') || etc.includes('아파트') || main.includes('공동주택')) {
            console.log(`bldNm: "${bldNm}" | dongNm: "${dongNm}" | 지번: ${bun}-${ji} | platPlc: "${platPlc}" | 용도: "${main} / ${etc}"`);
        }
    });

    // 장항동 호수마을 총괄표제부 (Page 5)
    const url2 = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41285&bjdongCd=10400&numOfRows=100&pageNo=5`;
    const xml2 = await httpsGet(url2);
    const items2 = xml2.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log('\n=== 장항동 총괄표제부 Page 5 아파트/오피스텔 샘플 ===');
    items2.forEach(item => {
        const bldNm = (item.match(/<bldNm>(.*?)<\/bldNm>/) || [])[1] || '';
        const dongNm = (item.match(/<dongNm>(.*?)<\/dongNm>/) || [])[1] || '';
        const bun = (item.match(/<bun>(.*?)<\/bun>/) || [])[1] || '';
        const ji = (item.match(/<ji>(.*?)<\/ji>/) || [])[1] || '';
        const platPlc = (item.match(/<platPlc>(.*?)<\/platPlc>/) || [])[1] || '';
        const main = (item.match(/<mainPurpsCdNm>(.*?)<\/mainPurpsCdNm>/) || [])[1] || '';
        const etc = (item.match(/<etcPurps>(.*?)<\/etcPurps>/) || [])[1] || '';
        if (bldNm.includes('호수마을') || bldNm.includes('킨텍스') || etc.includes('아파트') || etc.includes('오피스텔') || main.includes('오피스텔')) {
            console.log(`bldNm: "${bldNm}" | dongNm: "${dongNm}" | 지번: ${bun}-${ji} | platPlc: "${platPlc}" | 용도: "${main} / ${etc}"`);
        }
    });
}

run();
