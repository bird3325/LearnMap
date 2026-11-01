# 학업성취도 지도 디자인 사양서 (Design Guide)

이 문서는 개발팀 및 에이전트들이 구현 시 일관된 UI/UX 스타일을 유지할 수 있도록 작성된 디자인 사양서입니다.

---

## 1. 디자인 철학
- **신뢰성**: 차분하고 신뢰감을 주는 블루 계열 컬러 중심 배색
- **명확성**: 복잡한 학업성취 데이터를 직관적인 컬러 및 차트로 변환
- **따뜻함**: 학부모의 자녀 교육 관련 불안감을 덜어주는 친근한 톤앤매너
- **효율성**: 최대 3단계(Tab) 이내에 필요한 자녀 성적 비교 및 액션 정보 도달

---

## 2. 컬러 시스템 (Color System)

### 2.1 주 컬러 (Primary Colors)
- **Primary Blue** (`#4A90E2`): 핵심 액션 버튼, 링크, 강조 요소
- **Deep Blue** (`#2E5C8A`): 상단 네비게이션 헤더, 중요 타이틀
- **Light Blue** (`#E8F4FF`): 연한 배경색, 카드 배경 하이라이트

### 2.2 의미 및 성취 수준 컬러 (Semantic & Grade Colors)
- **Success Green** (`#5CB85C`): 우수 수준 (A등급), 상위권 (상위 0-35%), 유지 상태
- **Warning Yellow** (`#F0AD4E`): 보통 수준 (B/C등급), 중위권 (상위 35-80%), 관리 상태
- **Danger Red** (`#D9534F`): 기초 이하 (D등급 이하), 하위권/보완 시급 (상위 80% 초과)
- **Info Gray** (`#6C757D`): 정보성 텍스트, 비활성 핀

---

## 3. 타이포그래피 (Typography)
- **기본 서체**: `Pretendard`, system-ui, sans-serif
- **본문 크기**: `16px` (Line Height: 1.6)
- **제목 크기**: `20px` ~ `28px` (Line Height: 1.3)
- **보조 크기**: `12px` ~ `14px`

---

## 4. 컴포넌트 사양 (Components)

### 4.1 카드 (Cards)
- **기본 스타일**: `background: #FFFFFF`, `border: 1px solid #DEE2E6`, `border-radius: 12px`, `box-shadow: 0 2px 8px rgba(0,0,0,0.08)`
- **성취 수준 그래프**: 24px 높이의 수평 바(Bar) 차트 형태로 각 등급별 색상을 채워 0.5초 ease-in-out 애니메이션으로 렌더링.

### 4.2 버튼 (Buttons)
- **Primary Button**: `height: 48px`, `background: #4A90E2`, `color: #FFFFFF`, `border-radius: 8px`
- **Secondary Button**: `height: 48px`, `background: transparent`, `border: 1px solid #4A90E2`, `color: #4A90E2`

---

## 5. 레이아웃 & 브레이크포인트 (Layout & Breakpoints)
- **모바일 (320px - 767px)**: 1열 세로 스크롤 레이아웃
- **태블릿 (768px - 1023px)**: 2열 레이아웃
- **데스크톱 (1024px 이상)**: 2~3열 다단 레이아웃 (지도 70% + 사이드바 30% 구성)


---

## 6. 파트너스/비즈니스 프로필 컴포넌트 (Business & Partners UI)

### 6.1 학원소개 - 로고 및 대표 썸네일 업로더 (`#profLogoInput`, `.prof-logo-upload-box`)
- **컨테이너**: `border: 2px dashed #CBD5E1`, `background: #F8FAFC`, `border-radius: 12px`, `padding: 18px`, `display: flex`, `gap: 16px`, `align-items: center`
- **미리보기 썸네일**: `width: 80px`, `height: 80px`, `border-radius: 10px`, `border: 1px solid #E2E8F0`, `object-fit: cover`
- **파일 선택 버튼**: `background: #FFFFFF`, `border: 1px solid #CBD5E1`, `color: #334155`, `font-size: 13px`, `font-weight: 600`, `border-radius: 8px`
- **삭제 버튼**: `.btn-remove-logo` (소프트 레드 배경 `#FEE2E2`, 텍스트 `#DC2626`, `border-radius: 6px`)

### 6.2 학원 시설 및 전경 갤러리 그리드 (`#profPhotosGrid`, `.prof-photos-gallery-grid`)
- **그리드 레이아웃**: `display: grid`, `grid-template-columns: repeat(auto-fill, minmax(110px, 1fr))`, `gap: 12px`
- **사진 썸네일 카드**: `.prof-photo-thumb-card` (가로세로 비율 `1:1`, `border-radius: 10px`, `overflow: hidden`, `position: relative`, `border: 1px solid #E2E8F0`)
- **배지 표기**: 첫 번째 사진은 좌측 상단 초록색 배지 `대표`, 2번째 사진부터는 번호 표기
- **호버 삭제 버튼**: `.btn-remove-photo` 우측 상단 배치, 반투명 블랙 배경 (`rgba(0,0,0,0.6)`), 클릭 시 갤러리에서 즉시 제외 및 저장 반영
- **등록 용량 및 제한**: 최대 10장, 장당 최대 15MB, 지원 확장자 (JPG, PNG, WEBP, GIF, SVG)

### 6.3 이미지 삭제 인터랙션 및 피드백 정책
- **로고 삭제 (`#btnRemoveLogo`)**: 로고가 등록된 상태에서만 노출되며, 클릭 시 사용자 삭제 의사 확인(`confirm`) 후 즉시 기본 플레이스홀더 아이콘(🏫)으로 복원 및 서버 파일 삭제 비동기 요청.
- **개별 시설 사진 삭제 (`.btn-remove-photo`)**: 각 썸네일 카드 우측 상단에 위치한 원형 닫기 버튼을 클릭하여 개별 삭제(`confirm` 후 즉시 제거 및 그리드 재정렬).
- **전체 시설 사진 일괄 삭제 (`#btnRemoveAllPhotos`)**: 등록된 사진이 1장 이상일 때 카운트 좌측에 노출되며, 클릭 시 모든 사진의 일괄 비우기 및 서버 정리 수행.


### 6.4 멤버십 플랜 상태 배너 및 배지 (`#profPlanBanner`)
- **컨테이너 레이아웃**: `background: linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)`, `border: 1.5px solid #BFDBFE`, `border-radius: 12px`, `padding: 14px 20px`, `display: flex`, `justify-content: space-between`, `align-items: center`
- **플랜별 배지 컬러 시스템**:
  - **학원 FREE**: 배경 `#64748B`, 텍스트 `#FFFFFF` (체험 플랜)
  - **학원 BASIC**: 배경 `linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)`, 텍스트 `#FFFFFF` (인증 파트너)
  - **학원 PRO**: 배경 `linear-gradient(135deg, #059669 0%, #10B981 100%)`, 텍스트 `#FFFFFF` (주력 추천 파트너)
  - **학원 TEAM**: 배경 `linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)`, 텍스트 `#FFFFFF` (엔터프라이즈)
- **플랜별 혜택 및 시설 사진 등록 정책**:
  - **학원 FREE**: 기본 정보 등록 및 무료 체험 (학원 전경 및 시설 사진 0장 미지원)
  - **학원 BASIC**: 학원 상세 페이지 & 소개글 활성 (학원 전경 및 시설 사진 3장 등록, 1:1 상담 연결)
  - **학원 PRO / TEAM**: 검색 상단 [프리미엄/스폰서] 배지 노출 & 시설 사진 최대 10장 등록, 교육 상권 분석 보고서 연계
  - **학원 TEAM (엔터프라이즈)**: 다수 지점 통합 프로필 및 관리 지원 추가
  - 한도 초과 및 미지원 기능 접근 시 플랜 업그레이드 안내 모달 및 요금제 탭(`openTab('tab-pricing')`) 전환 유도
  - (UI 정책 개선) 학원 시설 사진 박스 상단의 마스킹 안내 오버레이 영역을 제거하고, 사진 등록 인터페이스와 그리드가 투명하게 노출되도록 개선함.

### 6.5 사업자 등록 정보 (`#tab-register`) 탭 레이아웃 구조 정상화
- 탭 컨테이너 구조: `<div id="tab-register" class="tab-content">` -> `.panel-card` -> `.panel-body` -> `#newBizForm`
- 직전 탭(`#tab-profile`)의 닫는 태그 불일치 및 `#tab-register` 컨테이너의 조기 종료 오류를 수선하여, 사이드바 전환 및 반응형 레이아웃 렌더링이 깨지지 않고 정상 노출되도록 보정함.

### 6.6 사이드 메뉴 하단 파트너 로그아웃 버튼 (`#btnPartnerLogout`)
- **영역 개편**: 기존 하단 "집중 파트너 등급" 배지 카드를 제거하고, 사용자가 언제든 안전하게 세션을 종료할 수 있도록 전용 로그아웃 버튼으로 교체
- **스타일 사양**:
  - 컨테이너: `.sidebar-footer-card`, 여백 `margin-top: auto`, 패딩 `10px`, 배경 `#F8FAFC`, 테두리 `1px solid #E2E8F0`
  - 버튼 본체: 너비 `100%`, 높이 `40px`, 배경 `#FFFFFF`, 테두리 `1px solid #CBD5E1`, 텍스트 `#475569`, 폰트 `13px` 볼드, 아이콘 `🚪`
  - 인터랙션 (Hover): 마우스 오버 시 소프트 레드 배경(`#FEF2F2`), 테두리 `#FECACA`, 텍스트 `#DC2626`로 전환되어 직관적인 종료 액션 피드백 제공
  - 클릭 동작: 로그아웃 여부 확인(`confirm`) 후 브라우저 내 유저 세션 및 캐시 스토리지를 정리하고 메인 서비스 화면(`/`)으로 안전하게 이동



---

## 7. 관리자 콘솔 컴포넌트 (Admin Console UI)

### 7.1 사업자 유료 구독 플랜 관리 모달 (`#adminChangeSubModal`)
- **컨테이너**: `position: fixed`, `z-index: 9999`, 어두운 오버레이 배경 (`rgba(0,0,0,0.55)`), 모달 본체 너비 `max-width: 460px`, `background: #FFFFFF`, `border-radius: 14px`, `box-shadow: 0 20px 40px rgba(0,0,0,0.2)`
- **헤더부**: `border-bottom: 1px solid #E2E8F0`, `padding: 16px 20px`, 블루 다이아몬드 아이콘(`💎`) 및 볼드 타이틀 (`font-size: 16px`), 우측 원형 닫기 버튼
- **대상 사업자 요약 카드**: 연한 슬레이트 배경 (`#F8FAFC`), `border: 1px solid #E2E8F0`, `border-radius: 8px`, `padding: 12px 14px` (상호명, 사업자번호, 업종 배지)
- **플랜 선택 셀렉트 (`#adminPlanSelect`)**: 높이 `44px`, 볼드한 옵션 텍스트, 플랜 변경 시 실시간 결제 금액 및 상세 혜택 안내 배너 자동 갱신
- **실제 결제 안내 및 메모 입력창**:
  - `안내 뱃지`: 실제 결제와 동일한 30일 유효기간, 결제 트랜잭션(`partner_payments`) 및 매출 지표(MRR) 동기화 안내 문구 노출
  - `메모 필드 (#adminChangeMemo)`: 관리자 직권 부여 사유(프로모션, 테스트, 현장 결제 등) 기록
- **액션 버튼**:
  - `취소 버튼`: `border: 1px solid #CBD5E1`, 배경 `#FFFFFF`, 텍스트 `#475569`
  - `변경 실행 버튼 (#btnExecuteSubChange)`: 메인 블루 배경 `linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)`, 텍스트 `#FFFFFF`, 호버 시 박스 섀도우 효과

### 7.2 수집 동기화된 주택 목록의 지역별 수집 현황 (`#realEstateRegionStatsBox`)
- **컨테이너**: `background: #F8FAFC`, `border: 1px solid var(--adm-border)`, `border-radius: 10px`, `padding: 14px 16px`
- **정렬 정책 (오름차순)**:
  - **시/도 칩 정렬**: 강원, 경기, 경남, 경북, 서울, 인천, 제주 등 지역명 가나다 오름차순(`a.localeCompare(b, 'ko')`) 정렬을 적용하여 관리자가 원하는 광역 시/도를 알파벳 순서대로 직관적으로 탐색 가능
  - **시/군/구 칩 정렬**: 세부 지역 칩 역시 가나다 오름차순으로 정렬되어, 다량의 수집 지역 중 원하는 시/군/구를 빠르게 찾아 필터링할 수 있도록 제공
- **인터랙션**: 칩 클릭 시 해당 지역으로 실시간 필터링되며, `[전체 보기 (필터 해제)]` 버튼을 통해 초기화 지원



---

## 8. 교육 상권 분석 컴포넌트 (Market Analysis UI)

### 8.1 지도에서 상권 위치 확인 버튼 (`#btnOpenMapLocation`)
- **버튼 스타일**: 보조 액션 버튼 (`.btn-secondary-act`), 패딩 `8px 14px`, 폰트 `13px`
- **인터랙션**: 클릭 시 현재 분석 대상 학원의 정확한 위경도 좌표(`lat`, `lng`)와 학원명, 주소, 전화번호, 과목을 URLSearchParams로 구성하여 메인 지도(`/?lat=...&lng=...&autoClick=1`)를 새 탭으로 띄우며, 메인 지도는 해당 좌표로 자동 이동 및 줌인(레벨 3), 학원 위치 핀 마커 및 상세 모달을 자동으로 오픈합니다.

### 8.2 AI 추천 타깃 홍보 전략 보기 버튼 & 전용 모달 (`#aiTargetStrategyModal`)
- **트리거 버튼**: 상권 종합 진단 브리핑 박스 우측에 배치된 다크 그린 강조 버튼 (`background: #166534`, 폰트 `13px`, 볼드, 아이콘 `🧠`), 모바일 화면 대응을 위해 flex-wrap으로 자연스럽게 정렬.
- **전용 모달 구조**:
  - **컨테이너**: `max-width: 600px`, `max-height: 90vh`, 세로 스크롤 가능, 부드러운 백드롭 블러 (`rgba(15, 23, 42, 0.65)`)
  - **상단 브리핑 카드**: 다크 슬레이트-포레스트 그린 그라디언트 (`linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #166534 100%)`)로 학원명, 분석 기준 반경, 배후 학생수 및 등급 요약 제공
  - **전략 1 (배후 학교 타깃 카드)**: 학생수 기준 상위 3개교 랭킹 배지(🥇 1순위, 🥈 2순위, 🥉 3순위), 거리, 학생수 및 시험 3주 전 집중 공략 키워드 가이드
  - **전략 2 (과목 차별화 & 슬로건 카드)**: 과목별 경쟁 구도 분석 및 학원 맞춤형 추천 슬로건 하이라이트 박스
  - **전략 3 (3단계 실행 로드맵)**: 프로필 최적화 -> 스폰서 광고 선점 -> 1:1 상담 채널 연계의 실천 로드맵
  - **하단 액션**: `[닫기]`, `[📋 추천 슬로건 프로필에 반영]` (클립보드 복사 및 프로필 탭 이동), `[🚀 스폰서 광고 미리보기]` (광고 미리보기 영역 `#adPreviewSection`으로 부드러운 스크롤 이동)


