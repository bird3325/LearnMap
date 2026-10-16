const fs = require('fs');
const https = require('https');

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { rejectUnauthorized: false }, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const data = Buffer.concat(chunks).toString('utf8');
                resolve({ status: res.statusCode, data });
            });
        }).on('error', (err) => reject(err));
    });
}

async function testExposPubuse() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    // getBrExposPubuseAreaInfo 5개 아이템
    const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=12800&numOfRows=5&pageNo=1`;
    const res = await httpsGet(url);
    const items = res.data.match(/<item>([\s\S]*?)<\/item>/g) || [];
    console.log(`Found ${items.length} items`);
    items.forEach((it, idx) => {
        console.log(`\n--- Item ${idx + 1} ---`);
        console.log(it);
    });
}

testExposPubuse();
