const https = require('https');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));

const serviceKey = config.data_go_kr_key;
const kakaoKey = config.kakao_app_key;
const agent = new https.Agent({ rejectUnauthorized: false });

async function checkKaenari() {
    // 1. Kakao address check for '경기 고양시 덕양구 충장로475번길 14-4'
    const addr = '경기 고양시 덕양구 충장로475번길 14-4';
    const kRes = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(addr)}`, {
        headers: { 'Authorization': `KakaoAK ${kakaoKey}` }
    });
    const kData = await kRes.json();
    console.log('Kakao address result:');
    if (kData.documents && kData.documents[0]) {
        console.log({
            address_name: kData.documents[0].address_name,
            b_code: kData.documents[0].address ? kData.documents[0].address.b_code : null,
            h_code: kData.documents[0].address ? kData.documents[0].address.h_code : null,
            region_3depth_name: kData.documents[0].address ? kData.documents[0].address.region_3depth_name : null,
            main_address_no: kData.documents[0].address ? kData.documents[0].address.main_address_no : null,
            sub_address_no: kData.documents[0].address ? kData.documents[0].address.sub_address_no : null,
        });
    }

    // 2. Query getBrTitleInfo with bjdongCd 10600 and 10300
    const testCodes = ['10600', '10300'];
    for (const bCode of testCodes) {
        console.log(`\n=== Querying getBrTitleInfo for sigunguCd=41281, bjdongCd=${bCode}, bun=0415, ji=0000 ===`);
        const titleUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=${bCode}&bun=0415&ji=0000&numOfRows=10&pageNo=1`;
        
        await new Promise((resolve) => {
            https.get(titleUrl, { agent }, (res) => {
                let d = '';
                res.on('data', chunk => d += chunk);
                res.on('end', () => {
                    const items = d.match(/<item>[\s\S]*?<\/item>/g) || [];
                    console.log(`bjdongCd ${bCode} items count:`, items.length);
                    items.forEach(it => {
                        const getTag = tag => {
                            const m = it.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                            return m ? m[1].trim() : '';
                        };
                        console.log({
                            bldNm: getTag('bldNm'),
                            dongNm: getTag('dongNm'),
                            mainPurpsCdNm: getTag('mainPurpsCdNm'),
                            etcPurps: getTag('etcPurps'),
                            platPlc: getTag('platPlc'),
                            totArea: getTag('totArea'),
                            grndFlrCnt: getTag('grndFlrCnt'),
                            hhldCnt: getTag('hhldCnt'),
                            fmlyCnt: getTag('fmlyCnt')
                        });
                    });
                    resolve();
                });
            });
        });

        // 3. Query getBrExposPubuseAreaInfo (전유부 면적)
        console.log(`\n=== Querying getBrExposPubuseAreaInfo for bjdongCd=${bCode} ===`);
        const exposUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=${bCode}&bun=0415&ji=0000&numOfRows=20&pageNo=1`;
        await new Promise((resolve) => {
            https.get(exposUrl, { agent }, (res) => {
                let d = '';
                res.on('data', chunk => d += chunk);
                res.on('end', () => {
                    const items = d.match(/<item>[\s\S]*?<\/item>/g) || [];
                    console.log(`getBrExposPubuseAreaInfo count:`, items.length);
                    items.slice(0, 5).forEach(it => {
                        const getTag = tag => {
                            const m = it.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                            return m ? m[1].trim() : '';
                        };
                        console.log({
                            bldNm: getTag('bldNm'),
                            dongNm: getTag('dongNm'),
                            hoNm: getTag('hoNm'),
                            flrNo: getTag('flrNo'),
                            exposPubuseGbCdNm: getTag('exposPubuseGbCdNm'),
                            mainPurpsCdNm: getTag('mainPurpsCdNm'),
                            area: getTag('area')
                        });
                    });
                    resolve();
                });
            });
        });
    }
}

checkKaenari();
