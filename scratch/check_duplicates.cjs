const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/realestate_seoul.json'), 'utf8'));

// Check if there are other entries at the same address / PNU / coordinates as the 66 suspicious items
const suspicious = data.filter(d => {
    if (d.type !== 'apt') return false;
    const name = d.name || '';
    return name.includes('주택') || name.includes('빌라') || name.includes('연립') || name.includes('원룸') || name.includes('번지') || name.includes('다세대') || name.includes('다가구');
});

console.log('Total suspicious:', suspicious.length);

suspicious.forEach((item, idx) => {
    // Find all items with same PNU or same address or same bun/ji
    const samePnu = data.filter(d => d.id !== item.id && d.pnu && d.pnu === item.pnu);
    const sameAddr = data.filter(d => d.id !== item.id && d.address && d.address === item.address);
    const sameDongBun = data.filter(d => d.id !== item.id && d.dong === item.dong && d.bun === item.bun && d.ji === item.ji && item.bun);

    if (samePnu.length > 0 || sameAddr.length > 0 || sameDongBun.length > 0) {
        const matches = [...new Set([...samePnu, ...sameAddr, ...sameDongBun])];
        console.log(`${idx+1}. [${item.name}] (type: ${item.type}) matches existing: ${matches.map(m => `"${m.name}" (${m.type})`).join(', ')}`);
    } else {
        console.log(`${idx+1}. [${item.name}] (type: ${item.type}) - NO other entry at PNU ${item.pnu} / addr ${item.address}`);
    }
});
