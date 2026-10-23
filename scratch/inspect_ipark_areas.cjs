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
    const item = data.find(d => d.name && d.name.includes('고양삼송아이파크'));
    console.log('Item found:', item.name, item.pnu, item.bun, item.ji);

    const paddedBun = String(parseInt(item.bun, 10) || 0).padStart(4, '0');
    const paddedJi = String(parseInt(item.ji, 10) || 0).padStart(4, '0');

    // Query 1 page of getBrExposPubuseAreaInfo
    const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${item.lawdCd}&bjdongCd=${item.bjdongCd}&bun=${paddedBun}&ji=${paddedJi}&numOfRows=30&pageNo=1`;
    const xml = await httpsGet(url);
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

    console.log(`Fetched ${items.length} items`);
    items.slice(0, 15).forEach(it => {
        const getTag = tag => {
            const m = it.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
            return m ? m[1].trim() : '';
        };
        console.log(
            `동: ${getTag('dongNm')}, 호: ${getTag('hoNm')}, 구분: ${getTag('exposPubuseGbCdNm')}, 면적: ${getTag('area')}㎡, 주용도: ${getTag('mainPurpsCdNm')}`
        );
    });
})();
