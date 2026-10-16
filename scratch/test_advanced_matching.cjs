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
    // 1. Remove parentheses with dong/ho
    name = name.replace(/\((?:제?\d+동|\d+호|[A-Za-z가-힣]동)\)/g, '');
    name = name.replace(/(?:제\s*)?\d+\s*동$/g, '');
    name = name.replace(/\s+[A-Za-z가-힣]\s*동$/g, '');
    name = name.replace(/\s+\d+\s*호$/g, '');

    // 2. Normalize Block notation to Danji: e.g. A9블럭, A-9블럭, A9BL, B4블록 -> 9단지, 4단지
    name = name.replace(/[A-Za-z]?\s*[-_]?\s*(\d+)\s*(?:블럭|블록|BL)/gi, '$1단지');

    // 3. Remove whitespace for robust comparison
    return name.replace(/\s+/g, '');
}

function extractCoreTokens(name) {
    const clean = normalizeComplexName(name);
    // extract digits (e.g. '9' for 9단지)
    const digits = clean.match(/\d+/g) || [];
    // extract hangul words
    const hangul = clean.replace(/[^가-힣]/g, ' ').trim().split(/\s+/).filter(Boolean);
    return { clean, digits, hangul };
}

function isFuzzyComplexMatch(estateName, tradeName, estateDong, tradeDong) {
    if (estateDong && tradeDong && estateDong !== tradeDong) {
        // If dongs are strictly different (e.g. 화정동 vs 행신동), do not match
        return false;
    }

    const e = extractCoreTokens(estateName);
    const t = extractCoreTokens(tradeName);

    if (e.clean === t.clean) return true;

    // Check if both contain the same core brand and danji number
    // e.g. estate: '신원마을호반베르디움9단지', trade: '9단지신원마을호반베르디움'
    if (e.digits.length > 0 && t.digits.length > 0) {
        const shareDigit = e.digits.some(d => t.digits.includes(d));
        if (!shareDigit) return false; // If numbers are different (e.g. 9단지 vs 10단지), reject!
    }

    // Check hangul overlap
    const brands = ['호반베르디움', '호반', '아이파크', '동일스위트', '우남퍼스트빌', '우림필유', '푸르지오', '래미안', '자이', '힐스테이트', '더샵', 'e편한세상', '이편한세상', '두산위브', '중흥', '중흥S-클래스', 'SK뷰', 'SKVIEW', '롯데캐슬'];
    for (const b of brands) {
        const bClean = b.replace(/[^가-힣A-Za-z0-9]/g, '');
        if (e.clean.includes(bClean) && t.clean.includes(bClean)) {
            // Check if village/region name also matches if present
            const villages = ['신원마을', '달빛마을', '은빛마을', '별빛마을', '옥빛마을', '햇빛마을', '무원마을', '소만마을', '샘터마을', '도래울', '원흥', '삼송', '지축', '향동', '덕은'];
            for (const v of villages) {
                if (e.clean.includes(v) && t.clean.includes(v)) {
                    return true;
                }
            }
            if (estateDong && tradeDong && estateDong === tradeDong) {
                return true;
            }
        }
    }

    // General substring check if length is sufficient
    if (e.clean.length >= 6 && t.clean.length >= 6) {
        if (e.clean.includes(t.clean) || t.clean.includes(e.clean)) return true;
    }

    return false;
}

// Test with 신원마을 호반베르디움 9단지 and A9블럭신원마을호반베르디움
const t1 = isFuzzyComplexMatch('신원마을 호반베르디움 9단지', 'A9블럭신원마을호반베르디움', '신원동', '신원동');
console.log('Match test result:', t1);
