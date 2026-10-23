const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/realestate_seoul.json'), 'utf8'));

const kaenari = data.filter(d => (d.name || '').includes('개나리'));
console.log('Found 개나리 count:', kaenari.length);
kaenari.forEach(item => {
    console.log(JSON.stringify(item, null, 2));
});
