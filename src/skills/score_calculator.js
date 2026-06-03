/**
 * Score Percentile Calculator Skill
 * 
 * 학교 성취도 공시 데이터(우수, 보통, 기초, 기초미달 분포 비율)에
 * 자녀의 실제 점수를 매핑하여 대략적인 상위 백분율(Percentile)을 추정합니다.
 * Z-score 및 표준 정규분포 CDF 모델을 모사하여 소수점 한자리까지 정교하게 계산합니다.
 */

// 표준 정규분포의 누적 분포 함수 (CDF) 근사
function getNormalCDF(z) {
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const erf = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z / 2.0);
    let cdf = 0.5 * (1.0 + (z >= 0 ? erf : -erf));
    return cdf;
}

export function calculatePercentile(score, avg, dist) {
    // dist: [우수_A_비율, 보통_B_비율, 기초_C_비율, 기초미달_D_비율] 예: [35, 45, 15, 5] (합 100)
    const [rateA, rateB, rateC, rateD] = dist;

    // 성취평가 비율 분포를 반영하여 가상 표준편차(sigma) 설정
    // A 비율과 D 비율이 고르게 퍼져 있을수록 편차가 크고, 한쪽에 몰려있으면 편차가 작다고 판단
    let sigma = 18;
    if (rateA > 40) {
        sigma = 15;
    } else if (rateD > 30) {
        sigma = 22;
    }

    const z = (score - avg) / sigma;
    const cdf = getNormalCDF(z);
    
    // cdf는 score 이하일 확률이므로, 상위 백분율은 (1 - cdf) * 100
    let percentile = (1.0 - cdf) * 100;
    
    // 등급 범위에 맞게 보정
    if (score >= 90) {
        const maxPercentile = rateA;
        percentile = Math.min(percentile, maxPercentile);
    } else if (score >= 80) {
        percentile = Math.min(percentile, rateA + rateB);
        percentile = Math.max(percentile, rateA);
    } else if (score >= 70) {
        percentile = Math.min(percentile, rateA + rateB + rateC);
        percentile = Math.max(percentile, rateA + rateB);
    } else {
        percentile = Math.max(percentile, rateA + rateB + rateC);
    }

    // 최소 상위 0.1%, 최대 상위 99.9%로 제한
    percentile = Math.max(0.1, Math.min(99.9, percentile));

    return parseFloat(percentile.toFixed(1));
}
