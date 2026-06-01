/**
 * School Comparison Sub-Agent
 * 
 * 여러 개의 학교 데이터와 자녀 성적을 매칭하여 
 * 나란히 비교할 수 있는 비교 매트릭스 정보를 생성합니다.
 */

export class CompareAgent {
    /**
     * 최대 3개 학교 비교 테이블 및 자녀 점수 적합도 계산
     */
    generateComparisonMatrix(schools, childScores) {
        const matrix = schools.map(school => {
            // 자녀 성적 대비 매칭도 계산 (적합도 상/중/하)
            let suitability = '중';
            if (childScores && childScores.math && childScores.english && childScores.korean) {
                const totalAvg = (school.subjects.korean.avg + school.subjects.english.avg + school.subjects.math.avg) / 3;
                const childAvg = (childScores.korean + childScores.english + childScores.math) / 3;
                
                const difference = childAvg - totalAvg;
                if (difference > 10) {
                    suitability = '상'; // 자녀 평균이 학교 전체 평균보다 10점 이상 높을 경우 상
                } else if (difference < -5) {
                    suitability = '하'; // 자녀 평균이 학교 전체 평균보다 5점 이상 낮을 경우 하
                }
            }

            // 강점 과목 판단
            const subjects = ['korean', 'english', 'math'];
            const strongSubject = subjects.reduce((prev, curr) => {
                return (school.subjects[prev].avg > school.subjects[curr].avg) ? prev : curr;
            });

            const subjectLabels = {
                korean: '국어',
                english: '영어',
                math: '수학'
            };

            return {
                school_id: school.school_id,
                school_name: school.school_name,
                student_count: `${school.student_count}명`,
                class_avg_size: `${school.class_avg_size}명`,
                korean_avg: school.subjects.korean.avg,
                english_avg: school.subjects.english.avg,
                math_avg: school.subjects.math.avg,
                strong_subject: subjectLabels[strongSubject],
                updated_at: school.updated_at,
                extracurricular_budget: school.extracurricular_budget || 120,
                suitability: suitability, // 상 / 중 / 하 적합도
                weightedAvg: school.weightedAvg,
                envScore: school.envScore,
                envScoresDetails: school.envScoresDetails,
                violence_stats: school.violence_stats,
                trendData: school.trendData
            };
        });

        return matrix;
    }
}
