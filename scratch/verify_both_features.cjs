const fs = require('fs');

// 1. app.js 검증
const appJs = fs.readFileSync('app.js', 'utf8');
const hasOldAlert = appJs.includes('지도에 안심 통학 경로선이 연결되었습니다');
console.log('1. app.js contains old alert popup?:', hasOldAlert);

const hasSelectCommute = appJs.includes('window.selectCommuteStartFromComplex = function');
console.log('2. app.js has selectCommuteStartFromComplex?:', hasSelectCommute);

const callsEnvironmentTab = appJs.includes("switchSchoolCardTab('Environment')");
console.log('3. selectCommuteStartFromComplex switches to Environment tab?:', callsEnvironmentTab);

// 2. business.html 검증
const bizHtml = fs.readFileSync('business.html', 'utf8');
console.log('4. business.html has PARTNER CONSOLE?:', bizHtml.includes('PARTNER CONSOLE'));
console.log('5. business.html has sidebar-console?:', bizHtml.includes('class="sidebar-console"'));
console.log('6. business.html has openAcademyOnParentMap?:', bizHtml.includes('openAcademyOnParentMap'));
console.log('7. business.html has printMarketReport?:', bizHtml.includes('printMarketReport'));
console.log('8. business.html has openAiTargetStrategyModal?:', bizHtml.includes('openAiTargetStrategyModal'));
console.log('9. business.html has marketPrintReportArea?:', bizHtml.includes('id="marketPrintReportArea"'));
