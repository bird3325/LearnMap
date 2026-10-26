const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const serviceKey = config.data_go_kr_key;

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

async function inspectDong(dongName, bjdongCd) {
    console.log(`\n================== [${dongName} (41285 - ${bjdongCd})] ==================`);
    
    // 1. 총괄표제부
    const recapUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41285&bjdongCd=${bjdongCd}&numOfRows=100&pageNo=1`;
    const recapXml = await httpsGet(recapUrl);
    const totalRecap = (recapXml.match(/<totalCount>(.*?)<\/totalCount>/) || [])[1];
    const recapItems = recapXml.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`[총괄표제부] totalCount: ${totalRecap}, 수신건수: ${recapItems.length}`);

    let aptRecapCount = 0;
    let offiRecapCount = 0;
    recapItems.forEach(item => {
        const bldNm = (item.match(/<bldNm>(.*?)<\/bldNm>/) || [])[1] || '';
        const mainPurpsCdNm = (item.match(/<mainPurpsCdNm>(.*?)<\/mainPurpsCdNm>/) || [])[1] || '';
        const etcPurps = (item.match(/<etcPurps>(.*?)<\/etcPurps>/) || [])[1] || '';
        const combined = `${mainPurpsCdNm} ${etcPurps}`;
        if (combined.includes('아파트') || bldNm.includes('아파트') || bldNm.includes('단지') || bldNm.includes('마을')) {
            aptRecapCount++;
            if (aptRecapCount <= 3) console.log(`   🏢 아파트(총괄): "${bldNm}" | 용도: ${combined}`);
        }
        if (combined.includes('오피스텔') || bldNm.includes('오피스텔')) {
            offiRecapCount++;
            if (offiRecapCount <= 3) console.log(`   🏬 오피스텔(총괄): "${bldNm}" | 용도: ${combined}`);
        }
    });
    console.log(`  -> 총괄표제부 중 아파트 관련: ${aptRecapCount}건, 오피스텔 관련: ${offiRecapCount}건`);

    // 2. 일반표제부
    const titleUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41285&bjdongCd=${bjdongCd}&numOfRows=100&pageNo=1`;
    const titleXml = await httpsGet(titleUrl);
    const totalTitle = (titleXml.match(/<totalCount>(.*?)<\/totalCount>/) || [])[1];
    const titleItems = titleXml.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`[일반표제부] totalCount: ${totalTitle}, 수신건수: ${titleItems.length}`);

    let aptTitleCount = 0;
    let offiTitleCount = 0;
    titleItems.forEach(item => {
        const bldNm = (item.match(/<bldNm>(.*?)<\/bldNm>/) || [])[1] || '';
        const mainPurpsCdNm = (item.match(/<mainPurpsCdNm>(.*?)<\/mainPurpsCdNm>/) || [])[1] || '';
        const etcPurps = (item.match(/<etcPurps>(.*?)<\/etcPurps>/) || [])[1] || '';
        const combined = `${mainPurpsCdNm} ${etcPurps}`;
        if (combined.includes('아파트') || bldNm.includes('아파트') || bldNm.includes('단지') || bldNm.includes('마을')) {
            aptTitleCount++;
            if (aptTitleCount <= 3) console.log(`   🏢 아파트(일반): "${bldNm}" | 용도: ${combined}`);
        }
        if (combined.includes('오피스텔') || bldNm.includes('오피스텔')) {
            offiTitleCount++;
            if (offiTitleCount <= 3) console.log(`   🏬 오피스텔(일반): "${bldNm}" | 용도: ${combined}`);
        }
    });
    console.log(`  -> 일반표제부 중 아파트 관련: ${aptTitleCount}건, 오피스텔 관련: ${offiTitleCount}건`);
}

async function run() {
    await inspectDong('백석동', '10600');
    await inspectDong('마두동', '10500');
    await inspectDong('장항동', '10400');
    await inspectDong('식사동', '10100');
}

run().catch(console.error);
