const fs = require('fs');

const existingList = JSON.parse(fs.readFileSync('src/data/realestate_seoul.json', 'utf8'));
const estateMap = new Map();
existingList.forEach(item => {
    if (item && item.name) {
        estateMap.set(`${item.sido}_${item.sigungu}_${item.name}`, item);
    }
});

const complexTargets = Array.from(estateMap.values()).filter(item => {
    const isComplex = item.type === 'apt' || item.type === 'rh' || item.type === 'offi' || (item.name && (item.name.includes('단지') || item.name.includes('아파트')));
    return isComplex && item.bjdongCd && item.bun && item.bun !== '0';
});

console.log('Total complexTargets:', complexTargets.length);
const idx1 = complexTargets.findIndex(t => t.name === '삼송 동일스위트');
const idx2 = complexTargets.findIndex(t => t.name.includes('동일스위트'));
console.log('삼송 동일스위트 index in complexTargets:', idx1);
console.log('first 동일스위트 index in complexTargets:', idx2);
console.log('Names of first 15 targets:', complexTargets.slice(0, 15).map(t => t.name));
