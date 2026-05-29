/**
 * Academic Achievement Map - Main Orchestrator Agent
 * 
 * 사용자 요청 및 상호작용 상태에 따라 해당 서브 에이전트(Map, Analysis, Compare)로
 * 작업을 위임하고 상태를 병렬적으로 동기화하는 컨트롤러 허브 역할을 수행합니다.
 */

import { MapAgent } from './map_agent.js';
import { AnalysisAgent } from './analysis_agent.js';
import { CompareAgent } from './compare_agent.js';

export class Orchestrator {
    constructor() {
        this.mapAgent = new MapAgent();
        this.analysisAgent = new AnalysisAgent();
        this.compareAgent = new CompareAgent();
        
        // 애플리케이션 상태 (Application State)
        this.state = {
            selectedSchool: null,
            childProfile: {
                name: '',
                grade: 2,
                scores: { korean: null, english: null, math: null }
            },
            comparisonList: [], // 최대 3개 학교
            filters: {
                schoolType: 'middle', // 'middle' | 'high'
                location: { lat: 37.5665, lng: 126.9780 } // default (Seoul)
            }
        };
    }

    /**
     * 지도 탐색 이벤트 처리 및 학교 핀 업데이트
     */
    async handleMapSearch(searchQuery) {
        console.log(`[Orchestrator] 지도 탐색 요청 수신: ${searchQuery}`);
        const schools = await this.mapAgent.searchSchools(searchQuery, this.state.filters);
        return schools;
    }

    /**
     * 특정 학교 선택 시 세부 분석 카드 정보 반환
     */
    selectSchool(school) {
        console.log(`[Orchestrator] 학교 선택됨: ${school.school_name}`);
        this.state.selectedSchool = school;
        return this.analysisAgent.getSchoolSummary(school);
    }

    /**
     * 자녀 성적 입력 및 학교 분포 매핑 분석 실행
     */
    analyzeChildPerformance(scores) {
        console.log(`[Orchestrator] 성적 분석 요청 수신`);
        this.state.childProfile.scores = scores;
        if (!this.state.selectedSchool) {
            throw new Error("비교할 대상 학교를 선택해 주세요.");
        }
        return this.analysisAgent.analyzeRelativePosition(scores, this.state.selectedSchool);
    }

    /**
     * 비교 보드에 학교 추가
     */
    addToComparison(school) {
        if (this.state.comparisonList.length >= 3) {
            return { success: false, message: "비교는 최대 3개 학교까지 가능합니다." };
        }
        
        const exists = this.state.comparisonList.some(s => s.school_id === school.school_id);
        if (exists) {
            return { success: false, message: "이미 비교 보드에 추가된 학교입니다." };
        }

        this.state.comparisonList.push(school);
        const comparisonTable = this.compareAgent.generateComparisonMatrix(this.state.comparisonList, this.state.childProfile.scores);
        return { success: true, data: comparisonTable };
    }

    /**
     * 비교 보드에서 학교 제거
     */
    removeFromComparison(schoolId) {
        this.state.comparisonList = this.state.comparisonList.filter(s => s.school_id !== schoolId);
        return this.compareAgent.generateComparisonMatrix(this.state.comparisonList, this.state.childProfile.scores);
    }
}
