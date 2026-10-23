const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/realestate_seoul.json'), 'utf8'));

const targets = data.filter(item => {
    const isComplex = item.type === 'apt' || item.type === 'rh' || item.type === 'offi' || (item.name && (item.name.includes('단지') || item.name.includes('아파트') || item.name.includes('마을')));
    return isComplex && item.bjdongCd && item.bun && item.bun !== '0';
});

console.log('Total complex targets:', targets.length);

const kaenariIndex = targets.findIndex(d => d.name === '개나리아파트');
console.log('개나리아파트 index in targets:', kaenariIndex);

const emptyAreaComplexes = targets.filter(d => (!d.area || d.area === '-') && (!d.areaList || d.areaList.length === 0));
console.log('Complexes with empty area:', emptyAreaComplexes.length);
emptyAreaComplexes.slice(0, 15).forEach((d, i) => {
    console.log(`${i+1}. ${d.name} (${d.type}) [${d.dong}] bun: ${d.bun}, bjdongCd: ${d.bjdongCd}`);
});
