const fs = require('fs');
const path = require('path');

function normalizeNewlines(str) {
    return str.replace(/\r\n/g, '\n');
}

// 1. Update index.html
const indexPath = path.join(__dirname, '..', 'index.html');
let indexRaw = fs.readFileSync(indexPath, 'utf8');
const isIndexCRLF = indexRaw.includes('\r\n');
let indexContent = normalizeNewlines(indexRaw);

const targetIndexStr = `                            // PC 화면: 학원 목록이 열릴 때 선택된 학교 핀이 실제로 사이드바에 가려지는 경우에만 지도 이동
                            setTimeout(() => {
                                const schoolObj = (typeof fullSchool !== 'undefined' ? fullSchool : null) ||`;

const replIndexStr = `                            // PC 화면: 학원 목록이 열릴 때 선택된 학교 핀이 실제로 사이드바에 가려지는 경우에만 지도 이동
                            setTimeout(() => {
                                if (window.isOpeningFromAcademyPin) return;
                                const schoolObj = (typeof fullSchool !== 'undefined' ? fullSchool : null) ||`;

if (indexContent.includes(targetIndexStr)) {
    indexContent = indexContent.replace(targetIndexStr, replIndexStr);
    const finalIndex = isIndexCRLF ? indexContent.replace(/\n/g, '\r\n') : indexContent;
    fs.writeFileSync(indexPath, finalIndex, 'utf8');
    console.log('Successfully updated index.html');
} else if (indexContent.includes('if (window.isOpeningFromAcademyPin) return;')) {
    console.log('index.html already has isOpeningFromAcademyPin check.');
} else {
    console.warn('Warning: targetIndexStr could not be matched in index.html');
}

// 2. Update app.js
const appPath = path.join(__dirname, '..', 'app.js');
let appRaw = fs.readFileSync(appPath, 'utf8');
const isAppCRLF = appRaw.includes('\r\n');
let appContent = normalizeNewlines(appRaw);

// 2-1. Add checkAndAdjustMapForAcademyPin
const targetFuncMarker = `        // 전역 지적 이동/줌 헬퍼 등록 (학원 카드에서 📍 거리/지도 버튼 클릭시 동작)
        window.focusAcademyLocationOnMap = function(lng, lat, name) {`;

const newFuncStr = `        // 학원 핀 클릭 시 학원 리스트에 가려질 때만 리스트 너비만큼 지도 이동, 가려지지 않으면 위치 유지
        window.checkAndAdjustMapForAcademyPin = function(lng, lat) {
            if (!lng || !lat || window.innerWidth <= 1024) return;
            const numLng = parseFloat(lng);
            const numLat = parseFloat(lat);
            if (isNaN(numLng) || isNaN(numLat)) return;

            const mapObj = window.kakaoMapInstance || (typeof kakaoMap !== 'undefined' ? kakaoMap : null);
            if (!mapObj || !window.kakao || !window.kakao.maps) return;

            const pos = new kakao.maps.LatLng(numLat, numLng);
            const mainSidebar = document.querySelector('.sidebar-section');
            const academySidebar = document.getElementById('academySidebar');
            const sidebarWidth = (mainSidebar && mainSidebar.offsetWidth > 0) ? mainSidebar.offsetWidth : 400;
            const listWidth = (academySidebar && academySidebar.offsetWidth > 0) ? academySidebar.offsetWidth : 340;
            const totalBlockedWidth = sidebarWidth + listWidth;

            const container = typeof mapObj.getContainer === 'function' ? mapObj.getContainer() : (document.getElementById('mapCanvas') || document.body);
            const containerWidth = container ? container.offsetWidth : window.innerWidth;

            if (typeof mapObj.getProjection === 'function') {
                const proj = mapObj.getProjection();
                if (proj && typeof proj.containerPointFromCoordinate === 'function') {
                    const pt = proj.containerPointFromCoordinate(pos);
                    const padding = 35; // 마커 크기 및 시각적 여유 패딩
                    const visibleBoundary = containerWidth - totalBlockedWidth - padding;

                    // 학원리스트가 열려서 클릭한 학원핀이 가려지는 위치인 경우에만 리스트 너비만큼 지도 이동
                    if (pt && pt.x > visibleBoundary) {
                        if (typeof mapObj.panBy === 'function') {
                            mapObj.panBy(listWidth, 0);
                        }
                    }
                    // 가려지지 않을 경우에는 지도를 이동하지 않고 위치 그대로 유지
                }
            }
        };

        // 전역 지적 이동/줌 헬퍼 등록 (학원 카드에서 📍 거리/지도 버튼 클릭시 동작)
        window.focusAcademyLocationOnMap = function(lng, lat, name) {`;

if (!appContent.includes('window.checkAndAdjustMapForAcademyPin = function')) {
    if (appContent.includes(targetFuncMarker)) {
        appContent = appContent.replace(targetFuncMarker, newFuncStr);
        console.log('Successfully added checkAndAdjustMapForAcademyPin to app.js');
    } else {
        console.error('Failed to locate targetFuncMarker in app.js');
    }
} else {
    console.log('checkAndAdjustMapForAcademyPin already exists in app.js');
}

// 2-2. Update single academy marker click in app.js
const targetSingleMarker = `                        const academySidebar = document.getElementById('academySidebar');
                        const isAlreadyOpen = academySidebar && (
                            academySidebar.style.display === 'flex' ||
                            (window.getComputedStyle && window.getComputedStyle(academySidebar).display !== 'none')
                        );

                        if (typeof window.openAcademyDetailModal === 'function') {
                            window.openAcademyDetailModal(primaryPlace);
                        }

                        if (!isAlreadyOpen) {
                            if (typeof window.centerAcademyPinWithSidebarOffset === 'function') {
                                window.centerAcademyPinWithSidebarOffset(primaryPlace.x, primaryPlace.y, primaryName);
                            } else if (mapObj && typeof mapObj.panTo === 'function') {
                                mapObj.panTo(pos);
                            }
                        }`;

const replSingleMarker = `                        window.isOpeningFromAcademyPin = true;
                        if (typeof window.openAcademyDetailModal === 'function') {
                            window.openAcademyDetailModal(primaryPlace);
                        }

                        setTimeout(() => {
                            if (typeof window.checkAndAdjustMapForAcademyPin === 'function') {
                                window.checkAndAdjustMapForAcademyPin(primaryPlace.x, primaryPlace.y);
                            }
                        }, 60);
                        setTimeout(() => {
                            window.isOpeningFromAcademyPin = false;
                        }, 350);`;

if (appContent.includes(targetSingleMarker)) {
    appContent = appContent.replace(targetSingleMarker, replSingleMarker);
    console.log('Successfully updated single academy marker click in app.js');
} else {
    console.log('targetSingleMarker not found or already updated in app.js');
}

// 2-3. Update cluster popup item click in app.js
const targetClusterItem = `                        // 플로팅 바에서 개별 학원 클릭 시 -> 학원상세와 학원리스트 사이드바 동시 오픈!
                        itemRow.addEventListener('click', (e) => {
                            e.stopPropagation();
                            closeClusterPopup();
                            if (typeof window.openAcademyDetailModal === 'function') {
                                window.openAcademyDetailModal(place);
                            }
                        });`;

const replClusterItem = `                        // 플로팅 바에서 개별 학원 클릭 시 -> 학원상세와 학원리스트 사이드바 동시 오픈!
                        itemRow.addEventListener('click', (e) => {
                            e.stopPropagation();
                            closeClusterPopup();
                            window.isOpeningFromAcademyPin = true;
                            if (typeof window.openAcademyDetailModal === 'function') {
                                window.openAcademyDetailModal(place);
                            }
                            setTimeout(() => {
                                if (typeof window.checkAndAdjustMapForAcademyPin === 'function') {
                                    window.checkAndAdjustMapForAcademyPin(place.x, place.y);
                                }
                            }, 60);
                            setTimeout(() => {
                                window.isOpeningFromAcademyPin = false;
                            }, 350);
                        });`;

if (appContent.includes(targetClusterItem)) {
    appContent = appContent.replace(targetClusterItem, replClusterItem);
    console.log('Successfully updated cluster popup item click in app.js');
} else {
    console.log('targetClusterItem not found or already updated in app.js');
}

const finalApp = isAppCRLF ? appContent.replace(/\n/g, '\r\n') : appContent;
fs.writeFileSync(appPath, finalApp, 'utf8');
console.log('app.js successfully saved!');
