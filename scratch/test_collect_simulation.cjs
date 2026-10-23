const fs = require('fs');
const path = require('path');

// Test the logic on raw API items simulation
const mockItems = [
    {
        rawBldNm: '화성아파트',
        dongNm: '',
        mainPurpsCdNm: '공동주택',
        etcPurps: '공동주택(아파트)',
        platPlc: '경기도 고양시 덕양구 고양동 103번지',
        newPlatPlc: '경기도 고양시 덕양구 벽제관로 47 (고양동)',
        dong: '고양동',
        bun: '0103',
        ji: '0000',
        pnu: '4128111600101030000'
    },
    {
        rawBldNm: '', // Empty name!
        dongNm: '',
        mainPurpsCdNm: '공동주택',
        etcPurps: '',
        platPlc: '경기도 고양시 덕양구 고양동 103번지',
        newPlatPlc: '경기도 고양시 덕양구 벽제관로 47 (고양동)',
        dong: '고양동',
        bun: '0103',
        ji: '0000',
        pnu: '4128111600101030000'
    },
    {
        rawBldNm: '희망빌라',
        dongNm: '',
        mainPurpsCdNm: '공동주택',
        etcPurps: '',
        platPlc: '경기도 고양시 덕양구 관산동 193-14번지',
        newPlatPlc: '',
        dong: '관산동',
        bun: '0193',
        ji: '0014',
        pnu: '4128111800101930014'
    },
    {
        rawBldNm: '',
        dongNm: '',
        mainPurpsCdNm: '단독주택',
        etcPurps: '단독주택',
        platPlc: '경기도 고양시 덕양구 관산동 151번지',
        newPlatPlc: '',
        dong: '관산동',
        bun: '0151',
        ji: '0000',
        pnu: '4128111800101510000'
    }
];

function cleanComplexName(rawName) {
    if (!rawName) return '';
    return rawName.trim();
}

const estateMap = new Map();
const sido = '경기도';
const gu = '덕양구';

mockItems.forEach(item => {
    const rawBldNm = item.rawBldNm;
    const dong = item.dong;
    const platPlc = item.platPlc;
    const combinedPurps = `${item.mainPurpsCdNm} ${item.etcPurps}`;
    const pnu = item.pnu;
    const bun = item.bun;
    const ji = item.ji;

    let baseName = rawBldNm || (dong && platPlc ? `${dong} ${platPlc.split(' ').pop()} 주택` : '');
    let cleanName = cleanComplexName(baseName);
    if (!cleanName) return;

    if (!rawBldNm) {
        let hasRealComplex = false;
        for (const est of estateMap.values()) {
            if (pnu && est.pnu && est.pnu === pnu && !est.name.endsWith('주택') && !est.name.includes('번지')) {
                hasRealComplex = true;
                break;
            }
            if (est.dong === dong && est.bun === bun && est.ji === ji && bun && !est.name.endsWith('주택') && !est.name.includes('번지')) {
                hasRealComplex = true;
                break;
            }
        }
        if (hasRealComplex) {
            console.log(`[SKIP 중복 허수] ${cleanName} - 동일 지번에 정식 단지 등록됨`);
            return;
        }
    }

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
    const isAptBrand = /(?:화성|자이|래미안|힐스테이트)/.test(cleanName);

    if (isOfficetel) housingType = 'offi';
    else if (isVillaRow) housingType = 'rh';
    else if (isDetachedMulti && !isAptBrand && !cleanName.includes('아파트') && !cleanName.includes('단지')) housingType = 'sh';
    else if (isAptKeyword || isAptBrand) housingType = 'apt';
    else housingType = 'sh';

    const key = `${sido}_${gu}_${cleanName}`;
    estateMap.set(key, {
        name: cleanName,
        type: housingType,
        dong,
        bun,
        ji,
        pnu
    });
    console.log(`[등록 완료] ${cleanName} -> type: ${housingType}`);
});

console.log('\nFinal registered items:');
Array.from(estateMap.values()).forEach(e => {
    console.log(`- ${e.name} (${e.type})`);
});
