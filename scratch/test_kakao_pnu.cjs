const fs = require('fs');
const https = require('https');

function httpsGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = https.request({
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'GET',
            headers
        }, res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
        req.on('error', reject);
        req.end();
    });
}

async function testKakaoAddress() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const kakaoKey = config.kakao_rest_key || config.kakao_app_key;

    const query = '경기 고양시 덕양구 권율대로 831';
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`;

    try {
        const res = await httpsGet(url, { Authorization: `KakaoAK ${kakaoKey}` });
        const json = JSON.parse(res);
        console.log('Kakao Address result:', JSON.stringify(json.documents[0], null, 2));
        if (json.documents && json.documents[0] && json.documents[0].address) {
            const a = json.documents[0].address;
            const bCode = a.b_code; // 10-digit 법정동코드
            const mountain = a.mountain_yn === 'Y' ? '2' : '1';
            const bun = String(a.main_address_no || '0').padStart(4, '0');
            const ji = String(a.sub_address_no || '0').padStart(4, '0');
            const pnu = `${bCode}${mountain}${bun}${ji}`;
            console.log('\nExtracted 19-digit PNU from Kakao:', pnu, '(Length:', pnu.length, ')');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testKakaoAddress();
