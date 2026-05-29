# 학업성취도 지도 (Academic Achievement Map) 개발 참고서

이 프로젝트는 학교알리미 데이터를 시각화하고 자녀의 성적 분포 상 상대적 위치를 분석하여 맞춤형 교육 제안을 제공하는 서비스입니다.

## 1. 아키텍처 개요 (Architecture Overview)

메인 오케스트레이터(Orchestrator)와 각 기능별 서브 에이전트(Sub-Agents)가 유기적으로 연동되는 병렬 에이전트 구조를 사용합니다.

```
/src
  /agents
    - orchestrator.js : 메인 조율 및 분기 라우팅
    - map_agent.js    : 지도/검색 서브 에이전트
    - analysis_agent.js: 성적 비교/분석 서브 에이전트
    - compare_agent.js : 다중 학교 비교 서브 에이전트
  /skills
    - pin_visualizer.js : 핀 색상 상태 결정 스킬
    - score_calculator.js : 분포 기반 자녀 위치 계산 알고리즘
    - action_generator.js : 액션 및 가이드라인 생성 규칙 엔진
```

## 2. 파일 목록 및 참고 가이드
- **[디자인 사양서 (design_guide.md)](file:///d:/100%20shop/AcademicMap/design_guide.md)**: 공통 UI/UX 스타일 가이드라인
- **[오케스트레이터 에이전트 로직 (src/agents/orchestrator.js)](file:///d:/100%20shop/AcademicMap/src/agents/orchestrator.js)**
- **[지도 및 검색 에이전트 (src/agents/map_agent.js)](file:///d:/100%20shop/AcademicMap/src/agents/map_agent.js)**
- **[성적 진단 에이전트 (src/agents/analysis_agent.js)](file:///d:/100%20shop/AcademicMap/src/agents/analysis_agent.js)**
- **[학교 비교 에이전트 (src/agents/compare_agent.js)](file:///d:/100%20shop/AcademicMap/src/agents/compare_agent.js)**
