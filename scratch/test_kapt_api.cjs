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

async function testKapt() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    console.log('Testing K-apt API services with existing data_go_kr_key...');

    // 1. AptListService2 (한국부동산원 공동주택 단지 목록제공 서비스)
    const testUrls = [
        // 한국부동산원 공동주택 단지 목록
        `https://apis.data.go.kr/1613000/AptListService2/getTotalAptList?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=10`,
        // 시군구별 단지 목록 (고양시 덕양구 41281)
        `https://apis.data.go.kr/1613000/AptListService2/getSigunguAptList?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&pageNo=1&numOfRows=10`,
        // K-apt 기본정보 서비스
        `https://apis.data.go.kr/1613000/AptBasisInfoService1/getAptBasisInfo?serviceKey=${encodeURIComponent(serviceKey)}&kaptCode=A13511203`
    ];

    for (const u of testUrls) {
        try {
            console.log(`\nCalling: ${u.split('?')[0]}`);
            const xml = await httpsGet(u);
            console.log('Response snippet:', xml.substring(0, 400).replace(/\n/g, ' '));
        } catch (e) {
            console.error('Error:', e.message);
        }
    }
}

testKapt();
