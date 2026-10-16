const fs = require('fs');

// Helper to convert jibun string (e.g. '658', '658-1', '산12-3') into bun(4), ji(4), platGb(1)
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

function buildPNU(sigunguCd, bjdongCd, rawJibun) {
    const sCd = String(sigunguCd || '').padStart(5, '0').substring(0, 5);
    const bCd = String(bjdongCd || '').padStart(5, '0').substring(0, 5);
    const { platGb, bun, ji } = parseJibun(rawJibun);
    return `${sCd}${bCd}${platGb}${bun}${ji}`;
}

// Test with Shinwon 658
const pnu = buildPNU('41281', '12800', '658');
console.log('Generated PNU for Shinwon 658:', pnu, '(Length:', pnu.length, ')');
