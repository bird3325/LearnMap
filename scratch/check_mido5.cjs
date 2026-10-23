const https = require('https');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));

const serviceKey = config.data_go_kr_key;
const agent = new https.Agent({ rejectUnauthorized: false });

// 미도아파트5차: 성사동 404번지
const exposUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=10600&bun=0404&ji=0000&numOfRows=10&pageNo=1`;

https.get(exposUrl, { agent }, (res) => {
    let d = '';
    res.on('data', chunk => d += chunk);
    res.on('end', () => {
        const items = d.match(/<item>[\s\S]*?<\/item>/g) || [];
        console.log('미도아파트5차 items count:', items.length);
        items.forEach(it => {
            const getTag = tag => {
                const m = it.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                return m ? m[1].trim() : '';
            };
            console.log(getTag('bldNm'), getTag('dongNm'), getTag('hoNm'), getTag('exposPubuseGbCdNm'), getTag('area'));
        });
    });
}).on('error', e => console.error(e));
