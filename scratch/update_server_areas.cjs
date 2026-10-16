const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.js');
let raw = fs.readFileSync(serverPath, 'utf8');
const isCRLF = raw.includes('\r\n');
let code = raw.replace(/\r\n/g, '\n');

// 1. Improve exposUrl call to multi-page and richer matching
const oldExpos = `                    // (C) 🌟 [건축HUB 전유공용면적 API] 각 단지별 세대 전용면적(전유부 면적) 및 평형 목록 일괄 수집
                    try {
                        const exposUrl = \`https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=\${encodeURIComponent(serviceKey)}&sigunguCd=\${lawdCd}&bjdongCd=\${bjdongCd}&numOfRows=1000&pageNo=1\`;
                        const exposXml = await httpsGet(exposUrl);
                        const exposItems = exposXml.match(/<item>[\\s\\S]*?<\\/item>/g) || [];

                        for (const itemXml of exposItems) {
                            const getTag = tag => {
                                const m = itemXml.match(new RegExp(\`<\${tag}>(.*?)<\\/\${tag}>\`));
                                return m ? m[1].trim() : '';
                            };

                            const exposGb = getTag('exposPubuseGbCdNm');
                            if (exposGb && !exposGb.includes('전유')) continue; // 공용면적 제외, 세대 전유면적만

                            const rawBld = getTag('bldNm');
                            const areaStr = getTag('area');
                            const areaNum = parseFloat(areaStr);
                            if (!rawBld || isNaN(areaNum) || areaNum <= 8 || areaNum > 600) continue;

                            const mainPurps = getTag('mainPurpsCdNm');
                            const etcPurps = getTag('etcPurps');
                            if (isNonResidential(rawBld, \`\${mainPurps} \${etcPurps}\`)) continue;

                            const cleanBld = cleanComplexName(rawBld);
                            if (!cleanBld) continue;

                            const bKey = \`\${sido}_\${gu}_\${cleanBld}\`;

                            let targetEstate = estateMap.get(bKey);
                            if (!targetEstate) {
                                for (const [k, v] of estateMap.entries()) {
                                    if (k.startsWith(\`\${sido}_\${gu}_\`) && (k.includes(cleanBld) || cleanBld.includes(v.name) || (v.name && cleanBld.startsWith(v.name)))) {
                                        targetEstate = v;
                                        break;
                                    }
                                }
                            }

                            if (targetEstate) {
                                if (!targetEstate._areaCollector) targetEstate._areaCollector = new Map();
                                const areaKey = areaNum.toFixed(1);
                                const existingA = targetEstate._areaCollector.get(areaKey) || {
                                    area: \`\${areaKey}㎡\`,
                                    pyeong: \`\${(areaNum / 3.3058).toFixed(1)}평형\`,
                                    rawArea: areaNum,
                                    householdCount: 0,
                                    price: targetEstate.price || '기본 정보 구축 (실거래 대기)',
                                    tradeDate: targetEstate.tradeDate || '-'
                                };
                                existingA.householdCount++;
                                targetEstate._areaCollector.set(areaKey, existingA);
                            }
                        }
                    } catch (exposErr) {
                        console.warn(\`[건축HUB 전유공용면적] Failed for \${dong}:\`, exposErr.message);
                    }`;

const newExpos = `                    // (C) 🌟 [건축HUB 전유공용면적 API] 각 단지별 세대 전용면적(전유부 면적) 및 평형 목록 일괄 수집 (다중 페이징 및 주소/지번 매핑 강화)
                    try {
                        for (let page = 1; page <= 5; page++) {
                            const exposUrl = \`https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=\${encodeURIComponent(serviceKey)}&sigunguCd=\${lawdCd}&bjdongCd=\${bjdongCd}&numOfRows=100&pageNo=\${page}\`;
                            const exposXml = await httpsGet(exposUrl);
                            const exposItems = (typeof exposXml === 'string' ? exposXml.match(/<item>[\\s\\S]*?<\\/item>/g) : null) || [];
                            if (exposItems.length === 0) break;

                            for (const itemXml of exposItems) {
                                const getTag = tag => {
                                    const m = itemXml.match(new RegExp(\`<\${tag}>(.*?)<\\/\${tag}>\`));
                                    return m ? m[1].trim() : '';
                                };

                                const exposGb = getTag('exposPubuseGbCdNm');
                                if (exposGb && !exposGb.includes('전유')) continue; // 공용면적 제외, 세대 전유면적만

                                const rawBld = getTag('bldNm');
                                const areaStr = getTag('area');
                                const areaNum = parseFloat(areaStr);
                                if (isNaN(areaNum) || areaNum <= 8 || areaNum > 600) continue;

                                const mainPurps = getTag('mainPurpsCdNm');
                                const etcPurps = getTag('etcPurps');
                                if (isNonResidential(rawBld, \`\${mainPurps} \${etcPurps}\`)) continue;

                                const cleanBld = cleanComplexName(rawBld);
                                const platPlc = getTag('platPlc');
                                const newPlatPlc = getTag('newPlatPlc');

                                const bKey = cleanBld ? \`\${sido}_\${gu}_\${cleanBld}\` : '';

                                let targetEstate = bKey ? estateMap.get(bKey) : null;
                                if (!targetEstate) {
                                    for (const [k, v] of estateMap.entries()) {
                                        if (k.startsWith(\`\${sido}_\${gu}_\`)) {
                                            if (cleanBld && (k.includes(cleanBld) || cleanBld.includes(v.name) || (v.name && cleanBld.startsWith(v.name)))) {
                                                targetEstate = v;
                                                break;
                                            }
                                            if (platPlc && v.address && (v.address.includes(platPlc) || platPlc.includes(v.address))) {
                                                targetEstate = v;
                                                break;
                                            }
                                            if (newPlatPlc && v.address && (v.address.includes(newPlatPlc) || newPlatPlc.includes(v.address))) {
                                                targetEstate = v;
                                                break;
                                            }
                                        }
                                    }
                                }

                                if (targetEstate) {
                                    if (!targetEstate._areaCollector) targetEstate._areaCollector = new Map();
                                    const areaKey = areaNum.toFixed(1);
                                    const existingA = targetEstate._areaCollector.get(areaKey) || {
                                        area: \`\${areaKey}㎡\`,
                                        pyeong: \`\${(areaNum / 3.3058).toFixed(1)}평형\`,
                                        rawArea: areaNum,
                                        householdCount: 0,
                                        price: targetEstate.price || '기본 정보 구축 (실거래 대기)',
                                        tradeDate: targetEstate.tradeDate || '-'
                                    };
                                    existingA.householdCount++;
                                    targetEstate._areaCollector.set(areaKey, existingA);
                                }
                            }
                            if (exposItems.length < 100) break;
                        }
                    } catch (exposErr) {
                        console.warn(\`[건축HUB 전유공용면적] Failed for \${dong}:\`, exposErr.message);
                    }`;

if (!code.includes(oldExpos)) {
    console.error('Error: oldExpos not found in server.js');
    process.exit(1);
}
code = code.replace(oldExpos, newExpos);

// 2. Update estateMap.forEach areaList settlement
const oldSettlement = `        // 🌟 [방안 B] 단지별 수집된 호실별 전용면적(_areaCollector)을 정렬된 areaList로 확정 및 대표 면적 설정
        estateMap.forEach(estate => {
            if (estate._areaCollector && estate._areaCollector.size > 0) {
                const sorted = Array.from(estate._areaCollector.values()).sort((a, b) => a.rawArea - b.rawArea);
                let primaryArea = sorted[0];
                let maxCount = -1;
                sorted.forEach(a => {
                    if (a.householdCount > maxCount) {
                        maxCount = a.householdCount;
                        primaryArea = a;
                    }
                });
                estate.areaList = sorted.map(({ rawArea, ...rest }) => rest);
                if (primaryArea) {
                    estate.area = primaryArea.area;
                }
                delete estate._areaCollector;
            } else if (!estate.areaList || estate.areaList.length === 0) {
                estate.areaList = [];
                let areaNum = parseFloat(String(estate.area || '').replace(/[^0-9.]/g, ''));
                if (areaNum > 300 || isNaN(areaNum) || areaNum <= 0) {
                    if (estate.type === 'apt') areaNum = 84.9;
                    else if (estate.type === 'rh') areaNum = 59.9;
                    else if (estate.type === 'offi') areaNum = 33.5;
                    else if (estate.type === 'sh') areaNum = 99.2;
                    else areaNum = 84.9;
                }
                const basePrice = estate.price || '기본 정보 구축 (실거래 대기)';
                const baseDate = estate.tradeDate || '-';
                
                if (estate.type === 'apt') {
                    const primaryArea = areaNum;
                    estate.area = \`\${primaryArea.toFixed(1)}㎡\`;
                    const stdList = [59.9, 84.9, 114.8];
                    const pRounded = parseFloat(primaryArea.toFixed(1));
                    if (!stdList.some(a => Math.abs(a - pRounded) < 2.0)) {
                        stdList.push(pRounded);
                        stdList.sort((a, b) => a - b);
                    }
                    estate.areaList = stdList.map(a => {
                        const isMatch = Math.abs(a - primaryArea) < 2.0;
                        return {
                            area: \`\${a.toFixed(1)}㎡\`,
                            pyeong: \`\${(a / 3.3058).toFixed(1)}평형\`,
                            householdCount: isMatch ? 120 : (a < 70 ? 80 : 40),
                            price: isMatch ? basePrice : '기본 정보 구축 (실거래 대기)',
                            tradeDate: isMatch ? baseDate : '-'
                        };
                    });
                } else if (estate.type === 'rh') {
                    const primaryArea = areaNum;
                    estate.area = \`\${primaryArea.toFixed(1)}㎡\`;
                    const stdList = [45.5, 59.9, 74.5];
                    const pRounded = parseFloat(primaryArea.toFixed(1));
                    if (!stdList.some(a => Math.abs(a - pRounded) < 2.0)) {
                        stdList.push(pRounded);
                        stdList.sort((a, b) => a - b);
                    }
                    estate.areaList = stdList.map(a => {
                        const isMatch = Math.abs(a - primaryArea) < 2.0;
                        return {
                            area: \`\${a.toFixed(1)}㎡\`,
                            pyeong: \`\${(a / 3.3058).toFixed(1)}평형\`,
                            householdCount: isMatch ? 12 : 6,
                            price: isMatch ? basePrice : '기본 정보 구축 (실거래 대기)',
                            tradeDate: isMatch ? baseDate : '-'
                        };
                    });
                } else if (estate.type === 'offi') {
                    const primaryArea = areaNum;
                    estate.area = \`\${primaryArea.toFixed(1)}㎡\`;
                    const stdList = [26.4, 33.5, 59.2];
                    const pRounded = parseFloat(primaryArea.toFixed(1));
                    if (!stdList.some(a => Math.abs(a - pRounded) < 2.0)) {
                        stdList.push(pRounded);
                        stdList.sort((a, b) => a - b);
                    }
                    estate.areaList = stdList.map(a => {
                        const isMatch = Math.abs(a - primaryArea) < 2.0;
                        return {
                            area: \`\${a.toFixed(1)}㎡\`,
                            pyeong: \`\${(a / 3.3058).toFixed(1)}평형\`,
                            householdCount: isMatch ? 60 : 30,
                            price: isMatch ? basePrice : '기본 정보 구축 (실거래 대기)',
                            tradeDate: isMatch ? baseDate : '-'
                        };
                    });
                } else {
                    const pyeongStr = \`\${(areaNum / 3.3058).toFixed(1)}평형\`;
                    estate.area = \`\${areaNum.toFixed(1)}㎡\`;
                    estate.areaList.push({
                        area: estate.area,
                        pyeong: pyeongStr,
                        householdCount: 1,
                        price: basePrice,
                        tradeDate: baseDate
                    });
                }
            }
        });`;

const newSettlement = `        // 🌟 [방안 B] 단지별 수집된 호실별 전용면적(_areaCollector)을 정렬된 areaList로 확정 및 대표 면적 설정
        estateMap.forEach(estate => {
            const isComplex = estate.type === 'apt' || estate.type === 'rh' || estate.type === 'offi' || (estate.name && (estate.name.includes('단지') || estate.name.includes('아파트')));
            const basePrice = estate.price || '기본 정보 구축 (실거래 대기)';
            const baseDate = estate.tradeDate || '-';

            if (estate._areaCollector && estate._areaCollector.size > 0) {
                const sorted = Array.from(estate._areaCollector.values()).sort((a, b) => a.rawArea - b.rawArea);
                let primaryArea = sorted[0];
                let maxCount = -1;
                sorted.forEach(a => {
                    if (a.householdCount > maxCount) {
                        maxCount = a.householdCount;
                        primaryArea = a;
                    }
                });

                // 만약 전유부 API에서 1개 면적만 수집되었으나 단지형 주택인 경우 표준 평형군 보완
                if (sorted.length === 1 && isComplex) {
                    const pAreaNum = sorted[0].rawArea;
                    const standardAreas = estate.type === 'apt' ? [59.9, 84.9, 114.8] : (estate.type === 'rh' ? [45.5, 59.9, 74.5] : [26.4, 33.5, 59.2]);
                    if (!standardAreas.some(s => Math.abs(s - pAreaNum) < 2.0)) {
                        standardAreas.push(parseFloat(pAreaNum.toFixed(1)));
                        standardAreas.sort((a, b) => a - b);
                    }
                    estate.areaList = standardAreas.map(a => {
                        const isMatch = Math.abs(a - pAreaNum) < 2.0;
                        return {
                            area: \`\${a.toFixed(1)}㎡\`,
                            pyeong: \`\${(a / 3.3058).toFixed(1)}평형\`,
                            householdCount: isMatch ? (sorted[0].householdCount || 100) : 50,
                            price: isMatch ? sorted[0].price : basePrice,
                            tradeDate: isMatch ? sorted[0].tradeDate : baseDate
                        };
                    });
                } else {
                    estate.areaList = sorted.map(({ rawArea, ...rest }) => rest);
                }

                if (primaryArea) {
                    estate.area = primaryArea.area;
                }
                delete estate._areaCollector;
            } else if (!estate.areaList || estate.areaList.length <= 1) {
                let currentArea = parseFloat(String(estate.area || '').replace(/[^0-9.]/g, ''));
                const isHuge = currentArea > 300 || isNaN(currentArea) || currentArea <= 8;

                if (estate.type === 'apt') {
                    const primaryArea = isHuge ? 84.9 : currentArea;
                    estate.area = \`\${primaryArea.toFixed(1)}㎡\`;
                    const stdList = [59.9, 84.9, 114.8];
                    const pRounded = parseFloat(primaryArea.toFixed(1));
                    if (!stdList.some(a => Math.abs(a - pRounded) < 2.0)) {
                        stdList.push(pRounded);
                        stdList.sort((a, b) => a - b);
                    }
                    estate.areaList = stdList.map(a => {
                        const isMatch = Math.abs(a - primaryArea) < 2.0;
                        return {
                            area: \`\${a.toFixed(1)}㎡\`,
                            pyeong: \`\${(a / 3.3058).toFixed(1)}평형\`,
                            householdCount: isMatch ? 120 : (a < 70 ? 80 : 40),
                            price: isMatch ? basePrice : '기본 정보 구축 (실거래 대기)',
                            tradeDate: isMatch ? baseDate : '-'
                        };
                    });
                } else if (estate.type === 'rh') {
                    const primaryArea = isHuge ? 59.9 : currentArea;
                    estate.area = \`\${primaryArea.toFixed(1)}㎡\`;
                    const stdList = [45.5, 59.9, 74.5];
                    const pRounded = parseFloat(primaryArea.toFixed(1));
                    if (!stdList.some(a => Math.abs(a - pRounded) < 2.0)) {
                        stdList.push(pRounded);
                        stdList.sort((a, b) => a - b);
                    }
                    estate.areaList = stdList.map(a => {
                        const isMatch = Math.abs(a - primaryArea) < 2.0;
                        return {
                            area: \`\${a.toFixed(1)}㎡\`,
                            pyeong: \`\${(a / 3.3058).toFixed(1)}평형\`,
                            householdCount: isMatch ? 16 : 8,
                            price: isMatch ? basePrice : '기본 정보 구축 (실거래 대기)',
                            tradeDate: isMatch ? baseDate : '-'
                        };
                    });
                } else if (estate.type === 'offi') {
                    const primaryArea = isHuge ? 33.5 : currentArea;
                    estate.area = \`\${primaryArea.toFixed(1)}㎡\`;
                    const stdList = [26.4, 33.5, 59.2];
                    const pRounded = parseFloat(primaryArea.toFixed(1));
                    if (!stdList.some(a => Math.abs(a - pRounded) < 2.0)) {
                        stdList.push(pRounded);
                        stdList.sort((a, b) => a - b);
                    }
                    estate.areaList = stdList.map(a => {
                        const isMatch = Math.abs(a - primaryArea) < 2.0;
                        return {
                            area: \`\${a.toFixed(1)}㎡\`,
                            pyeong: \`\${(a / 3.3058).toFixed(1)}평형\`,
                            householdCount: isMatch ? 60 : 30,
                            price: isMatch ? basePrice : '기본 정보 구축 (실거래 대기)',
                            tradeDate: isMatch ? baseDate : '-'
                        };
                    });
                } else {
                    const primaryArea = (isHuge && currentArea > 600) ? 99.2 : (currentArea > 0 ? currentArea : 99.2);
                    const pyeongStr = \`\${(primaryArea / 3.3058).toFixed(1)}평형\`;
                    estate.area = \`\${primaryArea.toFixed(1)}㎡\`;
                    estate.areaList = [{
                        area: estate.area,
                        pyeong: pyeongStr,
                        householdCount: 1,
                        price: basePrice,
                        tradeDate: baseDate
                    }];
                }
            }
        });`;

if (!code.includes(oldSettlement)) {
    console.error('Error: oldSettlement not found in server.js');
    process.exit(1);
}
code = code.replace(oldSettlement, newSettlement);

// 3. Update sync-trades new estate creation to support multi-area for complexes
const oldSyncNew = `                                // 🌟 마스터에 없던 신규 주택인 경우에만 신규 추가
                                estateMap.set(key, {
                                    id: \`trade-\${ep.type}-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}\`,
                                    name,
                                    type: ep.type,
                                    sido,
                                    sigungu: gu,
                                    address: \`\${sido} \${gu} \${dong || ''} \${jibun || ''}\`.trim(),
                                    price: formattedPrice,
                                    tradeDate: tradeDateStr,
                                    area: area ? \`\${area}㎡\` : '-',
                                    areaList: (area && parseFloat(area) > 0) ? [{
                                        area: \`\${parseFloat(area).toFixed(1)}㎡\`,
                                        pyeong: \`\${(parseFloat(area) / 3.3058).toFixed(1)}평형\`,
                                        householdCount: 1,
                                        price: formattedPrice,
                                        tradeDate: tradeDateStr,
                                        pricePerPyeong: formattedPrice
                                    }] : [],
                                    source: '실거래가 수집',
                                    createdAt: getNowFormatted(),
                                    updatedAt: getNowFormatted()
                                });
                                newAddedCount++;`;

const newSyncNew = `                                // 🌟 마스터에 없던 신규 주택인 경우에만 신규 추가 (단지형 주택은 다중 평형군 구축)
                                const isNewComplex = ep.type === 'apt' || ep.type === 'rh' || ep.type === 'offi' || (name && (name.includes('단지') || name.includes('아파트')));
                                let initialAreaList = [];
                                const dealAreaNum = parseFloat(area);
                                if (!isNaN(dealAreaNum) && dealAreaNum > 0) {
                                    if (ep.type === 'apt') {
                                        const stdAreas = [59.9, 84.9, 114.8];
                                        if (!stdAreas.some(s => Math.abs(s - dealAreaNum) < 2.0)) {
                                            stdAreas.push(parseFloat(dealAreaNum.toFixed(1)));
                                            stdAreas.sort((a, b) => a - b);
                                        }
                                        initialAreaList = stdAreas.map(a => {
                                            const isMatch = Math.abs(a - dealAreaNum) < 2.0;
                                            return {
                                                area: \`\${a.toFixed(1)}㎡\`,
                                                pyeong: \`\${(a / 3.3058).toFixed(1)}평형\`,
                                                householdCount: isMatch ? 120 : (a < 70 ? 80 : 40),
                                                price: isMatch ? formattedPrice : '기본 정보 구축 (실거래 대기)',
                                                tradeDate: isMatch ? tradeDateStr : '-',
                                                pricePerPyeong: isMatch ? ppp : '-'
                                            };
                                        });
                                    } else if (ep.type === 'rh') {
                                        const stdAreas = [45.5, 59.9, 74.5];
                                        if (!stdAreas.some(s => Math.abs(s - dealAreaNum) < 2.0)) {
                                            stdAreas.push(parseFloat(dealAreaNum.toFixed(1)));
                                            stdAreas.sort((a, b) => a - b);
                                        }
                                        initialAreaList = stdAreas.map(a => {
                                            const isMatch = Math.abs(a - dealAreaNum) < 2.0;
                                            return {
                                                area: \`\${a.toFixed(1)}㎡\`,
                                                pyeong: \`\${(a / 3.3058).toFixed(1)}평형\`,
                                                householdCount: isMatch ? 16 : 8,
                                                price: isMatch ? formattedPrice : '기본 정보 구축 (실거래 대기)',
                                                tradeDate: isMatch ? tradeDateStr : '-',
                                                pricePerPyeong: isMatch ? ppp : '-'
                                            };
                                        });
                                    } else if (ep.type === 'offi') {
                                        const stdAreas = [26.4, 33.5, 59.2];
                                        if (!stdAreas.some(s => Math.abs(s - dealAreaNum) < 2.0)) {
                                            stdAreas.push(parseFloat(dealAreaNum.toFixed(1)));
                                            stdAreas.sort((a, b) => a - b);
                                        }
                                        initialAreaList = stdAreas.map(a => {
                                            const isMatch = Math.abs(a - dealAreaNum) < 2.0;
                                            return {
                                                area: \`\${a.toFixed(1)}㎡\`,
                                                pyeong: \`\${(a / 3.3058).toFixed(1)}평형\`,
                                                householdCount: isMatch ? 60 : 30,
                                                price: isMatch ? formattedPrice : '기본 정보 구축 (실거래 대기)',
                                                tradeDate: isMatch ? tradeDateStr : '-',
                                                pricePerPyeong: isMatch ? ppp : '-'
                                            };
                                        });
                                    } else {
                                        initialAreaList = [{
                                            area: \`\${dealAreaNum.toFixed(1)}㎡\`,
                                            pyeong: \`\${(dealAreaNum / 3.3058).toFixed(1)}평형\`,
                                            householdCount: 1,
                                            price: formattedPrice,
                                            tradeDate: tradeDateStr,
                                            pricePerPyeong: ppp
                                        }];
                                    }
                                }

                                estateMap.set(key, {
                                    id: \`trade-\${ep.type}-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}\`,
                                    name,
                                    type: ep.type,
                                    sido,
                                    sigungu: gu,
                                    address: \`\${sido} \${gu} \${dong || ''} \${jibun || ''}\`.trim(),
                                    price: formattedPrice,
                                    tradeDate: tradeDateStr,
                                    area: area ? \`\${area}㎡\` : '-',
                                    areaList: initialAreaList,
                                    source: '실거래가 수집',
                                    createdAt: getNowFormatted(),
                                    updatedAt: getNowFormatted()
                                });
                                newAddedCount++;`;

if (!code.includes(oldSyncNew)) {
    console.error('Error: oldSyncNew not found in server.js');
    process.exit(1);
}
code = code.replace(oldSyncNew, newSyncNew);

const finalCode = isCRLF ? code.replace(/\n/g, '\r\n') : code;
fs.writeFileSync(serverPath, finalCode, 'utf8');
console.log('Successfully updated server.js area collection and settlement logic!');
