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

async function testDongs() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const kakaoKey = config.kakao_api_key || config.kakao_app_key;

    const sido = '경기도';
    const gu = '덕양구';

    const dongsInGu = new Set();
    const centerRes = await httpsGet(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(`${sido} ${gu} 행정복지센터`)}&size=15`, {
        'Authorization': `KakaoAK ${kakaoKey}`,
        'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000'
    });
    const cData = JSON.parse(centerRes);
    (cData.documents || []).forEach(doc => {
        const m = (doc.address_name || '').match(/([가-힣0-9]+동)/);
        if (m) dongsInGu.add(m[1].replace(/[0-9]+동$/, '동'));
    });

    console.log('dongsInGu list:', Array.from(dongsInGu));
    console.log('신원동 포함 여부:', dongsInGu.has('신원동'));
    console.log('원신동 포함 여부:', dongsInGu.has('원신동'));
}

testDongs();
