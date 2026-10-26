const fs = require('fs');

async function run() {
    const conf = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = conf.data_go_kr_key;
    
    // sigunguCd: 41281 (고양시 덕양구)
    // 최근 12개월 조회 (202501 ~ 202602)
    const lawdCd = '41281';
    
    const endpoints = [
        { name: '아파트 매매', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getAptTradeDev' },
        { name: '연립다세대 매매', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRHTrade' }
    ];
    
    const months = ['202501', '202502', '202503', '202504', '202505', '202506', '202507', '202508', '202509', '202510', '202511', '202512', '202601', '202602'];
    
    for (const ep of endpoints) {
        console.log(`=== ${ep.name} 실거래가 조회 ===`);
        for (const ym of months) {
            const url = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}&pageNo=1&numOfRows=1000`;
            try {
                const res = await fetch(url);
                const xml = await res.text();
                const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
                for (const itemXml of items) {
                    const getTag = tag => {
                        const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                        return m ? m[1].trim() : '';
                    };
                    const aptNm = getTag('aptNm') || getTag('mhouseNm');
                    const dong = getTag('umdNm');
                    const jibun = getTag('jibun');
                    const price = getTag('dealAmount');
                    
                    if (dong.includes('행신') && (aptNm.includes('건우') || aptNm.includes('장미') || aptNm.includes('동문') || jibun.startsWith('643') || jibun.startsWith('644'))) {
                        console.log(`[${ym}] ${dong} ${aptNm} (${jibun}) - 거래금액: ${price}만원`);
                    }
                }
            } catch (e) {
                console.error(ym, e.message);
            }
        }
    }
}
run();
