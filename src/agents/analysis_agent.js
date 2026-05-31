/**
 * Performance Analysis & Diagnosis Sub-Agent
 * 
 * 특정 학교 성취도 분석 요약 정보 제공 및
 * 자녀의 상대 위치 계산, 맞춤형 가이드라인 생성을 조율합니다.
 */

import { calculatePercentile } from '../skills/score_calculator.js';
import { generateActionText } from '../skills/action_generator.js';

export class AnalysisAgent {
    
    /**
     * 학교 경쟁 수준 계산
     */
    calculateCompetitionLevel(school) {
        const distKor = school.subjects.korean.dist;
        const distEng = school.subjects.english.dist;
        const distMath = school.subjects.math.dist;
        
        // A 비율 평균과 D 비율 평균 추출
        const avgA = (distKor[0] + distEng[0] + distMath[0]) / 3;
        const avgD = (distKor[3] + distEng[3] + distMath[3]) / 3;
        
        if (avgA >= 35 && avgD <= 10) {
            return { label: '최상 (경쟁 극심)', desc: '[판정기준: 평균 A등급 35%↑ & D등급 10%↓] 최상위권 우수생들이 초밀집된 대표 명문 학군입니다. 지필평가 서술형의 아주 미세한 감점 하나로도 전교 석차가 요동칩니다.' };
        } else if (avgA >= 27 && avgD <= 15) {
            return { label: '상 (경쟁 치열)', desc: '[판정기준: 평균 A등급 27%↑ & D등급 15%↓] 전반적인 학업 열기가 매우 뜨거우며, 상위권 내신 선점을 위한 심화 학습과 시험 시간 안배 연습이 필수적인 학교입니다.' };
        } else if (avgA >= 20 && avgD <= 22) {
            return { label: '중상 (학업열기 양호)', desc: '[판정기준: 평균 A등급 20%↑ & D등급 22%↓] 평이하지만 학구열이 준수한 중상위 수준의 분위기입니다. 상위권 도약을 위해 취약 과목 선행 및 오답 정리가 중요합니다.' };
        } else if (avgA >= 12 && avgD <= 30) {
            return { label: '중 (평이한 수준)', desc: '[판정기준: 평균 A등급 12%↑ & D등급 30%↓] 성취 비율이 고르게 분포된 전형적인 평범한 환경입니다. 학생이 쏟은 노력과 비례하여 직관적인 성과 및 등수를 얻을 수 있습니다.' };
        } else if (avgA >= 8 && avgD <= 40) {
            return { label: '중하 (기초 보강 권장)', desc: '[판정기준: 평균 A등급 8%↑ & D등급 40%↓] 기초 학습 조력 대상 비율이 점차 늘어나는 양상입니다. 흔들리기 쉬운 학교 분위기에 동요되지 않고 개별 학습 진도를 통제해야 합니다.' };
        } else {
            return { label: '하 (기초관리 시급)', desc: '[판정기준: 전 교과 기초학력 결손 40%↑] 학습 결손 학생 비중이 매우 높아 면학 분위기가 정돈되지 않을 가능성이 큽니다. 자녀의 올바른 공부 습관 형성을 위한 집중적인 가이드가 요구됩니다.' };
        }
    }

    /**
     * 특정 학교의 공시 요약 해석 정보 생성 (AI 텍스트)
     */
    getSchoolSummary(school) {
        const mathAvg = school.subjects.math.avg;
        const engAvg = school.subjects.english.avg;
        const korAvg = school.subjects.korean.avg;

        // 가장 높은/낮은 성취도를 비교하여 자동 설명 생성
        let insightText = `이 학교는 ${korAvg > mathAvg ? '국어' : '수학'} 성취도가 상대적으로 높으며, `;
        insightText += `${school.subjects.english.dist[3] > 8 ? '영어 과목의 편차가 다소 큰 편입니다.' : '과목별 편차가 고른 편입니다.'}`;

        const comp = this.calculateCompetitionLevel(school);

        const address = school.address || '';
        const parts = address.split(' ');
        const dong = parts[2] || parts[1] || '주변';
        
        const academyCount = school.academy_count || 25;
        const academyList = [];
        const subjects = ['수학', '영어', '논술', '과학', '코딩', '종합보습', '입시컨설팅', '미술', '음악', '어학원'];
        const prefixes = ['정상', '탑클래스', '에이원', '베스트', '명문', '프라임', '리더스', '하이', '퍼스트', '엘리트'];
        
        for (let i = 0; i < academyCount; i++) {
            if (i === 0) {
                academyList.push(`해법수학 학원`);
            } else if (i === 1) {
                academyList.push(`튼튼영어 교실`);
            } else if (i === 2) {
                academyList.push(`탑클래스 종합보습`);
            } else if (i === 3) {
                academyList.push(`${school.school_name.replace('중학교', '').replace('고등학교', '').replace('초등학교', '')} 내신전문 학원`);
            } else {
                const subj = subjects[i % subjects.length];
                const pref = prefixes[(i * 7) % prefixes.length];
                academyList.push(`${pref} ${subj}`);
            }
        }

        const budget = school.extracurricular_budget || 120;
        const studentCount = school.student_count || 500;

        // 1인당 월 환산 (년/인 → 월/인)
        const budgetPerStudentMonth = Math.round((budget * 10000) / 12 / studentCount);

        // 지역별 평균 창체 활동비 (시뮬레이션)
        const regionBudgetMap = {
            '강남구': 185, '서초구': 178, '송파구': 165, '마포구': 145,
            '용산구': 152, '성동구': 138, '광진구': 130, '동대문구': 122,
            '중랑구': 115, '성북구': 120, '강북구': 108, '도봉구': 112,
            '노원구': 118, '은평구': 116, '서대문구': 125, '양천구': 140,
            '강서구': 132, '구로구': 118, '금천구': 110, '영등포구': 135,
            '동작구': 128, '관악구': 120, '강동구': 138, '중구': 148
        };
        const addrParts = (school.address || '').split(' ');
        const gu = addrParts[1] || '';
        const regionAvgBudget = regionBudgetMap[gu] || 130;

        // 활동비 등급 산정 (지역 평균 대비)
        const budgetRatio = budget / regionAvgBudget;
        let budgetGrade;
        if (budgetRatio >= 1.3)      budgetGrade = { label: '상', color: '#1b5e20', bg: '#e8f5e9' };
        else if (budgetRatio >= 1.1) budgetGrade = { label: '중상', color: '#33691e', bg: '#f1f8e9' };
        else if (budgetRatio >= 0.9) budgetGrade = { label: '중', color: '#e65100', bg: '#fff3e0' };
        else if (budgetRatio >= 0.7) budgetGrade = { label: '중하', color: '#bf360c', bg: '#fbe9e7' };
        else                          budgetGrade = { label: '하', color: '#b71c1c', bg: '#ffebee' };

        // 3개년 활동비 추이 (시뮬레이션: 학교 ID 기반 결정론적 생성)
        const seed = school.school_id ? school.school_id.charCodeAt(school.school_id.length - 1) : 5;
        const trend = [
            Math.max(60, budget - 20 - (seed % 15)),
            Math.max(70, budget - 10 + (seed % 8)),
            budget
        ];

        // 항목별 세부 내역 (봉사/동아리/자율/진로 비율 기반 분해)
        const breakdown = {
            봉사활동: Math.round(budget * 0.28),
            동아리활동: Math.round(budget * 0.32),
            자율활동: Math.round(budget * 0.22),
            진로활동: Math.round(budget * 0.18)
        };

        return {
            school_name: school.school_name,
            insight: insightText,
            subjects: school.subjects,
            competition_level: comp,
            academy_count: academyCount,
            academies: academyList,
            extracurricular_budget: budget,
            budget_detail: {
                budget,
                perStudentMonth: budgetPerStudentMonth,
                grade: budgetGrade,
                regionAvg: regionAvgBudget,
                regionName: gu || '서울',
                cityName: school.region || '서울특별시',
                cityAvg: 138,
                nationalAvg: 122,
                trend,
                breakdown,
                schoolAlrimiUrl: `https://www.schoolinfo.go.kr/ei/ss/Pneiss_a01_s0.do?schulCode=${school.school_id || ''}`
            },
            graduate_career: school.graduate_career || { general: 75, special: 5, autonomous: 10, specialized: 10 }
        };
    }

    /**
     * 자녀 성적을 학교 분포에 매핑하여 등수 백분위 및 가이드 생성
     */
    analyzeRelativePosition(childScores, school) {
        const analysisResult = {
            korean: {},
            english: {},
            math: {},
            overall: {
                position_label: '중위권',
                summary: '',
                admission_simulation: ''
            }
        };

        let highCount = 0;
        let averageCount = 0;
        let totalPercentile = 0;
        let validSubjectsCount = 0;

        for (const [subjectName, score] of Object.entries(childScores)) {
            if (score === null || score === undefined) continue;

            const schoolDist = school.subjects[subjectName].dist; // [우수, 보통, 기초, 기초미달]
            const percentile = calculatePercentile(score, school.subjects[subjectName].avg, schoolDist);
            const actionInfo = generateActionText(percentile, school.subjects[subjectName].avg);

            // 성취 분위기에 맞춘 구체적인 과목별 전략 메시지 생성
            let customizedAction = actionInfo.action;
            if (subjectName === 'math') {
                if (schoolDist[0] > 30) {
                    customizedAction = `수학 우수 등급(A)이 두텁습니다. 실수 하나로 상위 백분위가 급락하므로 서술형 소문항 감점을 잡는 서술형 연습이 필수적입니다.`;
                } else if (schoolDist[3] > 30) {
                    customizedAction = `기초 부족 학생이 많은 형태입니다. 교과서 핵심 유형만 빈틈없이 암기하고 맞춰도 상위 20% 진입이 수월합니다.`;
                }
            } else if (subjectName === 'english') {
                if (schoolDist[0] > 40) {
                    customizedAction = `영어 A 비율이 비정상적으로 높습니다. 100점을 목표로 한 실수 제로 전략이 최우선이며 문법 변별력 문항에 유의하세요.`;
                }
            }

            const NATIONAL_AVERAGES = {
                korean: 70.0,
                english: 68.0,
                math: 62.0
            };

            analysisResult[subjectName] = {
                score: score,
                school_avg: school.subjects[subjectName].avg,
                national_avg: NATIONAL_AVERAGES[subjectName],
                percentile: percentile, // 상위 %
                label: actionInfo.label,   // 상위권/중위권/하위권
                action: customizedAction, // 액션 제안 문구
                status: actionInfo.status  // green / yellow / red
            };

            totalPercentile += percentile;
            validSubjectsCount++;

            if (actionInfo.label === '상위권') highCount++;
            if (actionInfo.label === '중위권') averageCount++;
        }

        // 평균 백분위
        const avgPercentile = validSubjectsCount > 0 ? (totalPercentile / validSubjectsCount) : 50;

        // 전체적인 요약 진단
        if (highCount >= 2) {
            analysisResult.overall.position_label = '상위권';
            analysisResult.overall.summary = `자녀는 대부분의 과목이 학교 평균 이상으로 우수한 수준이며 상위권 학교 도전에 적합합니다.`;
        } else if (averageCount >= 2 || (highCount + averageCount >= 2)) {
            analysisResult.overall.position_label = '중위권';
            analysisResult.overall.summary = `자녀는 전반적으로 안정적인 중상위권 흐름을 보이고 있으나 약점 과목의 세부 관리가 필요합니다.`;
        } else {
            analysisResult.overall.position_label = '하위권';
            analysisResult.overall.summary = `기초 보완이 시급합니다. 과목별 취약 영역 위주로 집중 보강이 요구됩니다.`;
        }

        // 고교 진학 시뮬레이션 문구 생성
        // 고교 진학 시뮬레이션 문구 생성
        const career = school.graduate_career || { general: 75, special: 5, autonomous: 10, specialized: 10 };
        const specialCut = career.special;
        const autoCut = career.special + career.autonomous;

        let hsGrade = 5;
        if (avgPercentile <= 4) hsGrade = 1;
        else if (avgPercentile <= 11) hsGrade = 2;
        else if (avgPercentile <= 23) hsGrade = 3;
        else if (avgPercentile <= 40) hsGrade = 4;
        else if (avgPercentile <= 60) hsGrade = 5;
        else if (avgPercentile <= 77) hsGrade = 6;
        else if (avgPercentile <= 89) hsGrade = 7;
        else if (avgPercentile <= 96) hsGrade = 8;
        else hsGrade = 9;

        if (avgPercentile <= specialCut) {
            analysisResult.overall.admission_simulation = `현재 점수 백분위 추정치는 상위 ${avgPercentile.toFixed(1)}%로, 이 학교의 특목고 진학률(${specialCut}%) 이내입니다. 특목고 진학이 유력하며 심화 학습을 추천합니다.<br><br>일반계 고등학교 진학 시 예상 고교 내신: <strong style="color:var(--primary-blue); font-size:15px;">${hsGrade}등급</strong> (상위 대학교 수시 학종 지원 매우 유리)`;
        } else if (avgPercentile <= autoCut) {
            analysisResult.overall.admission_simulation = `현재 점수 백분위 추정치는 상위 ${avgPercentile.toFixed(1)}%로, 자사/외고 진학 가능권입니다.<br><br>일반계 고등학교 진학 시 예상 고교 내신: <strong style="color:var(--primary-blue); font-size:15px;">${hsGrade}등급</strong> (주요 대학교 수시 교과 및 학종 전형 목표)`;
        } else {
            analysisResult.overall.admission_simulation = `현재 점수 백분위 추정치는 상위 ${avgPercentile.toFixed(1)}%로, 안정적인 일반고 진학군에 해당합니다.<br><br>일반계 고등학교 진학 시 예상 고교 내신: <strong style="color:var(--primary-blue); font-size:15px;">${hsGrade}등급</strong> (등급 상승을 위해 고교 입학 전 심화 서술형 집중 대비 필요)`;
        }

        return analysisResult;
    }
}
