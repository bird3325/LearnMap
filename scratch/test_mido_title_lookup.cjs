const fs = require('fs');
const path = require('path');
const https = require('https');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));

const serviceKey = config.data_go_kr_key;
const agent = new https.Agent({ rejectUnauthorized: false });

const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=10600&bun=0404&numOfRows=10&pageNo=1`;

https.get(url, { agent }, (res) => {
    let d = '';
    res.on('data', chunk => d += chunk);
    res.on('end', () => {
        const items = d.match(/<item>[\s\S]*?<\/item>/g) || [];
        console.log('Title info count for 성사동 404번지:', items.length);
        items.forEach(it => {
            const mBld = it.match(/<bldNm>(.*?)<\/bldNm>/);
            const mDong = it.match(/<dongNm>(.*?)<\/dongNm>/);
            const mJi = it.match(/<ji>(.*?)<\/ji>/);
            console.log(mBld ? mBld[1] : '', mDong ? mDong[1] : '', mJi ? mJi[1] : '');
        });
    });
});
