const fs = require('fs');

const data = JSON.parse(fs.readFileSync('src/data/realestate_seoul.json', 'utf8'));
const shinwon = data.filter(d => d.dong === '신원동' || d.address.includes('신원동'));

console.log(`Found ${shinwon.length} complexes in 신원동:`);
shinwon.forEach(s => {
    const areas = Array.isArray(s.areaList) ? s.areaList.map(a => a.area).join(', ') : s.area;
    console.log(`- ${s.name} (${s.type}): [${areas}] | ${s.price}`);
});
