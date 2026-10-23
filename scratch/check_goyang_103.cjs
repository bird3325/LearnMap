const https = require('https');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));

const serviceKey = config.data_go_kr_key;
const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=11600&bun=0103&ji=0000&numOfRows=10&pageNo=1`;

const agent = new https.Agent({ rejectUnauthorized: false });

https.get(url, { agent }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Result for getBrTitleInfo 고양동 103:');
        const items = data.match(/<item>[\s\S]*?<\/item>/g) || [];
        console.log('Found items count:', items.length);
        items.forEach(item => {
            const getTag = tag => {
                const m = item.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                return m ? m[1].trim() : '';
            };
            console.log({
                bldNm: getTag('bldNm'),
                mainPurpsCdNm: getTag('mainPurpsCdNm'),
                etcPurps: getTag('etcPurps'),
                platPlc: getTag('platPlc'),
                newPlatPlc: getTag('newPlatPlc'),
                grndFlrCnt: getTag('grndFlrCnt'),
                totArea: getTag('totArea')
            });
        });

        // Also check getBrRecapTitleInfo
        const recapUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=11600&bun=0103&ji=0000&numOfRows=10&pageNo=1`;
        https.get(recapUrl, { agent }, (res2) => {
            let data2 = '';
            res2.on('data', chunk => data2 += chunk);
            res2.on('end', () => {
                console.log('\nResult for getBrRecapTitleInfo 고양동 103:');
                const items2 = data2.match(/<item>[\s\S]*?<\/item>/g) || [];
                console.log('Found items count:', items2.length);
                items2.forEach(item => {
                    const getTag = tag => {
                        const m = item.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                        return m ? m[1].trim() : '';
                    };
                    console.log({
                        bldNm: getTag('bldNm'),
                        mainPurpsCdNm: getTag('mainPurpsCdNm'),
                        etcPurps: getTag('etcPurps'),
                        platPlc: getTag('platPlc'),
                        newPlatPlc: getTag('newPlatPlc'),
                        grndFlrCnt: getTag('grndFlrCnt'),
                        totArea: getTag('totArea')
                    });
                });
            });
        });
    });
});
