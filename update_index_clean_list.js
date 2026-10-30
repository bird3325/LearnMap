import fs from 'fs';

let html = fs.readFileSync('index.html', 'utf8');

// 1. openEduCultureFromSchoolCard 단순화 (탭 전환 및 스크롤 제거, 학원 카드처럼 오직 사이드바만 토글)
const oldOpenFunc = `function openEduCultureFromSchoolCard() {
                    if (typeof window.toggleEduCultureSidebar === 'function') {
                        window.toggleEduCultureSidebar(true);
                    }
                    if (typeof window.switchSchoolCardTab === 'function') {
                        window.switchSchoolCardTab('RealEstate');
                    }
                    setTimeout(() => {
                        const sec = document.getElementById('schoolEduCultureSection');
                        if (sec) {
                            sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    }, 150);
                }`;

const newOpenFunc = `function openEduCultureFromSchoolCard() {
                    if (typeof window.toggleEduCultureSidebar === 'function') {
                        window.toggleEduCultureSidebar(true);
                    }
                }`;

if (html.includes(oldOpenFunc)) {
    html = html.replace(oldOpenFunc, newOpenFunc);
    console.log('1. Simplified openEduCultureFromSchoolCard');
} else {
    console.log('1. oldOpenFunc not found directly, checking...');
}

// 2. eduCultureSidebar 마크업을 학원 사이드바(academySidebar)처럼 순수 리스트 중심으로 재구성
const sSidebarIdx = html.indexOf('<section class="housing-sidebar-section edu-culture-sidebar-section" id="eduCultureSidebar"');
const eSidebarIdx = html.indexOf('</section>', sSidebarIdx);

if (sSidebarIdx !== -1 && eSidebarIdx !== -1) {
    const cleanSidebarMarkup = `<section class="housing-sidebar-section edu-culture-sidebar-section" id="eduCultureSidebar"
            style="display: none; z-index: 10071;">
            <!-- Top Header -->
            <div id="eduCultureSidebarHeader"
                style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <h2
                        style="font-size: 19px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px;">
                        <span>교육·문화 자원 리스트</span>
                        <span id="eduCultureTotalCountBadge"
                            style="background: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px; display: inline-flex; align-items: center; white-space: nowrap;">총 0개소</span>
                    </h2>
                </div>
                <button onclick="toggleEduCultureSidebar()"
                    style="background: #f1f5f9; border: none; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; color: #475569; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; padding: 0;"
                    onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'"
                    aria-label="닫기">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                        stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <!-- 헤더 밑 스크롤 컨테이너 -->
            <div id="eduCultureScrollWrapper"
                style="flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; scrollbar-width: none; -ms-overflow-style: none;">

                <!-- 시설명 또는 키워드 검색창 -->
                <div style="display: flex; gap: 8px; margin-bottom: 10px; align-items: center; flex-shrink: 0;">
                    <div style="position: relative; flex: 1; display: flex; align-items: center;">
                        <svg style="position: absolute; left: 12px; width: 15px; height: 15px; color: #94a3b8; pointer-events: none;"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input type="text" id="eduCultureSearchInput" placeholder="시설명 또는 프로그램 검색"
                            style="width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 9px 30px 9px 34px; font-size: 12.5px; color: #1e293b; outline: none; box-shadow: 0 1px 2px rgba(0,0,0,0.02); transition: border-color 0.15s ease;">
                        <button id="btnEduSearchClear" type="button"
                            style="display: none; position: absolute; right: 9px; background: #cbd5e1; border: none; border-radius: 50%; width: 17px; height: 17px; font-size: 10px; color: #ffffff; cursor: pointer; align-items: center; justify-content: center; padding: 0;"
                            aria-label="검색어 초기화">✕</button>
                    </div>
                </div>

                <!-- 카테고리 퀵 필터 칩 & 정렬 드롭다운 (상단 고정 메뉴) -->
                <div id="eduCultureTabMenuBar"
                    style="position: sticky; top: 0; z-index: 20; background: #ffffff; display: flex; justify-content: space-between; align-items: center; padding: 6px 0 10px 0; margin-bottom: 10px; gap: 8px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0;">
                    <div id="eduCultureCategoryChips" class="hide-scrollbar draggable-scroll-content"
                        style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; -ms-overflow-style: none; flex: 1; align-items: center; cursor: grab; scroll-behavior: smooth; -webkit-overflow-scrolling: touch;">
                        <button class="academy-chip active" data-category="all"
                            style="padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; border: 1px solid #1e293b; background: #1e293b; color: #ffffff; cursor: pointer; white-space: nowrap; transition: all 0.15s ease;">전체</button>
                        <button class="academy-chip" data-category="library"
                            style="padding: 6px 13px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1px solid #e2e8f0; background: #ffffff; color: #475569; cursor: pointer; white-space: nowrap; transition: all 0.15s ease;">도서관</button>
                        <button class="academy-chip" data-category="youth"
                            style="padding: 6px 13px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1px solid #e2e8f0; background: #ffffff; color: #475569; cursor: pointer; white-space: nowrap; transition: all 0.15s ease;">청소년시설</button>
                        <button class="academy-chip" data-category="sports"
                            style="padding: 6px 13px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1px solid #e2e8f0; background: #ffffff; color: #475569; cursor: pointer; white-space: nowrap; transition: all 0.15s ease;">체육시설</button>
                        <button class="academy-chip" data-category="science_culture"
                            style="padding: 6px 13px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1px solid #e2e8f0; background: #ffffff; color: #475569; cursor: pointer; white-space: nowrap; transition: all 0.15s ease;">과학·문화</button>
                    </div>
                    <div style="position: relative; display: inline-flex; align-items: center; flex-shrink: 0;">
                        <select id="eduCultureSortFilter"
                            style="appearance: none; -webkit-appearance: none; background: transparent; border: none; font-size: 12.5px; font-weight: 700; color: #2563eb; cursor: pointer; padding-right: 14px; outline: none; text-align: right;">
                            <option value="distance">거리순</option>
                            <option value="name">이름순</option>
                            <option value="free">무료우선</option>
                        </select>
                        <svg style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 11px; height: 11px; color: #2563eb; pointer-events: none;"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
                            stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                </div>

                <!-- 공공 교육·문화 자원 리스트 카드 컨테이너 (학원 리스트 #sideAcademyList와 동일한 심플 구조!) -->
                <div id="sideEduCultureList" style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
                    <!-- 동적 자원 카드 렌더링 -->
                </div>
            </div>
        </section>`;

    html = html.substring(0, sSidebarIdx) + cleanSidebarMarkup + html.substring(eSidebarIdx + 10);
    console.log('2. Replaced eduCultureSidebar with clean list-only sidebar');
}

// 3. schoolEduCultureSection (학교 상세 카드 내부에 임의 추가되었던 복잡한 4분할 위젯 등) 제거
const sSectionIdx = html.indexOf('<!-- 3-1. 아이 주변 공공 교육·문화 자원 (도서관·청소년·체육·과학문화) -->');
if (sSectionIdx !== -1) {
    const nextCommentIdx = html.indexOf('<!-- 4. 주변 학원가 평균 수강료 -->', sSectionIdx);
    if (nextCommentIdx !== -1) {
        html = html.substring(0, sSectionIdx) + html.substring(nextCommentIdx);
        console.log('3. Removed schoolEduCultureSection from schoolTabRealEstate');
    }
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html update completed!');
