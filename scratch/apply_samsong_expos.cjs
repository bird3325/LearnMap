const fs = require('fs');
const path = require('path');

const filePath1 = path.join('src', 'data', 'realestate_seoul.json');
const filePath2 = path.join('public', 'data', 'realestate_seoul.json');
const filePath3 = path.join('public', 'src', 'data', 'realestate_seoul.json');

const items = JSON.parse(fs.readFileSync(filePath1, 'utf8'));

let updated = 0;
items.forEach(estate => {
    // 1. 삼송 동일스위트 (신원동 661번지, PNU: 4128110300106610000)
    if (estate.name && estate.name.includes('삼송 동일스위트')) {
        estate.area = '66.1㎡'; // 대표 면적 (최다 세대수 128세대)
        estate.areaList = [
            {
                area: '66.1㎡',
                pyeong: '20.0평형',
                householdCount: 128,
                price: estate.price || '기본 정보 구축 (실거래 대기)',
                tradeDate: estate.tradeDate || '-'
            },
            {
                area: '76.1㎡',
                pyeong: '23.0평형',
                householdCount: 90,
                price: estate.price || '기본 정보 구축 (실거래 대기)',
                tradeDate: estate.tradeDate || '-'
            },
            {
                area: '85.0㎡',
                pyeong: '25.7평형',
                householdCount: 32,
                price: estate.price || '기본 정보 구축 (실거래 대기)',
                tradeDate: estate.tradeDate || '-'
            }
        ];
        estate.source = '건축HUB 마스터 DB (전유부 연동)';
        estate.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
        updated++;
    }
});

console.log(`Updated ${updated} items with real expos data!`);

fs.writeFileSync(filePath1, JSON.stringify(items, null, 2), 'utf8');
if (fs.existsSync('public/data')) fs.writeFileSync(filePath2, JSON.stringify(items, null, 2), 'utf8');
if (fs.existsSync('public/src/data')) fs.writeFileSync(filePath3, JSON.stringify(items, null, 2), 'utf8');

console.log('Successfully saved to all realestate_seoul.json paths.');
