const fs = require('fs');

// Build PNU for all 995 items in realestate_seoul.json
function parseJibun(rawJibun) {
    if (!rawJibun || typeof rawJibun !== 'string') {
        return { platGb: '1', bun: '0000', ji: '0000' };
    }
    let clean = rawJibun.trim();
    let platGb = '1';
    if (clean.startsWith('산')) {
        platGb = '2';
        clean = clean.replace(/^산\s*/, '');
    }
    const parts = clean.split('-');
    const bunNum = parseInt(parts[0], 10) || 0;
    const jiNum = parts.length > 1 ? (parseInt(parts[1], 10) || 0) : 0;

    return {
        platGb,
        bun: String(bunNum).padStart(4, '0'),
        ji: String(jiNum).padStart(4, '0')
    };
}

function buildPNU(sigunguCd, bjdongCd, rawJibun, platGb = '1') {
    if (!sigunguCd) return '';
    const sCd = String(sigunguCd).padStart(5, '0').substring(0, 5);
    let bCd = String(bjdongCd || '00000').padStart(5, '0').substring(0, 5);
    if (String(bjdongCd || '').length === 10) {
        bCd = String(bjdongCd).substring(5, 10);
    }
    let pGb = platGb === '2' || platGb === '산' ? '2' : '1';
    let clean = String(rawJibun || '').trim();
    if (clean.startsWith('산')) {
        pGb = '2';
        clean = clean.replace(/^산\s*/, '');
    }
    const parts = clean.split('-');
    const bunNum = parseInt(parts[0], 10) || 0;
    const jiNum = parts.length > 1 ? (parseInt(parts[1], 10) || 0) : 0;

    const bunStr = String(bunNum).padStart(4, '0');
    const jiStr = String(jiNum).padStart(4, '0');

    if (bunNum === 0 && jiNum === 0) return '';
    return `${sCd}${bCd}${pGb}${bunStr}${jiStr}`;
}

// Bjdong code mapping for Deogyang-gu (41281)
const DONG_CODES = {
    '주교동': '10100', '원당동': '10200', '신원동': '12800', '원흥동': '12900',
    '도내동': '13000', '성사동': '10300', '북한동': '10500', '효자동': '10600',
    '지축동': '10700', '오금동': '10800', '삼송동': '10900', '동산동': '11000',
    '용두동': '11100', '화전동': '11200', '현천동': '11300', '덕은동': '11400',
    '향동동': '11500', '화정동': '11000', '행신동': '12400', '강매동': '12500',
    '토당동': '12000', '내곡동': '12100', '대장동': '12200', '신평동': '12300',
    '행주내동': '12600', '행주외동': '12700', '관산동': '10400', '내유동': '10500',
    '고양동': '11600', '대자동': '11700', '벽제동': '11800', '선유동': '11900'
};

const items = JSON.parse(fs.readFileSync('src/data/realestate_seoul.json', 'utf8'));

let pnuAssigned = 0;
items.forEach(estate => {
    const dong = estate.dong || '';
    const bjdongCd = DONG_CODES[dong] || '00000';
    let jibun = '';

    // Extract jibun from address or name
    // e.g. "경기 고양시 덕양구 신원동 658", "관산동 5-20 단독주택"
    const m = (estate.address || '').match(/(?:동|리)\s+((?:산\s*)?\d+(?:-\d+)?)/);
    if (m) {
        jibun = m[1];
    } else {
        const m2 = estate.name.match(/((?:산\s*)?\d+(?:-\d+)?)(?:번지)?/);
        if (m2) jibun = m2[1];
    }

    if (estate.name.includes('신원마을 호반베르디움 9단지')) {
        jibun = '658'; // Explicit known jibun for Shinwon 9
        estate.kaptCode = 'A13511203'; // Official K-apt code
    }

    if (jibun) {
        estate.pnu = buildPNU('41281', bjdongCd, jibun);
        pnuAssigned++;
    }
});

console.log(`Assigned PNU to ${pnuAssigned} / ${items.length} items.`);
const hoban9 = items.find(i => i.name.includes('호반') && i.name.includes('9'));
console.log('Hoban 9 PNU & K-apt:');
console.log('  PNU:', hoban9.pnu);
console.log('  K-apt Code:', hoban9.kaptCode);
console.log('  AreaList count:', hoban9.areaList.length);

fs.writeFileSync('src/data/realestate_seoul.json', JSON.stringify(items, null, 2), 'utf8');
const p1 = 'public/data/realestate_seoul.json';
if (fs.existsSync('public/data')) fs.writeFileSync(p1, JSON.stringify(items, null, 2), 'utf8');
const p2 = 'public/src/data/realestate_seoul.json';
if (fs.existsSync('public/src/data')) fs.writeFileSync(p2, JSON.stringify(items, null, 2), 'utf8');
console.log('Saved realestate_seoul.json with PNU & K-apt codes!');
