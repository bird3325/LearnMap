const NEIS_KEY = 'fb397febaaca465b9f02736cc6f37188';

async function testNeis() {
    try {
        // 1. 학교 정보 검색 (서운중학교)
        const schoolRes = await fetch(`https://open.neis.go.kr/hub/schoolInfo?KEY=${NEIS_KEY}&Type=json&pIndex=1&pSize=5&SCHUL_NM=${encodeURIComponent('서운중학교')}`);
        const schoolData = await schoolRes.json();
        console.log('--- School Info ---');
        console.log(JSON.stringify(schoolData, null, 2).slice(0, 500));

        const row = schoolData?.schoolInfo?.[1]?.row?.[0];
        if (!row) {
            console.log('No school found');
            return;
        }

        const atptCode = row.ATPT_OFCDC_SC_CODE;
        const schoolCode = row.SD_SCHUL_CODE;
        console.log(`ATPT: ${atptCode}, School: ${schoolCode}, Name: ${row.SCHUL_NM}`);

        // 2. 급식 정보 (최근 일자 또는 오늘)
        const today = new Date();
        const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
        // 최근 10일 전부터 10일 후까지
        const fromDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
        const toDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10).replace(/-/g, '');

        const mealRes = await fetch(`https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${NEIS_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${atptCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_FROM_YMD=${fromDate}&MLSV_TO_YMD=${toDate}`);
        const mealData = await mealRes.json();
        console.log('--- Meal Info ---');
        console.log(JSON.stringify(mealData?.mealServiceDietInfo?.[1]?.row?.[0] || mealData, null, 2).slice(0, 500));

        // 3. 학사 일정
        const scheduleRes = await fetch(`https://open.neis.go.kr/hub/SchoolSchedule?KEY=${NEIS_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${atptCode}&SD_SCHUL_CODE=${schoolCode}&AA_FROM_YMD=${fromDate}&AA_TO_YMD=${toDate}`);
        const scheduleData = await scheduleRes.json();
        console.log('--- Schedule Info ---');
        console.log(JSON.stringify(scheduleData?.SchoolSchedule?.[1]?.row?.slice(0, 3) || scheduleData, null, 2));

    } catch (e) {
        console.error('Error:', e);
    }
}

testNeis();
