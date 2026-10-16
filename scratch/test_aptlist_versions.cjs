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

async function testAptListVersions() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    const urls = [
        `https://apis.data.go.kr/1613000/AptListService3/getSigunguAptList3?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&pageNo=1&numOfRows=5`,
        `https://apis.data.go.kr/1613000/AptListService4/getSidoAptList4?serviceKey=${encodeURIComponent(serviceKey)}&sidoCd=41&pageNo=1&numOfRows=5`
    ];

    for (const u of urls) {
        try {
            console.log('Calling:', u.split('?')[0]);
            const res = await httpsGet(u);
            console.log('Result:', res.substring(0, 300).replace(/\n/g, ' '));
        } catch (e) {
            console.error('Error:', e.message);
        }
    }
}

testAptListVersions();
