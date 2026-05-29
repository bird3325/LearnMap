/**
 * Score Percentile Calculator Skill
 * 
 * 학교 성취도 공시 데이터(우수, 보통, 기초, 기초미달 분포 비율)에
 * 자녀의 실제 점수를 매핑하여 대략적인 상위 백분율(Percentile)을 추정합니다.
 */

export function calculatePercentile(score, avg, dist) {
    // dist: [우수_A_비율, 보통_B_비율, 기초_C_비율, 기초미달_D_비율] 예: [35, 45, 15, 5] (합 100)
    const [rateA, rateB, rateC, rateD] = dist;

    // 성취평가제 기준 점수 매핑(A: 90점 이상, B: 80-90점, C: 70-80점, D: 70점 미만)
    // 혹은 평균 점수 대비 상대 점수로 백분위를 간접 예측합니다.
    if (score >= 90) {
        // 우수 구간 (A등급 비율)
        // 90점에서 100점 사이 비례 보간
        const ratio = (100 - score) / 10; // 90점이면 1.0, 100점이면 0.0
        return Math.round(ratio * rateA); 
    } else if (score >= 80) {
        // 보통 구간 (B등급 비율)
        const ratio = (90 - score) / 10;
        return Math.round(rateA + (ratio * rateB));
    } else if (score >= 70) {
        // 기초 구간 (C등급 비율)
        const ratio = (80 - score) / 10;
        return Math.round(rateA + rateB + (ratio * rateC));
    } else {
        // 기초미달 구간 (D등급 비율)
        const ratio = Math.max(0, (70 - score) / 30);
        return Math.round(rateA + rateB + rateC + (ratio * rateD));
    }
}
