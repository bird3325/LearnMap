const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/realestate_seoul.json'), 'utf8'));

const aptWithJutaek = data.filter(d => {
    if (d.type !== 'apt') return false;
    const name = d.name || '';
    return name.includes('주택') || name.includes('빌라') || name.includes('원룸') || name.includes('단독') || name.includes('다가구') || name.includes('다세대') || name.includes('연립');
});

console.log('Total count:', aptWithJutaek.length);
aptWithJutaek.forEach((d, i) => {
    console.log(`${i+1}. ${d.name} (${d.type}) [${d.source}] ID: ${d.id} | dong: ${d.dong} | addr: ${d.address}`);
});
