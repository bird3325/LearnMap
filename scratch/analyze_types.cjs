const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/realestate_seoul.json'), 'utf8'));

console.log('Total items:', data.length);

const types = {};
data.forEach(d => {
    types[d.type] = (types[d.type] || 0) + 1;
});
console.log('Type breakdown:', types);

// Check items with "주택" in name
const jutaekList = data.filter(d => (d.name || '').includes('주택'));
console.log('\nTotal items with 주택 in name:', jutaekList.length);
const jutaekByType = {};
jutaekList.forEach(d => {
    jutaekByType[d.type] = (jutaekByType[d.type] || 0) + 1;
});
console.log('Items with 주택 by type:', jutaekByType);

// Check items with "빌라" in name
const villaList = data.filter(d => (d.name || '').includes('빌라'));
console.log('\nTotal items with 빌라 in name:', villaList.length);
const villaByType = {};
villaList.forEach(d => {
    villaByType[d.type] = (villaByType[d.type] || 0) + 1;
});
console.log('Items with 빌라 by type:', villaByType);

// Check items with "연립" in name
const yeonripList = data.filter(d => (d.name || '').includes('연립'));
console.log('\nTotal items with 연립 in name:', yeonripList.length);
const yeonripByType = {};
yeonripList.forEach(d => {
    yeonripByType[d.type] = (yeonripByType[d.type] || 0) + 1;
});
console.log('Items with 연립 by type:', yeonripByType);

// Check items with "번지" in name
const beonjiList = data.filter(d => (d.name || '').includes('번지'));
console.log('\nTotal items with 번지 in name:', beonjiList.length);
const beonjiByType = {};
beonjiList.forEach(d => {
    beonjiByType[d.type] = (beonjiByType[d.type] || 0) + 1;
});
console.log('Items with 번지 by type:', beonjiByType);
