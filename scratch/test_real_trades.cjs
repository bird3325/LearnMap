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

async function testRealTrades() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    // 덕양구 (41281), 2024년 4월 아파트 실거래가
    const url = `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=100&LAWD_CD=41281&DEAL_YMD=202404`;
    const xml = await httpsGet(url);
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`[덕양구 202404 실거래가] 총 ${items.length}건 거래 수집됨`);

    const complexAreas = new Map();
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

        if (!complexAreas.has(aptNm)) complexAreas.set(aptNm, new Map());
        const areaMap = complexAreas.get(aptNm);
        const areaKey = parseFloat(excluUseAr).toFixed(2);
        if (!areaMap.has(areaKey)) {
            areaMap.set(areaKey, {
                area: `${areaKey}㎡`,
                pyeong: `${(parseFloat(areaKey) / 3.3058).toFixed(1)}평형`,
                price: `${dealAmount.trim()}만원`,
                date: `${dealYear}-${String(dealMonth).padStart(2, '0')}-${String(dealDay).padStart(2, '0')}`,
                count: 1
            });
        } else {
            areaMap.get(areaKey).count++;
        }
    });

    console.log('\n[실제 국토부 실거래 아파트 단지별 실제 면적 리스트]:');
    for (const [apt, map] of complexAreas.entries()) {
        const areaList = Array.from(map.values()).map(a => `${a.area}(${a.pyeong}, ${a.price})`);
        console.log(`- ${apt}: [ ${areaList.join(' | ')} ]`);
    }
}

testRealTrades();
