/**
 * Map Pin Visualizer Skill
 * 
 * 학교 학업성취 공시 데이터에 기반하여 지도 상에 시각화할 핀 색상을 결정합니다.
 * 
 * - 파란색: 국어/영어/수학 평균이 모두 전체 데이터베이스(혹은 지역 평균) 이상
 * - 초록색: 2개 과목이 평균 이상
 * - 노란색: 1개 과목이 평균 이상 또는 최신 공시 데이터(3개월 이내)
 * - 회색: 6개월 이상 경과했거나 데이터가 부족함
 */

export function getPinColor(school) {
    const defaultBenchmark = 78.0; // 기준이 되는 평균 점수 가이드라인
    let aboveCount = 0;

    if (school.subjects.korean.avg >= defaultBenchmark) aboveCount++;
    if (school.subjects.english.avg >= defaultBenchmark) aboveCount++;
    if (school.subjects.math.avg >= defaultBenchmark) aboveCount++;

    // 공시 경과 월 계산
    const updateDate = new Date(school.updated_at);
    const currentDate = new Date('2026-05-27'); // 현재 로컬타임 기준 설정
    const monthDiff = (currentDate.getFullYear() - updateDate.getFullYear()) * 12 + (currentDate.getMonth() - updateDate.getMonth());

    if (monthDiff >= 6) {
        return 'gray'; // 회색: 6개월 이상 데이터 경과
    }

    if (aboveCount === 3) {
        return 'blue'; // 파란색: 모두 우수
    } else if (aboveCount === 2) {
        return 'green'; // 초록색: 2개 과목 우수
    } else if (aboveCount === 1 || monthDiff <= 3) {
        return 'yellow'; // 노란색: 1개 과목 우수 또는 최신 데이터
    }

    return 'gray';
}
