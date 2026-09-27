import { NEISService } from '../src/services/neis_service.js';

async function testService() {
    console.log('--- Testing NEISService ---');
    const service = new NEISService();

    // 1. 학교 검색
    console.log('1. 학교 검색 (서운중학교)...');
    const schoolInfo = await service.searchSchoolCode('서운중학교');
    console.log('학교 정보 결과:', schoolInfo);

    // 2. 급식 조회
    console.log('2. 급식 조회 및 알레르기 필터링...');
    const meals = await service.fetchRealMeals('서운중학교', ['우유', '대두']);
    console.log('급식 조회 결과:', meals ? {
        schoolName: meals.schoolName,
        date: meals.mealDate,
        menuCount: meals.checkedMenu?.length,
        dishes: meals.checkedMenu?.map(d => `${d.name} (${d.hasAllergyRisk ? '위험' : '안전'})`)
    } : 'None');

    // 3. 학사 일정 조회
    console.log('3. 학사 일정 조회...');
    const schedule = await service.fetchRealSchedule('서운중학교');
    console.log('학사 일정 결과 (최대 3건):', schedule?.schedule?.slice(0, 3));

    // 4. 생기부 파싱 테스트
    console.log('4. 생기부 파싱 테스트...');
    const sample = `
    성명 : 홍길동 | 학교 : 서운중학교 | 2학년
    국어 95 A
    수학 90 A
    영어 85 B
    수업일수 190일, 결석 0일, 지각 0일
    체력등급 1등급, 체질량 표준
    [세부능력 및 특기사항]
    수학적 모델링과 알고리즘적 사고를 바탕으로 데이터 분석 프로젝트를 주도함. 논리적인 탐구력과 문제해결력이 매우 우수함.
    `;
    const parseRes = service.parseRecordDocument(sample);
    console.log('생기부 파싱 결과:', {
        name: parseRes.extracted.studentName,
        grades: parseRes.extracted.grades,
        scores: parseRes.extracted.schoolRecord?.competencyScores,
        keywords: parseRes.extracted.schoolRecord?.keywords
    });
}

testService().catch(console.error);
