const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/realestate_seoul.json'), 'utf8'));

const apts = data.filter(d => d.type === 'apt');
const aptsWithArea = apts.filter(d => d.area && d.area !== '-' && (d.areaList || []).length > 0);
const aptsWithoutArea = apts.filter(d => !d.area || d.area === '-' || (d.areaList || []).length === 0);

console.log('Total apts:', apts.length);
console.log('Apts with area:', aptsWithArea.length);
console.log('Apts without area:', aptsWithoutArea.length);

console.log('\nSample Apts without area:');
aptsWithoutArea.slice(0, 15).forEach((d, i) => {
    console.log(`${i+1}. ${d.name} (${d.dong}) bun: ${d.bun}, bjdongCd: ${d.bjdongCd}, areas: ${(d.areaList||[]).length}`);
});
