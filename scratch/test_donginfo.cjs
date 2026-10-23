const fs = require('fs');
const https = require('https');

function httpsGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        https.get({ hostname: u.hostname, path: u.pathname + u.search, headers }, res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        }).on('error', reject);
    });
}

async function testDongInfo() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const kakaoKey = config.kakao_api_key || config.kakao_app_key;

    const query = `경기도 고양시 덕양구 신원동`;
    const dRes = await httpsGet(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`, {
        'Authorization': `KakaoAK ${kakaoKey}`,
        'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000'
    });
    const dData = JSON.parse(dRes);
    const doc = dData.documents[0];
    console.log('doc.address:', doc.address);
    console.log('b_code:', doc.address.b_code);
    console.log('bjdongCd:', doc.address.b_code.substring(5, 10));
}

testDongInfo();
