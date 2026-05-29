/**
 * Action & Feedback Generator Skill
 * 
 * 자녀의 상위 백분위 정보와 학교 성적 평균을 바탕으로 
 * 맞춤형 피드백 라벨 및 구체적인 교육 지침/액션을 제안합니다.
 */

export function generateActionText(percentile, schoolAvg) {
    let label = '중위권';
    let action = '평균 수준이며, 일부 취약한 부분의 집중 보완이 권장됩니다.';
    let status = 'yellow'; // green (유지), yellow (관리), red (보완)

    if (percentile <= 35) {
        label = '상위권';
        status = 'green';
        if (schoolAvg >= 80) {
            action = '현재 수준을 유지하며, 심화 학습 및 킬러 문항 대비에 집중하는 것이 유리합니다.';
        } else {
            action = '우수한 수준입니다. 더 높은 학군지의 심화 학습을 고려해볼 수 있습니다.';
        }
    } else if (percentile <= 80) {
        label = '중위권';
        status = 'yellow';
        if (schoolAvg >= 80) {
            action = '경쟁이 치열한 학교입니다. 꾸준한 관리를 통하여 상위권 진입을 노리세요.';
        } else {
            action = '평균 수준입니다. 특정 취약 과목의 개념 보완을 추천합니다.';
        }
    } else {
        label = '하위권';
        status = 'red';
        action = '집중적인 기초 보완이 필요합니다. 교과서 핵심 개념과 오답 정리를 선행하세요.';
    }

    return {
        label: label,
        action: action,
        status: status
    };
}
