const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const kakaoKey = config.kakao_app_key;
const headers = { 
    'Authorization': `KakaoAK ${kakaoKey}`,
    'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000'
};

async function run() {
    console.log('=== TEST 1: 카카오 주소 vs 키워드 검색 ===');
    const dongs = ['백석동', '마두동', '장항동', '식사동', '정발산동', '풍동', '중산동'];
    for (const d of dongs) {
        const query = `경기도 고양시 일산동구 ${d}`;
        // address.json
        const aRes = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`, { headers });
        const aData = await aRes.json();
        const aDoc = aData.documents && aData.documents[0];
        console.log(`[address] "${query}" -> count: ${aData.documents ? aData.documents.length : 0}`);
        if (aDoc) {
            console.log(`   b_code: ${aDoc.address ? aDoc.address.b_code : 'none'}, coord: ${aDoc.x}, ${aDoc.y}`);
        }

        // keyword.json
        const kRes = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`, { headers });
        const kData = await kRes.json();
        const kDoc = kData.documents && kData.documents[0];
        console.log(`[keyword] "${query}" -> place: ${kDoc ? kDoc.place_name : 'none'}, addr: ${kDoc ? kDoc.address_name : 'none'}`);
    }
}

run();
