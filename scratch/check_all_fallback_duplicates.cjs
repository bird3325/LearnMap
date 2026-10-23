const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/realestate_seoul.json'), 'utf8'));

// Check ALL items that look like nameless fallback: endsWith('주택') or includes('번지')
const fallbackItems = data.filter(d => {
    const n = d.name || '';
    return n.endsWith('주택') || n.includes('번지');
});

console.log('Total fallback-style items in realestate_seoul.json:', fallbackItems.length);

const duplicateFallbacks = [];

fallbackItems.forEach(item => {
    const namedComplex = data.find(d => {
        if (d.id === item.id) return false;
        if (!d.name || d.name.endsWith('주택') || d.name.includes('번지')) return false;
        if (item.pnu && d.pnu && item.pnu === d.pnu) return true;
        if (item.dong && d.dong && item.dong === d.dong && item.bun && d.bun && item.bun === d.bun && item.ji === d.ji) return true;
        return false;
    });

    if (namedComplex) {
        duplicateFallbacks.push({ item, namedComplex });
    }
});

console.log(`Duplicate fallbacks sharing parcel with named complex: ${duplicateFallbacks.length}건`);
duplicateFallbacks.forEach(d => {
    console.log(`- "${d.item.name}" (${d.item.type}) [id: ${d.item.id}] -> Real complex: "${d.namedComplex.name}" (${d.namedComplex.type})`);
});
