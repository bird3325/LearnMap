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

console.log('Total targets in complexTargets:', complexTargets.length);

// Check which items currently have areaList with > 1 item
const multipleAreas = complexTargets.filter(t => t.areaList && t.areaList.length > 1);
console.log('Targets with multiple area items:', multipleAreas.length);
console.log('Targets with multiple area names:', multipleAreas.slice(0, 20).map(t => `${t.name} (index: ${complexTargets.indexOf(t)})`));
