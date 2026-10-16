const fs = require('fs');
const https = require('https');
const path = require('path');

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
        let matched = groups.find(g => Math.abs(g.rawArea - item.rawArea) < 1.4);
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

async function runRealAreaSync() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;
    const REAL_ESTATE_PATH = path.join('src', 'data', 'realestate_seoul.json');
    const existingList = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8'));

    const ymds = ['202404', '202403', '202402', '202401', '202312', '202311'];

    // 1. Fetch real trades from public APIs for Deogyang-gu (41281)
    const complexTradeMap = new Map(); // key: type_cleanName -> [tradeItems]

    const endpoints = [
        { type: 'apt', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev', nameTag: 'aptNm' },
        { type: 'rh', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade', nameTag: 'mhouseNm' },
        { type: 'offi', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade', nameTag: 'offiNm' }
    ];

    console.log('Fetching genuine MOLIT trades for 41281 (Deogyang-gu)...');

    for (const ep of endpoints) {
        for (const ymd of ymds) {
            const url = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=41281&DEAL_YMD=${ymd}`;
            try {
                const xml = await httpsGet(url);
                const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
                items.forEach(it => {
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

                    if (!rawNm || !excluUseAr) return;

                    const cleanNm = cleanComplexName(rawNm);
                    const key = `${ep.type}_${cleanNm}`;
                    if (!complexTradeMap.has(key)) complexTradeMap.set(key, []);

                    const areaNum = parseFloat(excluUseAr);
                    const tradeDate = `${dealYear}-${String(dealMonth).padStart(2, '0')}-${String(dealDay).padStart(2, '0')}`;
                    const price = `${dealAmount.trim()}만원`;

                    complexTradeMap.get(key).push({
                        rawName: rawNm,
                        cleanName: cleanNm,
                        rawArea: areaNum,
                        price,
                        tradeDate,
                        dong: umdNm,
                        jibun
                    });
                });
            } catch (e) {
                console.error(`Error ${ep.type} ${ymd}:`, e.message);
            }
        }
    }

    console.log(`Unique traded complexes in MOLIT API: ${complexTradeMap.size}`);

    // 2. Process existing DB
    let realMatchedCount = 0;
    let fakePurgedCount = 0;

    const updatedList = existingList.map(estate => {
        const cName = cleanComplexName(estate.name);
        const directKey = `${estate.type}_${cName}`;

        let matchedTrades = complexTradeMap.get(directKey);

        // Try slight variations if not directly matched
        if (!matchedTrades) {
            for (const [key, trList] of complexTradeMap.entries()) {
                if (key.startsWith(`${estate.type}_`)) {
                    const tClean = key.replace(`${estate.type}_`, '');
                    const cleanWithoutSpaces = cName.replace(/\s+/g, '');
                    const tCleanWithoutSpaces = tClean.replace(/\s+/g, '');
                    if (cleanWithoutSpaces === tCleanWithoutSpaces || 
                        (cleanWithoutSpaces.length >= 4 && tCleanWithoutSpaces.includes(cleanWithoutSpaces)) ||
                        (tCleanWithoutSpaces.length >= 4 && cleanWithoutSpaces.includes(tCleanWithoutSpaces))) {
                        matchedTrades = trList;
                        break;
                    }
                }
            }
        }

        if (matchedTrades && matchedTrades.length > 0) {
            realMatchedCount++;
            const grouped = groupRealAreas(matchedTrades);

            // Find primary area (most transacted)
            let primary = grouped[0];
            let maxCount = -1;
            grouped.forEach(g => {
                if (g.count > maxCount) {
                    maxCount = g.count;
                    primary = g;
                }
            });

            // Find latest trade
            let latestTrade = matchedTrades[0];
            matchedTrades.forEach(tr => {
                if (tr.tradeDate >= latestTrade.tradeDate) latestTrade = tr;
            });

            return {
                ...estate,
                price: latestTrade.price,
                tradeDate: latestTrade.tradeDate,
                area: primary.area,
                source: '실거래가/마스터 연동',
                areaList: grouped.map(g => ({
                    area: g.area,
                    pyeong: g.pyeong,
                    householdCount: g.count,
                    price: g.price,
                    tradeDate: g.tradeDate
                }))
            };
        } else {
            // NOT matched with recent trades
            // PURGE fake dummy areas [59.9, 84.9, 114.8] or [45.5, 59.9, 74.5]
            const hasFakeDummy = Array.isArray(estate.areaList) && estate.areaList.some(a => 
                a.price === '기본 정보 구축 (실거래 대기)' && 
                (a.area === '59.9㎡' || a.area === '84.9㎡' || a.area === '114.8㎡' || a.area === '45.5㎡' || a.area === '74.5㎡' || a.area === '26.4㎡' || a.area === '33.5㎡')
            );

            if (hasFakeDummy) {
                fakePurgedCount++;
                let rawAreaNum = parseFloat(String(estate.area || '').replace(/[^0-9.]/g, ''));
                if (!isNaN(rawAreaNum) && rawAreaNum > 8 && rawAreaNum <= 300) {
                    // It had a single real area
                    const pyeongStr = `${(rawAreaNum / 3.3058).toFixed(1)}평형`;
                    estate.area = `${rawAreaNum.toFixed(1)}㎡`;
                    estate.areaList = [{
                        area: estate.area,
                        pyeong: pyeongStr,
                        householdCount: 1,
                        price: estate.price || '기본 정보 구축 (실거래 대기)',
                        tradeDate: estate.tradeDate || '-'
                    }];
                } else {
                    // Area was gross building area (> 300) or invalid
                    estate.area = '-';
                    estate.areaList = [];
                }
            }

            return estate;
        }
    });

    console.log(`\nResults:`);
    console.log(`- Total items: ${updatedList.length}`);
    console.log(`- Matched with REAL trades: ${realMatchedCount}`);
    console.log(`- Purged fake dummy areaLists: ${fakePurgedCount}`);

    // Save updated list
    fs.writeFileSync(REAL_ESTATE_PATH, JSON.stringify(updatedList, null, 2), 'utf8');

    // Also copy to public/data and public/src/data if they exist
    const p1 = path.join('public', 'data', 'realestate_seoul.json');
    if (fs.existsSync(path.dirname(p1))) fs.writeFileSync(p1, JSON.stringify(updatedList, null, 2), 'utf8');
    const p2 = path.join('public', 'src', 'data', 'realestate_seoul.json');
    if (fs.existsSync(path.dirname(p2))) fs.writeFileSync(p2, JSON.stringify(updatedList, null, 2), 'utf8');

    console.log('Saved realestate_seoul.json successfully!');
}

runRealAreaSync();
