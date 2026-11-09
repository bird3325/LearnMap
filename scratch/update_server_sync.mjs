import fs from 'fs';

let content = fs.readFileSync('server.js', 'utf8');

const target = "const fetchUrl = `${ep.url}?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=${lawdCd}&DEAL_YMD=${ymd}`;";
const replace = `const callLawdCd = (sido.includes('인천') && (gu === '동구' || gu === '중구' || lawdCd === '28140' || lawdCd === '28110')) ? '28125' : lawdCd;
                        const fetchUrl = \`\${ep.url}?serviceKey=\${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=1000&LAWD_CD=\${callLawdCd}&DEAL_YMD=\${ymd}\`;`;

if (content.includes(target)) {
    content = content.replace(target, replace);
    fs.writeFileSync('server.js', content, 'utf8');
    console.log('Successfully updated sync-trades fetchUrl in server.js');
} else {
    console.error('Target not found in server.js');
}
