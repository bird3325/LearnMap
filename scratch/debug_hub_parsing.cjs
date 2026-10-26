const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const serviceKey = config.data_go_kr_key;

const NON_RESIDENTIAL_REGEX = /(?:전기차|충전소|홍보관|모델하우스|분양홍보|분양사무|입주자대표|관리사무|노인정|경로당|공인중개사|중개사무소|상가|관리동|주차장|경비실|도서관|독서실|정문|후문|동문|서문|북문|출입구|놀이터|체육|테니스|수영장|골프|피트니스|헬스|어린이집|유치원|학원|교습소|클래스|과외|스터디|마트|편의점|카페|커피|식당|음식점|치킨|삼겹살|찌개|베이커리|세탁|미용|병원|의원|약국)/;

function isNonResidential(name, category = '') {
    if (!name) return false;
    if (NON_RESIDENTIAL_REGEX.test(name)) return true;
    if (category && /(?:충전소|부동산|홍보|분양|행정|공공|문화시설|교육|학문|음식점|카페|서비스|편의|의료|교통)/.test(category)) return true;
    return false;
}

function cleanComplexName(rawBldNm) {
    if (!rawBldNm) return '';
    let name = rawBldNm.trim();
    // 제1동, 101동, A동 등 단지 뒤 동 번호 분리/정제
    name = name.replace(/\s*(?:제)?\s*[0-9A-Za-z가-힣]{1,4}동$/, '');
    name = name.replace(/\(.*?\)/g, '').trim();
    return name;
}

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

async function debugDong(dong, bjdongCd) {
    console.log(`\n================== [${dong} - bjdongCd: ${bjdongCd}] ==================`);
    const hubEndpoints = [
        { name: '총괄표제부', url: 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo' },
        { name: '일반표제부', url: 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo' }
    ];

    const results = [];

    for (const ep of hubEndpoints) {
        const fetchUrl = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41285&bjdongCd=${bjdongCd}&numOfRows=100&pageNo=1`;
        const xmlText = await httpsGet(fetchUrl);
        const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];

        let skippedNonRes = 0;
        let skippedFilter = 0;
        let skippedNoName = 0;

        for (const itemXml of items) {
            const getTag = tag => {
                const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                return m ? m[1].trim() : '';
            };

            const rawBldNm = getTag('bldNm');
            const dongNm = getTag('dongNm');
            const mainPurpsCdNm = getTag('mainPurpsCdNm');
            const etcPurps = getTag('etcPurps');
            const platPlc = getTag('platPlc');
            const bun = getTag('bun');
            const ji = getTag('ji');

            const combinedPurps = `${mainPurpsCdNm} ${etcPurps}`;
            const isResidential = /(?:공동주택|단독주택|아파트|다세대|연립|오피스텔|다가구)/.test(combinedPurps);
            if (!isResidential) {
                skippedNonRes++;
                continue;
            }

            if (isNonResidential(rawBldNm, combinedPurps)) {
                skippedFilter++;
                continue;
            }
            if (isNonResidential(dongNm)) {
                skippedFilter++;
                continue;
            }

            const validRawName = cleanComplexName(rawBldNm);
            const lastJibun = (platPlc ? platPlc.split(' ').pop() : '').trim();
            let cleanName = validRawName || (dong && lastJibun ? `${dong} ${lastJibun} 주택` : '');
            if (!cleanName) {
                skippedNoName++;
                continue;
            }

            // 주택 유형 결정
            let housingType = 'sh';
            const isOfficetel = combinedPurps.includes('오피스텔') || cleanName.includes('오피스텔');
            const isVillaRow = combinedPurps.includes('다세대') || combinedPurps.includes('연립') ||
                               cleanName.includes('다세대') || cleanName.includes('연립') ||
                               cleanName.includes('빌라') || cleanName.includes('맨션') || cleanName.includes('타운하우스') || cleanName.includes('하이츠빌');
            const isDetachedMulti = combinedPurps.includes('단독') || combinedPurps.includes('다가구') ||
                                    cleanName.includes('단독') || cleanName.includes('다가구') ||
                                    cleanName.includes('원룸') || cleanName.includes('고시') ||
                                    cleanName.endsWith('주택') || cleanName.includes('번지') || !rawBldNm;

            const isAptKeyword = combinedPurps.includes('아파트') || cleanName.includes('아파트') || cleanName.includes('단지') || cleanName.includes('마을');
            const isAptBrand = /(?:동일스위트|베르디움|호반|자이|푸르지오|힐스테이트|래미안|e편한세상|이편한세상|롯데캐슬|아이파크|더샵|위브|센트레빌|풍림|금강|우미린|대방|중흥|우림|삼환|신안|한신|두산|현대|삼성|대우|벽산|극동|삼호|동아|쌍용|보람|건영|대림|성원|현진|서해|동문|신한|동원|태영|화성|모아|한라|서희|우방|중앙|동양|신동아|유승|계룡|부영|주공|리슈빌|에일린의뜰|삼정그린코아|비바힐스|유보라|위스테이|나인포레|아테라)/.test(cleanName);

            if (isOfficetel) {
                housingType = 'offi';
            } else if (isVillaRow) {
                housingType = 'rh';
            } else if (isDetachedMulti && !isAptBrand && !cleanName.includes('아파트') && !cleanName.includes('단지')) {
                housingType = 'sh';
            } else if (isAptKeyword || isAptBrand) {
                housingType = 'apt';
            } else if (combinedPurps.includes('공동주택')) {
                const flr = parseInt(getTag('grndFlrCnt'), 10) || 0;
                housingType = (flr >= 5) ? 'apt' : 'rh';
            }

            results.push({
                ep: ep.name,
                rawBldNm,
                dongNm,
                cleanName,
                housingType,
                mainPurpsCdNm,
                etcPurps,
                bun, ji
            });
        }
        console.log(`[${ep.name}] 수신 ${items.length}건 -> 비주거 제외 ${skippedNonRes}건, 필터 제외 ${skippedFilter}건, 통과 ${results.filter(r => r.ep === ep.name).length}건`);
    }

    const typeSummary = {};
    results.forEach(r => typeSummary[r.housingType] = (typeSummary[r.housingType] || 0) + 1);
    console.log(`-> 최종 수집 결과 요약 (${results.length}건):`, typeSummary);

    const apts = results.filter(r => r.housingType === 'apt');
    const offis = results.filter(r => r.housingType === 'offi');
    console.log(`-> 아파트 (${apts.length}건):`, apts.map(a => `${a.cleanName} (${a.bun}-${a.ji})`).slice(0, 5));
    console.log(`-> 오피스텔 (${offis.length}건):`, offis.map(o => `${o.cleanName} (${o.bun}-${o.ji})`).slice(0, 5));
}

async function run() {
    await debugDong('백석동', '10600');
    await debugDong('마두동', '10500');
    await debugDong('장항동', '10400');
    await debugDong('식사동', '10100');
}

run();
