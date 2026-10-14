import fs from 'fs';
import path from 'path';

const serverFile = path.resolve('server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// 1. Add getDongCoord and sh to apiEndpoints in collect-master
const target1 = `        const guDongsMap = new Map();

        // 1. 공공데이터포털 실거래가 API를 통해 최근 6개월간 거래된 실제 단지/주택 정보 일괄 추출
        if (serviceKey) {
            const months = [];
            const now = new Date();
            for (let i = 1; i <= 6; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push(\`\${d.getFullYear()}\${String(d.getMonth() + 1).padStart(2, '0')}\`);
            }

            const apiEndpoints = [
                { type: 'apt', name: '아파트', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev', nameTag: 'aptNm' },
                { type: 'rh', name: '연립·다세대', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade', nameTag: 'mhouseNm' },
                { type: 'offi', name: '오피스텔', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade', nameTag: 'offiNm' }
            ];`;

const replacement1 = `        const guDongsMap = new Map();
        const dongCoordMap = new Map();
        const getDongCoord = async (sido, gu, dong) => {
            const dKey = \`\${sido}_\${gu}_\${dong}\`;
            if (dongCoordMap.has(dKey)) return dongCoordMap.get(dKey);
            if (!kakaoKey) return null;
            try {
                const dRes = await fetch(\`https://dapi.kakao.com/v2/local/search/address.json?query=\${encodeURIComponent(\`\${sido} \${gu} \${dong}\`)}\`, {
                    headers: { 'Authorization': \`KakaoAK \${kakaoKey}\`, 'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000' }
                });
                if (dRes.ok) {
                    const dData = await dRes.json();
                    if (dData.documents && dData.documents.length > 0) {
                        const coord = { x: dData.documents[0].x, y: dData.documents[0].y };
                        dongCoordMap.set(dKey, coord);
                        return coord;
                    }
                }
            } catch (e) {}
            dongCoordMap.set(dKey, null);
            return null;
        };

        // 1. 공공데이터포털 실거래가 API를 통해 최근 6개월간 거래된 실제 단지/주택 정보 일괄 추출
        if (serviceKey) {
            const months = [];
            const now = new Date();
            for (let i = 1; i <= 6; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push(\`\${d.getFullYear()}\${String(d.getMonth() + 1).padStart(2, '0')}\`);
            }

            const apiEndpoints = [
                { type: 'apt', name: '아파트', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev', nameTag: 'aptNm' },
                { type: 'rh', name: '연립·다세대', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade', nameTag: 'mhouseNm' },
                { type: 'offi', name: '오피스텔', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade', nameTag: 'offiNm' },
                { type: 'sh', name: '단독·다가구', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade', nameTag: '' }
            ];`;

// Normalize CRLF to LF for matching
const normalize = (str) => str.replace(/\r\n/g, '\n');

let normCode = normalize(code);
let normTarget1 = normalize(target1);
let normReplacement1 = normalize(replacement1);

if (normCode.includes(normTarget1)) {
    normCode = normCode.replace(normTarget1, normReplacement1);
    console.log('Target 1 matched and replaced');
} else {
    console.error('Target 1 not found');
}

// 2. Update itemXml loop in collect-master to support sh
const target2 = `                            items.forEach(itemXml => {
                                const getTag = tag => {
                                    const m = itemXml.match(new RegExp(\`<\\/\${tag}>(.*?)</\${tag}>\`));
                                    return m ? m[1].trim() : '';
                                };
                                const pNm = getTag(ep.nameTag) || getTag('aptNm') || getTag('mhouseNm') || getTag('offiNm') || getTag('연립다세대') || getTag('단지');
                                if (!pNm) return;

                                const key = \`\${sido}_\${gu}_\${pNm}\`;
                                const dong = getTag('umdNm') || getTag('법정동');
                                const jibun = getTag('jibun') || getTag('지번');
                                const buildYear = getTag('buildYear') || getTag('건축년도');
                                const area = getTag('excluUseAr') || getTag('전용면적');

                                if (dong) {
                                    if (!guDongsMap.has(gu)) guDongsMap.set(gu, new Set());
                                    guDongsMap.get(gu).add(dong);
                                }

                                if (!estateMap.has(key)) {
                                    estateMap.set(key, {
                                        id: \`master-\${ep.type}-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}\`,
                                        name: pNm,
                                        type: ep.type,
                                        sido,
                                        sigungu: gu,
                                        address: \`\${sido} \${gu} \${dong} \${jibun}\`.trim(),
                                        price: '기본 정보 구축 (실거래 대기)',
                                        tradeDate: '-',
                                        area: area ? \`\${area}㎡\` : '-',
                                        buildYear: buildYear || '',
                                        source: '단지/건축물 마스터 DB'
                                    });
                                    newlyAddedCount++;
                                } else {
                                    const existing = estateMap.get(key);
                                    if (area && (!existing.area || existing.area === '-')) {
                                        existing.area = \`\${area}㎡\`;
                                    }
                                }
                            });`;

const replacement2 = `                            for (const itemXml of items) {
                                const getTag = tag => {
                                    const m = itemXml.match(new RegExp(\`<\${tag}>(.*?)</\${tag}>\`));
                                    return m ? m[1].trim() : '';
                                };
                                const dong = getTag('umdNm') || getTag('법정동');
                                const jibun = getTag('jibun') || getTag('지번');
                                const houseType = getTag('houseType') || '단독';
                                let pNm = getTag(ep.nameTag) || getTag('aptNm') || getTag('mhouseNm') || getTag('offiNm') || getTag('연립다세대') || getTag('단지');

                                if (!pNm && ep.type === 'sh') {
                                    pNm = dong && jibun ? \`\${dong} \${jibun} \${houseType}주택\` : \`\${dong} \${houseType}주택\`;
                                    pNm = pNm.replace(/\\s+/g, ' ').trim();
                                }
                                if (!pNm) continue;

                                const key = \`\${sido}_\${gu}_\${pNm}\`;
                                const buildYear = getTag('buildYear') || getTag('건축년도');
                                const area = getTag('totalFloorAr') || getTag('plottageAr') || getTag('excluUseAr') || getTag('전용면적');

                                if (dong) {
                                    if (!guDongsMap.has(gu)) guDongsMap.set(gu, new Set());
                                    guDongsMap.get(gu).add(dong);
                                }

                                if (!estateMap.has(key)) {
                                    let itemX = '';
                                    let itemY = '';
                                    if (ep.type === 'sh' && dong) {
                                        const baseC = await getDongCoord(sido, gu, dong);
                                        if (baseC) {
                                            let h = 0;
                                            const seed = \`\${dong}_\${jibun}_\${buildYear}\`;
                                            for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
                                            const dx = ((Math.abs(h) % 1000) - 500) * 0.000008;
                                            const dy = (((Math.floor(Math.abs(h) / 1000)) % 1000) - 500) * 0.000008;
                                            itemX = (parseFloat(baseC.x) + dx).toFixed(6);
                                            itemY = (parseFloat(baseC.y) + dy).toFixed(6);
                                        }
                                    }

                                    estateMap.set(key, {
                                        id: \`master-\${ep.type}-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}\`,
                                        name: pNm,
                                        type: ep.type,
                                        sido,
                                        sigungu: gu,
                                        address: \`\${sido} \${gu} \${dong} \${jibun}\`.trim(),
                                        price: '기본 정보 구축 (실거래 대기)',
                                        tradeDate: '-',
                                        area: area ? \`\${area}㎡\` : '-',
                                        buildYear: buildYear || '',
                                        source: ep.type === 'sh' ? '단독·다가구 마스터 DB' : '단지/건축물 마스터 DB',
                                        x: itemX,
                                        y: itemY,
                                        lng: itemX,
                                        lat: itemY
                                    });
                                    newlyAddedCount++;
                                } else {
                                    const existing = estateMap.get(key);
                                    if (area && (!existing.area || existing.area === '-')) {
                                        existing.area = \`\${area}㎡\`;
                                    }
                                }
                            }`;

// Notice in target2, getTag regex in file was: `<${tag}>(.*?)<\/${tag}>`
const regexTarget2 = /items\.forEach\(itemXml => \{[\s\S]*?if \(!estateMap\.has\(key\)\) \{[\s\S]*?\}\s*\}\);\s*\}\s*catch \(e\)/;
if (regexTarget2.test(normCode)) {
    normCode = normCode.replace(regexTarget2, replacement2 + '\n                        } catch (e)');
    console.log('Target 2 matched and replaced via regex');
} else {
    console.error('Target 2 regex did not match');
}

// 3. Add searchTypes: 타운하우스 and 전원주택
const target3 = `                const searchTypes = [
                    { keyword: '아파트', type: 'apt' },
                    { keyword: '연립주택', type: 'rh' },
                    { keyword: '오피스텔', type: 'offi' }
                ];`;

const replacement3 = `                const searchTypes = [
                    { keyword: '아파트', type: 'apt' },
                    { keyword: '연립주택', type: 'rh' },
                    { keyword: '오피스텔', type: 'offi' },
                    { keyword: '타운하우스', type: 'sh' },
                    { keyword: '전원주택', type: 'sh' }
                ];`;

if (normCode.includes(normalize(target3))) {
    normCode = normCode.replace(normalize(target3), normalize(replacement3));
    console.log('Target 3 matched and replaced');
} else {
    console.error('Target 3 not found');
}

// 4. Update sync-trades to include sh in apiEndpoints
const target4 = `        if (housingType === 'all' || housingType === 'offi') {
            apiEndpoints.push({ type: 'offi', name: '오피스텔', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade', nameTag: 'offiNm' });
        }`;

const replacement4 = `        if (housingType === 'all' || housingType === 'offi') {
            apiEndpoints.push({ type: 'offi', name: '오피스텔', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade', nameTag: 'offiNm' });
        }
        if (housingType === 'all' || housingType === 'sh') {
            apiEndpoints.push({ type: 'sh', name: '단독·다가구', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade', nameTag: '' });
        }`;

if (normCode.includes(normalize(target4))) {
    normCode = normCode.replace(normalize(target4), normalize(replacement4));
    console.log('Target 4 matched and replaced');
} else {
    console.error('Target 4 not found');
}

// 5. Update sync-trades item parsing to handle sh
const target5 = `                            let name = getTag(ep.nameTag) || getTag('aptNm') || getTag('mhouseNm') || getTag('offiNm') || getTag('연립다세대') || getTag('단지');
                            if (!name) return;`;

const replacement5 = `                            const dong = getTag('umdNm') || getTag('법정동');
                            const jibun = getTag('jibun') || getTag('지번');
                            const houseType = getTag('houseType') || '단독';
                            let name = getTag(ep.nameTag) || getTag('aptNm') || getTag('mhouseNm') || getTag('offiNm') || getTag('연립다세대') || getTag('단지');
                            if (!name && ep.type === 'sh') {
                                name = dong && jibun ? \`\${dong} \${jibun} \${houseType}주택\` : \`\${dong} \${houseType}주택\`;
                                name = name.replace(/\\s+/g, ' ').trim();
                            }
                            if (!name) return;`;

if (normCode.includes(normalize(target5))) {
    normCode = normCode.replace(normalize(target5), normalize(replacement5));
    console.log('Target 5 matched and replaced');
} else {
    console.error('Target 5 not found');
}

// Convert back to CRLF and save
const crlfCode = normCode.replace(/\n/g, '\r\n');
fs.writeFileSync(serverFile, crlfCode, 'utf8');
console.log('All updates written to server.js successfully!');
