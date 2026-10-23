const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../src/data/realestate_seoul.json');
const data = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

console.log('Original total items:', data.length);
console.log('Original apt items:', data.filter(d => d.type === 'apt').length);
console.log('Original rh items:', data.filter(d => d.type === 'rh').length);
console.log('Original sh items:', data.filter(d => d.type === 'sh').length);

// 1. Ghost duplicates to remove:
// Standalone fallback items (e.g. "...번지 주택") where a real named complex already exists on that exact parcel
const ghostIdsToRemove = new Set();

data.forEach(item => {
    const n = item.name || '';
    if (!n.endsWith('주택') && !n.includes('번지')) return; // not a fallback item
    if ((item.areaList || []).length > 0 || (item.price && item.price.includes('만원'))) return; // keep if it has deal price

    const realComplex = data.find(d => {
        if (d.id === item.id) return false;
        if (!d.name || d.name.endsWith('주택') || d.name.includes('번지')) return false;
        if (item.pnu && d.pnu && item.pnu === d.pnu) return true;
        if (item.dong && d.dong && item.dong === d.dong && item.bun && d.bun && item.bun === d.bun && item.ji === d.ji) return true;
        return false;
    });

    if (realComplex) {
        ghostIdsToRemove.add(item.id);
        console.log(`Removing ghost duplicate: [${item.name}] (id: ${item.id}, type: ${item.type}) in favor of real complex [${realComplex.name}] (${realComplex.type})`);
    }
});

let updatedList = data.filter(d => !ghostIdsToRemove.has(d.id));

// 2. Fix miscategorized types:
let reclassifiedToRh = 0;
let reclassifiedToSh = 0;

updatedList = updatedList.map(item => {
    const copy = { ...item };
    const n = copy.name || '';
    
    // If it was apt, but has villa/row house in name
    if (copy.type === 'apt' && (n.includes('빌라') || n.includes('연립') || n.includes('다세대') || n.includes('맨션') || n.includes('타운하우스'))) {
        copy.type = 'rh';
        if (copy.id && copy.id.startsWith('master-hub-apt-')) {
            copy.id = copy.id.replace('master-hub-apt-', 'master-hub-rh-');
        }
        reclassifiedToRh++;
        console.log(`Reclassified to RH: [${copy.name}]`);
    }
    // If it was apt, but has 주택 or 번지 and NOT apartment brand/keyword
    else if (copy.type === 'apt' && (n.includes('주택') || n.includes('번지') || n.includes('단독') || n.includes('다가구') || n.includes('원룸'))) {
        copy.type = 'sh';
        if (copy.id && copy.id.startsWith('master-hub-apt-')) {
            copy.id = copy.id.replace('master-hub-apt-', 'master-hub-sh-');
        }
        reclassifiedToSh++;
        console.log(`Reclassified to SH: [${copy.name}]`);
    }

    return copy;
});

console.log('\n--- After Correction Summary ---');
console.log('Removed ghosts:', ghostIdsToRemove.size);
console.log('Reclassified apt -> rh:', reclassifiedToRh);
console.log('Reclassified apt -> sh:', reclassifiedToSh);
console.log('New total items:', updatedList.length);
console.log('New apt count:', updatedList.filter(d => d.type === 'apt').length);
console.log('New rh count:', updatedList.filter(d => d.type === 'rh').length);
console.log('New sh count:', updatedList.filter(d => d.type === 'sh').length);

// Check if any apt remaining has 주택/빌라/연립/번지
const remainingSuspicious = updatedList.filter(d => {
    if (d.type !== 'apt') return false;
    const n = d.name || '';
    return n.includes('주택') || n.includes('빌라') || n.includes('연립') || n.includes('번지');
});
console.log('Remaining suspicious apts (should be 0):', remainingSuspicious.length);
