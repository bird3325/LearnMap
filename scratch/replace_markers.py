import os

filepath = 'app.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Target block to replace
target = """    // Helper to draw single Custom Overlay on Kakao map
    function createMarker(school, coords) {
        // DOM 엘리먼트 동적 생성 (HTML 문자열 파싱 오류 및 이벤트 유실 방지)
        const overlayEl = document.createElement('div');
        overlayEl.className = 'school-overlay';
        overlayEl.style.cursor = 'pointer';
        overlayEl.style.position = 'absolute';
        overlayEl.style.width = '0px';
        overlayEl.style.height = '0px';
        overlayEl.style.zIndex = '999';
        
        // 클릭 시 상세 정보 바인딩
        overlayEl.onclick = () => {
            window.selectSchoolById(school.school_id);
        };

        const pinEl = document.createElement('div');
        pinEl.className = `school-pin pin-${school.pin_color}`;
        // 핀의 뾰족한 끝이 정확히 (0,0)에 위치하도록 마진 조정
        pinEl.style.left = '-19px';
        pinEl.style.top = '-46px';
        
        const labelEl = document.createElement('div');
        labelEl.className = 'pin-label';
        labelEl.style.position = 'absolute';
        // 핀 바로 위에 라벨이 위치하도록 조정
        labelEl.style.top = '-46px';
        labelEl.style.left = '0px';
        labelEl.style.transform = 'translate(-50%, -100%)';
        labelEl.innerText = school.school_name;

        overlayEl.appendChild(pinEl);
        overlayEl.appendChild(labelEl);

        const marker = new kakao.maps.CustomOverlay({
            position: coords,
            content: overlayEl,
            xAnchor: 0,
            yAnchor: 0,
            zIndex: 999,
            clickable: true
        });

        marker.setMap(kakaoMap);
        mapMarkers.push(marker);
    }

    function renderPins(schools, shouldCenter) {
        // Clear existing markers from Kakao Map
        mapMarkers.forEach(marker => marker.setMap(null));
        mapMarkers = [];
        
        pinsContainer.innerHTML = '';
        let centered = false;

        const zoomLevel = kakaoMap ? kakaoMap.getLevel() : 5;

        // 7레벨 이상일 경우 개별 핀 대신 클러스터러에 등록
        if (zoomLevel >= 7) {
            if (clusterer) {
                clusterer.clear();
                const markers = schools.map(school => {
                    if (kakaoMap && school.lat && school.lng) {
                        const coords = new kakao.maps.LatLng(school.lat, school.lng);
                        if (shouldCenter && !centered) {
                            kakaoMap.setCenter(coords);
                            kakaoMap.setLevel(5); // 줌인되면 zoom_changed 이벤트를 통해 개별 핀이 다시 활성화됩니다.
                            centered = true;
                        }
                        const marker = new kakao.maps.Marker({
                            position: coords
                        });
                        
                        kakao.maps.event.addListener(marker, 'click', () => {
                            const summary = orchestrator.selectSchool(school);
                            showSchoolDetails(summary, school);
                        });
                        return marker;
                    }
                    return null;
                }).filter(m => m !== null);
                clusterer.addMarkers(markers);
            }
            return;
        }

        // 6레벨 이하일 경우 클러스터를 지우고 개별 핀으로 표시
        if (clusterer) {
            clusterer.clear();
        }

        schools.forEach((school, index) => {
            if (kakaoMap && school.lat && school.lng) {
                const coords = new kakao.maps.LatLng(school.lat, school.lng);
                createMarker(school, coords);

                if (shouldCenter && !centered) {
                    kakaoMap.setCenter(coords);
                    kakaoMap.setLevel(5); // Zoom in so that markers become visible (<=6)
                    centered = true;
                }
            } else {
                // Fallback to stylized SVG map overlay coordinates if offline or failing
                const xOffset = 100 + (index * 220);
                const yOffset = 250 + (index * 130);

                const pinEl = document.createElement('div');
                pinEl.className = `school-pin pin-${school.pin_color}`;
                pinEl.style.left = `${xOffset}px`;
                pinEl.style.top = `${yOffset}px`;
                pinEl.title = school.school_name;

                const labelEl = document.createElement('div');
                labelEl.className = 'pin-label';
                labelEl.innerText = school.school_name;
                labelEl.style.left = `${xOffset + 19}px`;
                labelEl.style.top = `${yOffset}px`;

                pinEl.addEventListener('click', () => {
                    const summary = orchestrator.selectSchool(school);
                    showSchoolDetails(summary, school);
                });

                pinsContainer.appendChild(pinEl);
                pinsContainer.appendChild(labelEl);
            }
        });
    }"""

replacement = """    // Helper to draw single Custom Overlay on Kakao map
    function createMarkerObject(school, coords) {
        // DOM 엘리먼트 동적 생성 (HTML 문자열 파싱 오류 및 이벤트 유실 방지)
        const overlayEl = document.createElement('div');
        overlayEl.className = 'school-overlay';
        overlayEl.style.cursor = 'pointer';
        overlayEl.style.position = 'absolute';
        overlayEl.style.width = '0px';
        overlayEl.style.height = '0px';
        overlayEl.style.zIndex = '999';
        
        // 클릭 시 상세 정보 바인딩
        overlayEl.onclick = () => {
            window.selectSchoolById(school.school_id);
        };

        const pinEl = document.createElement('div');
        pinEl.className = `school-pin pin-${school.pin_color}`;
        // 핀의 뾰족한 끝이 정확히 (0,0)에 위치하도록 마진 조정
        pinEl.style.left = '-19px';
        pinEl.style.top = '-46px';
        
        const labelEl = document.createElement('div');
        labelEl.className = 'pin-label';
        labelEl.style.position = 'absolute';
        // 핀 바로 위에 라벨이 위치하도록 조정
        labelEl.style.top = '-46px';
        labelEl.style.left = '0px';
        labelEl.style.transform = 'translate(-50%, -100%)';
        labelEl.innerText = school.school_name;

        overlayEl.appendChild(pinEl);
        overlayEl.appendChild(labelEl);

        const marker = new kakao.maps.CustomOverlay({
            position: coords,
            content: overlayEl,
            xAnchor: 0,
            yAnchor: 0,
            zIndex: 999,
            clickable: true
        });

        marker.setMap(kakaoMap);
        return marker;
    }

    function renderPins(schools, shouldCenter) {
        const zoomLevel = kakaoMap ? kakaoMap.getLevel() : 5;

        // 7레벨 이상일 경우 개별 핀 대신 클러스터러에 등록
        if (zoomLevel >= 7) {
            // 기존 핀 모두 지우기
            mapMarkers.forEach(item => {
                if (item.marker) item.marker.setMap(null);
                else item.setMap(null);
            });
            mapMarkers = [];
            pinsContainer.innerHTML = '';

            if (clusterer) {
                clusterer.clear();
                const markers = schools.map(school => {
                    if (kakaoMap && school.lat && school.lng) {
                        const coords = new kakao.maps.LatLng(school.lat, school.lng);
                        if (shouldCenter) {
                            kakaoMap.setCenter(coords);
                            kakaoMap.setLevel(5); // 줌인되면 zoom_changed 이벤트를 통해 개별 핀이 다시 활성화됩니다.
                        }
                        const marker = new kakao.maps.Marker({
                            position: coords
                        });
                        
                        kakao.maps.event.addListener(marker, 'click', () => {
                            const summary = orchestrator.selectSchool(school);
                            showSchoolDetails(summary, school);
                        });
                        return marker;
                    }
                    return null;
                }).filter(m => m !== null);
                clusterer.addMarkers(markers);
            }
            return;
        }

        // 6레벨 이하일 경우 클러스터를 지우고 개별 핀으로 표시
        if (clusterer) {
            clusterer.clear();
        }

        let centered = false;
        
        // Reconcile markers to prevent flickering
        const newSchoolIds = new Set(schools.map(s => s.school_id));
        const keepMarkers = [];
        const removeMarkers = [];

        mapMarkers.forEach(item => {
            // 만약 id가 없는 예전 규격 마커가 남아 있다면 지움
            if (!item.id || !item.marker) {
                removeMarkers.push(item);
                return;
            }
            if (newSchoolIds.has(item.id)) {
                // 기존 마커 유지 및 색상 클래스 동적 갱신
                const school = schools.find(s => s.school_id === item.id);
                if (school && item.content) {
                    const pin = item.content.querySelector('.school-pin');
                    if (pin) {
                        pin.className = `school-pin pin-${school.pin_color}`;
                    }
                }
                keepMarkers.push(item);
            } else {
                removeMarkers.push(item);
            }
        });

        // 지울 마커들 지도에서 제거
        removeMarkers.forEach(item => {
            if (item.marker) item.marker.setMap(null);
            else item.setMap(null);
        });

        mapMarkers = keepMarkers;
        pinsContainer.innerHTML = '';

        schools.forEach((school, index) => {
            if (kakaoMap && school.lat && school.lng) {
                const coords = new kakao.maps.LatLng(school.lat, school.lng);
                
                // 마커가 없을 때만 신규 생성
                const existing = mapMarkers.find(item => item.id === school.school_id);
                if (!existing) {
                    const marker = createMarkerObject(school, coords);
                    mapMarkers.push({
                        id: school.school_id,
                        marker: marker,
                        content: marker.getContent()
                    });
                }

                if (shouldCenter && !centered) {
                    kakaoMap.setCenter(coords);
                    kakaoMap.setLevel(5); // Zoom in so that markers become visible (<=6)
                    centered = true;
                }
            } else {
                // Fallback to stylized SVG map overlay coordinates if offline or failing
                const xOffset = 100 + (index * 220);
                const yOffset = 250 + (index * 130);

                const pinEl = document.createElement('div');
                pinEl.className = `school-pin pin-${school.pin_color}`;
                pinEl.style.left = `${xOffset}px`;
                pinEl.style.top = `${yOffset}px`;
                pinEl.title = school.school_name;

                const labelEl = document.createElement('div');
                labelEl.className = 'pin-label';
                labelEl.innerText = school.school_name;
                labelEl.style.left = `${xOffset + 19}px`;
                labelEl.style.top = `${yOffset}px`;

                pinEl.addEventListener('click', () => {
                    const summary = orchestrator.selectSchool(school);
                    showSchoolDetails(summary, school);
                });

                pinsContainer.appendChild(pinEl);
                pinsContainer.appendChild(labelEl);
            }
        });
    }"""

# Do replacement (handling potential windows line endings)
norm_content = content.replace('\\r\\n', '\\n')
norm_target = target.replace('\\r\\n', '\\n')
norm_replacement = replacement.replace('\\r\\n', '\\n')

if norm_target in norm_content:
    content = norm_content.replace(norm_target, norm_replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success: Markers replaced successfully")
else:
    # Try direct replacement
    if target in content:
        content = content.replace(target, replacement)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Success: Direct markers replaced successfully")
    else:
        print("Error: Target block not found in app.js")
