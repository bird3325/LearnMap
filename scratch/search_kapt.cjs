const fs = require('fs');
const https = require('https');

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { rejectUnauthorized: false }, res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        }).on('error', reject);
    });
}

async function searchKaptEndpoints() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    // Check potential K-apt endpoints on data.go.kr
    const endpoints = [
        // 한국부동산원_공동주택 단지 목록제공 서비스 (15058017 / 15057632 / 1613000 / 15057371 등)
        `https://apis.data.go.kr/1613000/AptListService/getTotalAptList?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=10`,
        `https://apis.data.go.kr/1613000/AptListService/getSigunguAptList?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&pageNo=1&numOfRows=10`,
        `https://apis.data.go.kr/1613000/AptListService/getLegaldongAptList?serviceKey=${encodeURIComponent(serviceKey)}&bjdCode=4128112800&pageNo=1&numOfRows=10`,
        `https://apis.data.go.kr/15058017/v1/uddi:00000000-0000-0000-0000-000000000000?serviceKey=${encodeURIComponent(serviceKey)}`,
        `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=112800&numOfRows=5&pageNo=1`
    ];

    for (const ep of endpoints) {
        try {
            console.log('Testing:', ep.split('?')[0]);
            const res = await httpsGet(ep);
            console.log('Result:', res.substring(0, 300).replace(/\n/g, ' '));
        } catch (e) {
            console.error('Err:', e.message);
        }
    }
}

searchKaptEndpoints();
