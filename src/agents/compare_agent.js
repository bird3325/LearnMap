/**
 * School Comparison Sub-Agent
 * 
 * 여러 개의 학교 데이터와 자녀 성적을 매칭하여 
 * 나란히 비교할 수 있는 비교 매트릭스 정보를 생성합니다.
 */

function getHousingAndAcademyStats(school) {
    const address = school.address || '';
    const parts = address.split(' ');
    const gu = parts[1] || '서울';
    
    // Base prices by district in 만원 (10,000 KRW)
    const districtPriceMap = {
        '강남구': { sale: 220000, jeonse: 130000, academies: 280, feeEng: 450000, feeMath: 480000 },
        '서초구': { sale: 210000, jeonse: 120000, academies: 240, feeEng: 440000, feeMath: 460000 },
        '송파구': { sale: 170000, jeonse: 95000, academies: 180, feeEng: 380000, feeMath: 400000 },
        '양천구': { sale: 150000, jeonse: 85000, academies: 220, feeEng: 360000, feeMath: 390000 },
        '마포구': { sale: 140000, jeonse: 80000, academies: 110, feeEng: 340000, feeMath: 360000 },
        '성동구': { sale: 145000, jeonse: 82000, academies: 90, feeEng: 330000, feeMath: 350000 },
        '용산구': { sale: 160000, jeonse: 90000, academies: 60, feeEng: 350000, feeMath: 370000 },
        '영등포구': { sale: 125000, jeonse: 72000, academies: 100, feeEng: 320000, feeMath: 340000 },
        '동작구': { sale: 120000, jeonse: 70000, academies: 95, feeEng: 310000, feeMath: 330000 },
        '광진구': { sale: 115000, jeonse: 68000, academies: 85, feeEng: 300000, feeMath: 320000 },
        '서대문구': { sale: 110000, jeonse: 65000, academies: 80, feeEng: 290000, feeMath: 310000 },
        '강동구': { sale: 115000, jeonse: 68000, academies: 90, feeEng: 310000, feeMath: 330000 },
        '성북구': { sale: 95000, jeonse: 58000, academies: 90, feeEng: 280000, feeMath: 300000 },
        '노원구': { sale: 85000, jeonse: 52000, academies: 170, feeEng: 270000, feeMath: 290000 },
        '동대문구': { sale: 95000, jeonse: 56000, academies: 75, feeEng: 280000, feeMath: 290000 },
        '은평구': { sale: 88000, jeonse: 53000, academies: 80, feeEng: 270000, feeMath: 280000 },
        '강서구': { sale: 95000, jeonse: 57000, academies: 120, feeEng: 290000, feeMath: 310000 },
        '중구': { sale: 120000, jeonse: 72000, academies: 45, feeEng: 320000, feeMath: 340000 },
        '관악구': { sale: 85000, jeonse: 52000, academies: 70, feeEng: 270000, feeMath: 280000 },
        '구로구': { sale: 82000, jeonse: 50000, academies: 75, feeEng: 260000, feeMath: 280000 },
        '중랑구': { sale: 75000, jeonse: 46000, academies: 65, feeEng: 250000, feeMath: 270000 },
        '강북구': { sale: 72000, jeonse: 44000, academies: 50, feeEng: 240000, feeMath: 260000 },
        '도봉구': { sale: 70000, jeonse: 43000, academies: 60, feeEng: 240000, feeMath: 250000 },
        '금천구': { sale: 72000, jeonse: 44000, academies: 55, feeEng: 240000, feeMath: 250000 }
    };
    
    const base = districtPriceMap[gu] || { sale: 85000, jeonse: 52000, academies: 70, feeEng: 270000, feeMath: 290000 };
    
    // Add minor deterministic variation based on school id
    const seed = school.school_id ? parseInt(school.school_id.substring(4)) || 5 : 5;
    const variationPercent = (seed % 15) - 7; // -7% to +7%
    
    const sale = Math.round(base.sale * (1 + variationPercent / 100));
    const jeonse = Math.round(base.jeonse * (1 + variationPercent / 100));
    const academies = Math.round(base.academies * (1 + (seed % 11 - 5) / 100));
    const feeEng = Math.round(base.feeEng * (1 + (seed % 9 - 4) / 100));
    const feeMath = Math.round(base.feeMath * (1 + (seed % 9 - 4) / 100));
    
    return { sale, jeonse, academies, feeEng, feeMath };
}

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
                    suitabilityDesc = `우리 아이 평균(${roundedChild}점)이 school 평균(${roundedSchool}점)보다 ${roundedDiff}점 높아 학업 소화가 수월한 '상' 수준입니다.`;
                } else if (diffVal < -5) {
                    suitability = '하';
                    suitabilityDesc = `우리 아이 평균(${roundedChild}점)이 school 평균(${roundedSchool}점)보다 ${roundedDiff}점 낮아 보강 학습이 권장되는 '하' 수준입니다.`;
                } else {
                    suitability = '중';
                    const diffText = diffVal >= 0 ? `${roundedDiff}점 높음` : `${roundedDiff}점 낮음`;
                    suitabilityDesc = `우리 아이 평균(${roundedChild}점)이 school 평균(${roundedSchool}점)과 편차 ${diffText} 수준으로 적절히 부합하는 '중' 수준입니다.`;
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

            const housingAca = getHousingAndAcademyStats(school);
            
            const ukSale = Math.floor(housingAca.sale / 10000);
            const manSale = housingAca.sale % 10000;
            const saleText = `${ukSale > 0 ? ukSale + '억 ' : ''}${manSale > 0 ? manSale.toLocaleString() + '만원' : ''}`;

            const ukJeonse = Math.floor(housingAca.jeonse / 10000);
            const manJeonse = housingAca.jeonse % 10000;
            const jeonseText = `${ukJeonse > 0 ? ukJeonse + '억 ' : ''}${manJeonse > 0 ? manJeonse.toLocaleString() + '만원' : ''}`;

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
                trendData: school.trendData,
                housing_sale: saleText,
                housing_jeonse: jeonseText,
                academy_count_est: housingAca.academies,
                fee_eng: `${housingAca.feeEng.toLocaleString()}원`,
                fee_math: `${housingAca.feeMath.toLocaleString()}원`
            };
        });

        return matrix;
    }
}
