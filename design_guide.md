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
