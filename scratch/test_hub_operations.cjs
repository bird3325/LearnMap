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

async function testOperations() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    const ops = [
        'getBrExposPubuseAreaInfo',
        'getBrPubuseAreaInfo',
        'getBrFlrOulnInfo',
        'getBrBasisOulnInfo',
        'getBrHsprcInfo',
        'getBrWclfInfo'
    ];

    for (const op of ops) {
        const url = `https://apis.data.go.kr/1613000/BldRgstHubService/${op}?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=12800&numOfRows=1&pageNo=1`;
        const res = await httpsGet(url);
        const hasItem = res.data.includes('<item>');
        console.log(`[${op}] status=${res.status}, hasItem=${hasItem}`);
        if (hasItem) {
            const m = res.data.match(/<item>([\s\S]*?)<\/item>/);
            console.log('Sample item:', m ? m[1].substring(0, 500) : '');
        } else {
            const msg = res.data.match(/<resultMsg>(.*?)<\/resultMsg>/);
            console.log('resultMsg:', msg ? msg[1] : res.data.substring(0, 200));
        }
    }
}

testOperations();
