/**
 * NEIS Sub-Agent for LearnMap
 * 
 * 나이스 학부모 마이데이터 분석 결과를 학교알리미 공시 통계 및 
 * 지역 학원 핀 데이터와 융합 조율하는 서브 에이전트입니다.
 */

import { NEISService, isLocalEnvironment } from '../services/neis_service.js';

export class NEISAgent {
    constructor() {
        this.service = new NEISService();
    }

    /**
     * 로컬 환경 여부 확인
     */
    isAvailable() {
        return isLocalEnvironment();
    }

    /**
     * 자녀 정보 및 마이데이터 요약 정보
     */
    getStudentSummary() {
        if (!this.isAvailable()) return null;
        return this.service.profile;
    }

    /**
     * 특정 선택 학교의 공시 정보와 자녀 나이스 마이데이터 융합 분석 리포트 생성 (동기 기본값)
     */
    generateFusionReport(selectedSchool) {
        if (!this.isAvailable()) return null;

        const profile = this.service.profile;
        if (!profile) return null;

        const gradesSummary = this.service.getGradesSummary(selectedSchool);

        // 선택된 학교가 공시 데이터를 보유하고 있다면 융합 비교
        let schoolMatchAnalysis = null;
        if (selectedSchool) {
            const schoolAvg = selectedSchool.avg_score || selectedSchool.score_avg || 75;
            const diff = gradesSummary.overallAvgScore - schoolAvg;
            
            schoolMatchAnalysis = {
                schoolName: selectedSchool.school_name || selectedSchool.name,
                schoolAvg: schoolAvg,
                childAvg: gradesSummary.overallAvgScore,
                diffScore: parseFloat(diff.toFixed(1)),
                matchStatus: diff >= 5 ? '학업 우위 (안정)' : (diff >= -5 ? '적정 경쟁' : '학업 보완 필요')
            };
        }

        // 약점 과목 기반 인근 추천 학원 태그 추출
        const weakSubject = gradesSummary.weakSubject;
        let recommendedAcademyKeyword = '전과목 종합 학원';
        if (weakSubject) {
            recommendedAcademyKeyword = `${weakSubject.subject} 전문 학원`;
        }

        return {
            student: profile.studentInfo,
            schoolMatch: schoolMatchAnalysis,
            grades: gradesSummary,
            record: profile.schoolRecord,
            schedule: profile.schedule,
            attendance: profile.attendance,
            health: profile.health,
            recommendations: {
                targetAcademyKeyword: recommendedAcademyKeyword,
                weakSubjectName: weakSubject ? weakSubject.subject : null,
                actionGuide: weakSubject && weakSubject.perfGap > 5 
                    ? `${weakSubject.subject} 과목의 수행평가 감점(-${weakSubject.perfGap}점)을 방지하기 위한 서술형/수행평가 밀착 케어 학원 수강을 추천합니다.`
                    : '전반적인 세특 탐구활동 강화 및 고득점 지필평가 유지를 위한 수능/내신 상위권 학원을 추천합니다.'
            }
        };
    }

    /**
     * 실시간 NEIS 오픈 API(급식/학사일정) 및 학교알리미 공시 결합 비동기 융합 리포트
     */
    async generateLiveFusionReport(selectedSchool) {
        if (!this.isAvailable()) return null;

        const baseReport = this.generateFusionReport(selectedSchool);
        if (!baseReport) return null;

        const schoolName = baseReport.student?.schoolName || selectedSchool?.school_name || '서운중학교';
        const allergies = baseReport.student?.allergies || [];

        try {
            // 병렬로 실제 급식 식단 및 실제 학사 일정 조회
            const [liveMeals, liveSchedule] = await Promise.allSettled([
                this.service.fetchRealMeals(schoolName, allergies),
                this.service.fetchRealSchedule(schoolName)
            ]);

            if (liveMeals.status === 'fulfilled' && liveMeals.value) {
                baseReport.health = {
                    ...baseReport.health,
                    ...liveMeals.value
                };
            }

            if (liveSchedule.status === 'fulfilled' && liveSchedule.value) {
                baseReport.schedule = liveSchedule.value.schedule;
                baseReport.isLiveSchedule = true;
            }
        } catch (e) {
            console.warn('[NEISAgent] Live data fetch warning:', e);
        }

        return baseReport;
    }

    /**
     * 성적/자녀 프로필 변경 업데이트
     */
    updateProfile(updatedData) {
        if (!this.isAvailable()) return;
        const newProfile = {
            ...this.service.profile,
            ...updatedData
        };
        this.service.saveProfile(newProfile);
        return newProfile;
    }

    /**
     * 나이스 생기부/성적표 원문 문서 파싱 및 AI 역량 반영
     */
    parseAndApplyDocument(docText) {
        return this.service.parseRecordDocument(docText);
    }
}

