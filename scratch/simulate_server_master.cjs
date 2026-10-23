const fs = require('fs');
const https = require('https');

function httpsGet(url, headers) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers, rejectUnauthorized: false }, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const data = Buffer.concat(chunks).toString('utf8');
                resolve(data);
            });
        });
        req.on('error', reject);
        req.setTimeout(8000, () => {
            req.destroy(new Error('timeout'));
        });
    });
}

async function simulate() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    // Load existing items
    const existingList = JSON.parse(fs.readFileSync('src/data/realestate_seoul.json', 'utf8'));
    const estateMap = new Map();
    existingList.forEach(item => {
        if (item && item.name) {
            estateMap.set(`${item.sido}_${item.sigungu}_${item.name}`, item);
        }
    });

    // Check Samsong Dongil in estateMap
    console.log('Total estates in Map:', estateMap.size);
    const targetKey1 = '경기도_덕양구_삼송 동일스위트';
    const targetKey2 = '경기도_고양시 덕양구_삼송 동일스위트';
    console.log('Has key1 (덕양구):', estateMap.has(targetKey1));
    console.log('Has key2 (고양시 덕양구):', estateMap.has(targetKey2));

    const foundItems = Array.from(estateMap.values()).filter(i => i.name.includes('동일스위트'));
    console.log('Found 동일스위트 in map:', foundItems.map(i => ({ name: i.name, sido: i.sido, sigungu: i.sigungu, bun: i.bun, bjdongCd: i.bjdongCd, pnu: i.pnu })));
}

simulate();
