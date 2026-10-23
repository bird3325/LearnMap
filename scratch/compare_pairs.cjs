const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/realestate_seoul.json'), 'utf8'));

const pairs = [
    { ghostName: '고양동 103번지 주택', realName: '화성아파트' },
    { ghostName: '행신동 204-5번지 주택', realName: '연세빌라' },
    { ghostName: '행신동 781번지 주택', realName: '소만마을' },
    { ghostName: '토당동 19번지 주택', realName: '별장아파트' },
    { ghostName: '토당동 26번지 주택', realName: '자성빌라' }
];

pairs.forEach(p => {
    const ghost = data.find(d => d.name === p.ghostName);
    const real = data.find(d => d.name === p.realName);
    console.log(`\n=== Ghost: ${p.ghostName} vs Real: ${p.realName} ===`);
    if (ghost) {
        console.log(`Ghost: id=${ghost.id}, price=${ghost.price}, tradeDate=${ghost.tradeDate}, area=${ghost.area}, areasCount=${(ghost.areaList||[]).length}`);
    } else {
        console.log(`Ghost: not found`);
    }
    if (real) {
        console.log(`Real: id=${real.id}, price=${real.price}, tradeDate=${real.tradeDate}, area=${real.area}, areasCount=${(real.areaList||[]).length}, kaptCode=${real.kaptCode}`);
    } else {
        console.log(`Real: not found`);
    }
});
