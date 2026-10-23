const fs = require('fs');

const existingList = JSON.parse(fs.readFileSync('src/data/realestate_seoul.json', 'utf8'));

// Sort: type === 'apt' first!
const sorted = [...existingList].sort((a, b) => {
    if (a.type === 'apt' && b.type !== 'apt') return -1;
    if (a.type !== 'apt' && b.type === 'apt') return 1;
    return 0;
});

const aptTargets = sorted.filter(item => {
    const isComplex = item.type === 'apt' || item.type === 'rh' || item.type === 'offi' || (item.name && (item.name.includes('단지') || item.name.includes('아파트')));
    return isComplex && item.bjdongCd && item.bun && item.bun !== '0';
});

console.log('Total targets:', aptTargets.length);
const idx1 = aptTargets.findIndex(t => t.name === '삼송 동일스위트');
const idx2 = aptTargets.findIndex(t => t.name.includes('동일스위트'));
console.log('삼송 동일스위트 new index:', idx1);
console.log('first 동일스위트 new index:', idx2);
console.log('First 10 targets:', aptTargets.slice(0, 10).map(t => `${t.name} (${t.type})`));
