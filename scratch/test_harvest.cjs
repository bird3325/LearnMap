const fs = require('fs');

async function testHarvest() {
    const conf = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = conf.data_go_kr_key;
    const kakaoKey = conf.kakao_app_key;
    const headers = {
        'Authorization': 'KakaoAK ' + kakaoKey,
        'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000'
    };
    
    // 41281 (고양시 덕양구)
    const lawdCd = '41281';
    const ym = '202501'; // 샘플 1달
    
    const url = `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getAptTradeDev?serviceKey=${encodeURIComponent(serviceKey)}&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}&pageNo=1&numOfRows=1000`;
    const res = await fetch(url);
    const xml = await res.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`[${ym}] 덕양구 아파트 매매 거래 건수: ${items.length}건`);
    
    const complexMap = new Map();
    items.forEach(itemXml => {
        const getTag = tag => {
            const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
            return m ? m[1].trim() : '';
        };
        const aptNm = getTag('aptNm');
        const umdNm = getTag('umdNm');
        const jibun = getTag('jibun');
        const buildYear = getTag('buildYear');
        if (aptNm && umdNm) {
            const key = `${umdNm}_${aptNm}_${jibun}`;
            if (!complexMap.has(key)) {
                complexMap.set(key, { aptNm, umdNm, jibun, buildYear });
            }
        }
    });
    
    console.log(`고유 단지 수: ${complexMap.size}개`);
    Array.from(complexMap.values()).slice(0, 5).forEach(c => {
        console.log(` - ${c.umdNm} ${c.aptNm} (지번: ${c.jibun}, 준공: ${c.buildYear})`);
    });
}
testHarvest();
