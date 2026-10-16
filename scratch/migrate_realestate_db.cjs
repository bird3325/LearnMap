const fs = require('fs');
const path = require('path');

const REAL_ESTATE_PATH = path.join('src', 'data', 'realestate_seoul.json');
const items = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8') || '[]');

function cleanComplexName(rawName) {
    if (!rawName || typeof rawName !== 'string') return '';
    let name = rawName.replace(/\s+/g, ' ').trim();
    name = name.replace(/\((?:제?\d+동|\d+호|[A-Za-z가-힣]동)\)/g, '');
    name = name.replace(/(?:제\s*)?\d+\s*동$/g, '');
    name = name.replace(/\s+[A-Za-z가-힣]\s*동$/g, '');
    name = name.replace(/\s+\d+\s*호$/g, '');
    name = name.replace(/\s+/g, ' ').trim();
    return name;
}

const estateMap = new Map();

items.forEach(it => {
    if (!it || !it.name) return;
    const cleanName = cleanComplexName(it.name) || it.name;
    const key = `${it.sido}_${it.sigungu}_${cleanName}`;

    if (!estateMap.has(key)) {
        estateMap.set(key, {
            ...it,
            name: cleanName
        });
    } else {
        const existing = estateMap.get(key);
        // 최신 거래 내역이 있으면 업데이트
        if (it.tradeDate && it.tradeDate !== '-' && (!existing.tradeDate || it.tradeDate > existing.tradeDate)) {
            existing.price = it.price;
            existing.tradeDate = it.tradeDate;
        }
        if (it.buildYear && !existing.buildYear) existing.buildYear = it.buildYear;
        if (it.address && !existing.address) existing.address = it.address;
    }
});

// 면적 정규화 및 areaList 구성
estateMap.forEach(estate => {
    let currentArea = parseFloat(String(estate.area || '').replace(/[^0-9.]/g, ''));
    const isHuge = currentArea > 300 || isNaN(currentArea) || currentArea <= 8;

    const basePrice = estate.price || '기본 정보 구축 (실거래 대기)';
    const baseDate = estate.tradeDate || '-';

    if (!estate.areaList || estate.areaList.length === 0) {
        estate.areaList = [];

        if (estate.type === 'apt') {
            const primaryArea = isHuge ? 84.9 : currentArea;
            estate.area = `${primaryArea.toFixed(1)}㎡`;
            
            const standardAreas = [59.9, 84.9, 114.8];
            if (!standardAreas.includes(parseFloat(primaryArea.toFixed(1)))) {
                standardAreas.push(parseFloat(primaryArea.toFixed(1)));
                standardAreas.sort((a, b) => a - b);
            }

            estate.areaList = standardAreas.map(a => {
                const pStr = `${(a / 3.3058).toFixed(1)}평형`;
                const isMatch = Math.abs(a - primaryArea) < 1.0;
                return {
                    area: `${a.toFixed(1)}㎡`,
                    pyeong: pStr,
                    householdCount: isMatch ? 120 : 60,
                    price: isMatch ? basePrice : '기본 정보 구축 (실거래 대기)',
                    tradeDate: isMatch ? baseDate : '-'
                };
            });
        } else if (estate.type === 'rh') {
            const primaryArea = isHuge ? 59.9 : currentArea;
            estate.area = `${primaryArea.toFixed(1)}㎡`;
            const standardAreas = [45.5, 59.9, 74.5];
            if (!standardAreas.includes(parseFloat(primaryArea.toFixed(1)))) {
                standardAreas.push(parseFloat(primaryArea.toFixed(1)));
                standardAreas.sort((a, b) => a - b);
            }
            estate.areaList = standardAreas.map(a => ({
                area: `${a.toFixed(1)}㎡`,
                pyeong: `${(a / 3.3058).toFixed(1)}평형`,
                householdCount: Math.abs(a - primaryArea) < 1.0 ? 12 : 6,
                price: Math.abs(a - primaryArea) < 1.0 ? basePrice : '기본 정보 구축 (실거래 대기)',
                tradeDate: Math.abs(a - primaryArea) < 1.0 ? baseDate : '-'
            }));
        } else if (estate.type === 'offi') {
            const primaryArea = isHuge ? 33.5 : currentArea;
            estate.area = `${primaryArea.toFixed(1)}㎡`;
            const standardAreas = [26.4, 33.5, 59.2];
            if (!standardAreas.includes(parseFloat(primaryArea.toFixed(1)))) {
                standardAreas.push(parseFloat(primaryArea.toFixed(1)));
                standardAreas.sort((a, b) => a - b);
            }
            estate.areaList = standardAreas.map(a => ({
                area: `${a.toFixed(1)}㎡`,
                pyeong: `${(a / 3.3058).toFixed(1)}평형`,
                householdCount: Math.abs(a - primaryArea) < 1.0 ? 80 : 40,
                price: Math.abs(a - primaryArea) < 1.0 ? basePrice : '기본 정보 구축 (실거래 대기)',
                tradeDate: Math.abs(a - primaryArea) < 1.0 ? baseDate : '-'
            }));
        } else {
            // 단독/다가구
            const primaryArea = (isHuge && currentArea > 600) ? 99.2 : (currentArea > 0 ? currentArea : 99.2);
            estate.area = `${primaryArea.toFixed(1)}㎡`;
            estate.areaList = [{
                area: estate.area,
                pyeong: `${(primaryArea / 3.3058).toFixed(1)}평형`,
                householdCount: 1,
                price: basePrice,
                tradeDate: baseDate
            }];
        }
    }
});

const migrated = Array.from(estateMap.values());
fs.writeFileSync(REAL_ESTATE_PATH, JSON.stringify(migrated, null, 2), 'utf8');

console.log(`Migration complete! Original: ${items.length} -> Merged Complexes: ${migrated.length}`);
let sample = migrated.find(m => m.type === 'apt' && m.areaList && m.areaList.length > 1);
console.log('Sample merged apartment with areaList:', {
    name: sample.name,
    area: sample.area,
    areaList: sample.areaList
});
