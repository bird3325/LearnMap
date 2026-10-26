const fs = require('fs');
const path = require('path');
const https = require('https');

const REAL_ESTATE_PATH = path.join(__dirname, '..', 'src', 'data', 'realestate_seoul.json');
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const LAWD_PATH = path.join(__dirname, '..', 'src', 'data', 'lawd_code_map.json');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const list = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8') || '[]');
const lawdMap = JSON.parse(fs.readFileSync(LAWD_PATH, 'utf8'));

console.log('=== 1. 현재 DB의 일산동구 데이터 확인 ===');
const ilsan = list.filter(item => 
    (item.sigungu && (item.sigungu.includes('일산동구') || item.sigungu === '고양시')) || 
    (item.address && item.address.includes('일산동구'))
);
console.log(`일산동구/고양시 전체 건수: ${ilsan.length}`);

const ilsanDongGuOnly = list.filter(item => 
    (item.sigungu && item.sigungu.includes('일산동구')) || 
    (item.address && item.address.includes('일산동구'))
);
console.log(`일산동구 한정 건수: ${ilsanDongGuOnly.length}`);
const typeCounts = {};
ilsanDongGuOnly.forEach(item => {
    typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
});
console.log('일산동구 유형별 분포:', typeCounts);

console.log('\n일산동구 샘플 데이터 10건:');
ilsanDongGuOnly.slice(0, 10).forEach(item => {
    console.log(`- [${item.type}] ${item.name} | 동: ${item.dong} | 주소: ${item.address} | 좌표: (${item.x}, ${item.y}) | 소스: ${item.source}`);
});

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

async function testApis() {
    console.log('\n=== 2. 카카오 로컬 API 검색 테스트 ===');
    const kakaoKey = config.kakao_app_key;
    const serviceKey = config.data_go_kr_key;

    // 카카오 주소 검색 테스트
    const addrQueries = [
        '경기도 고양시 일산동구 백석동',
        '경기도 고양시 일산동구 마두동',
        '경기도 고양시 일산동구 장항동',
        '경기도 고양시 일산동구 식사동'
    ];
    for (const q of addrQueries) {
        const dRes = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}`, {
            headers: { 'Authorization': `KakaoAK ${kakaoKey}` }
        });
        const dData = await dRes.json();
        const doc = dData.documents && dData.documents[0];
        console.log(`주소검색 [${q}]: b_code = ${doc ? doc.address.b_code : 'none'}, coord = ${doc ? doc.x + ',' + doc.y : 'none'}`);
    }

    console.log('\n=== 3. 국토부 실거래가 API (일산동구 41285) 테스트 ===');
    // 아파트 2024년 5월
    const aptTradeUrl = `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=10&LAWD_CD=41285&DEAL_YMD=202405`;
    const aptXml = await httpsGet(aptTradeUrl);
    const aptItems = aptXml.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`실거래가 아파트 (41285, 202405): ${aptItems.length}건 수신됨`);
    if (aptItems.length > 0) {
        const first = aptItems[0];
        const aptNm = (first.match(/<aptNm>(.*?)<\/aptNm>/) || [])[1];
        const umdNm = (first.match(/<umdNm>(.*?)<\/umdNm>/) || [])[1];
        console.log(`  샘플: ${umdNm} ${aptNm}`);
    } else {
        console.log('  응답 요약:', aptXml.substring(0, 300));
    }

    // 오피스텔 2024년 5월
    const offiTradeUrl = `https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=10&LAWD_CD=41285&DEAL_YMD=202405`;
    const offiXml = await httpsGet(offiTradeUrl);
    const offiItems = offiXml.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`실거래가 오피스텔 (41285, 202405): ${offiItems.length}건 수신됨`);
    if (offiItems.length > 0) {
        const first = offiItems[0];
        const offiNm = (first.match(/<offiNm>(.*?)<\/offiNm>/) || [])[1];
        const umdNm = (first.match(/<umdNm>(.*?)<\/umdNm>/) || [])[1];
        console.log(`  샘플: ${umdNm} ${offiNm}`);
    } else {
        console.log('  응답 요약:', offiXml.substring(0, 300));
    }

    console.log('\n=== 4. 건축HUB API (건축물대장 표제부) 테스트 ===');
    // 백석동 b_code = 4128510600 -> bjdongCd = 10600
    const recapUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41285&bjdongCd=10600&numOfRows=20&pageNo=1`;
    const recapXml = await httpsGet(recapUrl);
    const recapItems = recapXml.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`건축HUB 총괄표제부 (일산동구 41285, 백석동 10600): ${recapItems.length}건 수신됨`);
    if (recapItems.length > 0) {
        for (let i = 0; i < Math.min(recapItems.length, 5); i++) {
            const item = recapItems[i];
            const bldNm = (item.match(/<bldNm>(.*?)<\/bldNm>/) || [])[1];
            const mainPurpsCdNm = (item.match(/<mainPurpsCdNm>(.*?)<\/mainPurpsCdNm>/) || [])[1];
            const etcPurps = (item.match(/<etcPurps>(.*?)<\/etcPurps>/) || [])[1];
            console.log(`  [총괄표제부] ${bldNm} | 용도: ${mainPurpsCdNm} | 기타: ${etcPurps}`);
        }
    } else {
        console.log('  총괄표제부 응답 요약:', recapXml.substring(0, 300));
    }

    // 일반표제부 테스트
    const titleUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41285&bjdongCd=10600&numOfRows=20&pageNo=1`;
    const titleXml = await httpsGet(titleUrl);
    const titleItems = titleXml.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`건축HUB 일반표제부 (일산동구 41285, 백석동 10600): ${titleItems.length}건 수신됨`);
    if (titleItems.length > 0) {
        for (let i = 0; i < Math.min(titleItems.length, 5); i++) {
            const item = titleItems[i];
            const bldNm = (item.match(/<bldNm>(.*?)<\/bldNm>/) || [])[1];
            const mainPurpsCdNm = (item.match(/<mainPurpsCdNm>(.*?)<\/mainPurpsCdNm>/) || [])[1];
            const etcPurps = (item.match(/<etcPurps>(.*?)<\/etcPurps>/) || [])[1];
            console.log(`  [일반표제부] ${bldNm} | 용도: ${mainPurpsCdNm} | 기타: ${etcPurps}`);
        }
    } else {
        console.log('  일반표제부 응답 요약:', titleXml.substring(0, 300));
    }
}

testApis().catch(console.error);
