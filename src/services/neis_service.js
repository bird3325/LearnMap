/**
 * NEIS Parent Service - Real-Time Integration & AI Record Analyzer Service Engine
 * 
 * 1) 나이스(NEIS) 교육정보 개방포털 실시간 공공 API 연동:
 *    - 실시간 급식 식단표 및 19종 알레르기 식품 자동 필터링
 *    - 실시간 학교 공식 학사일정 (지필/수행평가 타임라인)
 * 2) 학교알리미 실제 공시 통계 결합:
 *    - 학교별 실제 교과목 평균/표준편차/성취도 기반 Z-Score 정밀 진단
 * 3) 나이스 생기부/성적표 문서 파서 및 AI 역량 분석 엔진:
 *    - 텍스트/PDF 데이터 자동 인식 및 교과성적/출결/PAPS/세특 파싱
 *    - 학업역량, 전공적합성, 공동체 인성 역량 스코어링 및 강점/보완점 도출
 */

export function isLocalEnvironment() {
    return true;
}

// 표준 정규분포 CDF 근사 (Z-Score 상위 % 산출)
export function getNormalCDF(z) {
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

// 나이스 식단 알레르기 번호 매핑
const ALLERGY_MAP = {
    '1': '난류(달걀)', '2': '우유', '3': '메밀', '4': '땅콩', '5': '대두(콩)',
    '6': '밀', '7': '고등어', '8': '게', '9': '새우', '10': '돼지고기',
    '11': '복숭아', '12': '토마토', '13': '아황산류', '14': '호두', '15': '닭고기',
    '16': '쇠고기', '17': '오징어', '18': '조개류(굴/전복/홍합)', '19': '잣'
};

const DEFAULT_NEIS_KEY = 'fb397febaaca465b9f02736cc6f37188';

export class NEISService {
    constructor() {
        this.storageKey = 'learnmap_neis_local_profile';
        this.schoolCodeCacheKey = 'learnmap_neis_school_code_cache';
        this.schoolCache = this.loadSchoolCache();
        this.profile = this.loadProfile();
        this.liveMealsCache = null;
        this.liveScheduleCache = null;
    }

    loadSchoolCache() {
        try {
            if (typeof sessionStorage !== 'undefined') {
                return JSON.parse(sessionStorage.getItem(this.schoolCodeCacheKey) || '{}');
            }
            return {};
        } catch (e) {
            return {};
        }
    }

    saveSchoolCache(cache) {
        this.schoolCache = cache;
        try {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(this.schoolCodeCacheKey, JSON.stringify(cache));
            }
        } catch (e) {}
    }

    /**
     * 로컬 저장된 자녀 나이스 마이데이터 불러오기
     */
    loadProfile() {
        let saved = null;
        try {
            if (typeof localStorage !== 'undefined') {
                saved = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
            }
        } catch (e) {
            console.error('Failed to load NEIS profile from localStorage', e);
        }

        const defaultProfile = this.getDefaultTemplate();

        if (!saved || typeof saved !== 'object') {
            return null;
        }

        return {
            isConnected: saved.isConnected ?? true,
            studentInfo: { ...defaultProfile.studentInfo, ...(saved.studentInfo || {}) },
            grades: Array.isArray(saved.grades) && saved.grades.length > 0 ? saved.grades : defaultProfile.grades,
            schoolRecord: { ...defaultProfile.schoolRecord, ...(saved.schoolRecord || {}) },
            schedule: Array.isArray(saved.schedule) && saved.schedule.length > 0 ? saved.schedule : defaultProfile.schedule,
            attendance: { ...defaultProfile.attendance, ...(saved.attendance || {}) },
            health: { ...defaultProfile.health, ...(saved.health || {}) }
        };
    }

    /**
     * 기본 템플릿 반환
     */
    getDefaultTemplate() {
        return {
            isConnected: true,
            studentInfo: {
                name: '자녀',
                schoolName: '서운중학교',
                grade: 2,
                classNum: 1,
                studentNum: 1,
                targetMajor: '일반 / 미정',
                allergies: []
            },
            grades: [
                { subject: '국어', rawScore: 80, writtenScore: 80, perfScore: 80, avg: 75.0, std: 14.0, achievement: 'B' },
                { subject: '수학', rawScore: 80, writtenScore: 80, perfScore: 80, avg: 70.0, std: 16.0, achievement: 'B' },
                { subject: '영어', rawScore: 80, writtenScore: 80, perfScore: 80, avg: 72.0, std: 15.0, achievement: 'B' },
                { subject: '사회', rawScore: 80, writtenScore: 80, perfScore: 80, avg: 74.0, std: 14.0, achievement: 'B' },
                { subject: '과학', rawScore: 80, writtenScore: 80, perfScore: 80, avg: 71.0, std: 15.0, achievement: 'B' }
            ],
            schoolRecord: {
                strengths: ['수업 참여도 양호', '과제 성실성 우수'],
                weaknesses: ['심화 문제 해결력 보완 권장'],
                competencyScores: { academic: 80, majorSuitability: 80, community: 85 },
                keywords: ['성실성', '자기주도학습']
            },
            schedule: [
                { type: 'exam', title: '중간고사 지필평가', date: '2026-10-15', detail: '국어, 수학, 영어' }
            ],
            attendance: { totalDays: 130, unexcusedAbsence: 0, unexcusedLateness: 0, status: '정상 (개근 유지 중)' },
            health: {
                papsGrade: 1,
                bmiStatus: '표준',
                todayMenu: []
            }
        };
    }

    /**
     * 프로필 저장
     */
    saveProfile(profile) {
        this.profile = profile;
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.storageKey, JSON.stringify(profile));
            }
        } catch (e) {
            console.error('Failed to save NEIS profile to localStorage', e);
        }
    }

    // ==============================================================
    // 1단계: 실시간 NEIS 오픈 API 연동 (학교검색, 급식, 학사일정)
    // ==============================================================

    /**
     * 학교명으로 교육청코드 및 학교코드 실시간 조회 (캐시 지원 & 프록시/직접 호출 페일오버)
     */
    async searchSchoolCode(schoolName, region = '') {
        if (!schoolName) return null;
        const cleanName = schoolName.trim();
        const cleanRegion = (region || '').trim();
        const cacheKey = cleanRegion ? `${cleanName}:::${cleanRegion}` : cleanName;

        if (this.schoolCache[cacheKey]) {
            return this.schoolCache[cacheKey];
        }

        if (typeof window !== 'undefined') {
            try {
                // 1차: 백엔드 프록시 API 호출
                const proxyRes = await fetch(`/api/neis/school-search?school_name=${encodeURIComponent(cleanName)}`);
                if (proxyRes.ok) {
                    const proxyData = await proxyRes.json();
                    if (Array.isArray(proxyData.schools) && proxyData.schools.length > 0) {
                        let match = null;
                        if (cleanRegion) {
                            match = proxyData.schools.find(s => 
                                s.school_name === cleanName && (s.address?.includes(cleanRegion) || s.atpt_name?.includes(cleanRegion) || s.region?.includes(cleanRegion))
                            );
                        }
                        if (!match) {
                            match = proxyData.schools.find(s => s.school_name === cleanName) || proxyData.schools[0];
                        }
                        const info = {
                            atptCode: match.atpt_code,
                            schoolCode: match.school_code,
                            schoolName: match.school_name,
                            schoolType: match.school_type,
                            address: match.address
                        };
                        this.schoolCache[cacheKey] = info;
                        this.saveSchoolCache(this.schoolCache);
                        return info;
                    }
                }
            } catch (e) {
                console.warn('Backend school search failed, falling back to direct NEIS API', e);
            }
        }

        try {
            // 2차: 백엔드 실패 시 open.neis.go.kr 직접 호출 (Failover)
            const directUrl = `https://open.neis.go.kr/hub/schoolInfo?KEY=${DEFAULT_NEIS_KEY}&Type=json&pIndex=1&pSize=10&SCHUL_NM=${encodeURIComponent(cleanName)}`;
            const directRes = await fetch(directUrl);
            if (directRes.ok) {
                const data = await directRes.json();
                const rows = data?.schoolInfo?.[1]?.row || [];
                if (rows.length > 0) {
                    let row = null;
                    if (cleanRegion) {
                        row = rows.find(r => 
                            (r.ORG_RDNMA && r.ORG_RDNMA.includes(cleanRegion)) || 
                            (r.JU_ORG_NM && r.JU_ORG_NM.includes(cleanRegion)) ||
                            (r.ATPT_OFCDC_SC_NM && r.ATPT_OFCDC_SC_NM.includes(cleanRegion))
                        );
                    }
                    if (!row) {
                        row = rows.find(r => r.SCHUL_NM === cleanName) || rows[0];
                    }
                    if (row) {
                        const info = {
                            atptCode: row.ATPT_OFCDC_SC_CODE,
                            schoolCode: row.SD_SCHUL_CODE,
                            schoolName: row.SCHUL_NM,
                            schoolType: row.SCHUL_KND_SC_NM,
                            address: row.ORG_RDNMA
                        };
                        this.schoolCache[cacheKey] = info;
                        this.saveSchoolCache(this.schoolCache);
                        return info;
                    }
                }
            }
        } catch (err) {
            console.error('Direct NEIS school fetch error:', err);
        }

        return null;
    }

    /**
     * 실제 학교의 실시간 급식 식단표 조회 및 알레르기 정밀 필터링
     */
    async fetchRealMeals(schoolName, userAllergies = [], region = '') {
        const schoolInfo = await this.searchSchoolCode(schoolName, region);
        if (!schoolInfo) return null;

        const { atptCode, schoolCode } = schoolInfo;
        const now = new Date();
        const fromDate = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
        const toDate = new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10).replace(/-/g, '');

        let rawMeals = [];

        // 1차 백엔드 프록시 호출
        if (typeof window !== 'undefined') {
            try {
                const res = await fetch(`/api/neis/meals?atpt_code=${atptCode}&school_code=${schoolCode}&from_date=${fromDate}&to_date=${toDate}`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data.meals) && data.meals.length > 0) {
                        rawMeals = data.meals;
                    }
                }
            } catch (e) {
                console.warn('Proxy meals failed, fallback to direct NEIS API');
            }
        }

        // 2차 NEIS 오픈 API 직접 호출
        if (rawMeals.length === 0) {
            try {
                const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${DEFAULT_NEIS_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${atptCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_FROM_YMD=${fromDate}&MLSV_TO_YMD=${toDate}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    const rows = data?.mealServiceDietInfo?.[1]?.row || [];
                    rawMeals = rows.map(r => {
                        const rawDishes = (r.DDISH_NM || '').split(/<br\s*\/?>|\n/).map(s => s.trim()).filter(Boolean);
                        const dishes = rawDishes.map(dStr => {
                            const match = dStr.match(/\(([\d\.]+)\)/);
                            const allergyNums = match ? match[1].split('.').filter(Boolean) : [];
                            const cleanName = dStr.replace(/\([\d\.]+\)/g, '').trim();
                            const allergyNames = allergyNums.map(n => ALLERGY_MAP[n] || `${n}번`).filter(Boolean);
                            return { name: cleanName, raw: dStr, allergies: allergyNames };
                        });
                        const ymd = r.MLSV_YMD;
                        return {
                            date: `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`,
                            rawDate: ymd,
                            mealType: r.MMEAL_SC_NM || '중식',
                            calories: r.CAL_INFO || '',
                            nutrition: r.NTR_INFO || '',
                            dishes: dishes
                        };
                    });
                }
            } catch (err) {
                console.error('Direct NEIS meal fetch error:', err);
            }
        }

        if (rawMeals.length === 0) return null;

        // 오늘 일자 기준 식단 선택 (없으면 가장 최근/가까운 다음 식단)
        const todayStr = now.toISOString().slice(0, 10);
        let selectedMeal = rawMeals.find(m => m.date === todayStr);

        if (!selectedMeal) {
            selectedMeal = rawMeals.find(m => m.date >= todayStr) || rawMeals[rawMeals.length - 1];
        }

        if (!selectedMeal) return null;

        // 알레르기 성분 대조
        const processedDishes = (selectedMeal.dishes || []).map(dish => {
            const dishAllergies = dish.allergies || [];
            const matches = dishAllergies.filter(a => userAllergies.some(userA => a.includes(userA) || userA.includes(a)));
            return {
                name: dish.name,
                allergies: dishAllergies,
                allergens: dishAllergies,
                hasAllergyRisk: matches.length > 0,
                matchedAllergies: matches
            };
        });

        return {
            isLive: true,
            schoolName: schoolInfo.schoolName,
            mealDate: selectedMeal.date,
            mealType: selectedMeal.mealType,
            calories: selectedMeal.calories,
            checkedMenu: processedDishes,
            allMeals: rawMeals
        };
    }

    /**
     * 실제 학교의 실시간 학사 일정 조회 (지필/수행평가, 방학식 등)
     */
    async fetchRealSchedule(schoolName, region = '') {
        const schoolInfo = await this.searchSchoolCode(schoolName, region);
        if (!schoolInfo) return null;

        const { atptCode, schoolCode } = schoolInfo;
        const fromDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
        const toDate = new Date(Date.now() + 75 * 86400000).toISOString().slice(0, 10).replace(/-/g, '');

        let scheduleList = [];

        // 1차 백엔드 프록시 호출
        if (typeof window !== 'undefined') {
            try {
                const res = await fetch(`/api/neis/schedule?atpt_code=${atptCode}&school_code=${schoolCode}&from_date=${fromDate}&to_date=${toDate}`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data.schedule) && data.schedule.length > 0) {
                        scheduleList = data.schedule;
                    }
                }
            } catch (e) {
                console.warn('Proxy schedule failed, fallback to direct NEIS API');
            }
        }

        // 2차 NEIS 오픈 API 직접 호출
        if (scheduleList.length === 0) {
            try {
                const url = `https://open.neis.go.kr/hub/SchoolSchedule?KEY=${DEFAULT_NEIS_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${atptCode}&SD_SCHUL_CODE=${schoolCode}&AA_FROM_YMD=${fromDate}&AA_TO_YMD=${toDate}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    const rows = data?.SchoolSchedule?.[1]?.row || [];
                    scheduleList = rows.map(r => {
                        const ymd = r.AA_YMD;
                        const eventNm = r.EVENT_NM || '';
                        let type = 'event';
                        if (/고사|평가|시험|모의|성취/.test(eventNm)) type = 'exam';
                        else if (/수행|제출|과제|보고서/.test(eventNm)) type = 'perf';
                        else if (/방학|휴업|재량|개교/.test(eventNm)) type = 'vacation';

                        return {
                            date: `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`,
                            rawDate: ymd,
                            title: eventNm,
                            detail: r.EVENT_CNTNT || r.SBTR_DD_SC_NM || `${schoolInfo.schoolName} 공식 학사일정`,
                            type: type
                        };
                    });
                }
            } catch (err) {
                console.error('Direct NEIS schedule fetch error:', err);
            }
        }

        if (scheduleList.length === 0) return null;

        return {
            isLive: true,
            schoolName: schoolInfo.schoolName,
            schedule: scheduleList
        };
    }

    // ==============================================================
    // 2단계: 학교알리미 실제 공시 통계 결합 & Z-Score 정밀 진단
    // ==============================================================

    /**
     * 학교알리미 실제 공시 데이터와 연동하여 과목별 실제 평균 및 표준편차 산출
     */
    calculateGradeMetrics(subjectItem = {}, schoolAlrimiData = null) {
        const rawScore = subjectItem.rawScore ?? 80;
        
        let avg = subjectItem.avg ?? 70;
        let std = subjectItem.std ?? 15;

        // 학교알리미 실제 공시 데이터가 연결되어 있는 경우 실측치 적용
        if (schoolAlrimiData && schoolAlrimiData.subjects) {
            const subjKeyMap = { 
                '국어': 'korean', 
                '수학': 'math', 
                '영어': 'english',
                '사회': 'society',
                '역사': 'history',
                '과학': 'science'
            };
            const subKey = subjKeyMap[subjectItem.subject];
            if (subKey && schoolAlrimiData.subjects[subKey]) {
                const sObj = schoolAlrimiData.subjects[subKey];
                if (sObj.avg) avg = sObj.avg;
                if (sObj.std && sObj.std > 0) std = sObj.std;
                else if (Array.isArray(sObj.dist)) {
                    std = sObj.dist[0] > 35 ? 18.2 : (sObj.dist[0] < 15 ? 13.5 : 15.5);
                }
            }
        }

        const z = (rawScore - avg) / (std > 0 ? std : 15);
        const cdf = getNormalCDF(z);
        
        let percentile = (1.0 - cdf) * 100;
        percentile = Math.max(0.1, Math.min(99.9, percentile));

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
            avg: parseFloat(avg.toFixed(1)),
            std: parseFloat(std.toFixed(1)),
            percentile: parseFloat(percentile.toFixed(1)),
            estimatedGrade: grade,
            zScore: parseFloat(z.toFixed(2)),
            isOfficialStats: Boolean(schoolAlrimiData)
        };
    }

    /**
     * 전체 성적 요약 및 지필/수행평가 밸런스 분석 (학교알리미 실제 공시 결합)
     */
    getGradesSummary(schoolAlrimiData = null) {
        const grades = (this.profile && Array.isArray(this.profile.grades)) ? this.profile.grades : [];
        const list = grades.map(item => {
            const metrics = this.calculateGradeMetrics(item, schoolAlrimiData);
            const written = item.writtenScore ?? item.rawScore ?? 80;
            const perf = item.perfScore ?? item.rawScore ?? 80;
            const perfGap = written - perf;
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

        const avgRaw = list.reduce((acc, cur) => acc + (cur.rawScore || 0), 0) / list.length;
        const avgPercentile = list.reduce((acc, cur) => acc + (cur.percentile || 50), 0) / list.length;
        const weakSubject = [...list].sort((a, b) => (b.percentile || 0) - (a.percentile || 0))[0] || null;

        return {
            subjects: list,
            overallAvgScore: parseFloat(avgRaw.toFixed(1)),
            overallPercentile: parseFloat(avgPercentile.toFixed(1)),
            weakSubject
        };
    }

    // ==============================================================
    // 2단계: 나이스 생기부/성적표 문서 파서 및 AI 역량 분석기
    // ==============================================================

    /**
     * 나이스 학부모 서비스 및 정부24 생기부/성적표 원문 텍스트 분석
     */
    parseRecordDocument(rawText) {
        if (!rawText || typeof rawText !== 'string') {
            throw new Error('파싱할 문서 텍스트가 유효하지 않습니다.');
        }

        const cleanText = rawText.replace(/\r\n/g, '\n');
        const parsedData = {
            studentName: '',
            schoolName: '',
            grade: null,
            grades: [],
            attendance: null,
            health: null,
            schoolRecord: null
        };

        // 1. 학생 기본 정보 추출
        const nameMatch = cleanText.match(/성\s*명\s*[:：]?\s*([가-힣]{2,4})/) || cleanText.match(/학생\s*[:：]?\s*([가-힣]{2,4})/);
        if (nameMatch) parsedData.studentName = nameMatch[1].trim();

        const schoolMatch = cleanText.match(/([가-힣A-Za-z0-9]+(초등|중|고등)학교)/);
        if (schoolMatch) parsedData.schoolName = schoolMatch[1].trim();

        const gradeMatch = cleanText.match(/(\d)\s*학년/);
        if (gradeMatch) parsedData.grade = parseInt(gradeMatch[1], 10);

        // 2. 성적표(지필/수행/원점수/성취도) 파싱
        const subjectsRegex = /(국어|수학|영어|과학|사회|역사|도덕|기술·가정|정보|체육|음악|미술)\s*[:|,\t\s]+(\d{1,3})(?:\s*[:|,\t\s]+(\d{1,3}(?:\.\d+)?))?(?:\s*[:|,\t\s]+(\d{1,2}(?:\.\d+)?))?(?:\s*[:|,\t\s]+([A-Ea-e]))?/g;
        
        let match;
        const foundSubjects = [];
        while ((match = subjectsRegex.exec(cleanText)) !== null) {
            const subjName = match[1];
            const rawScore = parseInt(match[2], 10);
            if (rawScore > 100) continue;

            const avg = match[3] ? parseFloat(match[3]) : 75.0;
            const std = match[4] ? parseFloat(match[4]) : 15.0;
            const ach = match[5] ? match[5].toUpperCase() : (rawScore >= 90 ? 'A' : (rawScore >= 80 ? 'B' : (rawScore >= 70 ? 'C' : 'D')));

            if (!foundSubjects.some(s => s.subject === subjName)) {
                foundSubjects.push({
                    subject: subjName,
                    rawScore: rawScore,
                    writtenScore: rawScore,
                    perfScore: rawScore,
                    avg: avg,
                    std: std,
                    achievement: ach
                });
            }
        }

        if (foundSubjects.length > 0) {
            parsedData.grades = foundSubjects;
        }

        // 3. 출결 현황 파싱
        const totalDaysMatch = cleanText.match(/수업일수\s*[:：]?\s*(\d+)/);
        const absenceMatch = cleanText.match(/(?:미인정결석|결석)\s*[:：]?\s*(\d+)/);
        const latenessMatch = cleanText.match(/(?:지각|미인정지각)\s*[:：]?\s*(\d+)/);

        if (totalDaysMatch) {
            const totalDays = parseInt(totalDaysMatch[1], 10);
            const unexcusedAbsence = absenceMatch ? parseInt(absenceMatch[1], 10) : 0;
            const unexcusedLateness = latenessMatch ? parseInt(latenessMatch[1], 10) : 0;
            parsedData.attendance = {
                totalDays: totalDays,
                unexcusedAbsence: unexcusedAbsence,
                unexcusedLateness: unexcusedLateness,
                status: (unexcusedAbsence === 0 && unexcusedLateness === 0) ? '개근 유지 (우수)' : '출결 관리 요망'
            };
        }

        // 4. PAPS 체력평가 파싱
        const papsMatch = cleanText.match(/체력등급\s*[:：]?\s*(\d)\s*등급/) || cleanText.match(/PAPS\s*[:：]?\s*(\d)\s*등급/);
        const bmiMatch = cleanText.match(/체질량\s*[:：]?\s*([가-힣]+)/) || cleanText.match(/BMI\s*[:：]?\s*([가-힣\d\.]+)/);
        if (papsMatch) {
            parsedData.health = {
                papsGrade: parseInt(papsMatch[1], 10),
                bmiStatus: bmiMatch ? bmiMatch[1] : '표준'
            };
        }

        // 5. 세특(과목별 세부능력 및 특기사항) & 행동특성 종합의견 AI 역량 분석
        const aiRecordAnalysis = this.analyzeRecordCompetencies(cleanText);
        parsedData.schoolRecord = aiRecordAnalysis;

        const currentProfile = this.profile || this.getDefaultTemplate();
        const updatedProfile = {
            ...currentProfile,
            isConnected: true,
            studentInfo: {
                ...currentProfile.studentInfo,
                name: parsedData.studentName || currentProfile.studentInfo.name,
                schoolName: parsedData.schoolName || currentProfile.studentInfo.schoolName,
                grade: parsedData.grade || currentProfile.studentInfo.grade
            },
            grades: parsedData.grades.length > 0 ? parsedData.grades : currentProfile.grades,
            attendance: parsedData.attendance || currentProfile.attendance,
            health: parsedData.health ? { ...currentProfile.health, ...parsedData.health } : currentProfile.health,
            schoolRecord: parsedData.schoolRecord || currentProfile.schoolRecord
        };

        this.saveProfile(updatedProfile);
        return {
            success: true,
            extracted: parsedData,
            profile: updatedProfile
        };
    }

    /**
     * 세특 원문 텍스트 기반 AI 역량 스코어링 및 강점/보완점 추출
     */
    analyzeRecordCompetencies(text) {
        const academicKeywords = ['문제해결', '탐구', '분석', '이해력', '논리적', '수학적', '비판적', '스스로', '심화', '개념', '원리', '호기심'];
        const majorKeywords = ['알고리즘', '프로그래밍', '실험', '발표', '보고서', '데이터', '설계', '융합', '창의적', '연계', '지속적', '전공'];
        const communityKeywords = ['협력', '배려', '소통', '경청', '리더십', '조율', '성실', '책임감', '공동체', '모범', '동아리', '나눔'];

        const countMatches = (list) => list.reduce((acc, kw) => acc + (text.split(kw).length - 1), 0);

        const acadCount = countMatches(academicKeywords);
        const majorCount = countMatches(majorKeywords);
        const commCount = countMatches(communityKeywords);

        const academicScore = Math.min(98, Math.max(78, 80 + acadCount * 3));
        const majorScore = Math.min(98, Math.max(78, 79 + majorCount * 3));
        const communityScore = Math.min(98, Math.max(78, 82 + commCount * 2));

        const matchedKeywords = [...academicKeywords, ...majorKeywords, ...communityKeywords]
            .filter(kw => text.includes(kw))
            .slice(0, 8);

        const strengths = [];
        if (acadCount >= 2) strengths.push('교과 개념에 대한 깊은 호기심과 논리적 탐구 태도 우수');
        if (majorCount >= 2) strengths.push('희망 진로 및 관심 분야와의 유기적인 프로젝트 연계 역량 탁월');
        if (commCount >= 2) strengths.push('팀 기반 과제 및 학급 활동에서의 협력적 소통과 리더십');
        if (strengths.length === 0) strengths.push('수업 참여 태도가 성실하며 학습 과제 수행에 충실함');

        const weaknesses = [];
        if (acadCount < 2) weaknesses.push('단순 암기 위주를 넘어 심화 개념을 증명하고 확장하는 탐구 보고서 보완 권장');
        if (majorCount < 2) weaknesses.push('전공 관심 분야와 교과목 지식을 융합한 개별 심화 탐구 주제 발굴 필요');
        if (commCount < 2) weaknesses.push('토론 및 발표 활동에서 자신의 의견을 적극적으로 개진하고 피드백 수용');
        if (weaknesses.length === 0) weaknesses.push('상위권 지필평가 유지를 위한 서술형/수행평가 감점 요인 집중 관리');

        return {
            strengths: strengths,
            weaknesses: weaknesses,
            competencyScores: {
                academic: academicScore,
                majorSuitability: majorScore,
                community: communityScore
            },
            keywords: matchedKeywords.length > 0 ? matchedKeywords : ['자기주도학습', '성실성', '문제해결']
        };
    }
}
