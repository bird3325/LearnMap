const fs = require('fs');
const path = require('path');

const targetPaths = [
    path.join(__dirname, '../src/data/realestate_seoul.json'),
    path.join(__dirname, '../public/data/realestate_seoul.json'),
    path.join(__dirname, '../public/src/data/realestate_seoul.json')
];

const srcPath = targetPaths[0];
const data = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

console.log('Original items count:', data.length);
console.log('Original apt count:', data.filter(d => d.type === 'apt').length);

// 1. Ghost duplicates to remove:
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
        console.log(`[제거] 중복 허수 항목: "${item.name}" (id: ${item.id}) -> 정식 단지: "${realComplex.name}" (${realComplex.type})`);
    }
});

let updatedList = data.filter(d => !ghostIdsToRemove.has(d.id));

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
        console.log(`[교정: apt -> rh] ${copy.name}`);
    }
    // If it was apt, but has 주택 or 번지 and NOT apartment brand/keyword
    else if (copy.type === 'apt' && (n.includes('주택') || n.includes('번지') || n.includes('단독') || n.includes('다가구') || n.includes('원룸'))) {
        copy.type = 'sh';
        if (copy.id && copy.id.startsWith('master-hub-apt-')) {
            copy.id = copy.id.replace('master-hub-apt-', 'master-hub-sh-');
        }
        reclassifiedToSh++;
        console.log(`[교정: apt -> sh] ${copy.name}`);
    }

    return copy;
});

console.log('\n=== 작업 결과 요약 ===');
console.log(`- 중복 허수 제거: ${ghostIdsToRemove.size}건`);
console.log(`- 아파트 -> 연립·다세대(rh) 유형 교정: ${reclassifiedToRh}건`);
console.log(`- 아파트 -> 단독·다가구(sh) 유형 교정: ${reclassifiedToSh}건`);
console.log(`- 최종 주택 총 수: ${updatedList.length}건`);
console.log(`  - 🏢 아파트(apt): ${updatedList.filter(d => d.type === 'apt').length}건`);
console.log(`  - 🏡 연립·다세대(rh): ${updatedList.filter(d => d.type === 'rh').length}건`);
console.log(`  - 🏠 단독·다가구(sh): ${updatedList.filter(d => d.type === 'sh').length}건`);
console.log(`  - 🏙️ 오피스텔(offi): ${updatedList.filter(d => d.type === 'offi').length}건`);

const remainingSuspicious = updatedList.filter(d => {
    if (d.type !== 'apt') return false;
    const n = d.name || '';
    return n.includes('주택') || n.includes('빌라') || n.includes('연립') || n.includes('번지');
});
console.log(`- 아파트 중 주택/빌라/연립 잔존 건수: ${remainingSuspicious.length}건 (정상: 0건)`);

if (remainingSuspicious.length === 0) {
    const jsonStr = JSON.stringify(updatedList, null, 2);
    targetPaths.forEach(p => {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, jsonStr, 'utf8');
        console.log(`[저장 완료] ${p}`);
    });
} else {
    console.error('오류: 여전히 이상 항목이 남아있어 저장을 중단합니다.');
}
