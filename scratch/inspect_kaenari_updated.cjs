const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/realestate_seoul.json'), 'utf8'));

const kaenari = data.find(d => d.name === '개나리아파트');
console.log(JSON.stringify(kaenari, null, 2));
