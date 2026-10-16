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

async function main() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    // Check multiple months of trade data for Deogyang-gu (41281)
    const ymds = ['202404', '202403', '202402', '202401', '202312', '202311'];
    console.log('Fetching MOLIT trades for 41281 over 6 months...');

    const aptTradeMap = new Map(); // complexName -> Map(area -> { price, date, count })

    for (const ymd of ymds) {
        const url = `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=41281&DEAL_YMD=${ymd}`;
        try {
            const xml = await httpsGet(url);
            const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
            console.log(`- Month ${ymd}: ${items.length} apt trades`);
            items.forEach(it => {
                const getTag = tag => {
                    const m = it.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                    return m ? m[1].trim() : '';
                };
                const aptNm = getTag('aptNm');
                const excluUseAr = getTag('excluUseAr');
                const dealAmount = getTag('dealAmount');
                const dealYear = getTag('dealYear');
                const dealMonth = getTag('dealMonth');
                const dealDay = getTag('dealDay');
                if (!aptNm || !excluUseAr) return;

                if (!aptTradeMap.has(aptNm)) aptTradeMap.set(aptNm, new Map());
                const aMap = aptTradeMap.get(aptNm);
                const areaNum = parseFloat(excluUseAr);
                const areaKey = areaNum.toFixed(2);

                const dateStr = `${dealYear}-${String(dealMonth).padStart(2, '0')}-${String(dealDay).padStart(2, '0')}`;
                const priceStr = `${dealAmount.trim()}만원`;

                if (!aMap.has(areaKey)) {
                    aMap.set(areaKey, {
                        area: `${areaKey}㎡`,
                        pyeong: `${(areaNum / 3.3058).toFixed(1)}평형`,
                        rawArea: areaNum,
                        price: priceStr,
                        tradeDate: dateStr,
                        count: 1
                    });
                } else {
                    const ex = aMap.get(areaKey);
                    ex.count++;
                    if (dateStr > ex.tradeDate) {
                        ex.tradeDate = dateStr;
                        ex.price = priceStr;
                    }
                }
            });
        } catch (e) {
            console.error(`Error for ${ymd}:`, e.message);
        }
    }

    console.log(`\nTotal unique Apt complexes with real trades: ${aptTradeMap.size}`);
    let sampleCount = 0;
    for (const [name, areas] of aptTradeMap.entries()) {
        if (sampleCount++ < 15) {
            const list = Array.from(areas.values()).map(a => `${a.area} (${a.pyeong}, ${a.price})`);
            console.log(`* ${name} (${areas.size}개 실면적): ${list.join(' | ')}`);
        }
    }
}

main();
