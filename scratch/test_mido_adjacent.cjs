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
    const estate = {
        name: '미도아파트5차',
        bun: '0404',
        ji: '0008',
        lawdCd: '41281',
        bjdongCd: '10600'
    };

    const pBun = '0404';
    const pJi = '0008';
    const candidates = [pJi, '0000'];
    const jiNum = parseInt(pJi, 10);
    if (jiNum > 0) {
        candidates.push(String(jiNum - 1).padStart(4, '0'));
        candidates.push(String(jiNum + 1).padStart(4, '0'));
    }

    console.log('Candidates for 미도아파트5차:', candidates);

    for (const testJi of candidates) {
        const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${estate.lawdCd}&bjdongCd=${estate.bjdongCd}&bun=${pBun}&ji=${testJi}&numOfRows=10&pageNo=1`;
        try {
            const xml = await httpsGet(url);
            const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
            console.log(`testJi: ${testJi} => items: ${items.length}`);
            if (items.length > 0) {
                console.log('Found with testJi:', testJi);
                break;
            }
        } catch (e) {
            console.error(e);
        }
    }
})();
