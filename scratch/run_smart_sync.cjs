const fs = require('fs');
const https = require('https');
const path = require('path');

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { rejectUnauthorized: false }, res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        }).on('error', reject);
    });
}

function normalize(raw) {
    if (!raw) return '';
    let n = String(raw).replace(/\s+/g, ' ').trim();
    n = n.replace(/\((?:제?\d+동|\d+호|[A-Za-z가-힣]동)\)/g, '');
    n = n.replace(/(?:제\s*)?\d+\s*동$/g, '');
    n = n.replace(/\s+[A-Za-z가-힣]\s*동$/g, '');
    n = n.replace(/\s+\d+\s*호$/g, '');
    n = n.replace(/아파트$/g, '');
    // Block normalization: A9블럭, A-9블록, A9BL, 9블럭 -> 9단지
    n = n.replace(/[A-Za-z]?\s*[-_]?\s*(\d+)\s*(?:블럭|블록|BL)/gi, '$1단지');
    return n.replace(/\s+/g, '');
}

function isComplexMatch(estate, tradeName, tradeDong, tradeJibun) {
    if (!estate || !estate.name || !tradeName) return false;
    
    // Address / Jibun match
    if (tradeDong && tradeJibun && estate.address && estate.address.includes(tradeDong) && estate.address.includes(tradeJibun)) {
        return true;
    }

    const eDong = estate.dong || '';
    if (eDong && tradeDong && eDong !== tradeDong) {
        return false;
    }

    const eNorm = normalize(estate.name);
    const tNorm = normalize(tradeName);

    if (eNorm === tNorm) return true;

    // Check digit correspondence (e.g. 9단지)
    const eDigits = eNorm.match(/\d+/g) || [];
    const tDigits = tNorm.match(/\d+/g) || [];
    if (eDigits.length > 0 && tDigits.length > 0) {
        const hasCommonDigit = eDigits.some(d => tDigits.includes(d));
        if (!hasCommonDigit) return false;
    }

    // Key brand matching in same dong or village
    const keyBrands = ['호반베르디움', '호반', '아이파크', '동일스위트', '우남퍼스트빌', '우림필유', '푸르지오', '래미안', '자이', '힐스테이트', '더샵', 'e편한세상', '이편한세상', '두산위브', '중흥', '중흥S-클래스', 'SK뷰', 'SKVIEW', '롯데캐슬', '센트럴푸르지오', '유쉘', '우방', '홈타운', '삼익', '동신', '쌍용', '라이프', '부영', '풍산', '그린나래', '에듀뷰', '써밋', '퍼스트'];

    for (const b of keyBrands) {
        const bClean = b.replace(/[^가-힣A-Za-z0-9]/g, '');
        if (eNorm.includes(bClean) && tNorm.includes(bClean)) {
            const villages = ['신원마을', '달빛마을', '은빛마을', '별빛마을', '옥빛마을', '햇빛마을', '무원마을', '소만마을', '샘터마을', '도래울', '원흥', '삼송', '지축', '향동', '덕은'];
            for (const v of villages) {
                if (eNorm.includes(v) && tNorm.includes(v)) return true;
            }
            if (eDong && tradeDong && eDong === tradeDong) return true;
        }
    }

    if (eNorm.length >= 6 && tNorm.length >= 6) {
        if (eNorm.includes(tNorm) || tNorm.includes(eNorm)) return true;
    }

    return false;
}

function groupRealAreas(rawAreaItems) {
    const groups = [];
    const sorted = [...rawAreaItems].sort((a, b) => a.rawArea - b.rawArea);

    sorted.forEach(item => {
        // Group slightly different measurements of the same layout (e.g. 84.94 vs 84.98 or 108.99 vs 109.72)
        // For Hoban 9: 84.95/84.98 is ~85m2, 106.37 is ~106m2, 108.99/109.72 is ~109m2
        let matched = groups.find(g => Math.abs(g.rawArea - item.rawArea) < 1.4);
        if (!matched) {
            groups.push({
                area: `${item.rawArea.toFixed(1)}㎡`,
                pyeong: `${(item.rawArea / 3.3058).toFixed(1)}평형`,
                rawArea: item.rawArea,
                price: item.price,
                tradeDate: item.tradeDate,
                count: item.count || 1
            });
        } else {
            matched.count += (item.count || 1);
            if (item.tradeDate >= matched.tradeDate) {
                matched.tradeDate = item.tradeDate;
                matched.price = item.price;
            }
        }
    });

    return groups.sort((a, b) => a.rawArea - b.rawArea);
}

async function runUpdate() {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const serviceKey = config.data_go_kr_key;
    const REAL_ESTATE_PATH = path.join('src', 'data', 'realestate_seoul.json');
    const existingList = JSON.parse(fs.readFileSync(REAL_ESTATE_PATH, 'utf8'));

    // Fetch 12 months for comprehensive area coverage
    const ymds = [
        '202404', '202403', '202402', '202401',
        '202312', '202311', '202310', '202309',
        '202308', '202307', '202306', '202305'
    ];

    const endpoints = [
        { type: 'apt', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev', nameTag: 'aptNm' },
        { type: 'rh', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade', nameTag: 'mhouseNm' },
        { type: 'offi', url: 'https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade', nameTag: 'offiNm' }
    ];

    const tradeList = [];
    console.log('Fetching 12 months of MOLIT trades for 41281...');

    for (const ep of endpoints) {
        for (const ymd of ymds) {
            const url = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=41281&DEAL_YMD=${ymd}`;
            try {
                const xml = await httpsGet(url);
                const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
                items.forEach(it => {
                    const getTag = t => {
                        const m = it.match(new RegExp(`<${t}>(.*?)<\/${t}>`));
                        return m ? m[1].trim() : '';
                    };
                    const rawNm = getTag(ep.nameTag);
                    const excluUseAr = getTag('excluUseAr');
                    const dealAmount = getTag('dealAmount');
                    const dealYear = getTag('dealYear');
                    const dealMonth = getTag('dealMonth');
                    const dealDay = getTag('dealDay');
                    const umdNm = getTag('umdNm');
                    const jibun = getTag('jibun');

                    if (rawNm && excluUseAr) {
                        tradeList.push({
                            type: ep.type,
                            rawName: rawNm,
                            rawArea: parseFloat(excluUseAr),
                            price: `${dealAmount.trim()}만원`,
                            tradeDate: `${dealYear}-${String(dealMonth).padStart(2, '0')}-${String(dealDay).padStart(2, '0')}`,
                            dong: umdNm,
                            jibun
                        });
                    }
                });
            } catch (e) {
                console.error(e.message);
            }
        }
    }

    console.log(`Total trades collected: ${tradeList.length}`);

    let matchCount = 0;
    const updatedList = existingList.map(estate => {
        // Find matching trades
        const matchedTrades = tradeList.filter(t => t.type === estate.type && isComplexMatch(estate, t.rawName, t.dong, t.jibun));

        if (matchedTrades.length > 0) {
            matchCount++;
            const grouped = groupRealAreas(matchedTrades);

            // Latest trade
            let latestTrade = matchedTrades[0];
            matchedTrades.forEach(tr => {
                if (tr.tradeDate >= latestTrade.tradeDate) latestTrade = tr;
            });

            // Primary area
            let primary = grouped[0];
            let maxCount = -1;
            grouped.forEach(g => {
                if (g.count > maxCount) {
                    maxCount = g.count;
                    primary = g;
                }
            });

            return {
                ...estate,
                price: latestTrade.price,
                tradeDate: latestTrade.tradeDate,
                area: primary.area,
                source: '실거래가/마스터 연동',
                areaList: grouped.map(g => ({
                    area: g.area,
                    pyeong: g.pyeong,
                    householdCount: g.count,
                    price: g.price,
                    tradeDate: g.tradeDate
                }))
            };
        }

        return estate;
    });

    console.log(`Total DB items matched: ${matchCount} / ${updatedList.length}`);

    // Check Hoban 9 specifically
    const hoban9 = updatedList.find(d => d.name.includes('호반') && d.name.includes('9'));
    console.log('\nUpdated Hoban 9 in DB:');
    console.log(JSON.stringify(hoban9, null, 2));

    fs.writeFileSync(REAL_ESTATE_PATH, JSON.stringify(updatedList, null, 2), 'utf8');

    const p1 = path.join('public', 'data', 'realestate_seoul.json');
    if (fs.existsSync(path.dirname(p1))) fs.writeFileSync(p1, JSON.stringify(updatedList, null, 2), 'utf8');
    const p2 = path.join('public', 'src', 'data', 'realestate_seoul.json');
    if (fs.existsSync(path.dirname(p2))) fs.writeFileSync(p2, JSON.stringify(updatedList, null, 2), 'utf8');

    console.log('Successfully written updated realestate_seoul.json!');
}

runUpdate();
