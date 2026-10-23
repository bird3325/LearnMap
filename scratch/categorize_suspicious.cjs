const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/realestate_seoul.json'), 'utf8'));

const suspicious = data.filter(d => {
    if (d.type !== 'apt') return false;
    const name = d.name || '';
    return name.includes('주택') || name.includes('빌라') || name.includes('연립') || name.includes('원룸') || name.includes('번지') || name.includes('다세대') || name.includes('다가구');
});

console.log('--- 66 Suspicious Items Analysis ---');
const duplicatesWithRealComplex = [];
const villasAndRowHouses = [];
const standaloneHouses = [];

suspicious.forEach(item => {
    // 1. Is there a named complex at the same PNU or (dong + bun + ji)?
    const namedComplex = data.find(d => {
        if (d.id === item.id) return false;
        // check if d is a named complex (not another "...번지 주택")
        if (!d.name || d.name.endsWith('주택') || d.name.includes('번지')) return false;
        if (item.pnu && d.pnu && item.pnu === d.pnu) return true;
        if (item.dong && d.dong && item.dong === d.dong && item.bun && d.bun && item.bun === d.bun && item.ji === d.ji) return true;
        return false;
    });

    if (namedComplex) {
        duplicatesWithRealComplex.push({ item, namedComplex });
    } else if (item.name.includes('빌라') || item.name.includes('연립') || item.name.includes('다세대')) {
        villasAndRowHouses.push(item);
    } else {
        standaloneHouses.push(item);
    }
});

console.log(`1. Ghost duplicates of existing named complex (e.g. 고양동 103번지 주택 vs 화성아파트): ${duplicatesWithRealComplex.length}건`);
duplicatesWithRealComplex.forEach(d => {
    console.log(`   - "${d.item.name}" (id: ${d.item.id}) -> 이미 존재하는 단지: "${d.namedComplex.name}" (${d.namedComplex.type})`);
});

console.log(`\n2. Villas and Row houses wrongly marked as apt: ${villasAndRowHouses.length}건`);
villasAndRowHouses.forEach(d => {
    console.log(`   - "${d.name}" (id: ${d.id}) -> 교정 대상: rh (연립·다세대)`);
});

console.log(`\n3. Standalone houses (...번지 주택) wrongly marked as apt: ${standaloneHouses.length}건`);
standaloneHouses.forEach(d => {
    console.log(`   - "${d.name}" (id: ${d.id}) -> 교정 대상: sh (단독·다가구)`);
});
