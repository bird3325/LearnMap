/**
 * NEIS Parent Service - Local Integration Service Engine
 * 
 * 나이스 학부모 서비스 마이데이터(성적, 생기부/세특, 출결, 급식, PAPS)와 
 * LearnMap 공시 데이터 간의 융합 분석을 전담하는 백엔드 로직 서비스입니다.
 * 
 * ⚠️ 보안 및 환경 제어: isLocalEnvironment()가 true일 때만 국한하여 실행됩니다.
 */

export function isLocalEnvironment() {
    try {
        const host = window.location.hostname || '';
        const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local');
        const isDevPort = window.location.port !== '' && window.location.port !== '80' && window.location.port !== '443';
        return isLocalHost || isDevPort;
    } catch (e) {
        return false;
    }
}

// 표준 정규분포 CDF 근사 (Z-Score 상위 % 산출)
function getNormalCDF(z) {
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const erf = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z / 2.0);
    const cdf = 0.5 * (1.0 + (z >= 0 ? erf : -erf));
    return cdf;
}

export class NEISService {
    constructor() {
        this.storageKey = 'learnmap_neis_local_profile';
        this.profile = this.loadProfile();
    }

    /**
     * 로컬 저장된 자녀 나이스 마이데이터 불러오기 (기본 시뮬레이션 샘플 데이터 포함)
     */
    loadProfile() {
        let saved = null;
        try {
            saved = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
        } catch (e) {
            console.error('Failed to load NEIS profile from localStorage', e);
        }

        // 기본 나이스 시뮬레이션 프로필 템플릿
        const defaultProfile = {
            isConnected: true,
            studentInfo: {
                name: '김배움',
                schoolName: '강남중학교',
                grade: 2,
                classNum: 3,
                studentNum: 14,
                targetMajor: '컴퓨터공학 / AI',
                allergies: ['대두', '우유', '땅콩']
            },
            grades: [
                { subject: '국어', rawScore: 92, writtenScore: 95, perfScore: 86, avg: 76.5, std: 14.2, achievement: 'A' },
                { subject: '수학', rawScore: 88, writtenScore: 92, perfScore: 80, avg: 68.2, std: 18.5, achievement: 'A' },
                { subject: '영어', rawScore: 81, writtenScore: 85, perfScore: 73, avg: 72.0, std: 16.0, achievement: 'B' },
                { subject: '과학', rawScore: 94, writtenScore: 96, perfScore: 90, avg: 70.1, std: 15.8, achievement: 'A' },
                { subject: '역사', rawScore: 85, writtenScore: 88, perfScore: 79, avg: 74.3, std: 13.9, achievement: 'B' }
            ],
            schoolRecord: {
                strengths: ['수학적 문제해결력 우수', '알고리즘 및 과학적 탐구 호기심 원활', '그룹 프로젝트 리더십'],
                weaknesses: ['영어 수행평가 감점(영작문 표현 세부 보완 필요)', '역사 세특 탐구 보고서 연계 확장 필요'],
                competencyScores: {
                    academic: 91,       // 학업 역량
                    majorSuitability: 88, // 전공 적합성
                    community: 93       // 공동체 / 인성
                },
                keywords: ['자연어 처리', '피타고라스 정리에 대한 알고리즘적 해석', '과학 토론 리더', '동아리 파이썬 프로그래밍']
            },
            schedule: [
                { type: 'exam', title: '2학기 중간고사 지필평가', date: '2026-10-15', detail: '국어, 수학, 과학' },
                { type: 'perf', title: '영어 에세이 수행평가 제출', date: '2026-10-08', detail: '영어 과목 20% 반영 (감점 주의)' },
                { type: 'perf', title: '과학 실험 탐구 보고서', date: '2026-10-12', detail: '과학 과목 15% 반영' },
                { type: 'event', title: '교내 과학 창의 융합 축제', date: '2026-10-24', detail: '세특 기록 연계 활동' }
            ],
            attendance: {
                totalDays: 130,
                unexcusedAbsence: 0,
                unexcusedLateness: 0,
                status: '정상 (개근 유지 중)'
            },
            health: {
                papsGrade: 1, // 1등급 (우수)
                bmiStatus: '표준 (신장 168cm / 체중 56kg)',
                todayMenu: [
                    { name: '현미찹쌀밥', allergies: [], allergens: [] },
                    { name: '돈육김치찌개', allergies: ['대두', '돼지고기'], allergens: ['대두', '돼지고기'] },
                    { name: '수제 닭강정', allergies: ['밀', '닭고기', '땅콩'], allergens: ['밀', '닭고기', '땅콩'] },
                    { name: '시금치나물무침', allergies: ['대두'], allergens: ['대두'] },
                    { name: '유기농 우유', allergies: ['우유'], allergens: ['우유'] }
                ]
            }
        };

        if (!saved || typeof saved !== 'object') {
            this.saveProfile(defaultProfile);
            return defaultProfile;
        }

        // 로컬스토리지 저장 데이터 안전 머지 (신규 필드 누락 예방)
        const merged = {
            isConnected: saved.isConnected ?? defaultProfile.isConnected,
            studentInfo: { ...defaultProfile.studentInfo, ...(saved.studentInfo || {}) },
            grades: Array.isArray(saved.grades) && saved.grades.length > 0 ? saved.grades : defaultProfile.grades,
            schoolRecord: { ...defaultProfile.schoolRecord, ...(saved.schoolRecord || {}) },
            schedule: Array.isArray(saved.schedule) && saved.schedule.length > 0 ? saved.schedule : defaultProfile.schedule,
            attendance: { ...defaultProfile.attendance, ...(saved.attendance || {}) },
            health: { ...defaultProfile.health, ...(saved.health || {}) }
        };

        this.saveProfile(merged);
        return merged;
    }

    /**
     * 프로필 저장
     */
    saveProfile(profile) {
        this.profile = profile;
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(profile));
        } catch (e) {
            console.error('Failed to save NEIS profile to localStorage', e);
        }
    }

    /**
     * Z-Score 기반 석차 백분위 및 예상 등급 정밀 산출
     */
    calculateGradeMetrics(subjectItem = {}) {
        const rawScore = subjectItem.rawScore ?? 80;
        const avg = subjectItem.avg ?? 70;
        const std = (subjectItem.std && subjectItem.std > 0) ? subjectItem.std : 15;
        const z = (rawScore - avg) / std;
        const cdf = getNormalCDF(z);
        
        // 상위 백분위 (0.1% ~ 99.9%)
        let percentile = (1.0 - cdf) * 100;
        percentile = Math.max(0.1, Math.min(99.9, percentile));

        // 상대평가 9등급제 환산 기준 (고교 기준 연동 시 참고용)
        let grade = 9;
        if (percentile <= 4) grade = 1;
        else if (percentile <= 11) grade = 2;
        else if (percentile <= 23) grade = 3;
        else if (percentile <= 40) grade = 4;
        else if (percentile <= 60) grade = 5;
        else if (percentile <= 77) grade = 6;
        else if (percentile <= 89) grade = 7;
        else if (percentile <= 96) grade = 8;

        return {
            percentile: parseFloat(percentile.toFixed(1)),
            estimatedGrade: grade,
            zScore: parseFloat(z.toFixed(2))
        };
    }

    /**
     * 전체 성적 요약 및 지필/수행평가 밸런스 분석
     */
    getGradesSummary() {
        const grades = (this.profile && Array.isArray(this.profile.grades)) ? this.profile.grades : [];
        const list = grades.map(item => {
            const metrics = this.calculateGradeMetrics(item);
            const written = item.writtenScore ?? item.rawScore ?? 80;
            const perf = item.perfScore ?? item.rawScore ?? 80;
            const perfGap = written - perf; // 수행평가 감점 폭
            return {
                ...item,
                ...metrics,
                perfGap
            };
        });

        if (list.length === 0) {
            return {
                subjects: [],
                overallAvgScore: 0,
                overallPercentile: 50,
                weakSubject: null
            };
        }

        // 평균 원점수 및 평균 상위 %
        const avgRaw = list.reduce((acc, cur) => acc + (cur.rawScore || 0), 0) / list.length;
        const avgPercentile = list.reduce((acc, cur) => acc + (cur.percentile || 50), 0) / list.length;

        // 가장 보완이 시급한 약점 과목 (수행평가 감점이 크거나 상위 %가 낮은 과목)
        const weakSubject = [...list].sort((a, b) => (b.percentile || 0) - (a.percentile || 0))[0] || null;

        return {
            subjects: list,
            overallAvgScore: parseFloat(avgRaw.toFixed(1)),
            overallPercentile: parseFloat(avgPercentile.toFixed(1)),
            weakSubject
        };
    }

    /**
     * 알레르기 유발 식단 필터링
     */
    getTodayMenuWithAllergyCheck() {
        const userAllergies = (this.profile && this.profile.studentInfo && Array.isArray(this.profile.studentInfo.allergies))
            ? this.profile.studentInfo.allergies
            : [];
        const menu = (this.profile && this.profile.health && Array.isArray(this.profile.health.todayMenu))
            ? this.profile.health.todayMenu
            : [];

        return menu.map(item => {
            const itemAllergies = Array.isArray(item?.allergies)
                ? item.allergies
                : (Array.isArray(item?.allergens) ? item.allergens : []);
            const matches = itemAllergies.filter(a => userAllergies.includes(a));
            return {
                ...item,
                allergies: itemAllergies,
                allergens: itemAllergies,
                hasAllergyRisk: matches.length > 0,
                matchedAllergies: matches
            };
        });
    }
}
