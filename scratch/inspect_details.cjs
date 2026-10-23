const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/realestate_seoul.json'), 'utf8'));

const suspicious = data.filter(d => {
    if (d.type !== 'apt') return false;
    const name = d.name || '';
    return name.includes('주택') || name.includes('빌라') || name.includes('연립') || name.includes('원룸') || name.includes('번지') || name.includes('다세대') || name.includes('다가구');
});

console.log('Sample suspicious items details:');
suspicious.slice(0, 10).forEach(d => {
    console.log({
        id: d.id,
        name: d.name,
        type: d.type,
        address: d.address,
        area: d.area,
        pnu: d.pnu
    });
});
