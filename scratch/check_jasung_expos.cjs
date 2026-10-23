const fs = require('fs');
const path = require('path');
const https = require('https');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));

const serviceKey = config.data_go_kr_key;
const agent = new https.Agent({ rejectUnauthorized: false });

const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=11800&bun=0037&ji=0000&numOfRows=10&pageNo=1`;

https.get(url, { agent }, (res) => {
    let d = '';
    res.on('data', chunk => d += chunk);
    res.on('end', () => {
        console.log('Expos raw response for 37-0000:', d.substring(0, 500));
    });
});
