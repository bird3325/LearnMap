const fs = require('fs');
const https = require('https');

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { rejectUnauthorized: false }, res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        }).on('error', reject);
    });
}

async function inspectHoban9() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    console.log('=== 1. Checking MOLIT Apt Trades for 신원동 & 호반 in 41281 ===');
    const ymds = ['202404', '202403', '202402', '202401', '202312', '202311', '202310', '202309', '202308', '202307', '202306', '202305'];

    const molitMatches = [];
    for (const ymd of ymds) {
        const url = `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=41281&DEAL_YMD=${ymd}`;
        try {
            const xml = await httpsGet(url);
            const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
            items.forEach(it => {
                const getTag = t => {
                    const m = it.match(new RegExp(`<${t}>(.*?)<\/${t}>`));
                    return m ? m[1].trim() : '';
                };
                const aptNm = getTag('aptNm');
                const umdNm = getTag('umdNm');
                const jibun = getTag('jibun');
                const excluUseAr = getTag('excluUseAr');
                const dealAmount = getTag('dealAmount');
                const dealYear = getTag('dealYear');
                const dealMonth = getTag('dealMonth');
                const dealDay = getTag('dealDay');

                if (aptNm && (aptNm.includes('호반') || aptNm.includes('9단지') || umdNm.includes('신원'))) {
                    molitMatches.push({
                        aptNm,
                        umdNm,
                        jibun,
                        excluUseAr,
                        dealAmount,
                        date: `${dealYear}-${dealMonth}-${dealDay}`
                    });
                }
            });
        } catch (e) {
            console.error(e.message);
        }
    }

    console.log(`Found ${molitMatches.length} matching trade records.`);
    const aptNames = [...new Set(molitMatches.map(m => `${m.umdNm} - ${m.aptNm} (지번: ${m.jibun})`))];
    console.log('Unique apt names found in MOLIT trades:');
    aptNames.forEach(n => console.log('  *', n));

    const hoban9Trades = molitMatches.filter(m => (m.aptNm.includes('9') && m.aptNm.includes('호반')) || (m.aptNm.includes('호반') && m.umdNm.includes('신원')));
    console.log('\nHoban in Shinwon trades:');
    const distinctAreas = new Map();
    hoban9Trades.forEach(t => {
        const aNum = parseFloat(t.excluUseAr);
        const k = aNum.toFixed(2);
        if (!distinctAreas.has(k)) {
            distinctAreas.set(k, { count: 1, price: t.dealAmount, aptNm: t.aptNm, date: t.date });
        } else {
            distinctAreas.get(k).count++;
        }
    });
    for (const [ar, info] of distinctAreas.entries()) {
        console.log(`  - Area: ${ar}㎡, Count: ${info.count}, Latest Price: ${info.price}만원, Name: ${info.aptNm}`);
    }

    console.log('\n=== 2. Checking BldRgstHubService expos for 신원동 ===');
    // First let's find bjdongCd for 신원동
    // Let's test bjdongCd in 41281 (신원동 is usually 12800 or let's search)
}

inspectHoban9();
