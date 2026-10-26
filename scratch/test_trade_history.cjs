const fs = require('fs');

async function run() {
    const conf = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = conf.data_go_kr_key;
    const lawdCd = '41281';
    
    // 2023, 2024 샘플 몇 달 조회
    const months = ['202410', '202409', '202408', '202407', '202406', '202405', '202404', '202403', '202402', '202401', '202312', '202311', '202310'];
    const eps = [
        { name: '아파트매매', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getAptTradeDev' },
        { name: '아파트전월세', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getAptRent' }
    ];

    for (const ep of eps) {
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
                    const aptNm = getTag('aptNm');
                    const dong = getTag('umdNm');
                    const jibun = getTag('jibun');
                    const price = getTag('dealAmount') || getTag('deposit');
                    
                    if (dong.includes('행신') && (aptNm.includes('건우') || aptNm.includes('장미') || aptNm.includes('동문') || jibun.startsWith('643') || jibun.startsWith('644'))) {
                        console.log(`[${ep.name} ${ym}] ${dong} ${aptNm} (${jibun}) - 금액: ${price}만원`);
                    }
                }
            } catch (e) {}
        }
    }
}
run();
