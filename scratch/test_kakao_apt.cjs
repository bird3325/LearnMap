const fs = require('fs');

async function run() {
    const conf = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const kakaoKey = conf.kakao_app_key;
    const headers = {
        'Authorization': 'KakaoAK ' + kakaoKey,
        'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000'
    };
    
    // 카카오 로컬 키워드 검색: "고양시 덕양구 행신동 아파트"
    const query = '고양시 덕양구 행신동 아파트';
    console.log('Searching Kakao query:', query);
    
    let allDocs = [];
    for (let page = 1; page <= 5; page++) {
        const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=15&page=${page}`;
        const res = await fetch(url, { headers });
        const data = await res.json();
        const docs = data.documents || [];
        allDocs = allDocs.concat(docs);
        if (data.meta && data.meta.is_end) break;
    }
    
    console.log('Total Kakao apartment results:', allDocs.length);
    const targets = ['건우', '장미', '동문'];
    targets.forEach(t => {
        const found = allDocs.filter(d => d.place_name.includes(t));
        console.log(`Found for [${t}]:`, found.map(f => `${f.place_name} (${f.address_name})`));
    });
}
run();
