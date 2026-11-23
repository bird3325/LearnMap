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

   8. **모바일 미니 요약 카드 노출 조건 엄격화 (학교 핀 선택 시에만 노출 정책) (2026-11-13)**:
      - **개선 배경**: 모바일 환경에서 사용자가 학교 핀을 선택하지 않았음에도 초기 로딩 시(자녀 학교 자동 포커싱 등) 또는 상세/사이드바 닫기 시 미니바가 계속 노출되는 문제 개선.
      - **적용 정책**:
        1. 학교 미니바(mobileSchoolPeekCard)는 사용자가 지도 위의 학교 핀(오버레이 핀, 클러스터 마커, SVG 핀)을 직접 선택(클릭/탭)하거나 명시적으로 검색/즐겨찾기 선택을 했을 때에만 플래그(window.__isSchoolPinSelectedByUser = true)를 통해 노출됩니다.
        2. 초기 페이지 로딩 시(centerMapOnChildSchool) 모바일 환경에서는 지도 중심 이동 및 필터 설정만 진행하고, 사용자가 핀을 직접 선택하기 전까지는 미니바가 자동으로 뜨지 않습니다.
         3. **학교 선택 해제 통합 초기화 엔진 (window.deselectSchoolEntirely)**:
            - 학교 상세 패널 닫기/초기화(tnDeselectSchool), 미니바 상단 닫기(closeMobileSchoolPeekCard), 또는 모바일에서 학교 핀 외 다른 지도 빈 영역 클릭 시 일관되게 전체 초기화를 수행합니다.
            - **영역 표시 초기화**: 학교 배정권역 폴리곤(clearSchoolZonePolygon), 안심 통학로 및 안전서클/시설물 마커(clearMapLayers)를 지도에서 완전 제거합니다.
            - **학원 및 주택 핀 초기화**: 학교 선택 시 표시되던 반경 내 학원 핀/오버레이/반경원(clearAcademyMapMarkers)과 주택 핀/오버레이/반경원(clearRealEstateMapMarkers), 교육문화 핀을 지도에서 즉시 제거합니다.
            - **선택 상태 및 미니바 숨김**: selectedSchool = null, window.__isSchoolPinSelectedByUser = false, 학교/아이템 미니바를 즉시 display: none으로 정리합니다.
         4. 지도 빈 공간(바탕) 터치/클릭 시 핀 터치 고스트 클릭 방어 딜레이(400ms)와 함께 window.deselectSchoolEntirely()를 호출하여 영역표시 및 학원/주택 핀이 잔존하지 않고 깔끔하게 리셋됩니다.
         5. 모바일 하단 네비게이션 탭('story', 'filter', 'region', 'mypage') 이동 시에도 미니바가 가리지 않도록 숨김 처리했습니다.

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


## 27. 학원 상세 기본 정보 Skeleton UI 및 모바일 리스트-상세 연동 사양 (2026-11-06)
- **적용 위치**: `app.js` (`getAcademyInfoSkeletonHtml`, `renderAcademyFeeCalculator`, `openAcademyDetailModal`, `openHousingDetailModal`), `style.css` (`.academy-skeleton-card`, `.academy-skeleton-bar`, `@keyframes academy-skeleton-shimmer`)
- **도입 내용**:
  1. **학원 상세 기본 정보 Skeleton UI (모바일 & 웹 공통)**:
     - 학원 상세 모달 진입 시 공공데이터 포털(NEIS) 또는 비즈니스 프로필 로딩 전까지 깜빡임 없는 스켈레톤 쉬머 애니메이션(`academy-skeleton-shimmer`) 제공.
     - **데이터 부재 시 미노출 정책 (2026-11-06 업데이트)**: 공공데이터 포털에 기본 학원 정보 데이터가 없는 학원의 경우, 로딩 완료 후 스켈레톤 UI가 화면에 계속 노출되지 않도록 영역을 깔끔하게 정리하여 불필요한 시각적 방해를 원천 차단.
  2. **모바일 주택 및 학원 리스트 클릭 시 상세 모달 직접 연결**:
     - 기존에 지도 핀 클릭용 미니카드 인터셉트 분기로 인해 모바일 리스트 사이드바에서 카드를 탭했을 때 상세가 열리지 않던 문제를 해결.
     - 리스트 사이드바 열림 상태 감지(`isAcademyListOpen`, `isHousingListOpen`) 및 `window.__expandingMobileItemDetailExplicitly` 명시적 플래그 바인딩을 통해 리스트에서 항목 클릭 시 즉시 해당 상세 모달이 열리도록 연동 완료.


## 28. 파트너센터 전용 로그인/회원가입 페이지 (`partner-auth.html`) 디자인 및 인증 플로우 사양 (2026-11-06)
- **적용 위치**: `partner-auth.html`, `business.html` (`goToPartnerLogin`, `loadSession`), `server.js` (`/api/auth/register`, `/partner-auth` 라우트), `vite.config.js`
- **도입 배경**:
  - 기존에는 파트너 센터(`/business`, `/partner`) 접근 시 비로그인 상태이면 메인 서비스 화면의 로그인 모달(`/?action=login`)로 튕겨나가 학부모 서비스와 파트너 서비스 간 맥락이 단절되는 문제가 있었습니다.
  - 이를 해결하기 위해 학원 및 부동산 사업자 회원을 위한 독립된 전용 로그인 및 회원가입 페이지(`partner-auth.html`)를 신설하여 비로그인 상태 시 해당 페이지로 자연스럽게 안내되도록 개편했습니다.
- **상세 UI/UX 사양**:
  1. **카드 레이아웃 & 브랜딩**:
     - 상단 파트너스 전용 배지(`🤝 학업여지도 파트너스`) 및 파트너 콘솔 전용 타이틀/서브타이틀 배치.
     - 최대 가로폭 `440px`의 모던한 슬레이트 카드 디자인(`border-radius: 20px`, `box-shadow`, `#2563eb` 포인트 컬러).
  2. **세그먼트 탭 네비게이션**:
     - `[ 파트너 로그인 ]` / `[ 파트너 회원가입 ]` 탭을 슬라이드 전환 방식으로 제공. URL 파라미터(`?tab=register` 등)로 탭 직접 진입 지원.
  3. **파트너 로그인 화면**:
     - 아이디(이메일), 비밀번호(보기/숨기기 눈 모양 토글), 로그인 상태 유지 체크박스.
     - (사용자 요청에 따라 검수용 1초 로그인 영역을 제거하고, 실제 Supabase DB와 직결된 정규 로그인/가입 인터페이스로 운영)
  4. **파트너 회원가입 화면**:
     - 사업자 유형 선택: 🏫 학원/교습소 vs 🏢 부동산 공인중개사 라디오 카드형 선택 UI.
     - 상호명, 대표자 성명, 이메일 아이디, 대표 연락처, 비밀번호 및 비밀번호 확인, 약관 동의.
     - 가입 완료 시 즉시 `role: 'partner'`로 계정 생성 및 파트너 비즈니스 기본 정보 동시 연동 후 파트너 센터(`/business`)로 안전하게 이동.
  5. **비로그인 진입 시 리다이렉트 정책**:
     - `/business` 또는 `/partner` 접속 시 로컬스토리지 내 사용자 세션이 없거나 게스트인 경우, 메인 로그인이 아닌 `/partner-auth.html?redirect=...`로 즉시 연결되어 로그인/가입 후 기존 탐색 목적지로 자동 복귀.
  6. **지도 내 회원 서비스 연계 (파트너 회원가입 링크)**:
     - PC 및 모바일 마이페이지 사이드바의 [회원 서비스] 카드, 그리고 메인 [회원 서비스 모달(`authModal`)]의 하단에 "학원 · 부동산 사업자이신가요? [파트너 회원가입 ➔]" 링크를 기본 배치하여, 지도 탐색 중인 사업자 사용자가 언제든지 파트너 전용 가입 페이지(`/partner-auth.html?tab=register`)로 직접 접근할 수 있도록 동선을 일원화함.


## 29. 지도 위 주택 및 학원 핀 노출 속도 극대화 사양 (2026-11-06)
- **적용 위치**: `server.js` (`/api/academies/list`, `/api/realestate/pins`), `app.js` (`loadAcademiesForRadius`)
- **개선 배경 및 해결책**:
  1. **직렬 Waterfall(폭포수) 병목 해소**:
     - 기존에는 학원 데이터 호출 → 학원 평점 DB 조회 → 사이드바 리스트 렌더링 → 학원 핀 표시가 모두 완료된 후에야 주택 핀(`updateRealEstateMapMarkers`)이 순차 실행되어 3~5초 이상 지연 발생.
     - `loadAcademiesForRadius` 시작 시 `updateRealEstateMapMarkers(radNum)`를 **즉시 비동기 병렬 호출**하여 학원 데이터와 주택 데이터가 동시에 지도에 표시되도록 전면 개선.
  2. **지도 핀 마커 우선 렌더링 (Non-blocking)**:
     - 학원 데이터 수신 즉시 `updateAcademyMapMarkers(allFetchedAcademies)`를 호출하여 지도에 핀을 먼저 노출하고, 평점 DB 조회 및 사이드바 목록 렌더링은 백그라운드 비차단 방식으로 처리.
  3. **Vercel Edge CDN 및 서버 인메모리 2단계 캐싱**:
     - 백엔드(`/api/academies/list`, `/api/realestate/pins`)에 `Cache-Control: public, max-age=..., s-maxage=3600, stale-while-revalidate=86400` 헤더를 추가하여 Vercel 글로벌 엣지 네트워크에서 캐싱 즉시 응답(10ms 미만).
     - 서버 인메모리 LRU 캐시(`academyListServerCache`, `realestatePinsServerCache`) 구축으로 중복 카카오 API 호출 및 공간 격자 연산을 방지.
  4. **클라이언트 인메모리 캐싱 (`window._academyListCache`)**:
     - 브라우저 인메모리 캐시를 통해 사용자가 반경을 변경(500m ↔ 1000m)하거나 동일 학교를 재선택할 때 네트워크 지연 없이 0ms 즉시 렌더링.


## 30. 모바일 핀 간 전환 인터랙션 및 회원 주소 기준 도보시간 연동 사양 (2026-11-06)
- **적용 위치**: `app.js` (`showMobileSchoolPeekCard`, `showSchoolDetails`, `showFloatingToast`), `index.html` (`#mobilePeekWalkBadge`)
- **개선 내용**:
  1. **주택/학원 핀 $\rightarrow$ 학교 핀 미니카드 즉시 전환 무결성 보장**:
     - 기존에는 주택이나 학원 핀을 선택해 `#mobileItemPeekCard`가 열려 있을 때 지도 위의 학교 핀을 다시 클릭하면, 주택/학원 미니카드가 닫히지 않고 화면 상단에 남아 있어 학교 정보로 바뀌지 않던 문제 발생.
     - `showMobileSchoolPeekCard` 및 `showSchoolDetails` 시작 시점에 `#mobileItemPeekCard`를 즉시 숨기도록 분기 처리하여, 학교 핀 탭 즉시 학교 요약 카드로 100% 깔끔하게 전환되도록 구현.
  2. **학교 도보시간의 단일 진실 소스(SSOT) - 회원정보 집 주소 기준 동기화**:
     - 기존의 임의 고정값(3분) 대신, 로그인된 회원정보(`currentUser.address`)를 단일 진실 소스로 바인딩.
     - 회원 주소의 위·경도 좌표와 선택된 학교의 좌표 간 하버사인(Haversine) 실거리 및 보행 속도(분당 67m)를 계산하여 실제 `도보 N분`으로 정확하게 노출.
  3. **도보 뱃지 전용 고시인성 플로팅 토스트 재설계 (`#walkDistanceFloatingToast`) (2026-11-06)**:
     - **위치 최적화**: 사용자의 시선이 머무는 하단 미니카드 바로 위(`position: fixed; bottom: 175px; left: 50%; transform: translateX(-50%)`)에 배치하여 즉시 눈에 띄도록 개편.
     - **고대비 프리미엄 비주얼**: 다크 슬레이트(#0f172a) 배경, 선명한 블루 보더 링(rgba(59, 130, 246, 0.4)), 화이트 볼드 텍스트(13px), 딥 섀도우를 적용하여 지도 및 배경과 완벽하게 분리.
     - **플로팅 바 전체 클릭 링크 인터랙션**: 별도의 버튼을 두지 않고 플로팅 바 전체를 터치 영역으로 구성하여, 클릭 시 즉시 부드러운 스케일 피드백(`scale(0.93)`)과 함께 회원 주소 등록 화면으로 자연스럽게 링크되도록 UX 개선.


### 8.8 푸터 약관 링크 및 통합 약관 모달 (`termsModal`) 디자인 가이드 (2026-11-07)
- **푸터 약관 링크**:
  - 배치: 사이드바 최하단 저작권 표기 상단에 가로 정렬(`display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 6px;`).
  - 폰트/색상: 11px, `var(--text-muted)` (#64748b), 개인정보처리방침은 법적 강조를 위해 `font-weight: 700` 적용. 호버 시 `var(--primary-blue, #2563eb)`로 부드러운 전환.
  - 구분자: `|` (opacity: 0.35, 10px).
- **약관 모달 (`termsModal`)**:
  - 오버레이: `background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px); z-index: 10100;`.
  - 카드 규격: `max-width: 660px; max-height: 86vh; border-radius: 16px; background: #ffffff;`.
  - 헤더: 다크 슬레이트 그라데이션(`linear-gradient(135deg, #1e293b, #0f172a)`), 16px Bold 타이틀, 32px 원형 닫기 버튼.
  - 탭 네비게이션: 토스 스타일 슬라이드 탭(`background: #f1f5f9; padding: 4px; border-radius: 10px;`), 활성 탭 화이트 카드 섀도우 적용.
  - 스크롤 본문: `font-size: 12.5px; line-height: 1.75; color: #334155; word-break: keep-all;`, 조항별 다크 헤딩(`13.5px #0f172a`) 및 상단 알림 배너 박스 적용.


## 25. Vercel 배포 환경 초고속 핀(학원·주택) 노출 최적화 아키텍처 (PC/모바일 공통)

### 25.1 학원 핀 노출 속도 개선 (3~5초 -> 0.1~0.2초)
- **1차 즉각 노출 (Client-Side Direct Rendering)**:
  - 학교 핀 클릭 즉시(`selectSchoolById`) 지연 대기 없이 `loadAcademiesForRadius`를 0ms 즉각 병렬 트리거.
  - 브라우저 카카오 SDK(`fetchAcademiesClientSide`)를 1차로 우선 실행하여 100~200ms 만에 카카오 실시간 데이터를 수신, 지도 마커와 리스트를 즉각 표출.
- **2차 백그라운드 보강 (Async Enrichment)**:
  - 서버 API(`/api/academies/list`)를 비동기로 병렬 호출하여 제휴/승인 파트너 비즈니스 뱃지 및 상세 프로필을 부드럽게 보강.
- **서버 및 DB 캐시 최적화**:
  - `syncBusinessesFromDB`, `syncSubscriptionsFromDB`에 5분 TTL 인메모리 캐시를 적용하여 Supabase REST API 왕복 지연(1~2초) 완전 제거.
  - 반경 1km 이하 탐색 시 카카오 API 다중 그리드 요청 수를 50회에서 중심점 1개(3~5회)로 최적화하여 서버 응답 대기 시간을 300ms 이내로 단축.

### 25.2 주택 핀 온디맨드 로딩 최적화 (3,000ms -> 10~20ms)
- **온디맨드 시군구 단일 파일 로딩 (`getRealEstateItemsForRegion`)**:
  - 기존 90개 시군구 분할 파일(수십 MB) 전체를 매번 파싱하던 구조를 전면 개편.
  - 클라이언트(`app.js`)의 `getLawdCdFromSchool` 함수가 학교 주소로부터 법정동코드(5자리, 예: `11680`)를 0ms 즉시 도출하여 `/api/realestate/pins?lawd_cd=...`로 전달.
  - 서버는 요청된 해당 시군구 1개 파일만 10~20ms 만에 온디맨드로 읽고 인메모리 캐시(`realEstateRegionCache`)에 등록.
- **초경량 BBOX & 하버사인 필터링**:
  - 80,000건 전체 공간 격자를 매번 빌드할 필요 없이, 해당 시군구 2,000~4,000건 데이터 내에서 O(N) 실수 비교로 0.5ms 만에 정확한 반경 내 주택을 추출하여 즉시 반환.


## 26. 사용자 인증 및 로그인 정책 (회원가입 회원 전용 로그인)
- **게스트 자동 로그인 원천 제거**:
  - 기존 최초 방문 시 `guest@learnmap.kr`로 자동 세션이 생성되던 로직을 전면 제거.
  - 브라우저 로컬 스토리지에 남아있는 게스트 계정(`guest@learnmap.kr`)은 `authService.getCurrentUser()` 및 `updateAuthUI()` 실행 시 즉시 세션을 파기하고 초기화.
- **회원가입 기반 로그인 필수화**:
  - 미로그인 사용자는 로그인/회원가입 폼이 기본 표시되며, 가입된 계정으로 로그인한 경우에만 마이페이지 프로필 카드 및 자녀/회원 관리 기능 활성화.
  - 비인가 사용자의 회원 정보 수정 및 활동 접근은 차단 후 로그인 폼으로 유도.


## 27. 관리자 사업자 신청 심사 및 반려 모달 정책
- **신청 반려 모달화 (`adminRejectModal`)**:
  - 기존 브라우저 기본 `prompt()` 팝업을 제거하고, 전용 반려 모달창(`adminRejectModal`) 적용.
  - 대상 사업자명 표시, 구체적인 반려 사유 입력 텍스트 영역(`textarea`), 빠른 사유 선택 칩 4종(사업자번호 누락, 서류 보완 필요, 소재지/대표자 불일치, 중복 신청) 지원.
  - 반려 확정 시 파트너 권한을 보류 상태로 동기화하고 파트너 센터에 사유를 실시간 노출.
- **회원 서비스 알림 센터(`userNotificationCenterModal`) 연동**:
  - 관리자가 신청 반려 시 회원 서비스(`index.html` 상단 종 버튼)에 빨간 점 알림 뱃지 활성화.
  - 종 아이콘 클릭 시 알림 센터 팝업이 노출되며 구체적인 반려 사유 및 '파트너센터에서 재신청하기' 바로가기 버튼 제공.
  - 확인 시 읽음 처리(`POST /api/notifications/read`)되어 뱃지가 자동으로 해제됨.
- **반려 후 사업자 정보 수정 및 재신청 정책**:
  - 파트너가 반려된 이후 사업자 정보를 수정하여 제출하면 단순 "수정되었습니다"가 아닌 **"승인 신청하였습니다."** 알림 토스트를 표시.
  - 사업자 상태가 `rejected`에서 관리자 심사 대기 상태(`submitted`)로 자동 재전환되고 이전 반려 사유를 리셋하여 관리자가 신속하게 재심사할 수 있도록 동기화.
  - 파트너 콘솔 UI의 등록 신청 탭에서도 "사업자 신청 반려" 상태 배지와 사유를 표시하고 "정보 수정 후 승인 재신청하기" 버튼을 제공.
- **파트너 사업자등록번호 필수화 정책**:
  - 신규 파트너 입점 신청 시 사업자등록번호(10자리 숫자 및 국세청 가중치 공식 유효성 검증)를 필수 항목으로 강제 적용.
  - 사업자번호가 누락되거나 유효하지 않은 신청은 서버 및 클라이언트에서 원천 차단.


## 28. 파트너 사업자등록번호 국세청 실시간 상태확인 프로세스
- **국세청 상태조회 API 연동 (`GET /api/business/verify-biznumber`)**:
  - 공공데이터포털(data.go.kr)의 국세청 사업자등록정보 진위확인 및 상태조회 공식 API(`nts-businessman/v1/status`) 연동.
  - 1단계: 10자리 국세청 가중치 체크섬 알고리즘 유효성 검사.
  - 2단계: 기신청/기등록 사업자번호 중복 검사.
  - 3단계: 국세청 실시간 계속사업자(`b_stt_cd: '01'`) 여부 확인. 휴업자(`02`), 폐업자(`03`), 국세청 미등록 가짜 번호는 즉시 차단.
- **프론트엔드 실시간 인증 UI/UX**:
  - `business.html` 및 `partner-auth.html`에 `[🔍 국세청 확인]` 버튼 추가.
  - 국세청 인증 완료 시 `✅ 국세청 실사용 인증 완료 (계속사업자 / 과세유형)` 배지 출력 및 검증 완료 플래그 활성화.
  - 국세청 확인을 통과하지 않은 사업자번호는 회원가입 및 입점 신청서 제출 불가.

### 4. 카카오 간편 로그인 및 회원 인증 정책 (2026-11 업데이트)
- **가짜 계정 fallback 원천 제거**:
  - 카카오 로그인 시도 시 인증 실패 또는 에러 발생 시 `parent_XXXX@learnmap.kr` 등의 임의 가짜 계정으로 자동 로그인되던 fallback 코드를 전면 삭제.
- **실제 가입 회원 전용 로그인 검증**:
  - 카카오 인증에 성공하더라도 Supabase `users` 테이블 또는 등록 회원 DB에 실제 존재하는 아이디가 아닐 경우 로그인을 즉시 차단.
  - 미가입 계정인 경우 "가입되지 않은 카카오 계정입니다. 먼저 회원가입을 진행해 주세요." 알림 모달 출력과 함께 회원가입 탭으로 자동 전환 유도.
  - 오직 사전에 가입이 완료된 활성 회원만 로그인 세션 생성 및 서비스 이용 허용.

## 29. 관리자 API 500 오류 방지 및 Vercel 서버리스 페이로드 최적화 (2026-11-20)
- **/api/realestate/stored 경량화 및 Vercel Payload Limit (4.5MB) 준수**:
  - 기존 96개 시군구 363MB 분할 데이터를 통째로 로드하여 발생하던 Serverless Function 메모리 OOM 크래시 및 4.5MB 페이로드 제한 초과(500 에러) 원천 차단.
  - Vercel 환경에서는 대표 지역 분할 파일(1~2개) 기준 최대 1,500건 안전 슬라이스 반환.
  - `admin.js`의 fallback 요청(`src/data/realestate_seoul.json`) 404 경로 호출 제거로 콘솔 에러 0건화.
- **/api/admin/users 및 /api/admin/businesses 고가용성 보장**:
  - Supabase 조회 시 5초 타임아웃(`AbortSignal.timeout(5000)`) 적용으로 함수 행(Hang) 및 지연 크래시 방지.
  - `users.json`, `businesses.json`, `subscriptions.json` 등 로컬 백업 계층과의 병합 시 배열 검증 및 null-safe 가드 적용.
  - 외부 DB 지연 또는 일시 장애 발생 시에도 500 대신 안전한 백업 데이터 및 빈 통계 구조(HTTP 200)로 응답하여 관리자 화면 렌더링 중단 방지.
  - `vercel.json`의 `includeFiles`에 `src/data/users.json` 등록하여 배포 환경 동기화.

## 30. 순위 통계 모달 학교급 연동 및 정렬 토글 정책 (2026-11-20)
- **메인 필터-모달 학교급 100% 동기화**:
  - `window.openTopicStatsModal()` 실행 시 메인 화면의 학교급 필터(`schoolTypeFilter`: 초/중/고/전체) 및 지역 필터(`regionFilter`) 값을 읽어 순위 모달 셀렉터(`topicStatsSchoolType`, `topicStatsSido`)에 즉시 반영.
  - 고등학교 필터 선택 시 모달 진입 시에도 고등학교(서울 319개교)로 자동 설정되어 열림.
- **정렬 토글 명확성 및 순위(Rank) 논리 일관성**:
  - 모달 진입 시 기본 정렬 방향을 항상 '내림차순 (높은 점수 1위)'으로 초기화.
  - 정렬 버튼 텍스트에 현재 방향을 명확하게 표시: 내림차순은 `▼ 높은순` (학교폭력은 `▼ 적은순`), 오름차순은 `▲ 낮은순` (학교폭력은 `▲ 많은순`).
  - 정렬 토글로 오름차순(`asc`)을 보더라도 점수 기준 실제 순위(`rank = isAsc ? (list.length - idx) : (idx + 1)`)를 유지하여, 최저점 학교가 1위 메달을 받거나 1위가 최저점이 되는 논리적 모순을 원천 방지.
  - 종합점수 정렬 시 1위는 항상 최고점(서울 고등학교 기준 서울디자인고등학교 89.6점)으로 일관되게 유지.

## 31. 검색엔진 최적화(SEO) 및 robots.txt · sitemap.xml 라우팅 정책 (2026-11-20)
- **robots.txt 정적 서빙 및 크롤러 허용 보장**:
  - `vercel.json`의 SPA fallback rewrite(`/(.*) -> /index.html`)에 의해 `/robots.txt` 요청 시 HTML이 반환되던 문제를 원천 해결.
  - `server.js`에 명시적 `app.get('/robots.txt')` 라우트를 두고 Content-Type `text/plain; charset=utf-8` 및 RFC 9309 표준 준수 포맷 반환.
  - 모든 정상 검색엔진 크롤러 허용(`User-agent: *`, `Allow: /`), 관리자 및 내부 API 수집 제외(`Disallow: /admin`, `Disallow: /api/`), 절대 URL 사이트맵 명시(`Sitemap: https://leamap.vercel.app/sitemap.xml`).
- **sitemap.xml 도메인 정정 및 최신화**:
  - 구버전 도메인(`learnmap.co.kr`)을 실제 운영 도메인인 `https://leamap.vercel.app`으로 전면 정정.
  - 최신 갱신일자(`lastmod: 2026-11-20`) 반영.
  - 메인(`index.html`), 파트너 비즈니스(`business.html`), 블로그 리서치 메인(`blog.html`), 파트너 인증(`partner-auth.html`) 및 주요 학군 분석 리서치 칼럼 URL 포함.
  - `server.js`의 `app.get('/sitemap.xml')` 라우트(`application/xml; charset=utf-8`) 및 `dist/sitemap.xml` 정적 빌드 2중 서빙 구조 구축.
- **네이버 서치어드바이저 및 구글 서치콘솔 소유확인**:
  - 네이버 소유확인 HTML 파일(`public/navere9069c6ebc833440c7859323acf51457.html`) 및 `index.html` 내 `<meta name="naver-site-verification">` 메타 태그 2중 인증 지원.
  - canonical URL(`https://leamap.vercel.app/`) 명시로 검색엔진 중복 색인 방지.

## 32. 학교급별·구별 정적 랭킹 페이지(SSG) 및 검색엔진 색인 시스템 (2026-11-20)
- **배경 및 목적**:
  - 기존 학교 순위 데이터가 클라이언트 사이드 JS 지도 및 모달 내부에만 렌더링되어 구글, 네이버 등 주요 검색엔진이 학교 점수와 순위를 색인하지 못하던 한계 극복.
  - 12월 3일(목)~12월 7일(월) 서울 후기 일반고 원서접수 시즌을 앞두고 학부모들이 '서울 고등학교 순위', '강남구 고등학교 순위' 등을 검색할 때 즉시 유입될 수 있는 고성능 정적 랭킹 페이지 구축.
- **정적 생성(SSG) 아키텍처**:
  - `scripts/generate_rank_pages.js`를 통해 빌드 시점(`npm run prebuild`)에 전체 79개 정적 HTML 생성:
    - 랭킹 허브: `/rank/index.html`
    - 서울 전체 3대 학교급: `/rank/seoul-high.html` (319개교), `/rank/seoul-middle.html` (390개교), `/rank/seoul-elementary.html` (611개교)
    - 서울 25개 자치구별 초/중/고: `/rank/seoul-[high|middle|elementary]-[gu].html` (75개)
  - HTML 원본 소스에 `<table>`, `<tr>`, `<td>`, 학교명, 종합점수(1위 서울디자인고 89.6점), 학업평균, 안전도, 주소가 100% 텍스트로 직접 렌더링되어 크롤러가 JS 실행 없이 즉시 파싱 가능.
- **신뢰성 및 지표 일관성 준수**:
  - 기존 지도 모달과 100% 동일한 공식 계산식 적용: 학업성취(40%) + 학급규모(30%) + 안전환경(20%) + 창제예산(10%). 임의 수치 조작 금지.
  - 모든 페이지 상단에 **"2025년 04월 학교알리미 공식 정보공시 기준"**, 평가 대상 학교 수, 지역, 학교급 명확히 표기.
- **구조화 데이터 및 SEO 최적화**:
  - Schema.org `ItemList` 및 `EducationalOrganization` JSON-LD 메타데이터 삽입으로 구글 리치 스니펫(Rich Snippet) 지원.
  - 고등학교 페이지 상단에 후기 일반고(1단계 2개교, 2단계 2개교) 원서접수 일정 안내 배너 배치.
  - 각 학교 행에 `/?school={id}` 딥링크를 제공하여 웹 순위표에서 메인 학업여지도 지도로 자연스러운 사용자 전환 유도.
  - `sitemap.xml`에 79개 정적 랭킹 URL 자동 등록 및 `robots.txt`에 `Allow: /rank/` 선언.

## 33. 동명이교 검색 결과 지역 구분 표시 및 선택 드롭다운 (2026-11-20)
- **배경 및 문제점**:
  - '동성중학교' 검색 시 서울 종로구 동성중(순위 1위 89.8점)이 아니라 경기도 수원시 팔달구 동성중학교가 기본 선택되어 열리는 문제 발생.
  - 전국에 걸쳐 동일한 학교명(동명이교)을 가진 학교가 다수 존재하나 검색 결과에 지역 구분 표시가 없어 사용자가 다른 학교로 오인하는 문제 해결.
- **개선 내용**:
  1. **현재 지도 지역(서울 등) 우선 정렬 알고리즘**:
     - `performSearch` 정렬 시 `regionFilter` 또는 현재 감지된 지도 지역과 일치하는 학교에 1순위 가중치를 부여.
     - 서울 지도를 보고 있을 때는 서울 동성중학교가 1순위로 자동 선택되어 서울 종로구 위치로 즉시 이동.
  2. **동명이교 및 다중 검색 결과 선택 드롭다운 UI (`#searchResultsDropdown`)**:
     - 검색창 하단에 부드러운 절대 위치(`position: absolute; top: calc(100% + 6px)`)의 플로팅 드롭다운 레이어 배치 (기존 UI/레이아웃 100% 보존).
     - 동명이교 발견 시 상단 안내 헤더(`🏫 동명이교 안내: 지역별 N개 학교 중 선택하세요`) 표시.
     - 각 항목마다 `학교명`, `📍 시/도 구/군 뱃지` (예: `📍 서울특별시 종로구`, `📍 경기도 수원시 팔달구`), `학교급 · 설립구분`, `도로명 주소` 노출.
     - 항목 클릭 시 해당 학교 좌표로 지도 이동, 핀 포커스 및 사이드바 상세 패널 오픈.
  3. **실시간 검색어 자동완성 (Autocomplete)**:
     - 검색창에 2글자 이상 입력 시 120ms 디바운스로 실시간 매칭 목록을 지역 뱃지와 함께 노출하여 검색 편의성 극대화.
     - 바깥 영역 클릭 및 ESC 키 입력 시 드롭다운 자동 닫힘.
  4. **사이드바 상세 패널 지역 구분 뱃지 연동 (`#schoolCardRegionBadge`)**:
     - 상세 패널 상단 학교명 옆에 `📍 서울특별시 종로구` 등 관할 지역 태그를 상시 노출하여 어떤 지역의 학교인지 명확하게 인지 가능.

## 34. 폰트 비호환 화살표 글리프(➔)를 표준 유니코드 화살표(→)로 전면 교체 (2026-11-20)
- **배경 및 문제점**:
  - 관리자 '대시보드 안전 로그인 ➔' 및 파트너 '파트너센터 로그인 ➔' 버튼 등에서 사용된 딩뱃 화살표 글리프 `➔` (U+2794)가 일부 윈도우 OS 및 브라우저 환경에서 폰트 글리프 누락으로 인해 빈 네모(Tofu, ▯)로 깨져 보이는 문제 발생.
- **조치 내용**:
  - `admin.html`, `partner-auth.html`, `business.html`, `index.html`, `app.js` 전역에서 `➔` (U+2794) 글리프를 모든 OS/브라우저/시스템 폰트(Pretendard, Noto Sans, 맑은 고딕, Arial 등)에서 100% 정상 지원되는 표준 유니코드 화살표 `→` (U+2192)로 전면 교체.
  - 로그인, 회원가입, 이동 버튼의 UI/레이아웃을 100% 유지하면서 브라우저 환경 의존적인 글자 깨짐 현상 원천 해결.

## 35. 파트너 로그인 '로그인 상태 유지' 및 약관 동의 기본 미체크 정책 적용 (2026-11-20)
- **배경 및 정책**:
  - 파트너 로그인 화면(`partner-auth.html`)의 '로그인 상태 유지' 체크박스(`chkRememberMe`)와 회원가입 탭의 필수 약관 동의(`chkTerms`)가 초기 로드 시 기본 체크(`checked`)되어 있던 문제를 개선.
  - 공용 PC 및 다인 환경에서의 계정 도용 방지(보안 강화) 및 개인정보보호위원회·공정거래위원회의 온라인 다크패턴 방지 가이드라인(사전 선택 체크 금지 원칙)에 부합하도록, 사용자가 본인의 의사로 직접 확인하고 능동적으로 체크할 수 있도록 기본 상태를 **미체크(Unchecked)**로 통일.
- **조치 내용**:
  - `partner-auth.html` 내 `id="chkRememberMe"` 및 `id="chkTerms"` 요소의 `checked` 속성을 전면 제거.
  - 초기 진입 시 빈 체크박스로 렌더링되며, 로그인 상태 유지 및 약관 동의 의사가 있는 사용자만 직접 클릭하여 체크하도록 정비 완료.

## 36. 관리자 공지사항 & 시스템 알림 관리 메뉴 (`#noticeManagementCard`) 연동 정책 (2026-11-23)
- **배경 및 목적**:
  - 관리자가 전체 사이트 이용자에게 노출되는 시스템 공지사항(학업성취도 공시 데이터 업데이트, 서비스 점검, 입시 일정 등)을 직접 작성하고 Supabase DB에 실시간 저장 및 삭제할 수 있는 전용 관리 메뉴 구축.
- **UI 및 화면 설계**:
  - 관리자 사이드바에 `📢 공지사항 & 알림 관리` 메뉴 버튼 배치 (`data-target="noticeManagementCard"`).
  - 우측 메인 영역에 `#noticeManagementCard` 배치:
    1. **신규 공지사항 작성 폼**: 제목(`adminNoticeTitleInput`), 본문(`adminNoticeMessageInput`), 연결 링크(`adminNoticeLinkInput`), 회원 알림 발송 여부 선택 체크박스(`adminNoticeSendAlertCheck` - 기본값 체크, 체크 해제 시 회원 알림 미발송 공지만 등록), 등록 버튼(`btnSubmitAdminNotice`).
    2. **등록된 공지 목록 테이블**: `#noticeListContainer`를 통해 Supabase DB의 `notifications` (type: 'notice') 레코드를 최신순으로 렌더링하며, 알림 발송 여부 뱃지(🔔 발송됨 / 🔕 미발송) 표시 및 원클릭 삭제 기능 지원.
    3. **전체 알림 발송 이력 리스트 (`#adminAllNotiListContainer`)**: 사이트에서 발송된 모든 알림(파트너 승인, 신청 반려, 회원가입 환영, 시스템 공지)을 알림 유형 필터(`adminNotiTypeFilter`) 및 수신자/제목 검색(`adminNotiSearchInput`)을 통해 실시간 조회하며, 수신 상태(읽음/미확인) 확인 및 원클릭 삭제 기능 지원 (테이블 관리 열 및 삭제 버튼은 줄바꿈 없이 깔끔하게 한 줄로 고정되도록 `white-space: nowrap;` 적용).
- **데이터 흐름**:
  - 등록 시 `POST /api/admin/notifications` -> Supabase DB `notifications` 테이블에 직접 `INSERT` (로컬 파일 미저장).
  - 회원이 회원 서비스 또는 파트너센터 접속 시 실시간 조회되어 알림 센터 및 상단 종 아이콘 뱃지에 즉각 노출됨.


