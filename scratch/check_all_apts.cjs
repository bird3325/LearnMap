const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/realestate_seoul.json'), 'utf8'));

const aptList = data.filter(d => d.type === 'apt');

console.log('Total apt items:', aptList.length);

console.log('\n--- Normal looking Apartments (with 아파트, 단지, 마을, or typical apartment brand) ---');
const typicalBrand = /(?:아파트|단지|마을|자이|래미안|힐스테이트|푸르지오|e편한세상|롯데캐슬|아이파크|더샵|위브|동일스위트|호반|베르디움|센트레빌|풍림|금강|우미린|대방|중흥|우림|삼환|신안|한신|두산|현대|삼성|대우|벽산|극동|삼호|동아|경남|쌍용|보람|건영|신원|유원|대림|성원|현진|서해|동문|신한|동원|태영|화성|모아|한라|서희|우방|중앙|동양|신동아|유승|계룡|계성|부영|주공)/i;

const normalApts = [];
const suspiciousApts = [];

aptList.forEach(d => {
    const name = d.name || '';
    if (name.includes('주택') || name.includes('빌라') || name.includes('연립') || name.includes('원룸') || name.includes('번지') || name.includes('다세대') || name.includes('다가구')) {
        suspiciousApts.push(d);
    } else {
        normalApts.push(d);
    }
});

console.log(`Normal apt count: ${normalApts.length}`);
console.log(`Suspicious apt count: ${suspiciousApts.length}`);

console.log('\nSuspicious list:');
suspiciousApts.forEach((d, i) => {
    console.log(`${i+1}. [${d.name}] | id: ${d.id} | source: ${d.source}`);
});

console.log('\nCheck if normal list has any weird names:');
normalApts.filter(d => !typicalBrand.test(d.name)).forEach((d, i) => {
    console.log(`Non-branded normal: ${d.name} (${d.source})`);
});
