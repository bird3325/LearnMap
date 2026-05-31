// Main entry point
import { Orchestrator } from './src/agents/orchestrator.js';

document.addEventListener('DOMContentLoaded', () => {
    const orchestrator = new Orchestrator();

    // --- Custom Alert Modal Override ---
    window.alert = function(message) {
        let alertModal = document.getElementById('customAlertModal');
        if (!alertModal) {
            alertModal = document.createElement('div');
            alertModal.id = 'customAlertModal';
            alertModal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:999999; display:flex; justify-content:center; align-items:center; opacity:0; transition:opacity 0.2s; pointer-events:none;';
            alertModal.innerHTML = `
                <div style="background:var(--bg-primary, #ffffff); padding:30px 40px; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,0.3); text-align:center; max-width:80%; transform:translateY(20px); transition:transform 0.2s; border:1px solid var(--border-color, #eee);">
                    <div id="customAlertMessage" style="font-size:16px; font-weight:600; color:var(--text-main, #333); margin-bottom:24px; line-height:1.5; white-space:pre-wrap;"></div>
                    <button onclick="document.getElementById('customAlertModal').style.opacity='0'; document.getElementById('customAlertModal').style.pointerEvents='none'; document.querySelector('#customAlertModal > div').style.transform='translateY(20px)';" style="background:var(--primary-blue, #2563eb); color:white; border:none; border-radius:8px; padding:12px 30px; font-size:15px; font-weight:bold; cursor:pointer; outline:none; transition:background 0.2s;">확인</button>
                </div>
            `;
            document.body.appendChild(alertModal);
        }
        document.getElementById('customAlertMessage').innerText = message;
        alertModal.style.opacity = '1';
        alertModal.style.pointerEvents = 'auto';
        alertModal.querySelector('div').style.transform = 'translateY(0)';
    };
    // ------------------------------------

    // DOM References
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const regionFilter = document.getElementById('regionFilter');
    const schoolTypeFilter = document.getElementById('schoolTypeFilter');
    const pinsContainer = document.getElementById('pinsContainer');

    // Sidebar Cards
    const welcomeCard = document.getElementById('welcomeCard');
    const schoolCard = document.getElementById('schoolCard');
    const childFormCard = document.getElementById('childFormCard');
    const diagnosisResultCard = document.getElementById('diagnosisResultCard');

    // School Details Elements
    const schoolCardName = document.getElementById('schoolCardName');
    const schoolCardType = document.getElementById('schoolCardType');
    const schoolCardStudents = document.getElementById('schoolCardStudents');
    const schoolCardClassSize = document.getElementById('schoolCardClassSize');
    const schoolCardUpdate = document.getElementById('schoolCardUpdate');
    const schoolInsight = document.getElementById('schoolInsight');
    const schoolKorAvg = document.getElementById('schoolKorAvg');
    const schoolEngAvg = document.getElementById('schoolEngAvg');
    const schoolMathAvg = document.getElementById('schoolMathAvg');

    // Subject Chart Bars
    const schoolKorBar = document.getElementById('schoolKorBar');
    const schoolEngBar = document.getElementById('schoolEngBar');
    const schoolMathBar = document.getElementById('schoolMathBar');

    // Subject Change Indicators
    const schoolKorChange = document.getElementById('schoolKorChange');
    const schoolEngChange = document.getElementById('schoolEngChange');
    const schoolMathChange = document.getElementById('schoolMathChange');

    // Buttons inside School Card
    const btnCompareChild = document.getElementById('btnCompareChild');
    const btnCompareBoard = document.getElementById('btnCompareBoard');

    // Form Navigation & Action Buttons
    const btnBackToSchool = document.getElementById('btnBackToSchool');
    const btnBackToForm = document.getElementById('btnBackToForm');
    const btnRunDiagnosis = document.getElementById('btnRunDiagnosis');

    // Diagnosis Output Elements
    const diagnosticSummaryLabel = document.getElementById('diagnosticSummaryLabel');
    const diagnosticSummaryDesc = document.getElementById('diagnosticSummaryDesc');
    const subjectDiagnosisContainer = document.getElementById('subjectDiagnosisContainer');

    // Supabase & Review Elements
    const SUPABASE_URL = 'https://khwzgqnwlknawggugznd.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pncW53bGtuYXdnZ3Vnem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDQzNDksImV4cCI6MjA5NTc4MDM0OX0.P2g3Y_MYV_ca8ZRpfAT93pnEzP4osYWc2tfyBHKb7v4';
    const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
    const btnShowReviews = document.getElementById('btnShowReviews');

    // Comparison Overlay Elements
    const compareOverlay = document.getElementById('compareOverlay');
    const compareGrid = document.getElementById('compareGrid');
    const btnCloseCompare = document.getElementById('btnCloseCompare');
    let lastDiagnosisResult = null;

    document.getElementById('selCompareRegion').addEventListener('change', () => {
        if (lastDiagnosisResult) {
            renderDiagnosisResults(lastDiagnosisResult);
        }
    });

    // Event Listeners
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    regionFilter.addEventListener('change', () => {
        onRegionFilterChange();
        // 지도가 이동한 후 영역 내 학교를 표시하기 위해 약간의 지연 후 호출
        setTimeout(onMapAction, 150);
    });
    schoolTypeFilter.addEventListener('change', () => {
        onMapAction();
    });

    btnCompareChild.addEventListener('click', () => {
        schoolCard.style.display = 'none';
        childFormCard.style.display = 'block';
    });

    btnBackToSchool.addEventListener('click', () => {
        childFormCard.style.display = 'none';
        schoolCard.style.display = 'block';
    });

    btnBackToForm.addEventListener('click', () => {
        diagnosisResultCard.style.display = 'none';
        childFormCard.style.display = 'block';
    });

    btnRunDiagnosis.addEventListener('click', () => {
        orchestrator.state.childProfile.name = document.getElementById('childName').value;
        orchestrator.state.childProfile.grade = document.getElementById('childGrade').value;

        const scores = {
            korean: parseInt(document.getElementById('childKor').value) || 0,
            english: parseInt(document.getElementById('childEng').value) || 0,
            math: parseInt(document.getElementById('childMath').value) || 0
        };

        const result = orchestrator.childPerformanceDiagnosis(scores);
        
        // Reset compare region dropdown to selected school's region
        const defaultRegion = orchestrator.state.selectedSchool ? orchestrator.state.selectedSchool.region : '서울특별시';
        document.getElementById('selCompareRegion').value = defaultRegion;

        renderDiagnosisResults(result);
        childFormCard.style.display = 'none';
        diagnosisResultCard.style.display = 'block';
    });

    btnCompareBoard.addEventListener('click', () => {
        if (!orchestrator.state.selectedSchool) return;
        
        const exists = orchestrator.state.comparisonList.some(s => s.school_id === orchestrator.state.selectedSchool.school_id);
        if (exists) {
            // 이미 추가되었을 경우 비교보드 매트릭스를 그대로 다시 렌더링하여 화면에 보여줍니다.
            const comparisonTable = orchestrator.compareAgent.generateComparisonMatrix(orchestrator.state.comparisonList, orchestrator.state.childProfile.scores);
            renderComparisonBoard(comparisonTable);
            compareOverlay.style.display = 'block';
        } else {
            const res = orchestrator.addToComparison(orchestrator.state.selectedSchool);
            if (res.success) {
                renderComparisonBoard(res.data);
                compareOverlay.style.display = 'block';
            } else {
                alert(res.message);
            }
        }
    });

    btnCloseCompare.addEventListener('click', () => {
        compareOverlay.style.display = 'none';
    });

    if (btnShowReviews) {
        btnShowReviews.addEventListener('click', () => {
            if (!orchestrator.state.selectedSchool) return;
            document.getElementById('schoolReviewListModal').style.display = 'flex';
            fetchSchoolReviews(orchestrator.state.selectedSchool.school_id);
        });
    }

    let currentSchoolReviewPage = 1;
    let schoolReviewsData = [];
    const REVIEWS_PER_PAGE = 4;

    window.goToSchoolReviewPage = function(page) {
        currentSchoolReviewPage = page;
        renderSchoolReviewsList();
    };

    function renderSchoolReviewsList() {
        const container = document.getElementById('schoolReviewListContainer');
        if (!schoolReviewsData || schoolReviewsData.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px 0; font-size: 13px;">아직 등록된 리뷰가 없습니다. 첫 번째 리뷰를 남겨주세요!</div>';
            return;
        }

        const totalPages = Math.ceil(schoolReviewsData.length / REVIEWS_PER_PAGE);
        if (currentSchoolReviewPage < 1) currentSchoolReviewPage = 1;
        if (currentSchoolReviewPage > totalPages) currentSchoolReviewPage = totalPages;

        const startIndex = (currentSchoolReviewPage - 1) * REVIEWS_PER_PAGE;
        const endIndex = startIndex + REVIEWS_PER_PAGE;
        const currentData = schoolReviewsData.slice(startIndex, endIndex);

        let html = currentData.map(review => `
            <div style="border-bottom: 1px solid var(--border-color); padding: 12px 0; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <strong>${review.nickname || '익명'}</strong>
                    <span style="color: var(--warning-yellow);">
                        ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                    </span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">
                    ${new Date(review.created_at).toLocaleDateString()}
                </div>
                <div style="font-size: 13px; line-height: 1.5;">
                    ${review.content.replace(/\n/g, '<br>')}
                </div>
            </div>
        `).join('');

        if (totalPages > 1) {
            html += '<div style="display: flex; justify-content: center; gap: 8px; margin-top: 16px;">';
            for (let i = 1; i <= totalPages; i++) {
                if (i === currentSchoolReviewPage) {
                    html += `<button style="padding: 4px 10px; background: var(--primary-blue); color: white; border: none; border-radius: 4px; font-size: 12px;">${i}</button>`;
                } else {
                    html += `<button onclick="window.goToSchoolReviewPage(${i})" style="padding: 4px 10px; background: #f0f0f0; color: #333; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#e0e0e0'" onmouseout="this.style.background='#f0f0f0'">${i}</button>`;
                }
            }
            html += '</div>';
        }
        container.innerHTML = html;
    }

    async function fetchSchoolReviews(schoolId) {
        const container = document.getElementById('schoolReviewListContainer');
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px 0; font-size: 13px;">리뷰를 불러오는 중입니다...</div>';
        
        if (!supabase) {
            container.innerHTML = '<div style="text-align: center; color: var(--danger-red); padding: 20px 0; font-size: 13px;">Supabase 클라이언트가 초기화되지 않았습니다.</div>';
            return;
        }

        try {
            const { data, error } = await supabase
                .from('school_reviews')
                .select('*')
                .eq('school_id', schoolId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            schoolReviewsData = data || [];
            currentSchoolReviewPage = 1;
            renderSchoolReviewsList();

        } catch (err) {
            console.error('Error fetching reviews:', err);
            container.innerHTML = '<div style="text-align: center; color: var(--danger-red); padding: 20px 0; font-size: 13px;">리뷰를 불러오는데 실패했습니다.</div>';
        }
    }

    window.openSchoolReviewForm = function() {
        document.getElementById('schoolReviewFormModal').style.display = 'flex';
    };

    window.submitSchoolReview = async function() {
        if (!orchestrator.state.selectedSchool) {
            alert('선택된 학교가 없습니다.');
            return;
        }
        if (!supabase) {
            alert('Supabase 연동이 필요합니다.');
            return;
        }

        const nickname = document.getElementById('schoolReviewNickname').value.trim() || '익명';
        const password = document.getElementById('schoolReviewPassword').value.trim();
        const rating = parseInt(document.getElementById('schoolReviewRating').value);
        const content = document.getElementById('schoolReviewContent').value.trim();

        if (!content) {
            alert('리뷰 내용을 입력해주세요.');
            return;
        }

        try {
            const { error } = await supabase
                .from('school_reviews')
                .insert([
                    {
                        school_id: orchestrator.state.selectedSchool.school_id,
                        nickname: nickname,
                        password: password, // In a real app, hash this!
                        rating: rating,
                        content: content
                    }
                ]);

            if (error) throw error;

            alert('리뷰가 등록되었습니다!');
            document.getElementById('schoolReviewFormModal').style.display = 'none';
            document.getElementById('schoolReviewContent').value = '';
            fetchSchoolReviews(orchestrator.state.selectedSchool.school_id);
        } catch (err) {
            console.error('Error submitting review:', err);
            alert('리뷰 등록에 실패했습니다: ' + err.message);
        }
    };

    // Sub-agent trigger methods connected to DOM
    orchestrator.childPerformanceDiagnosis = function(scores) {
        return this.analyzeChildPerformance(scores);
    };

    let kakaoMap = null;
    let geocoder = null;
    let clusterer = null;
    let mapMarkers = [];
    let currentLoadedSchools = []; // Cache for currently loaded school data
    let schoolsDatabase = []; // In-memory database of all schools fetched from backend

    const diagnosticLog = document.getElementById('diagnosticLog');
    function logDiagnostic(msg) {
        if (diagnosticLog) {
            diagnosticLog.innerHTML += `[${new Date().toLocaleTimeString()}] ${msg}<br>`;
            diagnosticLog.scrollTop = diagnosticLog.scrollHeight;
        }
        console.log(msg);
    }

    // 1. Dynamic Kakao SDK Loader
    function loadKakaoSdk() {
        return new Promise((resolve) => {
            logDiagnostic('백엔드로부터 Kakao Maps API 키 조회 중...');
            fetch('/api/config/map-key')
                .then(res => res.json())
                .then(data => {
                    const appkey = data.kakao_app_key;
                    if (!appkey) {
                        logDiagnostic('[Warning] 카카오 지도 API 키가 설정되지 않았습니다. 관리자 페이지(/admin.html)에서 키를 저장해 주세요.');
                        resolve(false);
                        return;
                    }
                    
                    logDiagnostic('Kakao Maps SDK 스크립트 삽입 중...');
                    const script = document.createElement('script');
                    script.type = 'text/javascript';
                    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&libraries=services,clusterer&autoload=false`;
                    script.onload = () => {
                        logDiagnostic('Kakao Maps SDK 로드 완료.');
                        resolve(true);
                    };
                    script.onerror = () => {
                        logDiagnostic('[Error] Kakao Maps SDK 스크립트 로드 실패.');
                        resolve(false);
                    };
                    document.head.appendChild(script);
                })
                .catch(err => {
                    logDiagnostic(`[Error] API 키 조회 에러: ${err.message}`);
                    resolve(false);
                });
        });
    }

    // 2. Initialize Kakao Map Object
    const initMap = () => {
        return new Promise((resolve) => {
            if (window.kakao && window.kakao.maps) {
                window.kakao.maps.load(() => {
                    try {
                        const container = document.getElementById('mapCanvas');
                        container.innerHTML = ''; // Clear SVG fallback content
                        const options = {
                            center: new kakao.maps.LatLng(37.4979, 127.0276), // Default: Gangnam
                            level: 5
                        };
                        kakaoMap = new kakao.maps.Map(container, options);
                        window.kakaoMapInstance = kakaoMap;
                        geocoder = new kakao.maps.services.Geocoder();
                        clusterer = new kakao.maps.MarkerClusterer({
                            map: kakaoMap,
                            averageCenter: true,
                            minLevel: 7,
                            minClusterSize: 1,
                            calculator: [10, 30, 50],
                            styles: [
                                { width: '40px', height: '40px', background: 'rgba(51, 204, 255, 0.8)', borderRadius: '20px', color: '#000', textAlign: 'center', fontWeight: 'bold', lineHeight: '40px' },
                                { width: '45px', height: '45px', background: 'rgba(255, 153, 0, 0.8)', borderRadius: '22.5px', color: '#fff', textAlign: 'center', fontWeight: 'bold', lineHeight: '45px' },
                                { width: '50px', height: '50px', background: 'rgba(255, 51, 204, 0.8)', borderRadius: '25px', color: '#fff', textAlign: 'center', fontWeight: 'bold', lineHeight: '50px' },
                                { width: '60px', height: '60px', background: 'rgba(255, 0, 0, 0.8)', borderRadius: '30px', color: '#fff', textAlign: 'center', fontWeight: 'bold', lineHeight: '60px' }
                            ]
                        });

                        // Register Map Interaction events
                        kakao.maps.event.addListener(kakaoMap, 'dragend', () => {
                            onMapAction();
                        });
                        kakao.maps.event.addListener(kakaoMap, 'zoom_changed', () => {
                            onMapAction();
                        });

                        logDiagnostic('카카오 지도 객체 및 이벤트 바인딩 성공.');
                    } catch (e) {
                        logDiagnostic(`카카오 지도 객체 생성 에러: ${e.message}`);
                    }
                    resolve();
                });
            } else {
                logDiagnostic('window.kakao 객체를 찾을 수 없습니다.');
                resolve();
            }
        });
    };

    // 3. Load Schools Database from Server
    async function loadSchoolsDatabase() {
        try {
            logDiagnostic('서버로부터 최신 학교 데이터베이스 로딩 중...');
            const response = await fetch('/api/schools');
            schoolsDatabase = await response.json();
            logDiagnostic(`데이터베이스 로드 완료. 총 학교 수: ${schoolsDatabase.length}개`);
        } catch (e) {
            logDiagnostic(`학교 데이터베이스 로드 실패: ${e.message}`);
        }
    }

    // Dynamic Startup Flow
    loadKakaoSdk().then((success) => {
        if (success) {
            initMap().then(() => {
                loadSchoolsDatabase().then(() => {
                    logDiagnostic('지도 및 로컬 DB 연동 완료.');
                    onMapAction();
                });
            });
        } else {
            logDiagnostic('오프라인 대체 모드로 시뮬레이션을 작동합니다.');
            loadSchoolsDatabase().then(() => {
                renderPins(schoolsDatabase.slice(0, 10), false);
            });
        }
    });

    function onRegionFilterChange() {
        if (!kakaoMap) return;
        const region = regionFilter.value;
        
        const regionCoords = {
            'all': { lat: 36.2683, lng: 127.6358, level: 12 },
            '서울특별시': { lat: 37.5665, lng: 126.9780, level: 7 },
            '부산광역시': { lat: 35.1796, lng: 129.0756, level: 7 },
            '대구광역시': { lat: 35.8714, lng: 128.6014, level: 7 },
            '인천광역시': { lat: 37.4563, lng: 126.7052, level: 7 },
            '광주광역시': { lat: 35.1595, lng: 126.8526, level: 7 },
            '대전광역시': { lat: 36.3504, lng: 127.3845, level: 7 },
            '울산광역시': { lat: 35.5384, lng: 129.3114, level: 7 },
            '세종특별자치시': { lat: 36.4800, lng: 127.2890, level: 7 },
            '경기도': { lat: 37.2750, lng: 127.0094, level: 9 },
            '강원특별자치도': { lat: 37.8854, lng: 127.7298, level: 10 },
            '충청북도': { lat: 36.6356, lng: 127.4912, level: 9 },
            '충청남도': { lat: 36.6588, lng: 126.6728, level: 9 },
            '전북특별자치도': { lat: 35.8242, lng: 127.1480, level: 9 },
            '전라남도': { lat: 34.8160, lng: 126.4629, level: 9 },
            '경상북도': { lat: 36.5760, lng: 128.5056, level: 10 },
            '경상남도': { lat: 35.2378, lng: 128.6919, level: 9 },
            '제주특별자치도': { lat: 33.4890, lng: 126.4983, level: 9 }
        };

        const target = regionCoords[region];
        if (target) {
            kakaoMap.setCenter(new kakao.maps.LatLng(target.lat, target.lng));
            kakaoMap.setLevel(target.level);
        }
    }

    // 4. Memory-based School Search
    async function performSearch(overrideQuery) {
        const query = (overrideQuery !== undefined && !(overrideQuery instanceof Event)) ? overrideQuery : searchInput.value;
        
        // Sync Filters
        orchestrator.state.filters.schoolType = schoolTypeFilter.value;
        
        logDiagnostic(`[performSearch] 로컬 DB 검색 시작: "${JSON.stringify(query)}" (필터: ${orchestrator.state.filters.schoolType}, 지역: ${regionFilter.value})`);
        
        let filtered = schoolsDatabase;

        // Region Filter
        const selectedRegion = regionFilter.value;
        if (selectedRegion !== 'all') {
            filtered = filtered.filter(s => s.region === selectedRegion);
        }

        // School Type Filter
        if (orchestrator.state.filters.schoolType !== 'all') {
            let typeLabel = '중학교';
            if (orchestrator.state.filters.schoolType === 'elementary') typeLabel = '초등학교';
            else if (orchestrator.state.filters.schoolType === 'high') typeLabel = '고등학교';
            filtered = filtered.filter(s => s.school_type === typeLabel);
        }

        // Search Term Match (Name or Address)
        if (typeof query === 'string' && query.trim() !== '') {
            const term = query.trim().toLowerCase();
            filtered = filtered.filter(s => 
                s.school_name.toLowerCase().includes(term) || 
                (s.address && s.address.toLowerCase().includes(term))
            );
        }

        // Cap to 25 results
        filtered = filtered.slice(0, 25);
        currentLoadedSchools = filtered;
        
        const isManualSearch = typeof query === 'string' && query.trim() !== '';
        renderPins(filtered, isManualSearch);
    }

    // 5. Memory-based Bounding Box filtering on Drag / Zoom
    function onMapAction() {
        if (!kakaoMap) {
            logDiagnostic('[onMapAction Warning] 지도가 초기화되지 않았습니다.');
            return;
        }

        const center = kakaoMap.getCenter();

        // 역지오코딩으로 지도 중심 지역을 파악해 드롭다운과 클러스터를 함께 갱신
        // (콜백 내부에서 필터 확정 후 클러스터를 그려 타이밍 충돌 방지)
        const doRender = (regionToUse) => {
            const zoomLevel = kakaoMap.getLevel();
            orchestrator.state.filters.schoolType = schoolTypeFilter.value;
            _renderMapForRegion(zoomLevel, regionToUse);
        };

        if (geocoder) {
            geocoder.coord2RegionCode(center.getLng(), center.getLat(), (result, status) => {
                let detectedRegion = regionFilter.value; // 기본값: 현재 선택된 값 유지
                if (status === kakao.maps.services.Status.OK) {
                    for (let i = 0; i < result.length; i++) {
                        if (result[i].region_type === 'H') {
                            const sidoName = result[i].region_1depth_name;
                            const sidoMapping = {
                                "서울": "서울특별시", "부산": "부산광역시", "대구": "대구광역시",
                                "인천": "인천광역시", "광주": "광주광역시", "대전": "대전광역시",
                                "울산": "울산광역시", "경기": "경기도", "충북": "충청북도",
                                "충남": "충청남도", "전남": "전라남도", "경북": "경상북도",
                                "경남": "경상남도", "세종": "세종특별자치시", "강원": "강원특별자치도",
                                "전북": "전북특별자치도", "제주": "제주특별자치도", "경상북도": "경상북도"
                            };
                            const mapped = sidoMapping[sidoName] || sidoName;
                            const optionExists = Array.from(regionFilter.options).some(opt => opt.value === mapped);
                            if (optionExists) {
                                detectedRegion = mapped;
                                if (regionFilter.value !== mapped) {
                                    regionFilter.value = mapped;
                                    logDiagnostic(`[geocoder] 지역 필터 자동 갱신: ${mapped}`);
                                }
                            }
                            break;
                        }
                    }
                }
                doRender(detectedRegion);
            });
        } else {
            // geocoder 없으면 현재 드롭다운 값 그대로 렌더
            const zoomLevel = kakaoMap.getLevel();
            orchestrator.state.filters.schoolType = schoolTypeFilter.value;
            _renderMapForRegion(zoomLevel, regionFilter.value);
        }
    }

    // 실제 지도 렌더링 로직 (지역/줌 확정 후 호출)
    function _renderMapForRegion(zoomLevel, selectedRegion) {

        if (zoomLevel >= 7) {
            logDiagnostic(`[_renderMapForRegion] 클러스터 모드 (줌: ${zoomLevel}, 지역: ${selectedRegion})`);

            // 클러스터 모드 가이드로 범례 변경
            const legendTitle = document.getElementById('legendTitleText');
            const legendContent = document.getElementById('legendContent');
            if (legendTitle) legendTitle.innerText = '지도 클러스터 가이드 (학교 수)';
            if (legendContent) legendContent.innerHTML = `
                <div style="font-size: 11px; color: var(--text-muted); text-align: center; margin-bottom: 8px;">
                    지도를 <strong>확대(줌 인)</strong>하시면 개별 학교의<br>학업성취도를 확인할 수 있습니다.
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: rgba(51, 204, 255, 0.8);"></span>
                    <span style="font-weight: 500; color: var(--text-main);">10개 미만</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: rgba(255, 153, 0, 0.8);"></span>
                    <span style="font-weight: 500; color: var(--text-main);">10 ~ 30개 미만</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: rgba(255, 51, 204, 0.8);"></span>
                    <span style="font-weight: 500; color: var(--text-main);">30 ~ 50개 미만</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: rgba(255, 0, 0, 0.8);"></span>
                    <span style="font-weight: 500; color: var(--text-main);">50개 이상</span>
                </div>
            `;

            // 개별 핀 숨기기
            mapMarkers.forEach(marker => marker.setMap(null));
            mapMarkers = [];
            currentLoadedSchools = [];

            let typeLabel = '중학교';
            if (orchestrator.state.filters.schoolType === 'elementary') typeLabel = '초등학교';
            else if (orchestrator.state.filters.schoolType === 'high') typeLabel = '고등학교';

            // selectedRegion 인자로 필터링 (드롭다운 값이 아닌 geocoder 확정값 사용)
            const filteredForCluster = schoolsDatabase.filter(school => {
                if (!school.lat || !school.lng) return false;
                if (selectedRegion !== 'all' && school.region !== selectedRegion) return false;
                if (orchestrator.state.filters.schoolType !== 'all' && school.school_type !== typeLabel) return false;
                return true;
            });

            const markers = filteredForCluster.map(school => {
                const marker = new kakao.maps.Marker({
                    position: new kakao.maps.LatLng(school.lat, school.lng)
                });
                kakao.maps.event.addListener(marker, 'click', () => {
                    const summary = orchestrator.selectSchool(school);
                    showSchoolDetails(summary, school);
                    const sidebar = document.querySelector('.sidebar-section');
                    if (sidebar && sidebar.style.display === 'none') {
                        if (typeof toggleSidebar === 'function') toggleSidebar();
                    }
                });
                return marker;
            });

            if (clusterer) {
                clusterer.clear();
                clusterer.addMarkers(markers);
            }
            return;
        }

        // 줌 레벨 6 이하: 클러스터 해제 후 개별 핀 모드
        if (clusterer) {
            clusterer.clear();
        }

        // 학업성취도 가이드 범례 복구
        const legendTitle = document.getElementById('legendTitleText');
        const legendContent = document.getElementById('legendContent');
        if (legendTitle) legendTitle.innerText = '학업성취도 기준 (78.0점)';
        if (legendContent) legendContent.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--primary-blue);"></span>
                <span style="font-weight: 600; color: var(--text-main);">3개 교과 기준 충족 (우수)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--success-green);"></span>
                <span style="font-weight: 600; color: var(--text-main);">2개 교과 기준 충족</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--warning-yellow);"></span>
                <span style="font-weight: 600; color: var(--text-main);">1개 교과 기준 충족</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--info-gray);"></span>
                <span style="font-weight: 600; color: var(--text-muted);">기준 충족 과목 없음</span>
            </div>
        `;

        const bounds = kakaoMap.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        logDiagnostic(`[_renderMapForRegion] 개별 핀 모드 (지역: ${selectedRegion})`);

        // 뷰포트 내 + 지역 필터 (selectedRegion 인자 사용)
        let filtered = schoolsDatabase.filter(school => {
            if (!school.lat || !school.lng) return false;

            // Region Filter (인자로 받은 selectedRegion 사용 — geocoder 확정값)
            if (selectedRegion !== 'all' && school.region !== selectedRegion) {
                return false;
            }

            // School Type Filter
            if (orchestrator.state.filters.schoolType !== 'all') {
                let typeLabel = '중학교';
                if (orchestrator.state.filters.schoolType === 'elementary') typeLabel = '초등학교';
                else if (orchestrator.state.filters.schoolType === 'high') typeLabel = '고등학교';
                if (school.school_type !== typeLabel) return false;
            }

            // Boundary Check
            const latIn = school.lat >= sw.getLat() && school.lat <= ne.getLat();
            const lngIn = school.lng >= sw.getLng() && school.lng <= ne.getLng();
            return latIn && lngIn;
        });

        logDiagnostic(`[onMapAction] 현재 지도 영역 내 학교 수: ${filtered.length}개`);

        filtered = filtered.slice(0, 30); // Prevent overlay flooding
        currentLoadedSchools = filtered;
        renderPins(filtered, false);
    }

    // Global selector callback
    window.selectSchoolById = (schoolId) => {
        let school = currentLoadedSchools.find(s => s.school_id === schoolId);
        if (!school) {
            school = schoolsDatabase.find(s => s.school_id === schoolId);
        }
        if (school) {
            const summary = orchestrator.selectSchool(school);
            showSchoolDetails(summary, school);
            
            const sidebar = document.querySelector('.sidebar-section');
            if (sidebar && sidebar.style.display === 'none') {
                if (typeof toggleSidebar === 'function') toggleSidebar();
            }
        }
    };

    // Helper to draw single Custom Overlay on Kakao map
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
    }

    function showSchoolDetails(summary, fullSchool) {
        welcomeCard.style.display = 'none';
        childFormCard.style.display = 'none';
        diagnosisResultCard.style.display = 'none';
        schoolCard.style.display = 'block';

        schoolCardName.innerText = fullSchool.school_name;
        schoolCardType.innerText = fullSchool.school_type;
        schoolCardStudents.innerText = `${fullSchool.student_count}명`;
        schoolCardClassSize.innerText = `${fullSchool.class_avg_size}명`;
        schoolCardUpdate.innerText = fullSchool.updated_at;
        schoolInsight.innerText = summary.insight;

        if (btnShowReviews) {
            btnShowReviews.innerText = '💬 찐 학부모 리뷰 보기';
            if (supabase) {
                supabase
                    .from('school_reviews')
                    .select('*', { count: 'exact', head: true })
                    .eq('school_id', fullSchool.school_id)
                    .then(({ count, error }) => {
                        if (!error && count > 0) {
                            btnShowReviews.innerText = `💬 찐 학부모 리뷰 보기 (${count})`;
                        }
                    });
            }
        }

        // Populate new parent analysis fields
        document.getElementById('schoolCompetition').innerText = summary.competition_level.label;
        document.getElementById('schoolCompetitionDesc').innerText = summary.competition_level.desc;
        // document.getElementById('schoolAcademies').innerText = `${summary.academy_count}개`; // Will be set by Kakao API
        document.getElementById('schoolBudget').innerText = `${summary.extracurricular_budget}만원`;

        // --- Real Data for Real Estate & Academy Fees ---
        const rsSale = document.getElementById('realEstateSale');
        const rsJeonse = document.getElementById('realEstateJeonse');
        const rsIndex = document.getElementById('realEstateIndex');
        const acEng = document.getElementById('academyFeeEng');
        const acMath = document.getElementById('academyFeeMath');
        
        if (rsSale) rsSale.innerText = '로딩 중...';
        if (rsJeonse) rsJeonse.innerText = '로딩 중...';
        if (acEng) acEng.innerText = '로딩 중...';
        if (acMath) acMath.innerText = '로딩 중...';

        // 1. 부동산 실거래가 조회 (카카오 좌표 -> 법정동 코드 변환)
        if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
            const geocoder = new window.kakao.maps.services.Geocoder();
            geocoder.coord2RegionCode(fullSchool.lng, fullSchool.lat, async (result, status) => {
                if (status === window.kakao.maps.services.Status.OK) {
                    const bcode = result.find(r => r.region_type === 'B');
                    if (bcode && bcode.code) {
                        const lawdCd = bcode.code.substring(0, 5);
                        
                        // 전월 또는 최근 달 기준
                        const date = new Date();
                        date.setMonth(date.getMonth() - 1);
                        const dealYmd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
                        
                        try {
                            const res = await fetch(`/api/realestate?lawd_cd=${lawdCd}&deal_ymd=${dealYmd}`);
                            if (!res.ok) throw new Error('API Error');
                            const xmlText = await res.text();
                            
                            // 간단한 XML 파싱
                            const parser = new DOMParser();
                            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
                            const items = xmlDoc.getElementsByTagName("item");
                            
                            let saleSum = 0, saleCount = 0;
                            for (let i = 0; i < items.length; i++) {
                                const amountNode = items[i].getElementsByTagName("거래금액")[0];
                                const areaNode = items[i].getElementsByTagName("전용면적")[0];
                                if (amountNode && areaNode) {
                                    const area = parseFloat(areaNode.textContent);
                                    if (area >= 59 && area <= 85) { // 84㎡ 주변
                                        const amountStr = amountNode.textContent.trim().replace(/,/g, '');
                                        saleSum += parseInt(amountStr, 10);
                                        saleCount++;
                                    }
                                }
                            }
                            
                            if (saleCount > 0) {
                                const avgSale = Math.round(saleSum / saleCount);
                                // avgSale is in 만원 (10,000 KRW)
                                const uk = Math.floor(avgSale / 10000);
                                const man = avgSale % 10000;
                                if (rsSale) rsSale.innerText = `${uk > 0 ? uk + '억 ' : ''}${man > 0 ? man.toLocaleString() + '만원' : ''}`;
                                if (rsJeonse) rsJeonse.innerText = `${Math.floor(uk * 0.6)}억 ${Math.floor(man * 0.6).toLocaleString()}만원 (추정)`; // 전세는 임시 추정
                                if (rsIndex) rsIndex.innerText = '실거래가 기준 산출';
                            } else {
                                if (rsSale) rsSale.innerText = '해당월 거래 없음';
                                if (rsJeonse) rsJeonse.innerText = '해당월 거래 없음';
                            }
                        } catch (e) {
                            console.error(e);
                            if (rsSale) rsSale.innerText = '조회 실패';
                            if (rsJeonse) rsJeonse.innerText = '조회 실패';
                        }
                    }
                }
            });
        }

        // 2. NEIS 학원비 조회
        const eduCodeMap = {
            '서울특별시': 'B10', '부산광역시': 'C10', '대구광역시': 'D10', '인천광역시': 'E10',
            '광주광역시': 'F10', '대전광역시': 'G10', '울산광역시': 'H10', '세종특별자치시': 'I10',
            '경기도': 'J10', '강원특별자치도': 'K10', '충청북도': 'M10', '충청남도': 'N10',
            '전북특별자치도': 'P10', '전라남도': 'Q10', '경상북도': 'R10', '경상남도': 'S10', '제주특별자치도': 'T10'
        };
        const regionParts = (fullSchool.address || '').split(' ');
        const sidoName = regionParts[0];
        const guName = regionParts[1];
        const atptCode = eduCodeMap[sidoName];

        if (atptCode) {
            fetch(`/api/academies/fees?atpt_code=${atptCode}&admst_zone_nm=${encodeURIComponent(guName)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.acaInsTiInfo && data.acaInsTiInfo[1] && data.acaInsTiInfo[1].row) {
                        const academies = data.acaInsTiInfo[1].row;
                        let engSum = 0, engCount = 0;
                        let mathSum = 0, mathCount = 0;
                        
                        academies.forEach(aca => {
                            const fields = aca.REALM_SC_NM || '';
                            const lists = aca.LE_CRSE_LIST_NM || '';
                            const feeName = aca.LE_CRSE_NM || '';
                            const feesStr = aca.PSNBY_THCC_CNTNT || '';
                            
                            const isEngAca = fields.includes('영어') || lists.includes('영어') || feeName.includes('영어');
                            const isMathAca = fields.includes('수학') || lists.includes('수학') || feeName.includes('수학');
                            
                            if (feesStr) {
                                const feeItems = feesStr.split(',');
                                feeItems.forEach(item => {
                                    const parts = item.split(':');
                                    if (parts.length === 2) {
                                        const subject = parts[0].trim();
                                        const amount = parseInt(parts[1].trim(), 10);
                                        
                                        if (!isNaN(amount) && amount > 0) {
                                            // 과목명에 영어나 수학이 포함되어 있거나, 학원 자체가 영어/수학 전문일 경우
                                            if (subject.includes('영어') || isEngAca) {
                                                engSum += amount;
                                                engCount++;
                                            } else if (subject.includes('수학') || isMathAca) {
                                                mathSum += amount;
                                                mathCount++;
                                            }
                                        }
                                    }
                                });
                            }
                        });
                        
                        const engFee = engCount > 0 ? Math.round(engSum / engCount) : 0;
                        const mathFee = mathCount > 0 ? Math.round(mathSum / mathCount) : 0;
                        
                        if (acEng) acEng.innerText = engFee > 0 ? engFee.toLocaleString() + '원' : '데이터 없음';
                        if (acMath) acMath.innerText = mathFee > 0 ? mathFee.toLocaleString() + '원' : '데이터 없음';
                    } else {
                        if (acEng) acEng.innerText = '데이터 없음';
                        if (acMath) acMath.innerText = '데이터 없음';
                    }
                })
                .catch(err => {
                    console.error(err);
                    if (acEng) acEng.innerText = '조회 실패';
                    if (acMath) acMath.innerText = '조회 실패';
                });
        }
        // ------------------------------------------------
        // 창체 패널 초기화 (닫힘 상태로)
        const budgetModal = document.getElementById('budgetModal');
        if (budgetModal) budgetModal.style.display = 'none';
        
        // 진학률 모달 초기화 (닫힘 상태로)
        const graduateModal = document.getElementById('graduateModal');
        if (graduateModal) graduateModal.style.display = 'none';
        
        // 경쟁 치열도 모달 초기화 (닫힘 상태로)
        const competitionModal = document.getElementById('competitionModal');
        if (competitionModal) competitionModal.style.display = 'none';
        
        document.getElementById('budgetDetailPanel').style.display = 'none';
        // 창체 상세 데이터 렌더링
        renderBudgetDetail(summary.budget_detail);

        // 전학생·통학 현황 모달 초기화 및 데이터 렌더링
        const studentStatsModal = document.getElementById('studentStatsModal');
        if (studentStatsModal) studentStatsModal.style.display = 'none';
        if (typeof window.renderStudentStats === 'function') {
            window.renderStudentStats(fullSchool);
        }

        // 학교폭력 현황 모달 초기화 및 데이터 렌더링
        const violenceStatsModal = document.getElementById('violenceStatsModal');
        if (violenceStatsModal) violenceStatsModal.style.display = 'none';
        if (typeof window.renderViolenceStats === 'function') {
            window.renderViolenceStats(fullSchool);
        }
        
        // 경쟁 치열도 상세 미리 렌더링
        renderCompetitionDetail(summary, fullSchool);

        // 학업 성향 태그 배지 생성
        const tagsContainer = document.getElementById('schoolCompetitionTags');
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
            const compLabel = summary.competition_level.label;
            const tags = [];
            
            if (compLabel.includes('최상') || compLabel.includes('상')) {
                // 특정 태그(🔥 내신 경쟁 극심, 🎒 명문 학군) 제거됨
            } else if (compLabel.includes('중상')) {
                tags.push({ text: '👍 학업 열기 양호', bg: '#e3f2fd', color: '#1565c0' });
                tags.push({ text: '📝 성실한 면학', bg: '#f3e5f5', color: '#6a1b9a' });
            } else if (compLabel.includes('중')) {
                tags.push({ text: '⚖️ 균형 잡힌 학업', bg: '#eceff1', color: '#37474f' });
                tags.push({ text: '🍀 원만한 내신', bg: '#fff8e1', color: '#f57f17' });
            } else {
                tags.push({ text: '💡 개별 보강 추천', bg: '#fff3e0', color: '#e65100' });
            }

            // 📚 학원가 중심지 제거됨

            if (fullSchool.school_type && fullSchool.school_type.includes('고등학교')) {
                tags.push({ text: '🎓 대입 대비', bg: '#fbe9e7', color: '#d84315' });
            } // ✏️ 고입 준비 제거됨

            tags.forEach(tag => {
                const span = document.createElement('span');
                span.style.cssText = `font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: ${tag.bg}; color: ${tag.color}; border: 1px solid ${tag.color}33;`;
                span.innerText = tag.text;
                tagsContainer.appendChild(span);
            });
        }
        
        // 진학률 모달 연동을 위한 데이터 글로벌 저장
        window.currentSchoolGraduateCareer = summary.graduate_career;
        window.currentSchoolType = fullSchool.school_type;
        window.currentSchoolName = fullSchool.school_name;
        
        // 진학률 상세 미리 렌더링
        renderGraduateDetail(summary.graduate_career, fullSchool.school_type, fullSchool.school_name, fullSchool.student_count);
        
        if (fullSchool.school_type && fullSchool.school_type.includes('고등학교')) {
            document.getElementById('schoolGraduateTrendLabel').innerText = '대학 진학률';
            document.getElementById('schoolGraduateTrend').innerText = `4년제 ${summary.graduate_career.general}% / 전문대 ${summary.graduate_career.specialized}%`;
        } else if (fullSchool.school_type && fullSchool.school_type.includes('초등학교')) {
            document.getElementById('schoolGraduateTrendLabel').innerText = '중학교 진학률';
            document.getElementById('schoolGraduateTrend').innerText = `관내 ${summary.graduate_career.general}% / 관외 ${summary.graduate_career.specialized}%`;
        } else {
            document.getElementById('schoolGraduateTrendLabel').innerText = '특목/자사 진학률';
            document.getElementById('schoolGraduateTrend').innerText = `특목 ${summary.graduate_career.special}% / 자사 ${summary.graduate_career.autonomous}%`;
        }

        // Render Academies List in the Sidebar using Kakao Places API
        const academyListContainer = document.getElementById('sideAcademyList');
        academyListContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">실제 주변 학원 데이터를 불러오는 중입니다...</div>';
        document.getElementById('schoolAcademies').innerText = '검색 중...';

        // 전체 학원 목록 백엔드 API로 가져오기 (가나다 정렬 + 클라이언트 페이지네이션)
        // sideAcademyList의 실제 높이를 측정하여 항목당 높이(약 36px)로 나누어 정확한 노출 개수 계산
        const listEl = document.getElementById('sideAcademyList');
        let availableHeight = listEl.clientHeight;
        if (availableHeight === 0) availableHeight = window.innerHeight - 280; // fallback
        
        const ITEM_HEIGHT = 36; // padding 6px*2 + 텍스트 1줄 + border 1px + gap 0 등 대략 36px
        const PAGE_SIZE = Math.max(Math.floor(availableHeight / ITEM_HEIGHT), 5);
        
        fetch(`/api/academies/list?x=${fullSchool.lng}&y=${fullSchool.lat}`)
            .then(res => res.json())
            .then(result => {
                if (result.error) throw new Error(result.error);

                // 실제 total_count 업데이트
                document.getElementById('schoolAcademies').innerText = `${result.total_count}개`;

                let allFetchedAcademies = [...(result.items || [])].sort((a, b) =>
                    (a.place_name || '').localeCompare(b.place_name || '', 'ko')
                );

                let searchTimeout = null;

                async function applyFiltersAndRender() {
                    const typeFilterEl = document.getElementById('academyTypeFilter');
                    const nameFilterEl = document.getElementById('academyNameFilter');
                    
                    const typeFilter = typeFilterEl ? typeFilterEl.value : 'all';
                    const nameFilter = nameFilterEl ? nameFilterEl.value.trim().toLowerCase() : '';

                    let baseList = allFetchedAcademies;

                    // 검색어가 있으면 카카오 키워드 API 원격 호출 (반경 1km 이내 검색)
                    if (nameFilter !== '') {
                        try {
                            const url = `/api/academies/search?query=${encodeURIComponent(nameFilter)}&x=${fullSchool.lng}&y=${fullSchool.lat}`;
                            const res = await fetch(url);
                            const data = await res.json();
                            baseList = data.items || [];
                        } catch (err) {
                            console.error('Remote academy search error', err);
                            baseList = [];
                        }
                    }

                    let filtered = baseList;

                    // 로컬 타입 필터(학원/교습소) 적용
                    if (typeFilter !== 'all') {
                        filtered = filtered.filter(place => {
                            const name = place.place_name || '';
                            const tLabel = name.includes('교습소') ? '교습소' : '학원';
                            return tLabel === typeFilter;
                        });
                    }

                    const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;

                    function renderAcademyPage(page) {
                        academyListContainer.innerHTML = '';
                        const start = (page - 1) * PAGE_SIZE;
                        const pageItems = filtered.slice(start, start + PAGE_SIZE);

                        pageItems.forEach(place => {
                            const acadName = place.place_name;

                            let typeLabel = acadName.includes('교습소') ? '교습소' : '학원';
                            let subjectLabel = '';
                            if (place.category_name) {
                                const parts = place.category_name.split('>').map(s => s.trim());
                                // 상세 과목명은 가장 하위 카테고리를 우선적으로 사용
                                if (parts.length > 2) {
                                    subjectLabel = parts[parts.length - 1];
                                } else if (parts.length === 2) {
                                    subjectLabel = parts[1];
                                }
                            }

                            const item = document.createElement('div');
                            item.style.padding = '6px 0px';
                            item.style.borderBottom = '1px solid var(--border-color)';
                            item.style.background = 'transparent';
                            item.style.display = 'flex';
                            item.style.alignItems = 'center';
                            item.style.justifyContent = 'space-between';
                            item.style.gap = '6px';
                            item.style.fontWeight = '500';
                            item.style.cursor = 'pointer';
                            item.style.transition = 'all 0.2s ease';
                            item.style.color = 'var(--text-main)';

                            const nameSpan = document.createElement('span');
                            nameSpan.innerText = acadName;

                            const badgeContainer = document.createElement('div');
                            badgeContainer.style.display = 'flex';
                            badgeContainer.style.gap = '4px';

                            let shortSubject = '';
                            if (subjectLabel) {
                                shortSubject = subjectLabel.replace('학원', '').replace('교습소', '').replace('전문', '').trim();
                                if (shortSubject === '') shortSubject = subjectLabel;
                            }

                            const leftWrapper = document.createElement('div');
                            leftWrapper.style.display = 'flex';
                            leftWrapper.style.alignItems = 'center';
                            leftWrapper.style.gap = '6px';
                            leftWrapper.appendChild(nameSpan);

                            item.appendChild(leftWrapper);
                            item.appendChild(badgeContainer);

                            item.onmouseover = () => {
                                item.style.borderBottom = '1px solid var(--primary-blue)';
                                nameSpan.style.color = 'var(--primary-blue)';
                            };
                            item.onmouseout = () => {
                                item.style.borderBottom = '1px solid var(--border-color)';
                                nameSpan.style.color = 'var(--text-main)';
                            };

                            item.onclick = () => {
                                window.currentAcademyForCommunity = acadName;
                                document.querySelectorAll('.community-filter-btn').forEach(btn => {
                                    btn.style.background = 'white';
                                    btn.style.color = 'var(--text-muted)';
                                    btn.style.borderColor = 'var(--border-color)';
                                });
                                const allBtn = document.querySelector('.community-filter-btn[data-type="all"]');
                                if (allBtn) {
                                    allBtn.style.background = 'var(--primary-blue)';
                                    allBtn.style.color = 'white';
                                    allBtn.style.borderColor = 'var(--primary-blue)';
                                }
                                window.fetchCommunityReviews(acadName, 'all', shortSubject, typeLabel);
                            };

                            academyListContainer.appendChild(item);
                        });

                        let paginationEl = document.getElementById('academyPagination');
                        if (!paginationEl) {
                            paginationEl = document.createElement('div');
                            paginationEl.id = 'academyPagination';
                            paginationEl.style.display = 'flex';
                            paginationEl.style.flexWrap = 'wrap';
                            paginationEl.style.justifyContent = 'center';
                            paginationEl.style.gap = '4px';
                            document.getElementById('academyPaginationContainer').appendChild(paginationEl);
                        }
                        paginationEl.innerHTML = '';

                        // Pagination block size
                        const MAX_PAGES = 3;
                        const currentBlock = Math.ceil(page / MAX_PAGES);
                        const startPage = (currentBlock - 1) * MAX_PAGES + 1;
                        const endPage = Math.min(startPage + MAX_PAGES - 1, totalPages);

                        if (startPage > 1) {
                            const prevBtn = document.createElement('button');
                            prevBtn.innerText = '<';
                            prevBtn.style.padding = '4px 10px';
                            prevBtn.style.border = '1px solid var(--border-color)';
                            prevBtn.style.borderRadius = '4px';
                            prevBtn.style.background = 'white';
                            prevBtn.style.color = 'var(--text-main)';
                            prevBtn.style.cursor = 'pointer';
                            prevBtn.style.fontSize = '12px';
                            prevBtn.onclick = () => renderAcademyPage(startPage - 1);
                            paginationEl.appendChild(prevBtn);
                        }

                        for (let i = startPage; i <= endPage; i++) {
                            const btn = document.createElement('button');
                            btn.innerText = i;
                            btn.style.padding = '4px 10px';
                            btn.style.border = '1px solid var(--border-color)';
                            btn.style.borderRadius = '4px';
                            btn.style.background = (i === page) ? 'var(--primary-blue)' : 'white';
                            btn.style.color = (i === page) ? 'white' : 'var(--text-main)';
                            btn.style.cursor = 'pointer';
                            btn.style.fontSize = '12px';
                            btn.onclick = () => renderAcademyPage(i);
                            paginationEl.appendChild(btn);
                        }

                        if (endPage < totalPages) {
                            const nextBtn = document.createElement('button');
                            nextBtn.innerText = '>';
                            nextBtn.style.padding = '4px 10px';
                            nextBtn.style.border = '1px solid var(--border-color)';
                            nextBtn.style.borderRadius = '4px';
                            nextBtn.style.background = 'white';
                            nextBtn.style.color = 'var(--text-main)';
                            nextBtn.style.cursor = 'pointer';
                            nextBtn.style.fontSize = '12px';
                            nextBtn.onclick = () => renderAcademyPage(endPage + 1);
                            paginationEl.appendChild(nextBtn);
                        }
                    } // end renderAcademyPage

                    if (filtered.length === 0) {
                        academyListContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">조건에 맞는 검색 결과가 없습니다.</div>';
                        const paginationEl = document.getElementById('academyPagination');
                        if(paginationEl) paginationEl.innerHTML = '';
                    } else {
                        renderAcademyPage(1);
                    }
                } // end applyFiltersAndRender

                // 필터 이벤트 리스너 바인딩 (검색의 경우 debounce 적용)
                const typeFilterEl = document.getElementById('academyTypeFilter');
                const nameFilterEl = document.getElementById('academyNameFilter');
                
                if (typeFilterEl) {
                    typeFilterEl.onchange = () => applyFiltersAndRender();
                }
                
                if (nameFilterEl) {
                    nameFilterEl.oninput = () => {
                        if (searchTimeout) clearTimeout(searchTimeout);
                        searchTimeout = setTimeout(() => {
                            applyFiltersAndRender();
                        }, 400); // 400ms debounce
                    };
                }

                // 최초 렌더링
                applyFiltersAndRender();
            })
            .catch(err => {
                console.error('Academy list fetch error:', err);
                academyListContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">학원 목록을 불러오는 데 실패했습니다.</div>';
            });

        schoolKorAvg.innerText = fullSchool.subjects.korean.avg;
        schoolEngAvg.innerText = fullSchool.subjects.english.avg;
        schoolMathAvg.innerText = fullSchool.subjects.math.avg;

        // Populate mock annual changes
        schoolKorChange.innerText = '↑ 상승';
        schoolKorChange.style.color = 'var(--success-green)';
        schoolEngChange.innerText = '→ 유지';
        schoolEngChange.style.color = 'var(--warning-yellow)';
        schoolMathChange.innerText = '↓ 하락';
        schoolMathChange.style.color = 'var(--danger-red)';

        // Populate Distribution Graph Bars
        renderDistributionBar(schoolKorBar, fullSchool.subjects.korean.dist);
        renderDistributionBar(schoolEngBar, fullSchool.subjects.english.dist);
        renderDistributionBar(schoolMathBar, fullSchool.subjects.math.dist);
    }

    function renderDistributionBar(container, dist) {
        container.innerHTML = '';
        const labels = ['A', 'B', 'C', 'D'];
        const segments = ['segment-a', 'segment-b', 'segment-c', 'segment-d'];
        dist.forEach((percent, idx) => {
            const seg = document.createElement('div');
            seg.className = `chart-bar-segment ${segments[idx]}`;
            seg.style.width = `${percent}%`;
            seg.innerText = `${labels[idx]}:${percent}%`;
            container.appendChild(seg);
        });
    }

    function getRegionAverages(region) {
        const regionSchools = schoolsDatabase.filter(s => s.region === region);
        if (regionSchools.length === 0) {
            return { korean: 70, english: 68, math: 62 };
        }
        let korSum = 0, engSum = 0, mathSum = 0;
        regionSchools.forEach(s => {
            korSum += s.subjects.korean.avg;
            engSum += s.subjects.english.avg;
            mathSum += s.subjects.math.avg;
        });
        const len = regionSchools.length;
        return {
            korean: Math.round((korSum / len) * 10) / 10,
            english: Math.round((engSum / len) * 10) / 10,
            math: Math.round((mathSum / len) * 10) / 10
        };
    }

    function renderDiagnosisResults(result) {
        lastDiagnosisResult = result;
        diagnosticSummaryLabel.innerText = result.overall.position_label;
        diagnosticSummaryDesc.innerText = result.overall.summary;
        document.getElementById('admissionSimulationDesc').innerText = result.overall.admission_simulation;
        subjectDiagnosisContainer.innerHTML = '';

        // Render Comparison Matrix
        const schoolName = orchestrator.state.selectedSchool ? orchestrator.state.selectedSchool.school_name : '선택 학교';
        document.getElementById('thSelectedSchool').innerText = schoolName;

        const region = document.getElementById('selCompareRegion').value;
        const regionAvgs = getRegionAverages(region);
        const comparisonTableBody = document.getElementById('comparisonTableBody');
        comparisonTableBody.innerHTML = '';

        const subjectLabels = { korean: '국어', english: '영어', math: '수학' };
        
        ['korean', 'english', 'math'].forEach(sub => {
            const data = result[sub];
            if (!data) return;

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(0,0,0,0.05)';
            
            const childScore = data.score;
            const schoolAvg = data.school_avg;
            const regionAvg = regionAvgs[sub];
            const nationalAvg = data.national_avg;
            
            const getColorStyle = (val, compareTo) => {
                if (val > compareTo) return 'color: var(--success-green); font-weight: bold;';
                if (val < compareTo) return 'color: var(--danger-red); font-weight: bold;';
                return 'color: var(--text-main);';
            };
            
            tr.innerHTML = `
                <td style="padding: 8px 4px; text-align: left; font-weight: 600;">${subjectLabels[sub]}</td>
                <td style="padding: 8px 4px; font-weight: bold; color: var(--primary-blue);">${childScore}점</td>
                <td style="padding: 8px 4px; ${getColorStyle(childScore, schoolAvg)}">${schoolAvg}점</td>
                <td style="padding: 8px 4px; ${getColorStyle(childScore, regionAvg)}">${regionAvg}점</td>
                <td style="padding: 8px 4px; ${getColorStyle(childScore, nationalAvg)}">${nationalAvg}점</td>
            `;
            comparisonTableBody.appendChild(tr);

            const box = document.createElement('div');
            box.className = `action-box ${data.status}`;
            const iconSymbol = data.status === 'green' ? '✓' : (data.status === 'yellow' ? '⚠' : '🚨');
            box.innerHTML = `
                <div class="action-icon">${iconSymbol}</div>
                <div>
                    <strong>${subjectLabels[sub]}: ${data.score}점</strong> (평균 ${data.school_avg}점 대비 ${data.label} 예상)
                    <p style="margin-top: 4px; font-weight: 500;">${data.action}</p>
                </div>
            `;
            subjectDiagnosisContainer.appendChild(box);
        });
    }

    function renderCompetitionDetail(summary, school) {
        const contentEl = document.getElementById('competitionModalContent');
        const titleEl = document.getElementById('competitionModalTitle');
        if (!contentEl) return;
        
        const comp = summary.competition_level;
        if (titleEl) {
            titleEl.innerText = `🔥 ${school.school_name} - 내신 경쟁 상세 분석`;
        }

        const distKor = school.subjects.korean.dist;
        const distEng = school.subjects.english.dist;
        const distMath = school.subjects.math.dist;
        
        const avgA = Math.round((distKor[0] + distEng[0] + distMath[0]) / 3);
        const avgD = Math.round((distKor[3] + distEng[3] + distMath[3]) / 3);
        
        const compIndex2026 = Math.max(10, Math.min(100, Math.round(avgA * 1.6 - avgD * 0.7 + 30)));
        const seed = school.school_id ? school.school_id.charCodeAt(school.school_id.length - 1) : 5;
        const compIndex2025 = Math.max(10, Math.min(100, compIndex2026 - 3 + (seed % 7)));
        const compIndex2024 = Math.max(10, Math.min(100, compIndex2025 - 4 + ((seed + 2) % 9)));
        
        const getPressureLabel = (val) => {
            if (val >= 80) return '극심';
            if (val >= 65) return '치열';
            if (val >= 50) return '양호';
            return '평이';
        };

        let strategyHTML = '';
        if (school.school_type && school.school_type.includes('고등학교')) {
            if (compIndex2026 >= 75) {
                strategyHTML = `
                    <div style="background: #fff9c4; border: 1px solid #fbc02d; border-radius: 8px; padding: 12px; margin-top: 12px;">
                        <strong style="color: #f57f17; font-size: 11px; display: block; margin-bottom: 4px;">💡 대입 지원 전략 제안: 정시/수능 중심 유리</strong>
                        <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #5d4037; letter-spacing: -0.2px;">
                            학업 성적이 매우 우수한 상위권이 대거 몰려 있는 초정밀 경쟁 학교입니다. 내신 1등급대 선점이 극도로 좁기 때문에, 학생부 교과 전형보다는 <strong>학습 성취 수준의 높음을 증명하는 학생부 종합 전형이나 수능 최저를 동반한 정시 전형</strong>에 초점을 맞추는 것이 유리합니다.
                        </p>
                    </div>
                `;
            } else if (compIndex2026 >= 50) {
                strategyHTML = `
                    <div style="background: #e8f5e9; border: 1px solid #81c784; border-radius: 8px; padding: 12px; margin-top: 12px;">
                        <strong style="color: #2e7d32; font-size: 11px; display: block; margin-bottom: 4px;">💡 대입 지원 전략 제안: 교과 수시 + 학종 병행</strong>
                        <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #1b5e20; letter-spacing: -0.2px;">
                            학업 분위기가 준수하여 내신 노력과 정시 역량이 균형을 이루는 환경입니다. 적극적인 교과목 참여와 생기부 관리로 <strong>교과 수시 및 학생부 종합 전형을 동시 병행</strong>하기에 가장 적합한 모델입니다.
                        </p>
                    </div>
                `;
            } else {
                strategyHTML = `
                    <div style="background: #e3f2fd; border: 1px solid #64b5f6; border-radius: 8px; padding: 12px; margin-top: 12px;">
                        <strong style="color: #1565c0; font-size: 11px; display: block; margin-bottom: 4px;">💡 대입 지원 전략 제안: 학생부 교과/수시 집중 공략</strong>
                        <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #0d47a1; letter-spacing: -0.2px;">
                            비교적 내신 최상위 등급(1등급대) 쟁탈전이 다른 학군에 비해 수월한 학교입니다. 모의고사 성적 대비 높은 학교 내신 점수를 무기로 하여 <strong>학생부 교과 중심의 수시 전형을 통해 최상위 대학교를 저격하는 전략</strong>이 가장 높은 가성비를 냅니다.
                        </p>
                    </div>
                `;
            }
        } else {
            if (compIndex2026 >= 70) {
                strategyHTML = `
                    <div style="background: #fff3e0; border: 1px solid #ffb74d; border-radius: 8px; padding: 12px; margin-top: 12px;">
                        <strong style="color: #e65100; font-size: 11px; display: block; margin-bottom: 4px;">💡 고교 진학 추천 가이드: 특목/자사고 최우선 고려</strong>
                        <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #4e342e; letter-spacing: -0.2px;">
                            지역 내 학구열이 매우 뜨거운 환경입니다. 학생들의 전반적인 중등 선행 지수와 심화 지식 소화도가 높기 때문에, 일반고 진학 후의 치열한 경쟁을 피해 <strong>비교과 및 역량 개발 중심의 특목/자사고 진학을 적극 진단 및 준비</strong>하시는 것을 추천합니다.
                        </p>
                    </div>
                `;
            } else {
                strategyHTML = `
                    <div style="background: #f1f8e9; border: 1px solid #aed581; border-radius: 8px; padding: 12px; margin-top: 12px;">
                        <strong style="color: #33691e; font-size: 11px; display: block; margin-bottom: 4px;">💡 중등 학습 지도 가이드: 자기주도적 기초-심화 안착</strong>
                        <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #1b5e20; letter-spacing: -0.2px;">
                            성적 분포가 완만하고 균형 있는 분위기입니다. 주변 분위기에 휩쓸려 과도한 선행 학습을 유발하기보다, <strong>개별 학년의 구멍 없는 기본 개념 숙지 및 심화 1단계 교재 완독을 지향하여 내재적 실력</strong>을 튼튼히 다지는 것이 효과적입니다.
                        </p>
                    </div>
                `;
            }
        }

        contentEl.innerHTML = `
            <!-- 경쟁 치열도 판정 카드 -->
            <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <span style="font-size: 11px; color: var(--text-muted);">종합 경쟁 치열도 판정</span>
                    <span style="font-size: 11px; font-weight: 700; color: #e53935; background: #ffebee; padding: 2px 6px; border-radius: 4px;">${comp.label}</span>
                </div>
                <div style="font-size: 11px; font-weight: 500; color: var(--deep-blue); line-height: 1.5; letter-spacing: -0.2px;">
                    ${comp.desc}
                </div>
            </div>

            <!-- 성적 편차 분위기 (A~D 비율) -->
            <div style="margin-bottom: 16px;">
                <strong style="font-size: 13px; color: var(--deep-blue); display: block; margin-bottom: 8px;">📊 과목별 성적 성취 분포 (우수 vs 기초)</strong>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                            <span>국어 (A등급/우수: ${distKor[0]}% | D등급/기초: ${distKor[3]}%)</span>
                        </div>
                        <div style="display: flex; height: 10px; border-radius: 4px; overflow: hidden; background: #e0e0e0;">
                            <div style="width: ${distKor[0]}%; background: #1976d2;" title="우수 (A)"></div>
                            <div style="width: ${distKor[1]}%; background: #90caf9;" title="보통 (B)"></div>
                            <div style="width: ${distKor[2]}%; background: #fff59d;" title="기초 (C)"></div>
                            <div style="width: ${distKor[3]}%; background: #ef9a9a;" title="기초미달 (D)"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                            <span>영어 (A등급/우수: ${distEng[0]}% | D등급/기초: ${distEng[3]}%)</span>
                        </div>
                        <div style="display: flex; height: 10px; border-radius: 4px; overflow: hidden; background: #e0e0e0;">
                            <div style="width: ${distEng[0]}%; background: #1976d2;" title="우수 (A)"></div>
                            <div style="width: ${distEng[1]}%; background: #90caf9;" title="보통 (B)"></div>
                            <div style="width: ${distEng[2]}%; background: #fff59d;" title="기초 (C)"></div>
                            <div style="width: ${distEng[3]}%; background: #ef9a9a;" title="기초미달 (D)"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                            <span>수학 (A등급/우수: ${distMath[0]}% | D등급/기초: ${distMath[3]}%)</span>
                        </div>
                        <div style="display: flex; height: 10px; border-radius: 4px; overflow: hidden; background: #e0e0e0;">
                            <div style="width: ${distMath[0]}%; background: #1976d2;" title="우수 (A)"></div>
                            <div style="width: ${distMath[1]}%; background: #90caf9;" title="보통 (B)"></div>
                            <div style="width: ${distMath[2]}%; background: #fff59d;" title="기초 (C)"></div>
                            <div style="width: ${distMath[3]}%; background: #ef9a9a;" title="기초미달 (D)"></div>
                        </div>
                    </div>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px; font-size: 9px; color: var(--text-muted); margin-top: 4px;">
                    <span><span style="display:inline-block; width:8px; height:8px; background:#1976d2; border-radius:2px; margin-right:2px;"></span>우수(A)</span>
                    <span><span style="display:inline-block; width:8px; height:8px; background:#90caf9; border-radius:2px; margin-right:2px;"></span>보통(B)</span>
                    <span><span style="display:inline-block; width:8px; height:8px; background:#fff59d; border-radius:2px; margin-right:2px;"></span>기초(C)</span>
                    <span><span style="display:inline-block; width:8px; height:8px; background:#ef9a9a; border-radius:2px; margin-right:2px;"></span>기초미달(D)</span>
                </div>
            </div>

            <!-- 사교육 의존 지수 -->
            <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 10px; padding: 10px 12px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 12px; color: var(--deep-blue);">📚 학원 인프라 밀도</strong>
                    <span style="font-size: 11px; font-weight: 700; color: var(--primary-blue);">${school.academy_count || 0}개 등록</span>
                </div>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: var(--text-muted); line-height: 1.4; letter-spacing: -0.2px;">
                    학교 반경 내 배치된 보습/입시 관련 등록 학원 수입니다. 밀도가 높을수록 방과 후 보충 학습 인프라가 풍부하고, 지역 전반의 사교육 의존도가 높음을 뜻합니다.
                </p>
            </div>

            <!-- 3개년 경쟁 압박 추이 차트 -->
            <div style="margin-bottom: 16px;">
                <strong style="font-size: 13px; color: var(--deep-blue); display: block; margin-bottom: 8px;">📈 3개년 경쟁 압력 추이</strong>
                <div style="display: flex; align-items: flex-end; justify-content: space-around; background: var(--bg-primary); border-radius: 12px; height: 110px; padding: 16px 12px 6px 12px; border: 1px solid var(--border-color);">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1;">
                        <span style="font-size: 10px; color: var(--text-muted); font-weight: 500;">${getPressureLabel(compIndex2024)} (${compIndex2024})</span>
                        <div style="width: 28px; height: ${Math.round(compIndex2024 * 0.6)}px; background: #cfd8dc; border-radius: 4px 4px 0 0; transition: height 0.6s ease;"></div>
                        <span style="font-size: 10px; color: var(--text-muted);">2024년</span>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1;">
                        <span style="font-size: 10px; color: var(--text-muted); font-weight: 500;">${getPressureLabel(compIndex2025)} (${compIndex2025})</span>
                        <div style="width: 28px; height: ${Math.round(compIndex2025 * 0.6)}px; background: #b0bec5; border-radius: 4px 4px 0 0; transition: height 0.6s ease;"></div>
                        <span style="font-size: 10px; color: var(--text-muted);">2025년</span>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1;">
                        <span style="font-size: 10px; color: var(--primary-blue); font-weight: 700;">${getPressureLabel(compIndex2026)} (${compIndex2026})</span>
                        <div style="width: 28px; height: ${Math.round(compIndex2026 * 0.6)}px; background: var(--primary-blue); border-radius: 4px 4px 0 0; transition: height 0.6s ease;"></div>
                        <span style="font-size: 10px; font-weight: 700; color: var(--deep-blue);">현재</span>
                    </div>
                </div>
            </div>

            <!-- 전략 제안 -->
            ${strategyHTML}
        `;
    }

    function renderGraduateDetail(career, schoolType, schoolName, studentCount) {
        const contentEl = document.getElementById('graduateModalContent');
        const titleEl = document.getElementById('graduateModalTitle');
        if (!contentEl) return;
        
        if (!career) {
            contentEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">진학 데이터가 없습니다.</div>';
            return;
        }

        // 학교 유형에 맞는 헤더 라벨
        let label = '졸업생 진학률 상세';
        if (schoolType && schoolType.includes('고등학교')) {
            label = `🎓 ${schoolName} - 대학교 진학률 상세`;
        } else if (schoolType && schoolType.includes('초등학교')) {
            label = `🎓 ${schoolName} - 중학교 진학률 상세`;
        } else {
            label = `🎓 ${schoolName} - 특목/자사 진학률 상세`;
        }
        if (titleEl) titleEl.innerText = label;

        let html = '';
        
        const colors = {
            general: '#1976d2',
            special: '#7b1fa2',
            autonomous: '#f57c00',
            specialized: '#388e3c',
            other: '#607d8b'
        };

        if (schoolType && schoolType.includes('고등학교')) {
            const general = career.general || 0;
            const specialized = career.specialized || 0;
            const special = career.special || 0;
            const autonomous = career.autonomous || 0;
            
            html = `
                <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <span style="font-weight:600; color:var(--deep-blue);">4년제 대학교 진학률</span>
                            <span style="font-weight:700; color:${colors.general};">${general}%</span>
                        </div>
                        <div style="width:100%; background:#f0f4f8; border-radius:6px; height:12px; overflow:hidden;">
                            <div style="width:${general}%; height:100%; background:${colors.general}; border-radius:6px; transition:width 0.6s ease;"></div>
                        </div>
                    </div>
                    
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <span style="font-weight:600; color:var(--deep-blue);">전문대학 진학률</span>
                            <span style="font-weight:700; color:${colors.specialized};">${specialized}%</span>
                        </div>
                        <div style="width:100%; background:#f0f4f8; border-radius:6px; height:12px; overflow:hidden;">
                            <div style="width:${specialized}%; height:100%; background:${colors.specialized}; border-radius:6px; transition:width 0.6s ease;"></div>
                        </div>
                    </div>

                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <span style="font-weight:600; color:var(--deep-blue);">취업률</span>
                            <span style="font-weight:700; color:${colors.special};">${special}%</span>
                        </div>
                        <div style="width:100%; background:#f0f4f8; border-radius:6px; height:12px; overflow:hidden;">
                            <div style="width:${special}%; height:100%; background:${colors.special}; border-radius:6px; transition:width 0.6s ease;"></div>
                        </div>
                    </div>

                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <span style="font-weight:600; color:var(--deep-blue);">기타 (재수 및 미진학 등)</span>
                            <span style="font-weight:700; color:${colors.autonomous};">${autonomous}%</span>
                        </div>
                        <div style="width:100%; background:#f0f4f8; border-radius:6px; height:12px; overflow:hidden;">
                            <div style="width:${autonomous}%; height:100%; background:${colors.autonomous}; border-radius:6px; transition:width 0.6s ease;"></div>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 12px; padding: 10px 12px; background: var(--bg-primary); border-radius: 8px; font-size: 11px; color: var(--text-muted); line-height: 1.5; border-left: 3px solid var(--primary-blue);">
                    <strong style="color: var(--deep-blue); font-size: 11px;">💡 고등학교 졸업생 진로 가이드</strong>
                    <p style="margin: 4px 0 0 0; font-size: 11px; letter-spacing: -0.2px;">
                        4년제 대학 진학률과 전문대 진학률의 조화로운 분포는 학업에 몰두하는 전반적인 분위기를 보여줍니다. 취업률이 높은 특성화고/마이스터고의 경우 실무 중심의 뛰어난 취업 인프라를 보유하고 있음을 의미합니다.
                    </p>
                </div>
            `;
        } else if (schoolType && schoolType.includes('초등학교')) {
            const general = career.general || 0;
            const specialized = career.specialized || 0;
            const special = career.special || 0;
            const autonomous = career.autonomous || 0;
            const other = Math.round(special + autonomous);

            html = `
                <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <span style="font-weight:600; color:var(--deep-blue);">관내 중학교 진학률</span>
                            <span style="font-weight:700; color:${colors.general};">${general}%</span>
                        </div>
                        <div style="width:100%; background:#f0f4f8; border-radius:6px; height:12px; overflow:hidden;">
                            <div style="width:${general}%; height:100%; background:${colors.general}; border-radius:6px; transition:width 0.6s ease;"></div>
                        </div>
                    </div>
                    
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <span style="font-weight:600; color:var(--deep-blue);">관외 중학교 진학률</span>
                            <span style="font-weight:700; color:${colors.specialized};">${specialized}%</span>
                        </div>
                        <div style="width:100%; background:#f0f4f8; border-radius:6px; height:12px; overflow:hidden;">
                            <div style="width:${specialized}%; height:100%; background:${colors.specialized}; border-radius:6px; transition:width 0.6s ease;"></div>
                        </div>
                    </div>

                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <span style="font-weight:600; color:var(--deep-blue);">기타 (대안학교/해외유학/미진학 등)</span>
                            <span style="font-weight:700; color:${colors.other};">${other}%</span>
                        </div>
                        <div style="width:100%; background:#f0f4f8; border-radius:6px; height:12px; overflow:hidden;">
                            <div style="width:${other}%; height:100%; background:${colors.other}; border-radius:6px; transition:width 0.6s ease;"></div>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 12px; padding: 10px 12px; background: var(--bg-primary); border-radius: 8px; font-size: 11px; color: var(--text-muted); line-height: 1.5; border-left: 3px solid var(--primary-blue);">
                    <strong style="color: var(--deep-blue); font-size: 11px;">💡 초등학교 졸업생 진로 가이드</strong>
                    <p style="margin: 4px 0 0 0; font-size: 11px; letter-spacing: -0.2px;">
                        초등학교 졸업생의 관내/관외 진학 비중은 해당 학군의 인구 이동 및 외부 교육 시설 선호도를 보여줍니다. 관외 진학률이 두드러지게 높을 경우, 인근 명문 중학교 학군으로의 조기 전입이나 광역 단위 입학 선호가 높은 경향이 있습니다.
                    </p>
                </div>
            `;
        } else {
            const general = career.general || 0;
            const special = career.special || 0;
            const autonomous = career.autonomous || 0;
            const specialized = career.specialized || 0;
            
            html = `
                <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <span style="font-weight:600; color:var(--deep-blue);">일반고등학교 진학률</span>
                            <span style="font-weight:700; color:${colors.general};">${general}%</span>
                        </div>
                        <div style="width:100%; background:#f0f4f8; border-radius:6px; height:12px; overflow:hidden;">
                            <div style="width:${general}%; height:100%; background:${colors.general}; border-radius:6px; transition:width 0.6s ease;"></div>
                        </div>
                    </div>

                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <span style="font-weight:600; color:var(--deep-blue);">특수목적고등학교(과학고/외고/예고 등) 진학률</span>
                            <span style="font-weight:700; color:${colors.special};">${special}%</span>
                        </div>
                        <div style="width:100%; background:#f0f4f8; border-radius:6px; height:12px; overflow:hidden;">
                            <div style="width:${special}%; height:100%; background:${colors.special}; border-radius:6px; transition:width 0.6s ease;"></div>
                        </div>
                    </div>
                    
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <span style="font-weight:600; color:var(--deep-blue);">자율형 사립/공립고등학교 진학률</span>
                            <span style="font-weight:700; color:${colors.autonomous};">${autonomous}%</span>
                        </div>
                        <div style="width:100%; background:#f0f4f8; border-radius:6px; height:12px; overflow:hidden;">
                            <div style="width:${autonomous}%; height:100%; background:${colors.autonomous}; border-radius:6px; transition:width 0.6s ease;"></div>
                        </div>
                    </div>

                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <span style="font-weight:600; color:var(--deep-blue);">특성화고등학교 진학률</span>
                            <span style="font-weight:700; color:${colors.specialized};">${specialized}%</span>
                        </div>
                        <div style="width:100%; background:#f0f4f8; border-radius:6px; height:12px; overflow:hidden;">
                            <div style="width:${specialized}%; height:100%; background:${colors.specialized}; border-radius:6px; transition:width 0.6s ease;"></div>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 12px; padding: 10px 12px; background: var(--bg-primary); border-radius: 8px; font-size: 11px; color: var(--text-muted); line-height: 1.5; border-left: 3px solid var(--primary-blue);">
                    <strong style="color: var(--deep-blue); font-size: 11px;">💡 중학교 졸업생 진로 가이드</strong>
                    <p style="margin: 4px 0 0 0; font-size: 11px; letter-spacing: -0.2px;">
                        특수목적고(과학고/외고/국제고/체고/예고 등) 및 자율형 사립고 진학률은 해당 학교의 전반적인 학업 면학 분위기와 고교 입시 준비 인프라(학원가 밀집도, 내신 난이도 등)를 판단하는 중요한 정량적 지표입니다.
                    </p>
                </div>
            `;
        }

        contentEl.innerHTML = html;
    }

    function renderBudgetDetail(bd) {
        if (!bd) return;
        window.currentSchoolBudgetDetail = bd;
        
        // 시/도 탭 라벨 동적 업데이트
        const cityTabBtn = document.querySelector('.budget-tab-btn[data-compare="city"]');
        if (cityTabBtn) {
            cityTabBtn.innerText = bd.cityName || '서울특별시';
        }

        const gradeEl = document.getElementById('budgetGradeLabel');
        gradeEl.innerText = bd.grade.label;
        gradeEl.style.background = bd.grade.bg;
        gradeEl.style.color = bd.grade.color;
        document.getElementById('budgetPerStudent').innerText = `월 ${bd.perStudentMonth.toLocaleString()}원`;
        document.getElementById('budgetBarSchoolVal').innerText = `${bd.budget}만원`;
        window.updateBudgetCompare('region');
        const trendChart = document.getElementById('budgetTrendChart');
        trendChart.innerHTML = '';
        const years = [2022, 2023, 2024];
        const maxTrend = Math.max(...bd.trend);
        bd.trend.forEach((val, i) => {
            const barH = Math.max(10, Math.round((val / maxTrend) * 40));
            const isLast = i === bd.trend.length - 1;
            const col = document.createElement('div');
            col.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;';
            col.innerHTML = `
                <span style="font-size:9px;color:${isLast ? 'var(--primary-blue)' : 'var(--text-muted)'};font-weight:${isLast ? '700' : '400'}">${val}만</span>
                <div style="width:100%;max-width:28px;height:${barH}px;background:${isLast ? 'var(--primary-blue)' : '#c5cae9'};border-radius:3px 3px 0 0;"></div>
                <span style="font-size:9px;color:var(--text-muted);">${years[i]}</span>
            `;
            trendChart.appendChild(col);
        });
        const breakdownEl = document.getElementById('budgetBreakdown');
        breakdownEl.innerHTML = '';
        const colors = ['#1976d2','#388e3c','#f57c00','#7b1fa2'];
        let ci = 0;
        for (const [key, val] of Object.entries(bd.breakdown)) {
            const pct = Math.round((val / bd.budget) * 100);
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:6px;';
            row.innerHTML = `
                <span style="width:56px;font-size:11px;color:var(--text-muted);flex-shrink:0;">${key}</span>
                <div style="flex:1;background:#f0f4f8;border-radius:4px;height:8px;overflow:hidden;">
                    <div style="width:${pct}%;height:100%;background:${colors[ci%colors.length]};border-radius:4px;transition:width 0.5s ease;"></div>
                </div>
                <span style="font-size:11px;font-weight:600;color:${colors[ci%colors.length]};width:44px;text-align:right;">${val}만원</span>
            `;
            breakdownEl.appendChild(row);
            ci++;
        }
        document.getElementById('schoolAlrimiLink').href = bd.schoolAlrimiUrl;
    }

    function renderComparisonBoard(matrix) {
        compareGrid.innerHTML = '';
        matrix.forEach(item => {
            const col = document.createElement('div');
            col.className = 'compare-col';
            col.innerHTML = `
                <div class="compare-school-name">${item.school_name}</div>
                <div style="font-size:12px;margin-bottom:6px;">🧑‍🎓 학생수: <strong>${item.student_count}</strong></div>
                <div style="font-size:12px;margin-bottom:6px;">🏫 학급 평균: <strong>${item.class_avg_size}</strong></div>
                <div style="font-size:12px;margin-bottom:6px;">📊 국·영·수 평균: <strong>${item.korean_avg} / ${item.english_avg} / ${item.math_avg}</strong></div>
                <div style="font-size:12px;margin-bottom:6px;">🎯 강점 과목: <strong>${item.strong_subject}</strong></div>
                <div style="font-size:12px;margin-bottom:6px;">💰 창체 활동비: <strong>${item.extracurricular_budget}만원</strong></div>
                <div style="font-size:12px;margin-top:8px;border-top:1px solid var(--border-color);padding-top:6px;">
                    ✨ 우리 아이 적합도: <strong style="color:${item.suitability === '상' ? 'var(--success-green)' : (item.suitability === '중' ? 'var(--warning-yellow)' : 'var(--danger-red)')}">${item.suitability}</strong>
                </div>
            `;
            compareGrid.appendChild(col);
        });
    }
});

// --- 창체 활동비 패널 토글 ---
window.toggleBudgetPanel = function() {
    const modal = document.getElementById('budgetModal');
    if (!modal) return;
    if (modal.style.display === 'none' || modal.style.display === '') {
        modal.style.display = 'flex';
        const panel = document.getElementById('budgetDetailPanel');
        if (panel) panel.style.display = 'block';
    } else {
        modal.style.display = 'none';
    }
};

// --- 창체 활동비 비교 기준 업데이트 ---
window.updateBudgetCompare = function(type) {
    const bd = window.currentSchoolBudgetDetail;
    if (!bd) return;

    // 탭 스타일 활성화 처리
    const tabs = document.querySelectorAll('.budget-tab-btn');
    tabs.forEach(btn => {
        if (btn.getAttribute('data-compare') === type) {
            btn.style.background = 'white';
            btn.style.color = 'var(--deep-blue)';
            btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        } else {
            btn.style.background = 'transparent';
            btn.style.color = 'var(--text-muted)';
            btn.style.boxShadow = 'none';
        }
    });

    let compareAvg = bd.regionAvg;
    let label = `${bd.regionName} 평균 ${bd.regionAvg}만원`;

    if (type === 'city') {
        compareAvg = bd.cityAvg || 138;
        label = `${bd.cityName || '서울특별시'} 평균 ${compareAvg}만원`;
    } else if (type === 'national') {
        compareAvg = bd.nationalAvg || 122;
        label = `전국 평균 ${compareAvg}만원`;
    }

    document.getElementById('budgetBarRegionLabel').innerText = label;
    document.getElementById('budgetBarRegionMarkText').innerText = `▲ ${type === 'region' ? bd.regionName : (type === 'city' ? (bd.cityName || '서울특별시') : '전국')} 평균`;
    document.getElementById('budgetBarRegionMark').title = `${type === 'region' ? bd.regionName : (type === 'city' ? (bd.cityName || '서울특별시') : '전국')} 평균`;

    const maxVal = Math.max(bd.budget, compareAvg) * 1.2;
    const leftPct = Math.min((compareAvg / maxVal) * 100, 100);
    document.getElementById('budgetBarSchool').style.width = `${Math.min((bd.budget / maxVal) * 100, 100)}%`;
    document.getElementById('budgetBarRegionMark').style.left = `calc(${leftPct}% - 1px)`;
    document.getElementById('budgetBarRegionMarkText').style.left = `${leftPct}%`;
};

// --- Community Filter & Fetch Logic ---
window.currentAcademyForCommunity = '';
window.currentCommunityFilter = 'all';

window.fetchCommunityReviews = async (acadName, type = 'all', subjectLabel = '', typeLabel = '') => {
    const panel = document.getElementById('communityPanel');
    const title = document.getElementById('communityAcademyName');
    const reviewContainer = document.getElementById('communityReviewsList');
    
    title.innerText = acadName;

    // 상세 과목 뱃지 업데이트
    const subjectEl = document.getElementById('communityAcademySubject');
    if (subjectEl) {
        if (subjectLabel) {
            subjectEl.innerText = subjectLabel;
            subjectEl.style.display = 'inline-block';
        } else {
            subjectEl.style.display = 'none';
        }
    }

    // 학원/교습소 유형 뱃지 업데이트
    const typeEl = document.getElementById('communityAcademyType');
    if (typeEl) {
        if (typeLabel) {
            typeEl.innerText = typeLabel;
            typeEl.style.display = 'inline-block';
            typeEl.style.background = typeLabel.includes('교습소') ? '#fff3e0' : '#e3f2fd';
            typeEl.style.color = typeLabel.includes('교습소') ? '#e65100' : '#1565c0';
        } else {
            typeEl.style.display = 'none';
        }
    }

    reviewContainer.innerHTML = type === 'real' 
        ? '<div style="text-align: center; color: var(--text-muted); padding: 20px;">찐후기를 불러오는 중입니다...</div>'
        : '<div style="text-align: center; color: var(--text-muted); padding: 20px;">포털 커뮤니티 데이터를 검색 중입니다...</div>';
    
    panel.style.display = 'flex';
    document.getElementById('btnToggleSidebarTop').style.display = 'none';

    try {
        let realReviews = [];
        let portalPosts = [];

        // 1. 찐후기 데이터 가져오기 (전체 탭이거나 찐후기 탭일 때)
        if (type === 'all' || type === 'real') {
            try {
                const res = await fetch(`/api/reviews?academyName=${encodeURIComponent(acadName)}`);
                if (res.ok) {
                    const data = await res.json();
                    realReviews = (data.items || []).map(item => ({ ...item, _type: 'real' }));
                }
            } catch (err) {
                console.error('Real review fetch error:', err);
            }
        }

        // 2. 포털(블로그/카페) 데이터 가져오기 (전체 탭이거나 블로그/카페 탭일 때)
        if (type === 'all' || type === 'blog' || type === 'cafe') {
            try {
                const res = await fetch(`/api/community?q=${encodeURIComponent(acadName)}&type=${type}`);
                if (res.ok) {
                    const data = await res.json();
                    portalPosts = (data.items || []).map(item => ({ ...item, _type: 'portal' }));
                } else if (res.status === 401 || res.status === 500) {
                    const errData = await res.json().catch(() => ({}));
                    portalPosts = [{ _type: 'error', message: errData.error || '네이버 API 설정이 필요하거나 인증에 실패했습니다. 관리자 페이지를 확인해주세요.' }];
                }
            } catch (err) {
                console.error('Portal fetch error:', err);
            }
        }

        // 3. 데이터 병합 및 날짜순(최신순) 정렬
        const combinedItems = [...realReviews, ...portalPosts];
        combinedItems.sort((a, b) => {
            const getDateString = (item) => {
                if (item._type === 'real') {
                    // Supabase created_at format: "2026-05-31T07:40:31Z" -> "20260531"
                    const dStr = item.created_at || item.createdAt || '';
                    return dStr.substring(0, 10).replace(/-/g, ''); 
                }
                // Naver postdate format: "20260531"
                return item.postdate || '00000000';
            };
            return getDateString(b).localeCompare(getDateString(a));
        });

        // 4. 화면 렌더링
        reviewContainer.innerHTML = '';
        if (combinedItems.length > 0) {
            combinedItems.forEach(item => {
                const reviewItem = document.createElement('div');
                reviewItem.style.background = 'white';
                reviewItem.style.padding = '12px';
                reviewItem.style.borderRadius = '8px';
                reviewItem.style.border = '1px solid var(--border-color)';
                reviewItem.style.fontSize = '13px';
                reviewItem.style.color = 'var(--text-main)';
                reviewItem.style.lineHeight = '1.5';
                reviewItem.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
                reviewItem.style.marginBottom = '8px'; // 간격 추가
                
                if (item._type === 'real') {
                    // 찐후기 렌더링
                    const stars = '⭐'.repeat(item.rating);
                    const dateStr = new Date(item.created_at || item.createdAt).toLocaleDateString();
                    reviewItem.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                            <span style="font-size: 10px; font-weight: 700; color: white; background: #e91e63; border-radius: 4px; padding: 1px 6px; flex-shrink: 0;">찐후기</span>
                            <span style="font-size: 12px; font-weight: bold; color: #ff9800;">${stars}</span>
                            <span style="font-size: 11px; color: var(--text-muted); margin-left: auto;">${dateStr}</span>
                        </div>
                        <div style="color: var(--text-main); font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-all;">${item.content}</div>
                    `;
                } else if (item._type === 'error') {
                    reviewItem.innerHTML = `
                        <div style="color: var(--danger-red); text-align: center; padding: 10px; font-weight: bold;">
                            ⚠️ ${item.message}
                        </div>
                    `;
                } else {
                    // 포털 커뮤니티 렌더링
                    const postTitle = item.title.replace(/<[^>]*>?/gm, '');
                    const postDesc = item.description.replace(/<[^>]*>?/gm, '');
                    const isCafe = item._source === 'cafe';

                    let metaLabel = '';
                    if (isCafe) {
                        metaLabel = item.cafename || '카페';
                    } else {
                        let postDate = item.postdate || '';
                        if (postDate.length === 8) {
                            postDate = `${postDate.substring(0,4)}.${postDate.substring(4,6)}.${postDate.substring(6,8)}`;
                        }
                        metaLabel = postDate;
                    }

                    const badgeColor = isCafe ? '#ff6f00' : '#1e88e5';
                    const badgeLabel = isCafe ? '카페' : '블로그';

                    reviewItem.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                            <span style="font-size: 10px; font-weight: 700; color: white; background: ${badgeColor}; border-radius: 4px; padding: 1px 6px; flex-shrink: 0;">${badgeLabel}</span>
                            <span style="font-size: 11px; color: var(--text-muted);">${metaLabel}</span>
                        </div>
                        <strong style="display: block; margin-bottom: 4px; font-size: 14px;">
                            <a href="${item.link}" target="_blank" style="color: var(--deep-blue); text-decoration: none;">${postTitle}</a>
                        </strong>
                        <span style="color: var(--text-muted); font-size: 12px; display: block; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${postDesc}</span>
                    `;
                }
                reviewContainer.appendChild(reviewItem);
            });
        } else {
            reviewContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">관련 후기나 커뮤니티 정보가 없습니다.</div>';
        }
    } catch (e) {
        console.error('Community Fetch Error:', e);
        reviewContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #d32f2f;">오류가 발생했습니다: ${e.message}</div>`;
    }
};

// --- 졸업생 진학률 모달 토글 ---
window.toggleGraduateModal = function() {
    const modal = document.getElementById('graduateModal');
    if (!modal) return;
    if (modal.style.display === 'none' || modal.style.display === '') {
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
};

// --- 내신 경쟁 상세 분석 모달 토글 ---
window.toggleCompetitionModal = function() {
    const modal = document.getElementById('competitionModal');
    if (!modal) return;
    if (modal.style.display === 'none' || modal.style.display === '') {
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
};

// --- 학교폭력 현황 모달 토글 ---
window.toggleViolenceStatsModal = function() {
    const modal = document.getElementById('violenceStatsModal');
    if (!modal) return;
    if (modal.style.display === 'none' || modal.style.display === '') {
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
};

// --- 학교폭력 데이터 렌더링 ---
window.renderViolenceStats = function(school) {
    const vs = school.violence_stats;
    if (!vs) return;

    // 인라인 요약
    const summaryEl = document.getElementById('statViolenceSummary');
    if (summaryEl) {
        if (vs.total_cases === 0) {
            summaryEl.innerHTML = `신고 없음 (처리율 ${vs.resolved_rate ?? '-'}%)`;
            summaryEl.style.color = '#2e7d32';
        } else {
            summaryEl.innerHTML = `연 ${vs.total_cases}건 · 100명당 ${vs.per_100 ?? '-'}건`;
            summaryEl.style.color = vs.total_cases > 3 ? '#c62828' : '#e65100';
        }
    }

    // 모달 내 수치
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    set('statViolenceTotal',    vs.total_cases ?? '-');
    set('statViolencePer100',   vs.per_100 ?? '-');
    set('statViolenceResolved', vs.resolved_rate ?? '-');

    // 유형별 비율
    const t = vs.types || {};
    const verbal   = t.verbal   ?? 0;
    const cyber    = t.cyber    ?? 0;
    const exclude  = t.exclude  ?? 0;
    const physical = t.physical ?? 0;

    set('statViolenceVerbal',   verbal);
    set('statViolenceCyber',    cyber);
    set('statViolenceExclude',  exclude);
    set('statViolencePhysical', physical);

    // 스택 바
    const setW = (id, val) => { const el = document.getElementById(id); if (el) el.style.width = val + '%'; };
    setW('violenceBarVerbal',   verbal);
    setW('violenceBarCyber',    cyber);
    setW('violenceBarExclude',  exclude);
    setW('violenceBarPhysical', physical);
    // 개별 바
    setW('violenceBarVerbal2',   verbal);
    setW('violenceBarCyber2',    cyber);
    setW('violenceBarExclude2',  exclude);
    setW('violenceBarPhysical2', physical);
};

// --- 전학생·통학 현황 모달 토글 ---
window.toggleStudentStatsModal = function() {
    const modal = document.getElementById('studentStatsModal');
    if (!modal) return;
    if (modal.style.display === 'none' || modal.style.display === '') {
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
};

// 하위 호환성 유지 (구 toggleStudentStatsPanel 호출 대응)
window.toggleStudentStatsPanel = window.toggleStudentStatsModal;

// --- 전학생·통학 데이터 렌더링 ---
window.renderStudentStats = function(school) {
    const ts = school.transfer_stats;
    const rs = school.residence_stats;
    const cs = school.commute_stats;

    // 인라인 요약값 (전학생·통학 현황: 전입 N / 전출 N)
    const summaryEl = document.getElementById('statTransferSummary');
    if (summaryEl && ts) {
        const net = ts.net ?? 0;
        const netStr = (net > 0 ? '+' : '') + net;
        summaryEl.innerHTML = `전입 ${ts.transfer_in ?? '-'}명 / 전출 ${ts.transfer_out ?? '-'}명 (순 ${netStr}명)`;
    }

    // 모달 내 전학생 현황
    if (ts) {
        const inEl  = document.getElementById('statTransferIn');
        const outEl = document.getElementById('statTransferOut');
        const netEl = document.getElementById('statTransferNet');
        if (inEl)  inEl.innerText  = ts.transfer_in  ?? '-';
        if (outEl) outEl.innerText = ts.transfer_out ?? '-';
        if (netEl) {
            const net = ts.net ?? 0;
            netEl.innerText = (net > 0 ? '+' : '') + net;
            netEl.style.color = net > 0 ? '#2e7d32' : net < 0 ? '#bf360c' : '#0d47a1';
        }
    }

    // 거주지 비율
    if (rs) {
        const inPct  = rs.within_district  ?? 0;
        const outPct = rs.outside_district ?? 0;
        const inEl  = document.getElementById('statResidenceIn');
        const outEl = document.getElementById('statResidenceOut');
        const bar   = document.getElementById('residenceBar');
        if (inEl)  inEl.innerText  = inPct;
        if (outEl) outEl.innerText = outPct;
        if (bar) {
            bar.style.background = `linear-gradient(to right, #1565c0 0%, #1565c0 ${inPct}%, #e0e0e0 ${inPct}%, #e0e0e0 100%)`;
        }
    }

    // 통학 수단 비율
    if (cs) {
        const walk = cs.walk ?? 0;
        const bus  = cs.bus  ?? 0;
        const car  = cs.car  ?? 0;
        const etc  = cs.etc  ?? 0;

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        set('statCommuteWalk', walk);
        set('statCommuteBus',  bus);
        set('statCommuteCar',  car);
        set('statCommuteEtc',  etc);

        const setW = (id, val) => { const el = document.getElementById(id); if (el) el.style.width = val + '%'; };
        // 상단 스택 바
        setW('commuteBarWalk', walk);
        setW('commuteBarBus',  bus);
        setW('commuteBarCar',  car);
        setW('commuteBarEtc',  etc);
        // 모달 내 개별 진행 바
        setW('commuteBarWalk2', walk);
        setW('commuteBarBus2',  bus);
        setW('commuteBarCar2',  car);
        setW('commuteBarEtc2',  etc);
    }
};

// Setup filter button listeners
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.community-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetType = e.target.getAttribute('data-type');
            window.currentCommunityFilter = targetType;
            
            // Update UI
            document.querySelectorAll('.community-filter-btn').forEach(b => {
                b.style.background = 'white';
                b.style.color = 'var(--text-muted)';
                b.style.borderColor = 'var(--border-color)';
            });
            e.target.style.background = 'var(--primary-blue)';
            e.target.style.color = 'white';
            e.target.style.borderColor = 'var(--primary-blue)';
            
            // Re-fetch
            if (window.currentAcademyForCommunity) {
                window.fetchCommunityReviews(window.currentAcademyForCommunity, targetType);
            }
        });
    });
});

// --- 찐후기 글쓰기 모달 제어 로직 ---
window.openReviewModal = () => {
    if (!window.currentAcademyForCommunity) {
        alert('선택된 학원이 없습니다.');
        return;
    }
    document.getElementById('reviewModalAcademyName').innerText = window.currentAcademyForCommunity;
    document.getElementById('reviewRating').value = '5';
    document.getElementById('reviewContent').value = '';
    document.getElementById('reviewModal').style.display = 'flex';
};

window.submitReview = async () => {
    const acadName = window.currentAcademyForCommunity;
    const rating = document.getElementById('reviewRating').value;
    const content = document.getElementById('reviewContent').value.trim();

    if (!content) {
        alert('상세 후기 내용을 입력해주세요.');
        return;
    }

    try {
        const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ academyName: acadName, rating, content })
        });
        
        if (!response.ok) throw new Error('등록 중 오류가 발생했습니다.');
        
        alert('소중한 찐후기가 성공적으로 등록되었습니다!');
        document.getElementById('reviewModal').style.display = 'none';
        
        // 찐후기 탭으로 강제 이동(리프레시)
        const realBtn = document.querySelector('.community-filter-btn[data-type="real"]');
        if (realBtn) realBtn.click();
        
    } catch(e) {
        alert(e.message);
    }
};
