const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));

const kakaoKey = config.kakao_app_key;

async function testDongInfo() {
    const query = `경기도 고양시 덕양구 성사동`;
    const dRes = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `KakaoAK ${kakaoKey}` }
    });
    const dData = await dRes.json();
    console.log('Kakao address query result for 성사동:');
    if (dData.documents && dData.documents.length > 0) {
        const doc = dData.documents[0];
        console.log({
            address_name: doc.address_name,
            b_code: doc.address ? doc.address.b_code : null,
            h_code: doc.address ? doc.address.h_code : null
        });
    }
}

testDongInfo();
