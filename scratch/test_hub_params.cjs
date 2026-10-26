const fs = require('fs');

async function run() {
    const conf = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = conf.data_go_kr_key;
    const lawdCd = '41281'; // 고양시 덕양구
    const bjdongCd = '12800'; // 행신동
    
    // mainPurpsCdNm 또는 mainPurpsCd 테스트
    // 공동주택 코드: 02000
    const tests = [
        { desc: '기본 (파라미터 없음)', params: '' },
        { desc: 'mainPurpsCd=02000 (공동주택)', params: '&mainPurpsCd=02000' },
        { desc: 'mainPurpsCdNm=공동주택', params: '&mainPurpsCdNm=' + encodeURIComponent('공동주택') },
        { desc: 'bldNm=건우', params: '&bldNm=' + encodeURIComponent('건우') }
    ];
    
    for (const t of tests) {
        const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${lawdCd}&bjdongCd=${bjdongCd}&numOfRows=10&pageNo=1${t.params}`;
        const res = await fetch(url);
        const text = await res.text();
        const totalCount = (text.match(/<totalCount>(.*?)<\/totalCount>/) || [])[1];
        const resultCode = (text.match(/<resultCode>(.*?)<\/resultCode>/) || [])[1];
        const resultMsg = (text.match(/<resultMsg>(.*?)<\/resultMsg>/) || [])[1];
        console.log(`[${t.desc}] -> totalCount: ${totalCount}, code: ${resultCode}, msg: ${resultMsg}`);
    }
}
run();
