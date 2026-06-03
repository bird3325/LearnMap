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
        // 자녀 성적 데이터가 유효하지 않으면 DOM에서 직접 읽어오는 Fallback 적용
        let scores = childScores;
        if (!scores || scores.korean === null || scores.english === null || scores.math === null) {
            const elKor = document.getElementById('childKor');
            const elEng = document.getElementById('childEng');
            const elMath = document.getElementById('childMath');
            if (elKor && elEng && elMath) {
                scores = {
                    korean: parseInt(elKor.value) || 0,
                    english: parseInt(elEng.value) || 0,
                    math: parseInt(elMath.value) || 0
                };
            }
        }

        const matrix = schools.map(school => {
            // 자녀 성적 대비 매칭도 계산 (적합도 상/중/하)
            let suitability = '중';
            let diffVal = 0;
            let suitabilityDesc = '자녀 성적 정보가 올바르게 입력되지 않았습니다.';
            
            if (scores && scores.math !== null && scores.english !== null && scores.korean !== null) {
                const totalAvg = (school.subjects.korean.avg + school.subjects.english.avg + school.subjects.math.avg) / 3;
                const childAvg = (scores.korean + scores.english + scores.math) / 3;
                
                diffVal = childAvg - totalAvg;
                const roundedDiff = Math.abs(Math.round(diffVal * 10) / 10);
                const roundedChild = Math.round(childAvg * 10) / 10;
                const roundedSchool = Math.round(totalAvg * 10) / 10;
                
                if (diffVal > 5) {
                    suitability = '상';
                    suitabilityDesc = `우리 아이 평균(${roundedChild}점)이 학교 평균(${roundedSchool}점)보다 ${roundedDiff}점 높아 학업 소화가 수월한 '상' 수준입니다.`;
                } else if (diffVal < -5) {
                    suitability = '하';
                    suitabilityDesc = `우리 아이 평균(${roundedChild}점)이 학교 평균(${roundedSchool}점)보다 ${roundedDiff}점 낮아 보강 학습이 권장되는 '하' 수준입니다.`;
                } else {
                    suitability = '중';
                    const diffText = diffVal >= 0 ? `${roundedDiff}점 높음` : `${roundedDiff}점 낮음`;
                    suitabilityDesc = `우리 아이 평균(${roundedChild}점)이 학교 평균(${roundedSchool}점)과 편차 ${diffText} 수준으로 적절히 부합하는 '중' 수준입니다.`;
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
                suitabilityDesc: suitabilityDesc, // 상세 설명
                suitabilityDiff: diffVal, // 격차 점수
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
