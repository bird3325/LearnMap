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

// Group areas within 1.2m2 tolerance to combine slight layout variations (e.g. 84.93 vs 84.98)
function groupRealAreas(rawAreaItems) {
    // rawAreaItems: [{ rawArea, dealAmount, dateStr, count }]
    const groups = [];
    // Sort descending by count or latest date
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

async function testGrouping() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    const ymds = ['202404', '202403', '202402', '202401', '202312', '202311'];
    const complexMap = new Map();

    for (const ymd of ymds) {
        const url = `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=41281&DEAL_YMD=${ymd}`;
        try {
            const xml = await httpsGet(url);
            const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
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

                const cleanName = cleanComplexName(aptNm);
                if (!complexMap.has(cleanName)) complexMap.set(cleanName, []);
                const areaNum = parseFloat(excluUseAr);
                const dateStr = `${dealYear}-${String(dealMonth).padStart(2, '0')}-${String(dealDay).padStart(2, '0')}`;
                const priceStr = `${dealAmount.trim()}만원`;

                complexMap.get(cleanName).push({
                    rawArea: areaNum,
                    price: priceStr,
                    tradeDate: dateStr,
                    count: 1
                });
            });
        } catch (e) {
            console.error(e.message);
        }
    }

    console.log(`\n=== 실제 단지별 그룹화된 실제 면적 리스트 (총 ${complexMap.size}개 단지) ===`);
    let count = 0;
    for (const [name, rawItems] of complexMap.entries()) {
        const grouped = groupRealAreas(rawItems);
        if (count++ < 20) {
            const listStr = grouped.map(g => `${g.area}(${g.pyeong}, ${g.price})`).join(' | ');
            console.log(`- ${name} [${grouped.length}개 타입]: ${listStr}`);
        }
    }
}

testGrouping();
