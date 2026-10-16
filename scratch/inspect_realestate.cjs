const fs = require('fs');
const path = require('path');

const REAL_ESTATE_PATH = path.join('src', 'data', 'realestate_seoul.json');
const items = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8') || '[]');

console.log('Total items in realestate_seoul.json:', items.length);

let hugeAreaCount = 0;
let hasAreaListCount = 0;
let dongNamedCount = 0;

items.forEach(it => {
    const areaNum = parseFloat(String(it.area || '').replace(/[^0-9.]/g, ''));
    if (areaNum > 300) hugeAreaCount++;
    if (it.areaList && it.areaList.length > 0) hasAreaListCount++;
    if (/제?\d+동/.test(it.name)) dongNamedCount++;
});

console.log('Items with huge area (>300m2, likely total floor area):', hugeAreaCount);
console.log('Items with areaList populated:', hasAreaListCount);
console.log('Items with dong in name (e.g. 101동, 제1동):', dongNamedCount);
