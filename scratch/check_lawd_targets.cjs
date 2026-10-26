const fs = require('fs');
const path = require('path');

const LAWD_JSON_PATH = path.join(__dirname, '..', 'src', 'data', 'lawd_code_map.json');
const NATIONWIDE_LAWD_MAP = JSON.parse(fs.readFileSync(LAWD_JSON_PATH, 'utf8'));

function getLawdTargets(sido, sigungu) {
    const sidoMap = NATIONWIDE_LAWD_MAP[sido] || NATIONWIDE_LAWD_MAP['서울특별시'];
    const targets = [];

    const findSubGuName = (code, defaultGu) => {
        const entry = Object.entries(sidoMap).find(([k, v]) => v === code && !Array.isArray(v));
        return entry ? entry[0] : defaultGu;
    };

    if (sigungu === 'all' || !sigungu || sigungu === '전체') {
        Object.entries(sidoMap).forEach(([gName, val]) => {
            if (Array.isArray(val)) {
            } else {
                targets.push({ gu: gName, code: val });
            }
        });
    } else {
        const val = sidoMap[sigungu];
        if (val) {
            if (Array.isArray(val)) {
                val.forEach(c => targets.push({ gu: findSubGuName(c, sigungu), code: c }));
            } else {
                targets.push({ gu: sigungu, code: val });
            }
        } else {
            const foundKey = Object.keys(sidoMap).find(k => k.includes(sigungu) || sigungu.includes(k));
            if (foundKey) {
                const fVal = sidoMap[foundKey];
                if (Array.isArray(fVal)) {
                    fVal.forEach(c => targets.push({ gu: findSubGuName(c, sigungu), code: c }));
                } else {
                    targets.push({ gu: sigungu, code: fVal });
                }
            } else {
                targets.push({ gu: sigungu, code: null });
            }
        }
    }
    return targets;
}

console.log('getLawdTargets(경기도, 일산동구):', getLawdTargets('경기도', '일산동구'));
console.log('getLawdTargets(경기도, 고양시):', getLawdTargets('경기도', '고양시'));
console.log('getLawdTargets(경기도, 고양시 일산동구):', getLawdTargets('경기도', '고양시 일산동구'));
