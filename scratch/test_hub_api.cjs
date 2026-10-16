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

async function testHub() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;
    console.log('serviceKey present:', !!serviceKey);

    // 고양시 덕양구 행신동: sigunguCd: 41281, bjdongCd: 12800
    // 서울 노원구 상계동: sigunguCd: 11350, bjdongCd: 10500
    const testCases = [
        { name: '행신동 총괄표제부', url: `https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=12800&numOfRows=2&pageNo=1` },
        { name: '행신동 일반표제부', url: `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=12800&numOfRows=2&pageNo=1` },
        { name: '행신동 전유부', url: `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=12800&numOfRows=5&pageNo=1` }
    ];

    for (const tc of testCases) {
        console.log(`\n--- ${tc.name} ---`);
        try {
            const res = await httpsGet(tc.url);
            console.log('Status:', res.status);
            console.log('Response sample:\n', res.data.substring(0, 1200));
        } catch (e) {
            console.error('Error:', e.message);
        }
    }
}

testHub();
