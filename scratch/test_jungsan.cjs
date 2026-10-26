const fs = require('fs');
const https = require('https');
const http = require('http');

async function readConfig() {
    return JSON.parse(fs.readFileSync('./config.json', 'utf8') || '{}');
}

function httpsGet(url, headers, timeoutMs = 7000) {
    return new Promise((resolve, reject) => {
        let isSettled = false;
        const safeReject = (err) => {
            if (!isSettled) { isSettled = true; reject(err); }
        };
        const safeResolve = (val) => {
            if (!isSettled) { isSettled = true; resolve(val); }
        };

        const client = url.startsWith('http://') ? http : https;
        const options = { headers: headers || {}, rejectUnauthorized: false };
        const req = client.get(url, options, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const data = Buffer.concat(chunks).toString('utf8');
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { safeResolve(JSON.parse(data)); } catch (e) { safeResolve(data); }
                } else {
                    safeReject({ status: res.statusCode, text: data });
                }
            });
            res.on('error', err => safeReject(err));
        });
        req.setTimeout(timeoutMs, () => {
            req.destroy(new Error(`Timeout ${timeoutMs}ms`));
            safeReject(new Error(`Timeout ${timeoutMs}ms`));
        });
        req.on('error', err => safeReject(err));
    });
}

async function run() {
    const config = await readConfig();
    const serviceKey = config.data_go_kr_key;
    const kakaoKey = config.kakao_app_key;

    console.log('Testing APIs for 중산마을1단지(두산)...');

    // 1. K-APT 목록 조회 (일산동구 41285)
    console.log('1. Testing K-APT list...');
    const t0 = Date.now();
    try {
        const kUrl = `https://apis.data.go.kr/1613000/AptListService4/getSigunguAptList4?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCode=41285&pageNo=1&numOfRows=100`;
        const kRes = await httpsGet(kUrl);
        console.log(`K-APT list done in ${Date.now() - t0}ms, response length:`, typeof kRes === 'string' ? kRes.length : JSON.stringify(kRes).length);
    } catch (e) {
        console.log('K-APT list error:', e.message);
    }

    // 2. K-APT 상세정보 조회
    console.log('2. Testing K-APT detail...');
    const t1 = Date.now();
    try {
        // 중산마을1단지 두산의 K-APT 코드를 찾아보거나 가상의 kaptCode 테스트
        const dUrl = `https://apis.data.go.kr/1613000/AptBasisInfoServiceV5/getAphusBassInfoV5?serviceKey=${encodeURIComponent(serviceKey)}&kaptCode=A13874301`;
        const dRes = await httpsGet(dUrl);
        console.log(`K-APT detail done in ${Date.now() - t1}ms`);
    } catch (e) {
        console.log('K-APT detail error:', e.message);
    }

    // 3. 전유부 API (BldRgstHubService/getBrExposPubuseAreaInfo)
    console.log('3. Testing Expos API...');
    const t2 = Date.now();
    try {
        const exposUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41285&bjdongCd=10200&bun=1555&ji=0000&numOfRows=100&pageNo=1`;
        const expRes = await httpsGet(exposUrl);
        console.log(`Expos API done in ${Date.now() - t2}ms, items count:`, typeof expRes === 'string' ? (expRes.match(/<item>/g) || []).length : 'JSON');
    } catch (e) {
        console.log('Expos API error:', e.message);
    }
}

run();
