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

### 6.7 파트너센터 상단 헤더 사업자 선택기 (`#bizSelector`) 업종 뱃지 동기화 (2026-11-06)
- **적용 위치**: `server.js` (`/api/business/session` 엔드포인트), `business.html` (`#bizSelector`)
- **문제점 개선**:
  - 기존 세션 조회 API에서 사용자 보유 사업자 목록(`allBusinesses`) 매핑 시 `type` 필드가 누락되어, 부동산/공인중개사 사업자임에도 기본값인 `🏫 [학원]` 태그로 헤더에 오표기되던 현상을 해결했습니다.
- **수정 사양**:
  - 백엔드 `allBusinesses` 응답 필드에 `type: b.type`을 포함하도록 수정했습니다.
  - 프론트엔드 셀렉터 렌더링 시 `b.type === 'real_estate'` 및 상호명 내 키워드('부동산', '공인중개사')를 정밀 판별하여, 부동산 사업자인 경우 정확히 `🏠 [부동산] 원탑 공인중개사 (승인)`으로 표시되도록 일관성을 확보했습니다.



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

### 7.3 블로그 & 학군 칼럼 관리 게시글 수 요약 및 페이지네이션 (`#blogManagementCard`)
- **게시글 수 요약 바 (`#adminBlogSummaryBar`)**:
  - **컨테이너**: `display: flex`, `justify-content: space-between`, `align-items: center`, `font-size: 12.5px`, `margin-bottom: 12px`
  - **전체 건수 뱃지**: `총 <strong id="adminBlogTotalCount" style="color: #2563EB;">N</strong>건`
  - **필터/상태 뱃지 (`#adminBlogFilteredCount`)**: `background: #F1F5F9`, `color: #64748B`, `border: 1px solid #E2E8F0`, `border-radius: 12px` (기본: `발행 N건 / 임시보관 N건`, 검색/필터 시: `검색 결과: N건 (전체 N건)`)
  - **페이지당 표시 개수 셀렉트 (`#adminBlogPageSizeSelect`)**: 10개씩 / 20개씩 / 50개씩 보기 지원
- **페이지네이션 컨트롤 바 (`#adminBlogPagination`)**:
  - **컨테이너**: `display: flex`, `justify-content: center`, `align-items: center`, `gap: 6px`, `margin-top: 16px`
  - **이전/다음 버튼**: 기본 `btn-secondary` 폰트 12px, 비활성화(1페이지 또는 마지막 페이지) 시 `opacity: 0.45; cursor: not-allowed`
  - **활성 페이지 번호**: `background: #2563EB`, `color: #FFFFFF`, `border: 1px solid #2563EB`, `font-weight: 700`, `border-radius: 6px`
  - **비활성 페이지 번호**: `background: #FFFFFF`, `color: #334155`, `border: 1px solid var(--adm-border)`, `border-radius: 6px`
  - **페이지 정보 표시**: `N / N 페이지 (N건 중 N~N번째)` 안내



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

### 8.3 비즈니스 학원 상세 프로필 ↔ 지도 노출 학원 매칭 및 정보 수정 바인딩 (`#academyBasicInfoContainer`)
- **동작 및 바인딩 원칙**: 기존 학원 카드(`.academy-card`)와 학원 상세 패널(`#communityPanel` 내 `#academyBasicInfoContainer`)의 레이아웃, CSS 스타일, 컬러 팔레트는 100% 그대로 유지하며, 학원명과 주소가 일치하여 확인(`mapVerified: true`)된 비즈니스 학원의 경우 상세 프로필 데이터(`institutionType`, `subjects`, `grades`, `eduOffice`, `foundingDate`, `capacity`, `contactPhone`, `address + addressDetail`, `directionGuide`, `headline`, `classMethod`, `description`, `feeInfo`)로 지도 노출 정보를 실시간 덮어쓰기(Override)하여 표출합니다.





## 23. 파트너센터 [학원 상세 프로필 관리] 변경사항 저장 시 지도 노출 학원 프로필 확인 모달 (2026-11-04)
- **적용 위치**: `business.html` (`saveProfile()`, `openMapAcademyProfileConfirmModal()`, `#mapAcademyProfileConfirmModal`)
- **동작 방식**:
  - 파트너센터의 **[학원 상세 프로필 관리]** 탭에서 **「💾 변경사항 저장하기」** 버튼 클릭 시 `/api/business/verify-map-academy`를 호출하여 입력한 학원명·주소와 실제 지도 노출 학원 정보를 대조합니다.
  - 화면 중앙에 **「지도에서 노출되는 학원 프로필 확인」** 모달(`#mapAcademyProfileConfirmModal`)을 노출하여 실제 메인 지도에서 학부모에게 보여지는 **`🏫 기본 학원 정보` 카드 UI**(학원명, 구분/커리큘럼, 관할 교육청, 설립일, 수용 정원, 전화번호, 상세주소, 헤드라인/수업방식/소개, 등록 수강료, 통학·교통 팁)와 기존 지도 매칭 학원 정보를 한눈에 보여줍니다.
  - 사업자가 **「✅ 해당 학원이 맞습니다 · 지도 학원정보 수정 및 저장」** 버튼을 클릭하면 `mapVerified: true` 상태로 저장되며, 메인 지도(`index.html` / `app.js`)에서는 별도 팝업 없이 즉시 수정된 학원 상세 프로필이 지도에 노출됩니다.


## 24. 사업자 등록정보 ↔ 학원 프로필 주소 분리 정책 및 '사업장 소재지 동일' 체크박스 제거 (2026-11-04)
- **체크박스 및 기능 제거**: `business.html`의 **[학원 상세 주소 및 지도 위치 설정]** 섹션에서 `사업장 소재지 동일` 체크박스(`#chkSameAsBizAddress`) 및 연동 핸들러(`handleSameAsBizAddressChange`)를 제거했습니다.
- **주소 노출 및 독립 수정 정책**:
  - 최초 사업자 등록정보에서 주소 등록 시 학원 프로필 주소(`academyProfile.address`, `academyProfile.addressDetail`)에 초기값으로 그대로 노출됩니다.
  - 이후 학원 프로필에서 주소를 수정하더라도 사업자 등록정보의 주소(`address`, `addressDetail`, `registeredAddress`, `registeredAddressDetail`)는 변경되지 않으며, 반대로 사업자 등록정보에서 주소를 수정하더라도 이미 등록된 학원 프로필의 주소는 변경되지 않도록 독립적으로 관리됩니다.


## 25. 모바일 지도 학교 선택 2단계 미니 바텀 카드 (Peek Card) 및 탐색 인터랙션 (2026-11-05)
- **적용 위치**: `index.html` (`#mobileSchoolPeekCard`), `style.css`, `app.js` (`showMobileSchoolPeekCard`, `expandMobileSchoolDetail`, `closeMobileSchoolPeekCard`)
- **도입 배경**:
  - 기존 모바일 환경(`window.innerWidth <= 1024px`)에서는 학교 핀 클릭 시 화면 높이의 60%를 차지하는 상세 사이드바(`.sidebar-section`)가 즉시 올라와 배정 영역(폴리곤), 주변 학원 핀, 주변 주택 핀 등 지도의 주요 탐색 영역을 가리는 문제가 있었습니다.
- **2단계 바텀 인터랙션 사양**:
  1. **1단계 (미니 Peek Card 노출)**:
     - 모바일에서 학교 핀 클릭 시 사이드바를 즉시 열지 않고, 하단 바텀 네비게이션 위에 컴팩트한 요약 카드(`#mobileSchoolPeekCard`, 높이 약 85~95px, `bottom: 70px; left: 12px; right: 12px; z-index: 10050; border-radius: 14px; background: #FFFFFF; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15)`)를 띄웁니다.
     - 지도의 80~85% 이상이 시원하게 유지되므로 학교 배정 영역 및 반경 내 학원/주택 핀을 그대로 확인하고 자유롭게 지도 조작 및 핀 터치가 가능합니다.
     - **미니 카드 구성**:
       - 학교 분류 뱃지(초/중/고) 및 학교명 (`#mobileSchoolPeekName`)
       - 메타 정보 (설립 구분, 학생 수) (`#mobileSchoolPeekMeta`)
       - `[📚 학원 N개]` 칩 버튼 (`#mobileSchoolPeekAcademyChip`): 클릭 시 반경 내 학원 핀으로 포커스
       - `[🏢 주택 N단지]` 칩 버튼 (`#mobileSchoolPeekHousingChip`): 클릭 시 반경 내 주택 핀으로 포커스
       - `[상세분석 ▲]` 버튼 (`.btn-peek-expand`): 클릭 시 전체 상세로 확장
       - 우측 닫기 버튼 (`#btnCloseMobileSchoolPeek`): 미니 카드 닫기
  2. **2단계 (전체 상세 패널 확장)**:
     - 사용자가 미니 카드를 터치하거나 `[상세분석 ▲]` 버튼을 클릭하면 플래그(`window.__expandingMobileDetailExplicitly`)를 통해 기존 60vh 높이의 상세 사이드바(`.sidebar-section`)가 부드럽게 확장 오픈됩니다.
     - 사이드바가 열려 있는 동안에는 미니 카드가 자동으로 숨겨집니다 (`.app-container.sidebar-open #mobileSchoolPeekCard { display: none !important; }`).
  3. **PC 환경 유지**:
     - 데스크톱(`window.innerWidth > 1024px`)에서는 미니 카드가 항상 숨김 처리(`display: none !important`)되며, 기존 우측 사이드바가 즉시 열리는 PC 동작을 100% 동일하게 유지합니다.

  4. **모바일 미니 요약 카드 제외 영역 정중앙(Center) 정렬 정책 (2026-11-05)**:
     - **문제점 개선**: 기존에는 모바일에서 상세 사이드바가 열려있지 않음에도 과거 60vh 바텀시트를 가정한 하단 블록 오프셋(`offsetY = bottomBlocked / 2`)이 적용되어, 학교 핀이 화면 위쪽으로 과도하게 밀려 올라가 상단 검색 헤더 및 지역/학교급 필터 버튼에 가려지는 현상이 있었습니다.
     - **정렬 로직 수정 (미니 요약 카드 영역 제외 정중앙)**:
       - 모바일(`window.innerWidth <= 1024px`)에서 사이드바가 닫혀 있는 일반 상태(미니 요약 카드 노출 상태)에서는 하단 미니 요약 카드(`#mobileSchoolPeekCard`)와 바텀 네비게이션이 차지하는 높이(`bottomBlocked`, 약 160px)를 동적으로 실시간 측정합니다.
       - 지도의 전체 높이에서 미니 요약 카드 영역을 제외한 남은 가시 높이(`visibleHeight = containerHeight - bottomBlocked`)의 정확한 수직 가운데(`targetY = Math.round(visibleHeight / 2)`)에 학교 핀이 안착하도록 보정(`window.checkAndAdjustMapForSchoolPin`)했습니다.
       - 이를 통해 상단 검색 헤더와도 220px 이상 여유를 유지하고, 하단 미니 카드와도 시각적으로 균형 잡힌 가시 지도 영역의 정가운데에 핀이 표시됩니다.
       - 모바일에서 사용자가 명시적으로 2단계 상세 패널을 오픈한 경우에만 기존 60vh 바텀시트 가시 영역 보정이 활성화됩니다.

  5. **미니 요약 카드 배정 권역 경계 토글 및 상세 닫기 시 폴리곤 보존 정책 (2026-11-05)**:
     - **미니 카드 전용 토글 칩 (`#mobilePeekZoneToggleBtn`)**:
       - 모바일 미니 요약 카드 하단에 배정 권역 경계 토글 칩을 추가하여, 전체 상세 화면에 진입하지 않고도 미니 카드에서 바로 학교의 배정 권역 경계(초등 통학구역 / 중학군 배정 권역 / 고교학군 경계)를 원터치로 지도에 ON/OFF 할 수 있습니다.
       - 학교급(초/중/고)에 맞춰 텍스트 라벨이 동적 반영(`초등 통학구역`, `중학군 배정 경계`, `고교학군 경계`)되며, ON 시 블루 테두리 및 반전 하이라이트로 활성 상태를 피드백합니다.
     - **상세 패널 닫기/뒤로가기 시 폴리곤 및 미니 카드 보존**:
       - 상세 패널에서 배정 권역 경계를 켜고 상단 뒤로가기 또는 닫기(`btnDeselectSchool`)를 눌렀을 때, 학교 선택이 완전히 해제되거나 폴리곤이 지워지던 문제를 개선했습니다.
       - 모바일에서는 상세 패널을 닫더라도 지도 위에 켜둔 배정 권역 경계(폴리곤)가 그대로 유지되며, 하단에는 1단계 미니 요약 카드가 복귀하여 지도 탐색을 연속적으로 이어갈 수 있습니다.
       - 미니 카드의 우측 `✕` 닫기 버튼을 누를 때에만 배정 권역 경계와 학교 선택이 완전히 정리됩니다.

  6. **미니 요약 카드 학원 및 주택 수 실시간 비동기 동기화 (`window.updateMobilePeekCounts`) (2026-11-05)**:
     - **원인 분석**:
       - 학교 핀 클릭 시 학원(`allFetchedAcademies`)과 주택(`allFetchedHousings`)은 비동기로 네트워크 조회가 이뤄지는데, 기존에는 미니 카드가 열리는 초기에만 1회성으로 읽고 조회 완료 후 재갱신되지 않았으며, 주택 변수명 불일치로 인해 주택 단지 수가 0단지로 멈춰 있던 문제를 확인했습니다.
     - **개선 조치**:
       - `window.updateMobilePeekCounts()` 전역 동기화 함수를 구현하여, 학원 및 주택 목록 조회가 완료될 때마다 미니 카드의 `[📚 학원 N개]` 및 `[🏢 주택 N단지]` 카운트가 즉시 최신 실제 개수로 실시간 자동 업데이트되도록 연동을 완료했습니다.


   7. **모바일 하단 학교 미니 카드 3분할 와이드 액션 카드 디자인 개편 (2026-11-06)**:
      - **도입 목적**:
        - 모바일 하단 학교 미니 요약 카드(`mobileSchoolPeekCard`)의 사용성을 극대화하기 위해 제공된 최신 시안(라운드 카드 + 상단 드래그 핸들 바 + 3분할 와이드 액션 카드 구조)으로 디자인을 정밀 리뉴얼했습니다.
      - **상세 레이아웃 구성**:
        1. **카드 외형**: `border-radius: 20px`, 상단 드래그 핸들 바(`width: 44px; height: 4px; background: #cbd5e1; border-radius: 9999px;`).
        2. **1행 (헤더 영역)**:
           - **설립구분 뱃지 (`#mobilePeekSchoolBadge`)**: `[초등학교·공립]` (연한 민트 `#ecfdf5`, 초록 텍스트 `#047857`, 테두리 `#a7f3d0`). 학교급과 설립구분(공립/사립/국립)을 동적으로 결합 표기.
           - **학교명 (`#mobilePeekSchoolName`)**: 17px 볼드, 긴 학교명 자동 말줄임(`ellipsis`).
           - **관심학교 별 버튼 (`#btnMobilePeekFavorite`)**: 원터치 즐겨찾기 저장/해제 토글 연동 (`☆` / `⭐`).
           - **도보시간 뱃지 (`#mobilePeekWalkBadge`)**: `🚶 3분` 연한 블루 알약 뱃지 (`#eef2ff`, 텍스트 `#2563eb`).
           - **상세분석 버튼 (`#btnMobilePeekExpandTop`)**: 블루 알약 버튼 (`#0052cc`, 텍스트 `상세분석 ↑`), 클릭 시 60vh 전체 상세 사이드바로 확장.
        3. **2행 (주소 및 복사 액션)**:
           - **학교 주소 (`#mobilePeekSchoolMeta`)**: 정돈된 도로명/지번 주소 텍스트 (`color: #334155`).
           - **주소 복사 버튼 (`#btnCopyMobileSchoolAddress`)**: 겹침 사각형 아이콘, 터치 시 클립보드로 주소를 즉시 복사.
        4. **3행 (3분할 와이드 액션 카드 그리드 - 1:1:1)**:
           - **인근 학원 카드 (`#mobilePeekAcademyCard`)**: 연한 퍼플 카드 (`#FBF9FF`, 테두리 `#EDE9FE`), `인근 학원` / `<strong id="mobilePeekAcademyCount">N</strong>개소` / 우측 화살표 `>`.
           - **배정 주택 카드 (`#mobilePeekHousingCard`)**: 연한 핑크 카드 (`#FFF1F2`, 테두리 `#FFE4E6`), `배정 주택` / `<strong id="mobilePeekHousingCount">N</strong>개 단지` / 우측 화살표 `>`.
           - **배정 구역 스위치 카드 (`#mobilePeekZoneCard`)**: 연한 블루 카드 (`#EFF6FF`, 테두리 `#DBEAFE`), 좌측 2줄 라벨(`통학구역`/`중학군`/`고교학군` + `구역 표시`) 및 우측 슬라이더 스위치 토글(`mobilePeekZoneToggleTrack` & `mobilePeekZoneToggleKnob`). 지도 위 배정 권역 폴리곤 표시 상태와 실시간 양방향 연동.
      - **기능 무결성 유지**:
        - 기존의 비동기 학원 수 / 주택 수 동기화(`updateMobilePeekCounts`), 배정구역 폴리곤 토글(`toggleMobileSchoolZoneBoundary`), 주소 복사, 관심학교 토글, 상세분석 확장이 100% 정상 작동하며, PC 레이아웃에는 영향을 주지 않습니다.

## 26. 모바일 학원 및 주택 핀 터치 시 2단계 미니 바텀 카드 (Peek Card) 및 기준 학교 맥락 유지 정책 (2026-11-05)
- **적용 위치**: `index.html` (`#mobileItemPeekCard`), `style.css`, `app.js` (`showMobileAcademyPeekCard`, `showMobileHousingPeekCard`, `expandMobileItemDetail`, `closeMobileItemPeekCard`, `returnToSchoolPeekCard`)
- **도입 배경**:
  - 기존에는 모바일에서 지도 위 학원 핀이나 주택 핀을 클릭했을 때 화면의 60vh를 덮는 전체 상세 패널(`#communityPanel`, `#housingDetailPanel`)이 즉시 올라와 지도의 주변 탐색 맥락이 단절되고 매번 닫기를 눌러야 하는 불편이 있었습니다.
- **모바일 2단계 인터랙션 사양**:
  1. **1단계 (학원/주택 미니 Peek Card 전환)**:
     - 모바일(`window.innerWidth <= 1024px`)에서 학원 핀이나 주택 핀 클릭 시 사이드바를 즉시 열지 않고, 하단 네비게이션 위에 컴팩트한 요약 카드(`#mobileItemPeekCard`)로 전환합니다.
     - **학교 맥락 유지**: 상단에 `🏫 [선택 학교명] 기준 도보 N분 (Nm)` (주택의 경우 `배정 유력 · 도보 N분`) 뱃지가 부착되어 현재 탐색 기준 학교의 맥락을 잃지 않습니다.
     - **첨부 이미지 최신 디자인 개편 (2026-11-06)**:
         - **카드 외형**: border-radius 22px, 상단 드래그 핸들 바 (44px x 4px, #cbd5e1).
         - **1행 (헤더 영역)**: 뱃지(APT/OFFI/VILLA, 연한 블루), 명칭(17.5px 볼드), 상세분석 알약 버튼(#2563eb, 상세분석 ↑).
         - **하단 정보 컨테이너 박스**:
           - 1행: 배정/기준 학교 + 학교 아이콘(🏫) + 학교명(터치 시 학교 미니카드로 복귀) + 우측 연녹색 도보시간 뱃지(🏃 도보 3분 (230m)).
           - 구분선: 얇은 가로선(#f1f5f9).
           - 2행: 도로명 주소 + 주소 복사 버튼 + 우측 단지 스펙(968세대 · 2015년 준공 · 용적률 169%, 면적 정보는 제외하여 간결성 유지).
   2. **기준 학교 복귀 인터랙션**:
      - 하단 박스의 학교명 터치 시 언제든지 원래 보고 있던 [학교 미니카드]로 지도 중심과 함께 자연스럽게 복귀합니다.
   3. **2단계 (학원/주택 상세 모달 및 리스트 탐색 플로우)**:
      - **상세 닫기 시 리스트 유지**:
        - 모바일에서 학원이나 주택 상세 모달의 닫기(`✕`)를 누르면, **학원 리스트 / 주택 리스트가 온전히 나타나 다른 학원이나 주택들을 계속 탐색**할 수 있습니다.
        - 이때 배경에 위치한 학교 상세 본문(`#sidebarContent`)은 숨김 상태(`display: none`)로 유지되어 학교 상세가 겹치거나 노출되지 않습니다.
      - **리스트 닫기 시 학교 상세 숨김 및 지도/학교 미니카드 복귀**:
        - 학원 리스트나 주택 리스트의 상단 닫기(`✕`) 버튼을 누르면, **학교 상세를 직접 연 경우가 아니라면 학교 상세는 노출되지 않고 지도 화면 및 학교 미니카드로 깔끔하게 복귀**합니다.
        - 오직 사용자가 학교 미니카드에서 `[상세분석 ↑]`을 직접 눌렀던 경우(`window.__schoolDetailOpenedDirectly = true`)에만 학교 상세가 유지됩니다.
      - **학교 미니카드에서 리스트 바로 열기**:
        - 학교 미니카드 3행의 `[인근 학원 N개소 >]` 또는 `[배정 주택 N단지 >]` 카드를 원터치하면 언제든지 전체 리스트 사이드바를 바로 열어볼 수 있습니다.

   4. **PC 환경 유지**:
     - `[상세분석 ▲]` 버튼을 클릭하면 플래그(`window.__expandingMobileItemDetailExplicitly`)를 통해 커리큘럼, 강사진, 실거래가 추이 등의 60vh 전체 상세 패널이 오픈됩니다.
  4. **PC 환경 유지**:
     - 데스크톱 PC(`window.innerWidth > 1024px`)에서는 미니 카드가 항상 숨김 처리(`display: none !important`)되며, 기존 우측 다단 사이드바 동작을 100% 동일하게 유지합니다.
