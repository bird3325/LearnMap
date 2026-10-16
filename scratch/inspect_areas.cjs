const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'data', 'realestate_seoul.json');
const items = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');

console.log('Total items:', items.length);

const types = {};
items.forEach(it => {
    types[it.type] = (types[it.type] || 0) + 1;
});
console.log('Types count:', types);

const withMultipleAreas = items.filter(i => i.areaList && i.areaList.length > 1);
console.log('With >1 area:', withMultipleAreas.length);

const aptWithAreas = items.filter(i => i.type === 'apt' && i.areaList && i.areaList.length > 0);
console.log('Apt with areaList:', aptWithAreas.length);

if (withMultipleAreas.length > 0) {
    console.log('Sample item with multiple areas:\n', JSON.stringify({
        name: withMultipleAreas[0].name,
        type: withMultipleAreas[0].type,
        area: withMultipleAreas[0].area,
        areaList: withMultipleAreas[0].areaList
    }, null, 2));
}

const sampleApt = items.find(i => i.type === 'apt');
if (sampleApt) {
    console.log('Sample apt:\n', JSON.stringify({
        name: sampleApt.name,
        type: sampleApt.type,
        area: sampleApt.area,
        areaList: sampleApt.areaList
    }, null, 2));
}
