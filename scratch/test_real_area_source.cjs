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

async function checkSamSong() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    console.log('=== 1. 삼송 동일스위트 K-APT API (A10026357) 테스트 ===');
    const kaptEndpoints = [
        // 기본정보
        `https://apis.data.go.kr/1613000/AptBasisInfoService1/getAptBasisInfo?serviceKey=${encodeURIComponent(serviceKey)}&kaptCode=A10026357`,
        // 상세정보
        `https://apis.data.go.kr/1613000/AptBasisInfoService1/getAptDetailInfo?serviceKey=${encodeURIComponent(serviceKey)}&kaptCode=A10026357`
    ];

    for (const url of kaptEndpoints) {
        console.log(`\nCalling: ${url.split('?')[0]}`);
        try {
            const xml = await httpsGet(url);
            console.log('Response:\n', xml.substring(0, 1500));
        } catch (e) {
            console.error('K-APT Error:', e.message);
        }
    }

    console.log('\n=== 2. 삼송 동일스위트 건축물대장 전유부 / 전유공용면적 API 테스트 ===');
    // 삼송 동일스위트: 경기 고양시 덕양구 신원1로 70 (신원동 661번지, PNU: 4128110300106610000)
    // sigunguCd: 41281 (덕양구), bjdongCd: 12800 (신원동), bun: 0661, ji: 0000
    const bldEndpoints = [
        // getBrExposPubuseAreaInfo (전유공용면적)
        `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=10300&bun=0661&ji=0000&numOfRows=100&pageNo=1`,
        // getBrExposInfo (전유부)
        `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=10300&bun=0661&ji=0000&numOfRows=100&pageNo=1`,
        // getBrTitleInfo (일반표제부)
        `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=10300&bun=0661&ji=0000&numOfRows=5&pageNo=1`
    ];

    for (const url of bldEndpoints) {
        console.log(`\nCalling: ${url.split('?')[0]} with bun=0661`);
        try {
            const xml = await httpsGet(url);
            console.log('Response snippet:\n', xml.substring(0, 1200));
        } catch (e) {
            console.error('BldRgst Error:', e.message);
        }
    }
}

checkSamSong();
