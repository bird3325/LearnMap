import fs from 'fs';

let app = fs.readFileSync('app.js', 'utf8');

const sIdx = app.indexOf('function initEduCultureModule() {');
const eIdx = app.indexOf('initNEISLocalModule();', sIdx);

if (sIdx !== -1 && eIdx !== -1) {
    const cleanModuleCode = `function initEduCultureModule() {
    window.eduCultureService = eduCultureService;
    window.eduCultureMarkers = [];
    window.currentEduCultureCategory = 'all';

    // 지도 상의 공공 교육자원 마커 제거
    window.clearEduCultureMapMarkers = function() {
        if (window.eduCultureMarkers && window.eduCultureMarkers.length > 0) {
            window.eduCultureMarkers.forEach(m => {
                if (m && typeof m.setMap === 'function') m.setMap(null);
            });
            window.eduCultureMarkers = [];
        }
    };

    // 카카오 지도에 교육·문화 자원 핀(커스텀 오버레이) 렌더링
    window.renderEduCultureMapMarkers = function(items) {
        window.clearEduCultureMapMarkers();
        const mapObj = window.kakaoMapInstance || (typeof kakaoMap !== 'undefined' ? kakaoMap : null);
        if (!mapObj || typeof kakao === 'undefined' || !kakao.maps || !Array.isArray(items)) return;

        items.forEach(item => {
            if (!item.lat || !item.lng) return;
            const meta = eduCultureService.getCategoryMeta(item.category);
            const pos = new kakao.maps.LatLng(item.lat, item.lng);

            const markerDiv = document.createElement('div');
            markerDiv.className = 'edu-culture-map-pin';
            markerDiv.setAttribute('data-id', item.id);
            markerDiv.style.cssText = \`
                position: relative;
                cursor: pointer;
                background: #ffffff;
                border: 2px solid \${meta.color};
                border-radius: 20px;
                padding: 4px 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.18);
                display: flex;
                align-items: center;
                gap: 5px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 11.5px;
                font-weight: 800;
                color: \${meta.color};
                white-space: nowrap;
                transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
                transform: translate(-50%, -100%);
                user-select: none;
            \`;
            markerDiv.innerHTML = \`
                <span style="font-size: 13px;">\${meta.icon}</span>
                <span>\${item.name}</span>
                \${item.is_free ? '<span style="background: #10b981; color: #fff; font-size: 9.5px; padding: 1px 5px; border-radius: 6px; font-weight: 700;">무료</span>' : ''}
            \`;

            markerDiv.onmouseover = () => {
                markerDiv.style.transform = 'translate(-50%, -108%) scale(1.06)';
                markerDiv.style.boxShadow = '0 6px 18px rgba(0,0,0,0.25)';
                markerDiv.style.zIndex = '10099';
            };
            markerDiv.onmouseout = () => {
                markerDiv.style.transform = 'translate(-50%, -100%) scale(1)';
                markerDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.18)';
                markerDiv.style.zIndex = 'auto';
            };
            markerDiv.onclick = (e) => {
                e.stopPropagation();
                mapObj.panTo(pos);
                if (window.focusEduCultureCard) window.focusEduCultureCard(item.id);
            };

            const overlay = new kakao.maps.CustomOverlay({
                position: pos,
                content: markerDiv,
                yAnchor: 1.0,
                zIndex: 10050
            });
            overlay.setMap(mapObj);
            window.eduCultureMarkers.push(overlay);
        });
    };

    // 학교 선택 시 학원 정보처럼 공공 교육·문화 자원을 자동 노출
    window.updateEduCultureForSelectedSchool = function(schoolObj) {
        if (!schoolObj) return;
        let sLat = 37.5665, sLng = 126.9780;
        if (schoolObj.lat || schoolObj.y || schoolObj.latitude) {
            sLat = parseFloat(schoolObj.lat || schoolObj.y || schoolObj.latitude);
            sLng = parseFloat(schoolObj.lng || schoolObj.x || schoolObj.longitude);
        }

        // 해당 학교 기준 주변 교육·문화 자원 취득 (기본 거리순)
        const items = eduCultureService.getResources({
            centerLat: sLat,
            centerLng: sLng,
            radiusKm: 15.0,
            sort: 'distance'
        });

        // 지도 위 마커 자동 렌더링 (학원 마커처럼 즉시 지도에 노출!)
        window.renderEduCultureMapMarkers(items);

        // 학교 상세 카드 내 인프라 지표 뱃지 업데이트
        const badgeEl = document.getElementById('envCardEduCultureVal');
        if (badgeEl) badgeEl.innerText = \`공공 \${items.length}개소\`;

        // 사이드바 내부 렌더러도 최신 선택 학교 기준으로 동기화
        if (typeof window.renderEduCultureSidebar === 'function') {
            window.renderEduCultureSidebar();
        }
    };

    // 학교 상세 카드 내 "아이 교육·문화 자원" 뱃지 카운트 자동 연동
    window.updateEduCultureSchoolCardBadge = function(schoolObj) {
        const badgeEl = document.getElementById('envCardEduCultureVal');
        if (!badgeEl) return;

        let sLat = 37.5665, sLng = 126.9780;
        if (schoolObj && (schoolObj.lat || schoolObj.y || schoolObj.latitude)) {
            sLat = parseFloat(schoolObj.lat || schoolObj.y || schoolObj.latitude);
            sLng = parseFloat(schoolObj.lng || schoolObj.x || schoolObj.longitude);
        }
        const nearbyItems = eduCultureService.getResources({
            centerLat: sLat,
            centerLng: sLng,
            radiusKm: 5.0
        });
        badgeEl.innerText = \`공공 \${nearbyItems.length}개소\`;
    };

    // 특정 시설 카드 하이라이트 및 스크롤
    window.focusEduCultureCard = function(itemId) {
        const card = document.getElementById(\`eduCard_\${itemId}\`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.borderColor = '#2563eb';
            card.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.3)';
            setTimeout(() => {
                card.style.borderColor = '#e2e8f0';
                card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
            }, 2000);
        }
    };

    // 특정 시설 지도 중심 이동
    window.panToEduCultureLocation = function(lat, lng, name) {
        const mapObj = window.kakaoMapInstance || (typeof kakaoMap !== 'undefined' ? kakaoMap : null);
        if (mapObj && typeof kakao !== 'undefined' && kakao.maps) {
            const pos = new kakao.maps.LatLng(lat, lng);
            mapObj.panTo(pos);
            if (mapObj.getLevel() > 4) mapObj.setLevel(4);
        }
    };

    // 학원리스트(#sideAcademyList) 스타일과 동일한 순수 리스트 렌더러
    window.renderEduCultureSidebar = function() {
        // 1. 기준 좌표 추출 (선택 학교 또는 지도 중심)
        let centerLat = 37.5665, centerLng = 126.9780;
        const schoolObj = (typeof fullSchool !== 'undefined' ? fullSchool : null) ||
                          window.currentSelectedSchool ||
                          (typeof orchestrator !== 'undefined' && orchestrator && orchestrator.state && orchestrator.state.selectedSchool) || null;
        if (schoolObj && (schoolObj.lat || schoolObj.y || schoolObj.latitude)) {
            centerLat = parseFloat(schoolObj.lat || schoolObj.y || schoolObj.latitude);
            centerLng = parseFloat(schoolObj.lng || schoolObj.x || schoolObj.longitude);
        } else if (window.kakaoMapInstance) {
            const c = window.kakaoMapInstance.getCenter();
            centerLat = c.getLat();
            centerLng = c.getLng();
        }

        // 2. 필터 상태값 취득
        const category = window.currentEduCultureCategory || 'all';
        const keyword = document.getElementById('eduCultureSearchInput')?.value?.trim() || '';
        const sort = document.getElementById('eduCultureSortFilter')?.value || 'distance';

        // 3. 자원 목록 필터링
        const items = eduCultureService.getResources({
            centerLat,
            centerLng,
            radiusKm: 15.0,
            category,
            keyword,
            sort
        });

        // 총 개수 뱃지 업데이트
        const countBadge = document.getElementById('eduCultureTotalCountBadge');
        if (countBadge) countBadge.innerText = \`총 \${items.length}개소\`;

        // 검색어 클리어 버튼 가시성
        const clearBtn = document.getElementById('btnEduSearchClear');
        if (clearBtn) {
            clearBtn.style.display = keyword ? 'flex' : 'none';
        }

        // 지도 핀 렌더링
        window.renderEduCultureMapMarkers(items);

        // 리스트 렌더링 (학원 리스트 카드 스타일과 완벽한 일치화)
        const listContainer = document.getElementById('sideEduCultureList');
        if (listContainer) {
            if (items.length === 0) {
                listContainer.innerHTML = \`
                    <div style="padding: 36px 16px; text-align: center; color: #64748b; background: #f8fafc; border-radius: 14px; border: 1px dashed #cbd5e1;">
                        <span style="font-size: 26px; display: block; margin-bottom: 8px;">🏛️</span>
                        <strong style="font-size: 13.5px; color: #1e293b; display: block; margin-bottom: 4px;">해당 조건의 공공 교육·문화 시설이 없습니다.</strong>
                        <span style="font-size: 12px; color: #94a3b8;">카테고리를 변경하거나 검색어를 비워보세요.</span>
                    </div>
                \`;
            } else {
                listContainer.innerHTML = items.map(item => {
                    const meta = eduCultureService.getCategoryMeta(item.category);
                    const walkMins = Math.max(2, Math.round(item.distanceKm * 14));
                    const programsTags = item.programs && item.programs.length > 0 
                        ? item.programs.slice(0, 3).map(p => \`<span style="font-size: 11px; background: #f1f5f9; color: #475569; padding: 2px 7px; border-radius: 6px; font-weight: 500;">\${p}</span>\`).join('')
                        : '';

                    return \`
                        <div id="eduCard_\${item.id}"
                            onclick="window.panToEduCultureLocation(\${item.lat}, \${item.lng}, '\${item.name.replace(/'/g, "\\\\'")}')"
                            style="cursor: pointer; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); transition: all 0.15s ease;"
                            onmouseover="this.style.borderColor='#93c5fd'; this.style.boxShadow='0 4px 12px rgba(37,99,235,0.08)';"
                            onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.02)';">
                            
                            <!-- 상단: 카테고리 뱃지 & 거리 -->
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="background: \${meta.bg}; color: \${meta.color}; border: 1px solid \${meta.border}; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; display: inline-flex; align-items: center; gap: 3px;">
                                        <span>\${meta.icon}</span> \${meta.label}
                                    </span>
                                    <span style="font-size: 11px; font-weight: 700; color: \${item.is_free ? '#059669' : '#d97706'}; background: \${item.is_free ? '#ecfdf5' : '#fffbeb'}; border: 1px solid \${item.is_free ? '#a7f3d0' : '#fde68a'}; padding: 2px 6px; border-radius: 6px;">
                                        \${item.is_free ? '무료' : \`\${item.admission_fee.toLocaleString()}원\`}
                                    </span>
                                </div>
                                <span style="font-size: 12px; font-weight: 800; color: #2563eb;">
                                    \${item.distanceKm}km <span style="font-weight: 500; font-size: 10.5px; color: #64748b;">(도보 \${walkMins}분)</span>
                                </span>
                            </div>

                            <!-- 시설명 -->
                            <h4 style="margin: 0 0 6px 0; font-size: 14.5px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">
                                \${item.name}
                            </h4>

                            <!-- 주소 & 운영시간 -->
                            <div style="font-size: 11.5px; color: #64748b; line-height: 1.4; margin-bottom: 8px;">
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <span>📍</span>
                                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">\${item.address}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                                    <span>⏰</span>
                                    <span>\${item.operating_hours || '운영시간 시설 문의'} (\${item.closed_days || '연중무휴'})</span>
                                </div>
                            </div>

                            <!-- 주요 프로그램 태그들 -->
                            \${programsTags ? \`
                                <div style="display: flex; flex-wrap: wrap; gap: 4px; padding-top: 6px; border-top: 1px dashed #f1f5f9;">
                                    \${programsTags}
                                </div>
                            \` : ''}
                        </div>
                    \`;
                }).join('');
            }
        }
    };

    // 4. 이벤트 바인딩 (카테고리 칩, 검색창, 정렬)
    const categoryChips = document.querySelectorAll('#eduCultureCategoryChips .academy-chip');
    categoryChips.forEach(chip => {
        chip.addEventListener('click', () => {
            categoryChips.forEach(c => {
                c.classList.remove('active');
                c.style.background = '#ffffff';
                c.style.color = '#475569';
                c.style.borderColor = '#e2e8f0';
                c.style.fontWeight = '500';
            });
            chip.classList.add('active');
            chip.style.background = '#1e293b';
            chip.style.color = '#ffffff';
            chip.style.borderColor = '#1e293b';
            chip.style.fontWeight = '700';

            window.currentEduCultureCategory = chip.getAttribute('data-category') || 'all';
            window.renderEduCultureSidebar();
        });
    });

    // 정렬 드롭다운
    const sortFilterEl = document.getElementById('eduCultureSortFilter');
    if (sortFilterEl) {
        sortFilterEl.addEventListener('change', () => window.renderEduCultureSidebar());
    }

    // 검색창 디바운스 입력
    const searchInputEl = document.getElementById('eduCultureSearchInput');
    const searchClearBtn = document.getElementById('btnEduSearchClear');
    let searchDebounceTimer = null;
    if (searchInputEl) {
        searchInputEl.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                window.renderEduCultureSidebar();
            }, 200);
        });
    }
    if (searchClearBtn && searchInputEl) {
        searchClearBtn.addEventListener('click', () => {
            searchInputEl.value = '';
            window.renderEduCultureSidebar();
        });
    }

    // 서비스 데이터 사전 로드
    eduCultureService.init().then(() => {
        console.log('[EduCultureModule] 공공 교육·문화 자원 서비스 초기화 완료');
        const defaultSchool = (typeof fullSchool !== 'undefined' ? fullSchool : null) || window.currentSelectedSchool || null;
        if (defaultSchool) {
            window.updateEduCultureSchoolCardBadge(defaultSchool);
        }
    });
}

    `;

    app = app.substring(0, sIdx) + cleanModuleCode + app.substring(eIdx);
    console.log('Successfully prepared updated app.js');
}

fs.writeFileSync('app.js.tmp', app, 'utf8');

async function saveWithRetry() {
    let success = false;
    for (let i = 0; i < 15; i++) {
        try {
            fs.copyFileSync('app.js.tmp', 'app.js');
            fs.unlinkSync('app.js.tmp');
            success = true;
            break;
        } catch(e) {
            await new Promise(r => setTimeout(r, 150));
        }
    }
    if (success) {
        console.log('Successfully saved app.js with retry');
    } else {
        console.log('Failed to save app.js, retrying again with writeFileSync...');
        try {
            fs.writeFileSync('app.js', app, 'utf8');
            console.log('Saved directly with writeFileSync');
        } catch(err2) {
            console.log('writeFileSync also failed:', err2.message);
        }
    }
}

saveWithRetry();
