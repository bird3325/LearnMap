const fs = require('fs');
const https = require('https');

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { rejectUnauthorized: false }, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const data = Buffer.concat(chunks).toString('utf8');
                resolve({ status: res.statusCode, data });
            });
        }).on('error', (err) => reject(err));
    });
}

async function testAptExpos() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    // 강남구 대치동(11680, 10600)의 전유공용면적
    const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=11680&bjdongCd=10600&numOfRows=100&pageNo=1`;
    const res = await httpsGet(url);
    const items = res.data.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`Found ${items.length} items for 대치동`);
    
    const aptMap = new Map();
    items.forEach(it => {
        const getTag = tag => {
            const m = it.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
            return m ? m[1].trim() : '';
        };
        const gb = getTag('exposPubuseGbCdNm');
        if (gb !== '전유') return;
        const bldNm = getTag('bldNm');
        const area = getTag('area');
        if (!bldNm || !area) return;
        if (!aptMap.has(bldNm)) aptMap.set(bldNm, new Set());
        aptMap.get(bldNm).add(area);
    });

    console.log('대치동 단지별 전유면적 집계 샘플:');
    for (const [bld, areas] of aptMap.entries()) {
        console.log(`- ${bld}: [${Array.from(areas).slice(0, 5).join('㎡, ')}㎡]`);
    }
}

testAptExpos();
