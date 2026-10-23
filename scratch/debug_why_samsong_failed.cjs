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

async function debugExactFlow() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    // 1. 신원동 총괄표제부 호출
    console.log('1. Fetching RecapTitle for 신원동 (41281, 10300)...');
    const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=10300&numOfRows=100&pageNo=1`;
    const xml = await httpsGet(url);
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

    const estateMap = new Map();

    items.forEach(it => {
        const getTag = t => {
            const m = it.match(new RegExp(`<${t}>(.*?)<\/${t}>`));
            return m ? m[1].trim() : '';
        };
        const rawBldNm = getTag('bldNm');
        const cleanName = cleanComplexName(rawBldNm);
        const bun = getTag('bun');
        const ji = getTag('ji');
        const platGbCd = getTag('platGbCd');

        if (cleanName.includes('동일')) {
            console.log(`Found item in Recap: rawBldNm="${rawBldNm}", cleanName="${cleanName}", bun="${bun}", ji="${ji}"`);
            const estate = {
                name: cleanName,
                type: 'apt',
                sido: '경기도',
                sigungu: '고양시 덕양구',
                dong: '신원동',
                bun,
                ji,
                lawdCd: '41281',
                bjdongCd: '10300'
            };
            estateMap.set(cleanName, estate);
        }
    });

    // 2. complexTargets 필터링 테스트
    console.log('\n2. Testing complexTargets filter...');
    const complexTargets = Array.from(estateMap.values()).filter(item => {
        const isComplex = item.type === 'apt' || item.type === 'rh' || item.type === 'offi' || (item.name && (item.name.includes('단지') || item.name.includes('아파트')));
        if (!isComplex) {
            console.log(`- ${item.name} filtered out by isComplex`);
            return false;
        }
        const hasBun = item.bjdongCd && item.bun && item.bun !== '0';
        if (!hasBun) {
            console.log(`- ${item.name} filtered out by hasBun (bjdongCd=${item.bjdongCd}, bun=${item.bun})`);
            return false;
        }
        return true;
    });

    console.log(`Passed complexTargets: ${complexTargets.map(t => t.name).join(', ')}`);

    // 3. 전유부 수집 테스트
    for (const estate of complexTargets) {
        console.log(`\n3. Testing Expos for ${estate.name}...`);
        const paddedBun = String(parseInt(estate.bun, 10) || 0).padStart(4, '0');
        const paddedJi = String(parseInt(estate.ji, 10) || 0).padStart(4, '0');
        const lawdCd = estate.lawdCd;

        const exposUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${lawdCd}&bjdongCd=${estate.bjdongCd}&bun=${paddedBun}&ji=${paddedJi}&numOfRows=100&pageNo=1`;
        const exposXml = await httpsGet(exposUrl);
        const exposItems = exposXml.match(/<item>[\s\S]*?<\/item>/g) || [];
        console.log(`- Expos items count for ${estate.name}: ${exposItems.length}`);

        for (const itemXml of exposItems) {
            const getTag = tag => {
                const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                return m ? m[1].trim() : '';
            };
            const exposGb = getTag('exposPubuseGbCdNm');
            if (exposGb && !exposGb.includes('전유')) continue;

            const areaStr = getTag('area');
            const areaNum = parseFloat(areaStr);
            if (isNaN(areaNum) || areaNum <= 8 || areaNum > 600) continue;

            if (!estate._areaCollector) estate._areaCollector = new Map();
            const areaKey = areaNum.toFixed(1);
            const existingA = estate._areaCollector.get(areaKey) || {
                area: `${areaKey}㎡`,
                pyeong: `${(areaNum / 3.3058).toFixed(1)}평형`,
                rawArea: areaNum,
                householdCount: 0
            };
            existingA.householdCount++;
            estate._areaCollector.set(areaKey, existingA);
        }

        if (estate._areaCollector) {
            console.log(`- _areaCollector size for ${estate.name}: ${estate._areaCollector.size}`);
            for (const [k, v] of estate._areaCollector.entries()) {
                console.log(`  * ${k}㎡: ${v.householdCount}세대`);
            }
        } else {
            console.log(`- _areaCollector is EMPTY for ${estate.name}!`);
        }
    }
}

debugExactFlow();
