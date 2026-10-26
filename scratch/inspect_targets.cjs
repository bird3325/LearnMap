const fs = require('fs');

async function run() {
    const conf = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = conf.data_go_kr_key;
    const lawdCd = '41281';
    const bjdongCd = '12800';
    
    // Page 6 에 있었음
    const fetchUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${lawdCd}&bjdongCd=${bjdongCd}&numOfRows=100&pageNo=6`;
    const res = await fetch(fetchUrl);
    const text = await res.text();
    const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    for (const itemXml of items) {
        const getTag = tag => {
            const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
            return m ? m[1].trim() : '';
        };
        const bldNm = getTag('bldNm');
        const bun = getTag('bun');
        const ji = getTag('ji');
        const hhldCnt = getTag('hhldCnt');
        const fmlyCnt = getTag('fmlyCnt');
        const grndFlrCnt = getTag('grndFlrCnt');
        const useAprDay = getTag('useAprDay');
        const platPlc = getTag('platPlc');
        const newPlatPlc = getTag('newPlatPlc');
        
        if (bldNm.includes('건우') || bldNm.includes('장미') || bldNm.includes('동문')) {
            console.log(`단지명: ${bldNm}`);
            console.log(`  - 지번: ${bun}-${ji} (${platPlc})`);
            console.log(`  - 도로명: ${newPlatPlc}`);
            console.log(`  - 세대수: ${hhldCnt}세대 (가구수: ${fmlyCnt})`);
            console.log(`  - 층수: 지상 ${grndFlrCnt}층`);
            console.log(`  - 사용승인일: ${useAprDay}`);
            console.log('--------------------------------------------------');
        }
    }
}
run();
