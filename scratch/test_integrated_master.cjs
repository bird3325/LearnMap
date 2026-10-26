const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const serviceKey = config.data_go_kr_key;
const kakaoKey = config.kakao_app_key;

const headers = { 
    'Authorization': `KakaoAK ${kakaoKey}`,
    'KA': 'sdk/1.0.0 os/javascript origin/http://localhost:3000'
};

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

async function testIntegrated() {
    console.log('=== 통합 주택 마스터 수집 시뮬레이션: 일산동구 (41285) ===');

    const dongs = ['백석동', '마두동', '장항동', '식사동', '정발산동', '풍동', '중산동'];
    const collected = new Map();

    // 1. 국토부 최신 실거래가(아파트 + 오피스텔) 3개월 스캔 테스트
    console.log('\n1. 국토부 실거래가 아파트/오피스텔 스캔 중...');
    const months = ['202405', '202404', '202403'];
    for (const m of months) {
        // 아파트
        const aptUrl = `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=41285&DEAL_YMD=${m}`;
        const aptXml = await httpsGet(aptUrl);
        const aptItems = aptXml.match(/<item>[\s\S]*?<\/item>/g) || [];
        aptItems.forEach(item => {
            const getTag = tag => (item.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`)) || [])[1] || '';
            const aptNm = getTag('aptNm');
            const dong = getTag('umdNm');
            const jibun = getTag('jibun');
            if (aptNm && dong) {
                const key = `일산동구_${dong}_${aptNm}`;
                if (!collected.has(key)) {
                    collected.set(key, { name: aptNm, dong, type: 'apt', jibun });
                }
            }
        });

        // 오피스텔
        const offiUrl = `https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=41285&DEAL_YMD=${m}`;
        const offiXml = await httpsGet(offiUrl);
        const offiItems = offiXml.match(/<item>[\s\S]*?<\/item>/g) || [];
        offiItems.forEach(item => {
            const getTag = tag => (item.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`)) || [])[1] || '';
            const offiNm = getTag('offiNm');
            const dong = getTag('umdNm');
            const jibun = getTag('jibun');
            if (offiNm && dong) {
                const key = `일산동구_${dong}_${offiNm}`;
                if (!collected.has(key)) {
                    collected.set(key, { name: offiNm, dong, type: 'offi', jibun });
                }
            }
        });
    }

    const aptCount = Array.from(collected.values()).filter(x => x.type === 'apt').length;
    const offiCount = Array.from(collected.values()).filter(x => x.type === 'offi').length;
    console.log(`-> 국토부 스캔 결과: 고유 아파트 단지 ${aptCount}개, 고유 오피스텔 ${offiCount}개 확보!`);

    console.log('\n샘플 아파트 단지 (10개):');
    Array.from(collected.values()).filter(x => x.type === 'apt').slice(0, 10).forEach(a => console.log(`  [아파트] ${a.dong} ${a.name} (${a.jibun})`));

    console.log('\n샘플 오피스텔 (10개):');
    Array.from(collected.values()).filter(x => x.type === 'offi').slice(0, 10).forEach(o => console.log(`  [오피스텔] ${o.dong} ${o.name} (${o.jibun})`));
}

testIntegrated();
