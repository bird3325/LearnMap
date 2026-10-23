const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));
const kakaoKey = config.kakao_app_key;

async function testKeyword() {
    const kw = '덕양구 개나리아파트';
    const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(kw)}`, {
        headers: { 'Authorization': `KakaoAK ${kakaoKey}` }
    });
    const d = await res.json();
    console.log('Keyword result for 덕양구 개나리아파트:');
    (d.documents || []).forEach(doc => {
        console.log({
            place_name: doc.place_name,
            address_name: doc.address_name,
            road_address_name: doc.road_address_name,
            x: doc.x,
            y: doc.y
        });
    });

    // Also search address for '경기 고양시 덕양구 성사동 415'
    const aRes = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent('경기 고양시 덕양구 성사동 415')}`, {
        headers: { 'Authorization': `KakaoAK ${kakaoKey}` }
    });
    const aData = await aRes.json();
    console.log('\nAddress result for 성사동 415:');
    (aData.documents || []).forEach(doc => {
        console.log({
            address_name: doc.address_name,
            b_code: doc.address ? doc.address.b_code : null,
            h_code: doc.address ? doc.address.h_code : null
        });
    });
}
testKeyword();
