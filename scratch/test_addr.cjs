const fs = require('fs');
const https = require('https');

function httpsGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            headers
        };
        https.get(options, res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        }).on('error', reject);
    });
}

async function findAddr() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const kakaoKey = config.kakao_api_key || config.kakao_app_key;

    const res = await httpsGet(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent('경기 고양시 덕양구 신원1로 70')}`, {
        'Authorization': `KakaoAK ${kakaoKey}`,
        'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000'
    });
    console.log('Kakao address result:', res);
}

findAddr();
