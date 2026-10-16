const fs = require('fs');

async function checkBlocks() {
    const data = JSON.parse(fs.readFileSync('src/data/realestate_seoul.json', 'utf8'));
    const hoban = data.find(d => d.name.includes('호반') && d.name.includes('9'));
    console.log('Hoban 9 in DB:');
    console.log('  name:', hoban.name);
    console.log('  dong:', hoban.dong);
    console.log('  address:', hoban.address);
    console.log('  area:', hoban.area);
    console.log('  areaList:', JSON.stringify(hoban.areaList));

    // Check Kakao geocoder address or building info for '권율대로 831'
    // 권율대로 831 is indeed 신원동 658번지 (신원마을9단지 호반베르디움)
}

checkBlocks();
