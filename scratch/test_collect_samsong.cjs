const fs = require('fs');
const https = require('https');

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { rejectUnauthorized: false }, res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        }).on('error', reject);
    });
}

async function debugCollect() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    // 삼송 동일스위트 2개 단지
    // 1) 신원동 661 (삼송 동일스위트)
    // 2) 신원동 595 (고양삼송 동일스위트 1차)
    const targets = [
        { name: '삼송 동일스위트', lawdCd: '41281', bjdongCd: '10300', bun: '0661', ji: '0000' },
        { name: '고양삼송 동일스위트 1차', lawdCd: '41281', bjdongCd: '10300', bun: '0595', ji: '0000' }
    ];

    for (const t of targets) {
        console.log(`\n=== Testing Expos for ${t.name} (bun=${t.bun}) ===`);
        const paddedBun = String(parseInt(t.bun, 10) || 0).padStart(4, '0');
        const paddedJi = String(parseInt(t.ji, 10) || 0).padStart(4, '0');
        const exposUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${t.lawdCd}&bjdongCd=${t.bjdongCd}&bun=${paddedBun}&ji=${paddedJi}&numOfRows=100&pageNo=1`;
        console.log('URL:', exposUrl.split('serviceKey=')[0] + 'serviceKey=...');
        const exposXml = await httpsGet(exposUrl);
        const exposItems = exposXml.match(/<item>[\s\S]*?<\/item>/g) || [];
        console.log(`- Fetched items count: ${exposItems.length}`);
        if (exposItems.length > 0) {
            console.log(`- First item:`, exposItems[0].substring(0, 300));
        } else {
            console.log(`- Response XML:`, exposXml.substring(0, 400));
        }
    }
}

debugCollect();
