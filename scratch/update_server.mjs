import fs from 'fs';

let content = fs.readFileSync('server.js', 'utf8');

// 1. KNOWN_DISTRICT_DONGS에 인천 동구, 중구 추가
const target1 = `    '화성시': ['우정읍', '향남읍', '남양읍', '마도면', '송산면', '서신면', '팔탄면', '장안면', '양감면', '새솔동', '행정리', '상신리', '하길리', '남양리', '북양리', '조암리', '봉담읍', '매송면', '비봉면', '정남면', '기안동', '배양동', '동화리', '와우리', '수영리', '상리', '내리', '수기리', '진안동', '병점동', '반월동', '기산동', '안녕동', '송산동', '황계동', '반정동', '반송동', '석우동', '청계동', '영천동', '중동', '오산동', '신동', '목동', '산척동', '장지동', '송동', '방교동', '금곡동', '능동', '여울동']\r\n};`;
const target1_LF = `    '화성시': ['우정읍', '향남읍', '남양읍', '마도면', '송산면', '서신면', '팔탄면', '장안면', '양감면', '새솔동', '행정리', '상신리', '하길리', '남양리', '북양리', '조암리', '봉담읍', '매송면', '비봉면', '정남면', '기안동', '배양동', '동화리', '와우리', '수영리', '상리', '내리', '수기리', '진안동', '병점동', '반월동', '기산동', '안녕동', '송산동', '황계동', '반정동', '반송동', '석우동', '청계동', '영천동', '중동', '오산동', '신동', '목동', '산척동', '장지동', '송동', '방교동', '금곡동', '능동', '여울동']\n};`;

const addition1 = `,\r\n    '인천광역시_동구': ['만석동', '화수동', '송현동', '화평동', '창영동', '금곡동', '송림동'],\r\n    '인천광역시_중구': ['신포동', '신흥동1가', '신흥동2가', '신흥동3가', '선린동', '북성동1가', '북성동2가', '북성동3가', '항동1가', '항동2가', '항동3가', '항동4가', '항동5가', '항동6가', '항동7가', '중산동', '운서동', '운남동', '운북동', '을왕동', '남북동', '덕교동', '무의동', '유동', '율목동', '도원동', '내동', '경동', '용동', '인현동', '전동', '송월동1가', '송월동2가', '송월동3가', '신생동', '해안동1가', '해안동2가', '해안동3가', '해안동4가', '관동1가', '관동2가', '관동3가', '송학동1가', '송학동2가', '송학동3가', '사동', '답동'],\r\n    '동구': ['만석동', '화수동', '송현동', '화평동', '창영동', '금곡동', '송림동'],\r\n    '중구': ['신포동', '신흥동1가', '신흥동2가', '신흥동3가', '선린동', '북성동1가', '북성동2가', '북성동3가', '항동1가', '항동2가', '항동3가', '항동4가', '항동5가', '항동6가', '항동7가', '중산동', '운서동', '운남동', '운북동', '을왕동', '남북동', '덕교동', '무의동', '유동', '율목동', '도원동', '내동', '경동', '용동', '인현동', '전동', '송월동1가', '송월동2가', '송월동3가', '신생동', '해안동1가', '해안동2가', '해안동3가', '해안동4가', '관동1가', '관동2가', '관동3가', '송학동1가', '송학동2가', '송학동3가', '사동', '답동']\r\n};`;

if (content.includes(target1)) {
    content = content.replace(target1, target1.replace('\r\n};', addition1));
    console.log('Target 1 replaced (CRLF).');
} else if (content.includes(target1_LF)) {
    content = content.replace(target1_LF, target1_LF.replace('\n};', addition1.replace(/\r\n/g, '\n')));
    console.log('Target 1 replaced (LF).');
} else {
    console.error('Target 1 NOT found!');
}

// 2. collect-master: KNOWN_DISTRICT_DONGS 조회
const target2 = "if (KNOWN_DISTRICT_DONGS[gu]) {\n                    KNOWN_DISTRICT_DONGS[gu].forEach(d => dongsInGu.add(d));\n                }";
const target2_CRLF = "if (KNOWN_DISTRICT_DONGS[gu]) {\r\n                    KNOWN_DISTRICT_DONGS[gu].forEach(d => dongsInGu.add(d));\r\n                }";

const replace2 = "const knownList = KNOWN_DISTRICT_DONGS[`${sido}_${gu}`] || KNOWN_DISTRICT_DONGS[gu];\n                if (knownList) {\n                    knownList.forEach(d => dongsInGu.add(d));\n                }";

if (content.includes(target2)) {
    content = content.replace(target2, replace2);
    console.log('Target 2 replaced (LF).');
} else if (content.includes(target2_CRLF)) {
    content = content.replace(target2_CRLF, replace2.replace(/\n/g, '\r\n'));
    console.log('Target 2 replaced (CRLF).');
} else {
    console.error('Target 2 NOT found!');
}

// 3. collect-master: 카카오 검색 제물포구 허용
const target3 = "if (doc.address_name && !doc.address_name.includes(gu)) return;";
const replace3 = `const isMatchingAddr = doc.address_name && (
                                        doc.address_name.includes(gu) ||
                                        ((gu === '동구' || gu === '중구') && sido.includes('인천') && doc.address_name.includes('제물포구'))
                                    );
                                    if (!isMatchingAddr) return;`;

if (content.includes(target3)) {
    content = content.replace(target3, replace3);
    console.log('Target 3 replaced.');
} else {
    console.error('Target 3 NOT found!');
}

// 4. collect-master: 건축HUB 표제부 API 호출 sigunguCd
const target4 = "const fetchUrl = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=${lawdCd}&bjdongCd=${bjdongCd}&numOfRows=100&pageNo=${pageNo}`;";
const replace4 = `const hubSigunguCd = (sido.includes('인천') && (gu === '동구' || gu === '중구' || lawdCd === '28140' || lawdCd === '28110'))
                                    ? '28125'
                                    : (bCode && bCode.startsWith(lawdCd) ? lawdCd : (bCode ? bCode.substring(0, 5) : lawdCd));
                                const fetchUrl = \`\${ep.url}?serviceKey=\${encodeURIComponent(serviceKey)}&sigunguCd=\${hubSigunguCd}&bjdongCd=\${bjdongCd}&numOfRows=100&pageNo=\${pageNo}\`;`;

if (content.includes(target4)) {
    content = content.replace(target4, replace4);
    console.log('Target 4 replaced.');
} else {
    console.error('Target 4 NOT found!');
}

// 5. collect-master: pnu 생성
const target5 = "const pnu = (lawdCd && bjdongCd && bun) ? buildPNU(lawdCd, bjdongCd, `${parseInt(bun, 10) || 0}-${parseInt(ji, 10) || 0}`, platGbCd === '1' ? '2' : '1') : '';";
const replace5 = `const pnuSigunguCd = (sido.includes('인천') && (gu === '동구' || gu === '중구')) ? hubSigunguCd : lawdCd;
                                const pnu = (pnuSigunguCd && bjdongCd && bun) ? buildPNU(pnuSigunguCd, bjdongCd, \`\${parseInt(bun, 10) || 0}-\${parseInt(ji, 10) || 0}\`, platGbCd === '1' ? '2' : '1') : '';`;

if (content.includes(target5)) {
    content = content.replace(target5, replace5);
    console.log('Target 5 replaced.');
} else {
    console.error('Target 5 NOT found!');
}

// 6. sync-trades: callLawdCd
const target6 = "const fetchUrl = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=${lawdCd}&DEAL_YMD=${ymd}`;";
const replace6 = `const callLawdCd = (sido.includes('인천') && (gu === '동구' || gu === '중구' || lawdCd === '28140' || lawdCd === '28110')) ? '28125' : lawdCd;
                        const fetchUrl = \`\${ep.url}?serviceKey=\${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=\${callLawdCd}&DEAL_YMD=\${ymd}\`;`;

if (content.includes(target6)) {
    content = content.replace(target6, replace6);
    console.log('Target 6 replaced.');
} else {
    console.error('Target 6 NOT found!');
}

// 7. sync-trades: 관할 법정동 필터링
const target7 = "const dong = getTag('umdNm') || getTag('법정동');\n                            const jibun = getTag('jibun') || getTag('지번');";
const target7_CRLF = "const dong = getTag('umdNm') || getTag('법정동');\r\n                            const jibun = getTag('jibun') || getTag('지번');";

const replace7 = `const dong = getTag('umdNm') || getTag('법정동');
                            // 🌟 인천 동구/중구(통합 제물포구 28125) 거래 시 관할 구역 필터링
                            if (sido.includes('인천')) {
                                const INCHEON_DONG_DONGS = new Set(['만석동', '화수동', '송현동', '화평동', '창영동', '금곡동', '송림동']);
                                const baseDong = (dong || '').replace(/\\d+가$/, '동');
                                if (gu === '동구' && dong && !INCHEON_DONG_DONGS.has(dong) && !INCHEON_DONG_DONGS.has(baseDong)) {
                                    continue;
                                }
                                if (gu === '중구' && dong && (INCHEON_DONG_DONGS.has(dong) || INCHEON_DONG_DONGS.has(baseDong))) {
                                    continue;
                                }
                            }
                            const jibun = getTag('jibun') || getTag('지번');`;

if (content.includes(target7)) {
    content = content.replace(target7, replace7);
    console.log('Target 7 replaced (LF).');
} else if (content.includes(target7_CRLF)) {
    content = content.replace(target7_CRLF, replace7.replace(/\n/g, '\r\n'));
    console.log('Target 7 replaced (CRLF).');
} else {
    console.error('Target 7 NOT found!');
}

// 8. sync-trades: PNU 매칭 보강
const target8 = `                            // 1순위: PNU 매칭
                            if (tradePnu && pnuMap.has(tradePnu)) {
                                existing = pnuMap.get(tradePnu);
                            }`;
const target8_CRLF = `                            // 1순위: PNU 매칭\r
                            if (tradePnu && pnuMap.has(tradePnu)) {\r
                                existing = pnuMap.get(tradePnu);\r
                            }`;

const replace8 = `                            // 1순위: PNU 매칭 (인천 제물포구 28125 및 기존 28140/28110 상호 호환)
                            if (tradePnu && pnuMap.has(tradePnu)) {
                                existing = pnuMap.get(tradePnu);
                            } else if (tradePnu && tradePnu.startsWith('28125')) {
                                const altPnu1 = '28140' + tradePnu.substring(5);
                                const altPnu2 = '28110' + tradePnu.substring(5);
                                if (pnuMap.has(altPnu1)) existing = pnuMap.get(altPnu1);
                                else if (pnuMap.has(altPnu2)) existing = pnuMap.get(altPnu2);
                            }`;

if (content.includes(target8)) {
    content = content.replace(target8, replace8);
    console.log('Target 8 replaced (LF).');
} else if (content.includes(target8_CRLF)) {
    content = content.replace(target8_CRLF, replace8.replace(/\n/g, '\r\n'));
    console.log('Target 8 replaced (CRLF).');
} else {
    console.error('Target 8 NOT found!');
}

// 9. sync-trades: newEstate에 lawdCd 보충
const target9 = `                                    pnu: tradePnu || '',\n                                    buildYear: tradeBuildYear ? String(tradeBuildYear).trim() : '',`;
const target9_CRLF = `                                    pnu: tradePnu || '',\r\n                                    buildYear: tradeBuildYear ? String(tradeBuildYear).trim() : '',`;

const replace9 = `                                    pnu: tradePnu || '',\n                                    lawdCd: lawdCd || (tradePnu ? tradePnu.substring(0, 5) : ''),\n                                    buildYear: tradeBuildYear ? String(tradeBuildYear).trim() : '',`;

if (content.includes(target9)) {
    content = content.replace(target9, replace9);
    console.log('Target 9 replaced (LF).');
} else if (content.includes(target9_CRLF)) {
    content = content.replace(target9_CRLF, replace9.replace(/\n/g, '\r\n'));
    console.log('Target 9 replaced (CRLF).');
} else {
    console.error('Target 9 NOT found!');
}

fs.writeFileSync('server.js', content, 'utf8');
console.log('ALL UPDATES COMPLETE!');
