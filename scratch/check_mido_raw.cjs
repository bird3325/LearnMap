const fs = require('fs');
const path = require('path');
const https = require('https');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));

const serviceKey = config.data_go_kr_key;
const agent = new https.Agent({ rejectUnauthorized: false });

const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=10600&bun=0404&ji=0007&numOfRows=10&pageNo=1`;

https.get(url, { agent }, (res) => {
    let d = '';
    res.on('data', chunk => d += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', d.substring(0, 300));
    });
});
