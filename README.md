# 학업여지도 (LearnMap) - 학군 및 교육환경 의사결정 지도

"점수 나열 대신, 우리 아이에게 맞는 학교를 찾는 의사결정 지도"

이 프로젝트는 공공데이터(학교알리미, KERIS, 학구도안내서비스) 기반의 팩트 데이터와 맞춤형 온보딩 매칭 알고리즘을 활용하여 자녀에게 꼭 맞는 학교 및 이사/통학 의사결정을 보조하는 서비스입니다.

## 1. 개편 핵심 전략 및 참고 가이드
- **[서비스 리포지셔닝 및 개편 계획서 (docs/repositioning_plan.md)](file:///d:/100%20shop/LearnMap/docs/repositioning_plan.md)**: 데이터 다이어트, 온보딩 UX, 매칭 태그, 수익화 모델(BM) 및 리스크 정리 지침
- **[디자인 사양서 (docs/design_guide.md)](file:///d:/100%20shop/LearnMap/docs/design_guide.md)**: 공통 UI/UX 스타일 가이드라인

## 2. 아키텍처 개요 (Architecture Overview)

메인 오케스트레이터(Orchestrator)와 각 기능별 서브 에이전트(Sub-Agents)가 유기적으로 연동되는 병렬 에이전트 구조를 사용합니다.

```
/src
  /agents
    - orchestrator.js  : 메인 조율 및 분기 라우팅
    - map_agent.js     : 지도/검색 서브 에이전트
    - analysis_agent.js: 학교별 상세 데이터 및 성치도 보조 진단 에이전트
    - compare_agent.js : 다중 학교 비교 서브 에이전트
    - neis_agent.js    : 공공데이터포털 학교 마스터 연계 에이전트
  /skills
    - pin_visualizer.js   : 핀 색상 상태 결정 스킬
    - score_calculator.js : 분포 기반 위치 추정 알고리즘
    - action_generator.js : 액션 및 가이드라인 생성 규칙 엔진
  /services
    - auth_service.js : 사용자 인증 서비스 엔진 (개인정보 보호 강화)
    - neis_service.js : 공공데이터 연계 서비스 (SD_SCHUL_CODE 마스터)
```

