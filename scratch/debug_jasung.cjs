const fs = require('fs');
const path = require('path');
const https = require('https');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));

const serviceKey = config.data_go_kr_key;
const agent = new https.Agent({ rejectUnauthorized: false });

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { agent }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', err => reject(err));
    });
}

(async () => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/realestate_seoul.json'), 'utf8'));
    const item = data.find(d => d.name === '자성리치빌');
    console.log('Item:', item);

    const paddedBun = String(parseInt(item.bun, 10) || 0).padStart(4, '0');
    const paddedJi = String(parseInt(item.ji, 10) || 0).padStart(4, '0');
    const lawdCd = item.lawdCd;
    const bjdongCd = item.bjdongCd;

    const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${lawdCd}&bjdongCd=${bjdongCd}&bun=${paddedBun}&ji=${paddedJi}&numOfRows=100&pageNo=1`;
    console.log('Fetching:', url);

    try {
        const xml = await httpsGet(url);
        console.log('XML length:', xml.length);
        const exposItems = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        console.log('Expos items count:', exposItems.length);
    } catch (e) {
        console.error('Error:', e);
    }
})();
