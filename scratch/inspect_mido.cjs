const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/realestate_seoul.json'), 'utf8'));

const mido = data.find(d => d.name === '미도아파트5차');
console.log(mido);
