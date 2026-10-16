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

async function testExposItem() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    // getBrExposInfo 1개 아이템 전체 태그 확인
    const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=12800&numOfRows=1&pageNo=1`;
    const res = await httpsGet(url);
    const m = res.data.match(/<item>([\s\S]*?)<\/item>/);
    if (m) {
        console.log('전유부 item tags:\n', m[1]);
    } else {
        console.log('No item found. Full response:', res.data);
    }
}

testExposItem();
