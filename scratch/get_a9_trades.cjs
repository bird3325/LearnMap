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

async function getA9Trades() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    const ymds = [
        '202404', '202403', '202402', '202401',
        '202312', '202311', '202310', '202309',
        '202308', '202307', '202306', '202305'
    ];

    const allTrades = [];

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
                if (aptNm && (aptNm.includes('A9') || aptNm.includes('신원마을호반') || (aptNm.includes('호반') && aptNm.includes('9')))) {
                    allTrades.push({
                        aptNm,
                        excluUseAr: parseFloat(getTag('excluUseAr')),
                        dealAmount: getTag('dealAmount').trim(),
                        date: `${getTag('dealYear')}-${String(getTag('dealMonth')).padStart(2, '0')}-${String(getTag('dealDay')).padStart(2, '0')}`,
                        floor: getTag('floor')
                    });
                }
            });
        } catch (e) {
            console.error(e.message);
        }
    }

    console.log(`Total A9 Hoban trades found: ${allTrades.length}`);
    allTrades.forEach(t => console.log(`  * ${t.aptNm} | ${t.excluUseAr}㎡ | ${t.dealAmount}만원 | ${t.date} (${t.floor}층)`));

    // Grouping
    const groups = [];
    allTrades.sort((a, b) => a.excluUseAr - b.excluUseAr).forEach(t => {
        let g = groups.find(x => Math.abs(x.rawArea - t.excluUseAr) < 1.4);
        if (!g) {
            groups.push({
                area: `${t.excluUseAr.toFixed(1)}㎡`,
                pyeong: `${(t.excluUseAr / 3.3058).toFixed(1)}평형`,
                rawArea: t.excluUseAr,
                price: `${t.dealAmount}만원`,
                tradeDate: t.date,
                count: 1
            });
        } else {
            g.count++;
            if (t.date >= g.tradeDate) {
                g.tradeDate = t.date;
                g.price = `${t.dealAmount}만원`;
            }
        }
    });

    console.log('\nGrouped 3 real areas for 신원마을 호반베르디움 9단지:');
    groups.sort((a, b) => a.rawArea - b.rawArea).forEach(g => {
        console.log(`- ${g.area} (${g.pyeong}): 최근 실거래가 ${g.price} (거래일: ${g.tradeDate}, 총 ${g.count}건 거래)`);
    });
}

getA9Trades();
