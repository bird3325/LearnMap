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

async function testRHAndOffi() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;
    const ymds = ['202404', '202403', '202402', '202401', '202312', '202311'];

    // 1. RH
    let rhTotal = 0;
    const rhMap = new Map();
    for (const ymd of ymds) {
        const url = `https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=41281&DEAL_YMD=${ymd}`;
        const xml = await httpsGet(url);
        const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        rhTotal += items.length;
        items.forEach(it => {
            const getTag = t => {
                const m = it.match(new RegExp(`<${t}>(.*?)<\/${t}>`));
                return m ? m[1].trim() : '';
            };
            const nm = cleanComplexName(getTag('mhouseNm'));
            const ar = getTag('excluUseAr');
            const amt = getTag('dealAmount');
            if (nm && ar) {
                if (!rhMap.has(nm)) rhMap.set(nm, []);
                rhMap.get(nm).push({ area: ar, price: amt });
            }
        });
    }
    console.log(`RH trades: ${rhTotal}, Unique complexes: ${rhMap.size}`);

    // 2. Offi
    let offiTotal = 0;
    const offiMap = new Map();
    for (const ymd of ymds) {
        const url = `https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=41281&DEAL_YMD=${ymd}`;
        const xml = await httpsGet(url);
        const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        offiTotal += items.length;
        items.forEach(it => {
            const getTag = t => {
                const m = it.match(new RegExp(`<${t}>(.*?)<\/${t}>`));
                return m ? m[1].trim() : '';
            };
            const nm = cleanComplexName(getTag('offiNm'));
            const ar = getTag('excluUseAr');
            const amt = getTag('dealAmount');
            if (nm && ar) {
                if (!offiMap.has(nm)) offiMap.set(nm, []);
                offiMap.get(nm).push({ area: ar, price: amt });
            }
        });
    }
    console.log(`Offi trades: ${offiTotal}, Unique complexes: ${offiMap.size}`);
}

testRHAndOffi();
