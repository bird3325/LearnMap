const fs = require('fs');

async function run() {
    const conf = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = conf.data_go_kr_key;
    console.log('serviceKey present:', Boolean(serviceKey));
    
    // sigunguCd: 41281 (고양시 덕양구), bjdongCd: 12800 (행신동)
    const lawdCd = '41281';
    const bjdongCd = '12800';
    
    const eps = [
        { name: '총괄표제부', url: 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo' },
        { name: '일반표제부', url: 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo' }
    ];
    
    for (const ep of eps) {
        console.log('=== Checking:', ep.name, '===');
        for (let p = 1; p <= 10; p++) {
            const fetchUrl = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${lawdCd}&bjdongCd=${bjdongCd}&numOfRows=100&pageNo=${p}`;
            const res = await fetch(fetchUrl);
            const text = await res.text();
            const totalCount = parseInt((text.match(/<totalCount>(.*?)<\/totalCount>/) || [])[1], 10) || 0;
            const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
            console.log(`Page ${p} - totalCount: ${totalCount}, items in page: ${items.length}`);
            
            for (const itemXml of items) {
                const getTag = tag => {
                    const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                    return m ? m[1].trim() : '';
                };
                const bldNm = getTag('bldNm');
                const dongNm = getTag('dongNm');
                const bun = getTag('bun');
                const ji = getTag('ji');
                const mainPurpsCdNm = getTag('mainPurpsCdNm');
                const etcPurps = getTag('etcPurps');
                
                if (bldNm.includes('건우') || bldNm.includes('장미') || bldNm.includes('동문') || bun === '0643' || bun === '0644' || parseInt(bun, 10) === 643 || parseInt(bun, 10) === 644) {
                    console.log(`  -> Match: bldNm=[${bldNm}], dongNm=[${dongNm}], bun-ji=[${bun}-${ji}], purps=[${mainPurpsCdNm}], etc=[${etcPurps}]`);
                }
            }
            if (items.length === 0) break;
            if (p * 100 >= totalCount) break;
        }
    }
}
run();
