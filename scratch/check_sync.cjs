const fs = require('fs');
const d1 = fs.readFileSync('src/data/realestate_seoul.json', 'utf8');
const d2 = fs.readFileSync('public/data/realestate_seoul.json', 'utf8');
const d3 = fs.readFileSync('public/src/data/realestate_seoul.json', 'utf8');
console.log('d1 length:', d1.length, 'd2 length:', d2.length, 'd3 length:', d3.length);
console.log('All files identical?', d1 === d2 && d2 === d3);
