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

async function testShinwonTitles() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    const eps = [
        { name: '총괄표제부', url: 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo' },
        { name: '일반표제부', url: 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo' }
    ];

    for (const ep of eps) {
        console.log(`\n=== Calling ${ep.name} for 신원동 (41281, 10300) ===`);
        const url = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=10300&numOfRows=100&pageNo=1`;
        const xml = await httpsGet(url);
        const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        console.log(`Items count: ${items.length}`);
        
        items.forEach(it => {
            const getTag = tag => {
                const m = it.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                return m ? m[1].trim() : '';
            };
            const bldNm = getTag('bldNm');
            const bun = getTag('bun');
            const ji = getTag('ji');
            const newPlatPlc = getTag('newPlatPlc');
            if (bldNm.includes('동일') || bun === '0661' || bun === '0595' || (newPlatPlc && newPlatPlc.includes('신원1로 70'))) {
                console.log(`* Matched: bldNm="${bldNm}", bun=${bun}, ji=${ji}, addr=${newPlatPlc}`);
            }
        });
    }
}

testShinwonTitles();
