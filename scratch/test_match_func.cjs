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

function normalizeComplexName(raw) {
    if (!raw || typeof raw !== 'string') return '';
    let name = raw.replace(/\s+/g, ' ').trim();
    name = name.replace(/\((?:제?\d+동|\d+호|[A-Za-z가-힣]동)\)/g, '');
    name = name.replace(/(?:제\s*)?\d+\s*동$/g, '');
    name = name.replace(/\s+[A-Za-z가-힣]\s*동$/g, '');
    name = name.replace(/\s+\d+\s*호$/g, '');
    name = name.replace(/아파트$/g, '');

    // Normalize block notation: A9블럭, A9BL, B4블록 -> 9단지, 4단지
    name = name.replace(/[A-Za-z]?\s*[-_]?\s*(\d+)\s*(?:블럭|블록|BL)/gi, '$1단지');
    return name.replace(/\s+/g, '');
}

function isComplexMatch(estate, trade) {
    // 1. Exact clean match
    const eNorm = normalizeComplexName(estate.name);
    const tNorm = normalizeComplexName(trade.rawName);

    if (eNorm === tNorm) return true;

    // Check dong consistency
    const eDong = estate.dong || '';
    const tDong = trade.dong || '';
    if (eDong && tDong && eDong !== tDong) return false;

    // 2. Check danji number and brand match
    // e.g. eNorm: '신원마을호반베르디움9단지', tNorm: '9단지신원마을호반베르디움'
    const eDigits = eNorm.match(/\d+/g) || [];
    const tDigits = tNorm.match(/\d+/g) || [];

    // If both have numbers, they MUST share at least one number
    if (eDigits.length > 0 && tDigits.length > 0) {
        const hasCommonDigit = eDigits.some(d => tDigits.includes(d));
        if (!hasCommonDigit) return false;
    }

    const keyBrands = ['호반베르디움', '호반', '아이파크', '동일스위트', '우남퍼스트빌', '우림필유', '푸르지오', '래미안', '자이', '힐스테이트', '더샵', 'e편한세상', '이편한세상', '두산위브', '중흥', '중흥S-클래스', 'SK뷰', 'SKVIEW', '롯데캐슬', '센트럴푸르지오', '유쉘', '우방', '홈타운', '삼익', '동신', '쌍용', '라이프', '부영', '풍산', '그린나래', '에듀뷰', '써밋', '퍼스트'];

    for (const b of keyBrands) {
        const bClean = b.replace(/[^가-힣A-Za-z0-9]/g, '');
        if (eNorm.includes(bClean) && tNorm.includes(bClean)) {
            // If they also share the village name or dong, match!
            const villages = ['신원마을', '달빛마을', '은빛마을', '별빛마을', '옥빛마을', '햇빛마을', '무원마을', '소만마을', '샘터마을', '도래울', '원흥', '삼송', '지축', '향동', '덕은'];
            for (const v of villages) {
                if (eNorm.includes(v) && tNorm.includes(v)) return true;
            }
            if (eDong && tDong && eDong === tDong) return true;
        }
    }

    // 3. Substring check if clean name is long enough
    if (eNorm.length >= 6 && tNorm.length >= 6) {
        if (eNorm.includes(tNorm) || tNorm.includes(eNorm)) return true;
    }

    return false;
}

// Test with Shinwon Hoban 9
const estate = { name: '신원마을 호반베르디움 9단지', dong: '신원동' };
const trade = { rawName: 'A9블럭신원마을호반베르디움', dong: '신원동' };

console.log('Shinwon Hoban 9 match:', isComplexMatch(estate, trade));
