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

function cleanComplexName(rawName) {
    if (!rawName || typeof rawName !== 'string') return '';
    let name = rawName.replace(/\s+/g, ' ').trim();
    name = name.replace(/\((?:제?\d+동|\d+호|[A-Za-z가-힣]동)\)/g, '');
    name = name.replace(/(?:제\s*)?\d+\s*동$/g, '');
    name = name.replace(/\s+[A-Za-z가-힣]\s*동$/g, '');
    name = name.replace(/\s+\d+\s*호$/g, '');
    name = name.replace(/\s+/g, ' ').trim();
    return name;
}

function groupRealAreas(rawAreaItems) {
    const groups = [];
    const sorted = [...rawAreaItems].sort((a, b) => a.rawArea - b.rawArea);

    sorted.forEach(item => {
        let matched = groups.find(g => Math.abs(g.rawArea - item.rawArea) < 1.5);
        if (!matched) {
            groups.push({
                area: `${item.rawArea.toFixed(1)}㎡`,
                pyeong: `${(item.rawArea / 3.3058).toFixed(1)}평형`,
                rawArea: item.rawArea,
                price: item.price,
                tradeDate: item.tradeDate,
                count: item.count || 1
            });
        } else {
            matched.count += (item.count || 1);
            if (item.tradeDate >= matched.tradeDate) {
                matched.tradeDate = item.tradeDate;
                matched.price = item.price;
            }
        }
    });

    return groups.sort((a, b) => a.rawArea - b.rawArea);
}

async function testMatch() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;
    const items = JSON.parse(fs.readFileSync('src/data/realestate_seoul.json', 'utf8'));

    const ymds = ['202404', '202403', '202402', '202401', '202312', '202311'];

    // Collect all real trades for Apt, RH, Offi
    const trades = [];
    const endpoints = [
        { type: 'apt', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev', nameTag: 'aptNm' },
        { type: 'rh', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade', nameTag: 'mhouseNm' },
        { type: 'offi', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade', nameTag: 'offiNm' }
    ];

    for (const ep of endpoints) {
        for (const ymd of ymds) {
            const url = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=41281&DEAL_YMD=${ymd}`;
            try {
                const xml = await httpsGet(url);
                const xmlItems = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
                xmlItems.forEach(it => {
                    const getTag = t => {
                        const m = it.match(new RegExp(`<${t}>(.*?)<\/${t}>`));
                        return m ? m[1].trim() : '';
                    };
                    const rawNm = getTag(ep.nameTag);
                    const excluUseAr = getTag('excluUseAr');
                    const dealAmount = getTag('dealAmount');
                    const dealYear = getTag('dealYear');
                    const dealMonth = getTag('dealMonth');
                    const dealDay = getTag('dealDay');
                    const umdNm = getTag('umdNm');
                    const jibun = getTag('jibun');

                    if (rawNm && excluUseAr) {
                        trades.push({
                            type: ep.type,
                            rawName: rawNm,
                            cleanName: cleanComplexName(rawNm),
                            rawArea: parseFloat(excluUseAr),
                            price: `${dealAmount.trim()}만원`,
                            tradeDate: `${dealYear}-${String(dealMonth).padStart(2, '0')}-${String(dealDay).padStart(2, '0')}`,
                            dong: umdNm,
                            jibun
                        });
                    }
                });
            } catch (e) {
                console.error(e.message);
            }
        }
    }

    console.log(`Total real trades fetched: ${trades.length}`);

    // Map trades by type and cleanName
    const tradeMap = new Map(); // key: type_cleanName -> [trades]
    trades.forEach(t => {
        const key = `${t.type}_${t.cleanName}`;
        if (!tradeMap.has(key)) tradeMap.set(key, []);
        tradeMap.get(key).push(t);
    });

    let matchedCount = 0;
    const sampleResults = [];

    items.forEach(estate => {
        const cName = cleanComplexName(estate.name);
        const directKey = `${estate.type}_${cName}`;
        let matchedTrades = tradeMap.get(directKey);

        if (!matchedTrades) {
            // fuzzy search in same type
            for (const [k, trList] of tradeMap.entries()) {
                if (k.startsWith(`${estate.type}_`)) {
                    const tradeCName = k.replace(`${estate.type}_`, '');
                    if (cName.includes(tradeCName) || tradeCName.includes(cName) || (estate.address && trList[0].dong && estate.address.includes(trList[0].dong) && trList[0].jibun && estate.address.includes(trList[0].jibun))) {
                        matchedTrades = trList;
                        break;
                    }
                }
            }
        }

        if (matchedTrades && matchedTrades.length > 0) {
            matchedCount++;
            const grouped = groupRealAreas(matchedTrades);
            if (sampleResults.length < 10) {
                sampleResults.push({
                    name: estate.name,
                    cleanName: cName,
                    type: estate.type,
                    address: estate.address,
                    realAreas: grouped.map(g => `${g.area} (${g.pyeong}, ${g.price})`)
                });
            }
        }
    });

    console.log(`Matched existing DB items with real trades: ${matchedCount} / ${items.length}`);
    console.log('\nSamples:');
    sampleResults.forEach(s => {
        console.log(`- ${s.name} (${s.type}): ${s.realAreas.join(' | ')}`);
    });
}

testMatch();
