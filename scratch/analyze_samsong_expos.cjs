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

async function analyzeSamSongExpos() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;

    const areaStats = new Map(); // areaKey -> { count, pyeong, rawArea }

    console.log('Fetching all ExposPubuseArea items for Shinwon-dong 661 (삼송 동일스위트 2차)...');
    for (let page = 1; page <= 15; page++) {
        const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=10300&bun=0661&ji=0000&numOfRows=100&pageNo=${page}`;
        try {
            const xml = await httpsGet(url);
            const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
            if (items.length === 0) {
                console.log(`Page ${page}: 0 items (done).`);
                break;
            }
            console.log(`Page ${page}: ${items.length} items fetched.`);

            items.forEach(it => {
                const getTag = tag => {
                    const m = it.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
                    return m ? m[1].trim() : '';
                };
                const gb = getTag('exposPubuseGbCdNm');
                if (gb !== '전유') return;

                const areaStr = getTag('area');
                const areaNum = parseFloat(areaStr);
                if (isNaN(areaNum) || areaNum <= 8) return;

                const key = areaNum.toFixed(1);
                if (!areaStats.has(key)) {
                    areaStats.set(key, {
                        area: `${key}㎡`,
                        pyeong: `${(areaNum / 3.3058).toFixed(1)}평형`,
                        rawArea: areaNum,
                        householdCount: 0
                    });
                }
                areaStats.get(key).householdCount++;
            });
        } catch (e) {
            console.error(`Page ${page} error:`, e.message);
        }
    }

    console.log('\n=== 신원동 661 삼송 동일스위트 2차 전유부 면적 집계 결과 ===');
    const sorted = Array.from(areaStats.values()).sort((a, b) => a.rawArea - b.rawArea);
    let totalHouseholds = 0;
    sorted.forEach(a => {
        totalHouseholds += a.householdCount;
        console.log(`- ${a.area} (${a.pyeong}): 총 ${a.householdCount}세대`);
    });
    console.log(`총 집계 세대수: ${totalHouseholds}세대`);
}

analyzeSamSongExpos();
