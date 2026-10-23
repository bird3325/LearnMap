const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/realestate_seoul.json'), 'utf8'));

console.log('--- Checking all miscategorizations across all 995 items ---');

// 1. type === 'apt' but not apartment
const aptMismatch = data.filter(d => {
    if (d.type !== 'apt') return false;
    const n = d.name || '';
    if (n.includes('주택') || n.includes('빌라') || n.includes('연립') || n.includes('오피스텔') || n.includes('원룸') || n.includes('번지')) return true;
    return false;
});
console.log('Apt mismatches:', aptMismatch.length);

// 2. type === 'rh' but has 아파트 or 오피스텔
const rhMismatch = data.filter(d => {
    if (d.type !== 'rh') return false;
    const n = d.name || '';
    if (n.includes('아파트') || n.includes('오피스텔')) return true;
    return false;
});
console.log('RH mismatches (has 아파트 or 오피스텔):', rhMismatch.length);
rhMismatch.forEach(d => console.log(`   rh mismatch: ${d.name} (${d.type}) [${d.source}]`));

// 3. type === 'sh' but has 아파트, 빌라, 연립, 오피스텔
const shMismatch = data.filter(d => {
    if (d.type !== 'sh') return false;
    const n = d.name || '';
    if (n.includes('아파트') || n.includes('빌라') || n.includes('연립') || n.includes('오피스텔')) return true;
    return false;
});
console.log('SH mismatches (has 아파트/빌라/연립/오피스텔):', shMismatch.length);
shMismatch.forEach(d => console.log(`   sh mismatch: ${d.name} (${d.type}) [${d.source}]`));

// 4. type === 'offi' but has 아파트, 빌라, 연립, 주택
const offiMismatch = data.filter(d => {
    if (d.type !== 'offi') return false;
    const n = d.name || '';
    if (n.includes('아파트') || n.includes('빌라') || n.includes('연립')) return true;
    return false;
});
console.log('Offi mismatches:', offiMismatch.length);
offiMismatch.forEach(d => console.log(`   offi mismatch: ${d.name} (${d.type}) [${d.source}]`));
