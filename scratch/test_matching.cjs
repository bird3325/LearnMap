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

async function testMatching() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    // 덕양구 관산동 (41281, 11800)
    const lawdCd = '41281';
    const bjdongCd = '11800';
    const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${lawdCd}&bjdongCd=${bjdongCd}&numOfRows=1000&pageNo=1`;
    const xml = await httpsGet(url);
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`[관산동 전유부] 총 ${items.length}개 항목 수집됨`);

    const bldNames = new Map();
    items.forEach(itemXml => {
        const getTag = tag => {
            const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
            return m ? m[1].trim() : '';
        };
        const gb = getTag('exposPubuseGbCdNm');
        if (gb && !gb.includes('전유')) return;
        const rawBld = getTag('bldNm');
        const areaStr = getTag('area');
        const cleanBld = cleanComplexName(rawBld);
        if (!cleanBld) return;
        if (!bldNames.has(cleanBld)) bldNames.set(cleanBld, new Set());
        bldNames.get(cleanBld).add(areaStr);
    });

    console.log(`[관산동 전유부 단지 수]: ${bldNames.size}개`);
    for (const [name, areas] of bldNames.entries()) {
        console.log(`- ${name}: ${areas.size}개 면적 (${Array.from(areas).slice(0, 3).join(', ')}...)`);
    }

    // Now check how many of these exist in realestate_seoul.json
    const existing = JSON.parse(fs.readFileSync('src/data/realestate_seoul.json', 'utf8'));
    const gwansanExisting = existing.filter(i => i.dong === '관산동');
    console.log(`\n[DB 내 관산동 주택 수]: ${gwansanExisting.length}개`);
    gwansanExisting.filter(i => i.type === 'apt' || i.type === 'rh').forEach(i => {
        const hasExpos = bldNames.has(i.name);
        console.log(`DB 단지: "${i.name}" (${i.type}) -> 전유부에 존재 여부: ${hasExpos ? 'YES (' + bldNames.get(i.name).size + '개 면적)' : 'NO'}`);
    });
}

testMatching();
