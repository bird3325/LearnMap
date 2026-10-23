const fs = require('fs');
const path = require('path');
const https = require('https');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8'));

const serviceKey = config.data_go_kr_key;
const agent = new https.Agent({ rejectUnauthorized: false });

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { agent }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', err => reject(err));
    });
}

const targetPaths = [
    path.join(__dirname, '../src/data/realestate_seoul.json'),
    path.join(__dirname, '../public/data/realestate_seoul.json'),
    path.join(__dirname, '../public/src/data/realestate_seoul.json')
];

const data = JSON.parse(fs.readFileSync(targetPaths[0], 'utf8'));

async function syncAptAreas() {
    const aptsWithoutArea = data.filter(d => d.type === 'apt' && (!d.area || d.area === '-' || (d.areaList || []).length === 0));
    console.log(`Checking ${aptsWithoutArea.length} apartments without area...`);

    let updatedCount = 0;

    for (const estate of aptsWithoutArea) {
        const paddedBun = String(parseInt(estate.bun, 10) || 0).padStart(4, '0');
        const paddedJi = String(parseInt(estate.ji, 10) || 0).padStart(4, '0');
        const lawdCd = estate.lawdCd || (estate.pnu ? estate.pnu.substring(0, 5) : '41281');
        const bjdongCd = estate.bjdongCd || (estate.pnu ? estate.pnu.substring(5, 10) : '');

        if (!bjdongCd || !estate.bun || estate.bun === '0') {
            console.log(`[SKIP: 지번/법정동 없음] ${estate.name}`);
            continue;
        }

        const areaCollector = new Map();

        try {
            for (let page = 1; page <= 2; page++) {
                const exposUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${lawdCd}&bjdongCd=${bjdongCd}&bun=${paddedBun}&ji=${paddedJi}&numOfRows=100&pageNo=${page}`;
                const exposXml = await httpsGet(exposUrl);
                const exposItems = (typeof exposXml === 'string' ? exposXml.match(/<item>[\s\S]*?<\/item>/g) : null) || [];
                if (exposItems.length === 0) break;

                for (const itemXml of exposItems) {
                    const getTag = tag => {
                        const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                        return m ? m[1].trim() : '';
                    };
                    const exposGb = getTag('exposPubuseGbCdNm');
                    if (exposGb && !exposGb.includes('전유')) continue;

                    const areaStr = getTag('area');
                    const areaNum = parseFloat(areaStr);
                    if (isNaN(areaNum) || areaNum <= 8 || areaNum > 600) continue;

                    const areaKey = areaNum.toFixed(1);
                    const existingA = areaCollector.get(areaKey) || {
                        area: `${areaKey}㎡`,
                        pyeong: `${(areaNum / 3.3058).toFixed(1)}평형`,
                        rawArea: areaNum,
                        householdCount: 0,
                        price: estate.price || '기본 정보 구축 (실거래 대기)',
                        tradeDate: estate.tradeDate || '-'
                    };
                    existingA.householdCount++;
                    areaCollector.set(areaKey, existingA);
                }
                if (exposItems.length < 100) break;
            }

            if (areaCollector.size > 0) {
                const sorted = Array.from(areaCollector.values()).sort((a, b) => a.rawArea - b.rawArea);
                let primaryArea = sorted[0];
                let maxCount = -1;
                sorted.forEach(a => {
                    if (a.householdCount > maxCount) {
                        maxCount = a.householdCount;
                        primaryArea = a;
                    }
                });

                estate.areaList = sorted.map(({ rawArea, ...rest }) => rest);
                estate.area = primaryArea.area;
                estate.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
                updatedCount++;
                console.log(`[면적 구축 성공] ${estate.name} (${estate.dong}): 대표 ${estate.area} (${sorted.length}개 평형, 총 ${sorted.reduce((acc, c) => acc + c.householdCount, 0)}세대)`);
            } else {
                console.log(`[면적 데이터 없음] ${estate.name} (${estate.dong}) - 공공 API 전유부 미등록`);
            }
        } catch (e) {
            console.warn(`[에러] ${estate.name}:`, e.message);
        }

        // Rate limit 보호 딜레이
        await new Promise(r => setTimeout(r, 60));
    }

    console.log(`\n총 ${updatedCount}개 아파트 전용면적 보충 완료!`);

    if (updatedCount > 0) {
        const jsonStr = JSON.stringify(data, null, 2);
        targetPaths.forEach(p => {
            fs.writeFileSync(p, jsonStr, 'utf8');
            console.log(`[파일 저장] ${p}`);
        });
    }
}

syncAptAreas();
