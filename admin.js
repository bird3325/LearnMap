// Admin Dashboard logic

let token = localStorage.getItem('admin_token') || '';
let kakaoGeocoderInstance = null;

// DOM Elements
const loginCard = document.getElementById('loginCard');
const managementPanel = document.getElementById('managementPanel');
const adminPassword = document.getElementById('adminPassword');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');

const kakaoAppKey = document.getElementById('kakaoAppKey');
const neisApiKey = document.getElementById('neisApiKey');
const naverClientId = document.getElementById('naverClientId');
const naverClientSecret = document.getElementById('naverClientSecret');
const dataGoKrKey = document.getElementById('dataGoKrKey');
const btnSaveConfig = document.getElementById('btnSaveConfig');

const updateSido = document.getElementById('updateSido');
const updateSigungu = document.getElementById('updateSigungu');
const updateSchoolType = document.getElementById('updateSchoolType');
const btnRunUpdate = document.getElementById('btnRunUpdate');
const progressContainer = document.getElementById('progressContainer');
const progressStatus = document.getElementById('progressStatus');
const progressPercent = document.getElementById('progressPercent');
const progressBarFill = document.getElementById('progressBarFill');
const adminLog = document.getElementById('adminLog');

// Stored school list DOM Elements & Filters
const storedSchoolsCount = document.getElementById('storedSchoolsCount');
const btnSearchSchools = document.getElementById('btnSearchSchools');
const storedSchoolsListContainer = document.getElementById('storedSchoolsListContainer');
const storedRegionFilter = document.getElementById('storedRegionFilter');
const storedTypeFilter = document.getElementById('storedTypeFilter');
const storedSearchInput = document.getElementById('storedSearchInput');

let allStoredSchools = []; // Hold all fetched schools for local filtering

const sigunguMap = {
    '서울특별시': [
        '전체', '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'
    ],
    '부산광역시': [
        '전체', '강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'
    ],
    '대구광역시': [
        '전체', '군위군', '남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'
    ],
    '인천광역시': [
        '전체', '강화군', '계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '옹진군', '중구'
    ],
    '광주광역시': [
        '전체', '광산구', '남구', '동구', '북구', '서구'
    ],
    '대전광역시': [
        '전체', '대덕구', '동구', '서구', '유성구', '중구'
    ],
    '울산광역시': [
        '전체', '남구', '동구', '북구', '울주군', '중구'
    ],
    '세종특별자치시': [
        '전체'
    ],
    '경기도': [
        '전체', '가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'
    ],
    '강원특별자치도': [
        '전체', '강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군'
    ],
    '충청북도': [
        '전체', '괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '증평군', '진천군', '청주시', '충주시'
    ],
    '충청남도': [
        '전체', '계룡시', '공주시', '금산군', '논산시', '당진시', '부여군', '서산시', '서천군', '아산시', '예산군', '천안시', '청양군', '태안군', '홍성군'
    ],
    '전북특별자치도': [
        '전체', '고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군'
    ],
    '전라남도': [
        '전체', '강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'
    ],
    '경상북도': [
        '전체', '경산시', '경주시', '고령군', '구미시', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시'
    ],
    '경상남도': [
        '전체', '거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '창녕군', '창원시', '통영시', '하동군', '함안군', '함양군', '합천군'
    ],
    '제주특별자치도': [
        '전체', '서귀포시', '제주시'
    ]
};

function updateSigunguDropdown() {
    if (!updateSido || !updateSigungu) return;
    const sido = updateSido.value;
    const sigungus = sigunguMap[sido] || ['전체'];
    updateSigungu.innerHTML = sigungus.map(s => `<option value="${s}">${s}</option>`).join('');
}

// Init View State
if (updateSido) {
    updateSido.addEventListener('change', updateSigunguDropdown);
    updateSigunguDropdown();
}

window.addEventListener('DOMContentLoaded', () => {
    if (token) {
        showPanel();
    }
});

// Log utility
function logMsg(msg) {
    adminLog.innerHTML += `[${new Date().toLocaleTimeString()}] ${msg}<br>`;
    adminLog.scrollTop = adminLog.scrollHeight;
}

function updateProgress(status, percent) {
    progressStatus.innerText = status;
    progressPercent.innerText = `${percent}%`;
    progressBarFill.style.width = `${percent}%`;
}

// Render school list based on filter criteria
let currentStoredSchoolsLimit = 100;

function renderStoredSchoolsList() {
    if (!storedSchoolsListContainer || !storedSchoolsCount) return;

    const selectedRegion = storedRegionFilter ? storedRegionFilter.value : 'all';
    const selectedType = storedTypeFilter ? storedTypeFilter.value : 'all';
    const searchQuery = storedSearchInput ? storedSearchInput.value.trim().toLowerCase() : '';

    let filtered = allStoredSchools;

    // Filter by Region
    if (selectedRegion !== 'all') {
        filtered = filtered.filter(s => s.region === selectedRegion);
    }

    // Filter by School Type
    if (selectedType !== 'all') {
        filtered = filtered.filter(s => s.school_type === selectedType);
    }

    // Filter by Search Query
    if (searchQuery !== '') {
        filtered = filtered.filter(s => 
            s.school_name.toLowerCase().includes(searchQuery) ||
            (s.address && s.address.toLowerCase().includes(searchQuery))
        );
    }

    storedSchoolsCount.innerText = filtered.length;

    if (filtered.length === 0) {
        storedSchoolsListContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px 0;">조건에 해당하는 학교가 없습니다.</div>';
        return;
    }

    // Limit the items for performance
    const sliced = filtered.slice(0, currentStoredSchoolsLimit);

    let html = sliced.map((school, index) => {
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.05); padding: 6px 0;">
                <div>
                    <strong style="color: var(--deep-blue); font-size: 13px;">${index + 1}. ${school.school_name}</strong> 
                    <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">(${school.school_type})</span>
                    ${(() => {
                        const updatedDate = school.updated_at || '2025-09-15';
                        const isOutdated = new Date(updatedDate) < new Date(new Date().setFullYear(new Date().getFullYear() - 1));
                        if (isOutdated) {
                            return `<span style="background: var(--danger-red); color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 6px; font-size: 10px;">업데이트 필요</span>`;
                        } else {
                            return `<span style="background: var(--success-green); color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 6px; font-size: 10px;">최신</span>`;
                        }
                    })()}
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                        주소: ${school.address} | 공시 기준일: ${school.updated_at || '2025-09-15'}
                    </div>
                </div>
                <div style="text-align: right; font-size: 11px;">
                    <span style="background: var(--primary-blue); color: white; padding: 2px 6px; border-radius: 4px; font-weight: 600;">국:${school.subjects.korean.avg} 영:${school.subjects.english.avg} 수:${school.subjects.math.avg}</span>
                </div>
            </div>
        `;
    }).join('');

    if (filtered.length > currentStoredSchoolsLimit) {
        html += `
            <div style="text-align: center; padding: 12px 0;">
                <button id="btnLoadMoreStoredSchools" class="btn-secondary" style="width: auto; padding: 6px 20px; font-size: 12px; margin: 0; background: #e2e8f0; color: #4a5568; border: none; border-radius: 4px; cursor: pointer;">
                    더 보기 (${sliced.length} / ${filtered.length})
                </button>
            </div>
        `;
    }

    storedSchoolsListContainer.innerHTML = html;

    // Bind event for Load More button
    const btnLoadMore = document.getElementById('btnLoadMoreStoredSchools');
    if (btnLoadMore) {
        btnLoadMore.addEventListener('click', () => {
            currentStoredSchoolsLimit += 100;
            renderStoredSchoolsList();
        });
    }
}

// Load stored schools from database
async function loadStoredSchools() {
    if (!storedSchoolsListContainer || !storedSchoolsCount) return;

    storedSchoolsListContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px 0;">학교 데이터를 불러오는 중...</div>';
    storedSchoolsCount.innerText = '0';

    try {
        const response = await fetch('/api/schools');
        if (!response.ok) throw new Error('학교 데이터를 불러오지 못했습니다.');
        const schools = await response.json();
        
        allStoredSchools = schools;
        renderStoredSchoolsList();
        renderUnsavedRegions();

    } catch (err) {
        storedSchoolsListContainer.innerHTML = `<div style="text-align: center; color: red; padding: 20px 0;">에러 발생: ${err.message}</div>`;
    }
}

// 미저장 지역(시/도 및 시/군/구) 계산 및 렌더링
function renderUnsavedRegions() {
    const container = document.getElementById('unsavedRegionsContainer');
    if (!container) return;

    if (!allStoredSchools || allStoredSchools.length === 0) {
        container.innerHTML = "저장된 데이터가 없어 모든 지역이 미저장 상태입니다.";
        return;
    }

    // 1. 저장된 시/도 -> 시/군/구 목록 추출
    const savedRegions = {};
    allStoredSchools.forEach(school => {
        const sido = school.region;
        if (!sido || !school.address) return;
        
        const parts = school.address.split(' ');
        if (parts.length >= 2) {
            let sigungu = parts[1];
            if (!savedRegions[sido]) savedRegions[sido] = new Set();
            savedRegions[sido].add(sigungu);
        }
    });

    // 2. sigunguMap과 비교하여 미저장 항목 산출
    let unsavedHtml = '';
    
    Object.keys(sigunguMap).forEach(sido => {
        const totalSigungus = sigunguMap[sido].filter(s => s !== '전체');
        
        if (totalSigungus.length === 0) {
            // 세종특별자치시처럼 '전체'만 있는 경우
            if (!savedRegions[sido] || savedRegions[sido].size === 0) {
                unsavedHtml += `<div style="margin-bottom: 4px;"><strong>${sido}</strong>: 전체 미저장</div>`;
            }
            return;
        }

        const savedForSido = savedRegions[sido] || new Set();
        const unsavedForSido = totalSigungus.filter(s => !savedForSido.has(s));
        
        if (unsavedForSido.length > 0) {
            if (unsavedForSido.length === totalSigungus.length) {
                unsavedHtml += `<div style="margin-bottom: 4px;"><strong>${sido}</strong>: 전체 미저장 (${unsavedForSido.length}개 지역)</div>`;
            } else {
                unsavedHtml += `<div style="margin-bottom: 4px;"><strong>${sido}</strong>: ${unsavedForSido.join(', ')}</div>`;
            }
        }
    });

    if (unsavedHtml === '') {
        container.innerHTML = "<span style='color: var(--success-green); font-weight: bold;'>🎉 모든 지역이 업데이트 되었습니다!</span>";
    } else {
        container.innerHTML = unsavedHtml;
    }
}

// Bind search button and filter inputs
if (btnSearchSchools) {
    btnSearchSchools.addEventListener('click', () => {
        currentStoredSchoolsLimit = 100;
        renderStoredSchoolsList();
    });
}
if (storedRegionFilter) {
    storedRegionFilter.addEventListener('change', () => {
        currentStoredSchoolsLimit = 100;
        renderStoredSchoolsList();
    });
}
if (storedTypeFilter) {
    storedTypeFilter.addEventListener('change', () => {
        currentStoredSchoolsLimit = 100;
        renderStoredSchoolsList();
    });
}
if (storedSearchInput) {
    storedSearchInput.addEventListener('input', () => {
        currentStoredSchoolsLimit = 100;
        renderStoredSchoolsList();
    });
}

// Show Panel and Load Configurations
let supabaseAdmin = null;
function initSupabaseAdmin() {
    if (window.supabase) {
        const SUPABASE_URL = 'https://khwzgqnwlknawggugznd.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pncW53bGtuYXdnZ3Vnem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDQzNDksImV4cCI6MjA5NTc4MDM0OX0.P2g3Y_MYV_ca8ZRpfAT93pnEzP4osYWc2tfyBHKb7v4';
        supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
}

function showPanel() {
    loginCard.style.display = 'none';
    managementPanel.style.display = 'block';
    
    // Initialize Supabase client
    initSupabaseAdmin();

    // Load school list
    loadStoredSchools();
    
    // Load reviews
    setTimeout(() => {
        if (typeof loadReviews === 'function') loadReviews();
    }, 300);
    
    // Fetch Configuration from server
    fetch('/api/admin/config', {
        headers: { 'Authorization': token }
    })
    .then(res => {
        if (!res.ok) throw new Error('로그인 토큰이 만료되었거나 올바르지 않습니다.');
        return res.json();
    })
    .then(config => {
        kakaoAppKey.value = config.kakao_app_key || '';
        neisApiKey.value = config.neis_api_key || '';
        naverClientId.value = config.naver_client_id || '';
        naverClientSecret.value = config.naver_client_secret || '';
        if (dataGoKrKey) dataGoKrKey.value = config.data_go_kr_key || '';
        
        // Dynamically load Kakao SDK if App Key exists for Geocoding in Admin page
        if (config.kakao_app_key) {
            loadKakaoSdkForAdmin(config.kakao_app_key);
        }
    })
    .catch(err => {
        showAlert(err.message);
        logout();
    });
}

function logout() {
    localStorage.removeItem('admin_token');
    token = '';
    loginCard.style.display = 'block';
    managementPanel.style.display = 'none';
}

// Dynamic Kakao SDK loader for Admin Geocoder
function loadKakaoSdkForAdmin(appkey) {
    if (window.kakao && window.kakao.maps) {
        // Already loaded
        if (window.kakao.maps.services && window.kakao.maps.services.Geocoder) {
            kakaoGeocoderInstance = new window.kakao.maps.services.Geocoder();
        }
        return;
    }
    
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&libraries=services&autoload=false`;
    script.onload = () => {
        window.kakao.maps.load(() => {
            kakaoGeocoderInstance = new window.kakao.maps.services.Geocoder();
            console.log('[Admin] Geocoder loaded successfully.');
        });
    };
    document.head.appendChild(script);
}

// 1. LOGIN Event
btnLogin.addEventListener('click', () => {
    const password = adminPassword.value.trim();
    if (!password) {
        showAlert('비밀번호를 입력해 주세요.');
        return;
    }

    fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    })
    .then(res => {
        if (!res.ok) throw new Error('인증 실패. 올바른 비밀번호를 입력하세요.');
        return res.json();
    })
    .then(data => {
        token = data.token;
        localStorage.setItem('admin_token', token);
        showPanel();
    })
    .catch(err => {
        showAlert(err.message);
    });
});

// 엔터 키 입력 시 로그인 처리
adminPassword.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        btnLogin.click();
    }
});

// 2. LOGOUT Event
btnLogout.addEventListener('click', logout);

// 3. SAVE CONFIG Event
btnSaveConfig.addEventListener('click', () => {
    const keys = {
        kakao_app_key: kakaoAppKey.value.trim(),
        neis_api_key: neisApiKey.value.trim(),
        naver_client_id: naverClientId.value.trim(),
        naver_client_secret: naverClientSecret.value.trim(),
        data_go_kr_key: dataGoKrKey ? dataGoKrKey.value.trim() : ''
    };

    fetch('/api/admin/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify(keys)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showAlert('API 설정이 저장되었습니다.');
            loadKakaoSdkForAdmin(keys.kakao_app_key);
        } else {
            showAlert('저장 실패: ' + data.message);
        }
    })
    .catch(err => {
        showAlert('서버 통신 에러: ' + err.message);
    });
});

// Helper for Pin Color (Client-side mirror of pin_visualizer.js)
function getPinColor(school) {
    const defaultBenchmark = 78.0;
    let aboveCount = 0;
    if (school.subjects.korean.avg >= defaultBenchmark) aboveCount++;
    if (school.subjects.english.avg >= defaultBenchmark) aboveCount++;
    if (school.subjects.math.avg >= defaultBenchmark) aboveCount++;
    if (aboveCount === 3) return 'blue';
    if (aboveCount === 2) return 'green';
    if (aboveCount === 1) return 'yellow';
    return 'gray';
}

// Custom Modal Dialog Helpers
function showAlert(message) {
    const modal = document.getElementById('alertModal');
    const msgEl = document.getElementById('alertModalMessage');
    const btnClose = document.getElementById('btnAlertClose');
    if (!modal || !msgEl || !btnClose) {
        alert(message);
        return;
    }
    msgEl.innerText = message;
    modal.style.display = 'flex';
    btnClose.onclick = () => {
        modal.style.display = 'none';
    };
}

function showConfirm(message, onProceed) {
    const modal = document.getElementById('confirmModal');
    const msgEl = document.getElementById('confirmModalMessage');
    const btnProceed = document.getElementById('btnConfirmProceed');
    const btnCancel = document.getElementById('btnConfirmCancel');
    if (!modal || !msgEl || !btnProceed || !btnCancel) {
        if (confirm(message)) {
            onProceed();
        }
        return;
    }
    msgEl.innerText = message;
    modal.style.display = 'flex';
    
    btnProceed.onclick = () => {
        modal.style.display = 'none';
        onProceed();
    };
    btnCancel.onclick = () => {
        modal.style.display = 'none';
    };
}

// 4. DATABASE UPDATE PROCESS Event (Complex Geocoding Pipeline)
btnRunUpdate.addEventListener('click', () => {
    const sido = updateSido.value;
    const sigungu = updateSigungu.value;
    const typeValue = updateSchoolType.value;
    const neisKey = neisApiKey.value.trim();

    if (!kakaoGeocoderInstance) {
        showAlert('Kakao Maps 지오코더 서비스가 준비되지 않았습니다. 올바른 카카오 앱 키를 먼저 설정하고 저장해 주세요.');
        return;
    }

    const regionText = sigungu === '전체' ? sido : `${sido} ${sigungu}`;
    const typeText = typeValue === 'all' ? '초·중·고등학교' : typeValue;

    showConfirm(`${regionText}의 전체 ${typeText} 정보를 나이스 API에서 내려받아 업데이트를 시작할까요?`, async () => {
        progressContainer.style.display = 'block';
        adminLog.innerHTML = '';
        updateProgress('기존 로컬 데이터베이스 최신성 확인 중...', 2);
        
        // 최신성 검사를 위해 서버의 기존 학교 DB 리스트 최종 조회
        try {
            const dbRes = await fetch('/api/schools');
            if (dbRes.ok) {
                allStoredSchools = await dbRes.json();
            }
        } catch (e) {
            logDiagnosticMsg('[Warning] 기존 로컬 DB 로드 실패 (전체 지오코딩이 실행됩니다): ' + e.message);
        }

        updateProgress('학교 기본 정보 조회 시작...', 5);
        logMsg(`[Update] 나이스 Open API 호출 시작 (지역: ${sido}, 학교급: ${typeText})`);

        const schoolTypes = typeValue === 'all' ? ['초등학교', '중학교', '고등학교'] : [typeValue];
        let allFetchedSchools = [];

        try {
            for (const type of schoolTypes) {
                logDiagnosticMsg(`학교급 [${type}] 다운로드 중...`);
                let pIndex = 1;
                let hasMore = true;
                
                while (hasMore) {
                    let url = `https://open.neis.go.kr/hub/schoolInfo?Type=json&pIndex=${pIndex}&pSize=100`;
                    url += `&LCTN_SC_NM=${encodeURIComponent(sido)}`;
                    url += `&SCHUL_KND_SC_NM=${encodeURIComponent(type)}`;
                    
                    if (neisKey) {
                        url += `&KEY=${neisKey}`;
                    }

                    logDiagnosticMsg(`나이스 요청 페이지: ${pIndex}...`);
                    const response = await fetch(url);
                    const data = await response.json();

                    if (data.schoolInfo && data.schoolInfo[1] && data.schoolInfo[1].row) {
                        const rows = data.schoolInfo[1].row;
                        allFetchedSchools = allFetchedSchools.concat(rows);
                        
                        // If return size is less than 100, we finished this type
                        if (rows.length < 100) {
                            hasMore = false;
                        } else {
                            pIndex++;
                        }
                    } else {
                        // No data or error/limit
                        hasMore = false;
                        if (pIndex === 1) {
                            logDiagnosticMsg(`[Warning] 해당 분류의 데이터가 없거나 인증키 제한이 걸렸습니다.`);
                        }
                    }

                    // Delay to prevent hitting open api rate limits
                    await new Promise(r => setTimeout(r, 100));
                }
            }

            logMsg(`[Download Complete] 총 조회된 학교: ${allFetchedSchools.length}개`);
            if (allFetchedSchools.length === 0) {
                throw new Error('API 수신 데이터가 비어 있습니다. 인증키 상태를 확인해 주세요.');
            }

            // 시/군/구 필터링 처리
            let fetchedFilteredSchools = allFetchedSchools;
            if (sigungu !== '전체') {
                fetchedFilteredSchools = allFetchedSchools.filter(row => {
                    const address = row.ORG_RDNMA || row.ORG_ADRES || '';
                    return address.includes(sigungu);
                });
                logMsg(`[Filter] ${sigungu} 필터 적용 완료. 총 ${fetchedFilteredSchools.length}개 학교 대상`);
            }

            if (fetchedFilteredSchools.length === 0) {
                throw new Error(`${sigungu}에 해당하는 학교 데이터가 없습니다.`);
            }

            updateProgress('주소 지오코딩 변환 작업 중...', 30);
            logMsg('[Geocoding] 카카오 지오코더를 이용해 학교 주소를 좌표로 일괄 변환 중...');

            const finalProcessedSchools = [];
            const total = fetchedFilteredSchools.length;

            // 병렬 처리를 위한 청크(Batch) 단위 설정 (속도 개선)
            const chunkSize = 10;
            for (let i = 0; i < total; i += chunkSize) {
                const chunk = fetchedFilteredSchools.slice(i, i + chunkSize);
                
                const chunkPromises = chunk.map(async (row, index) => {
                    const currentIndex = i + index;
                    const address = row.ORG_RDNMA || row.ORG_ADRES || '';
                    const cleanAddress = address.split('(')[0].split(',')[0].trim();
                    const schoolName = row.SCHUL_NM;

                    // [최신성 검사] 이미 DB에 저장되어 있고 주소가 동일한 경우 지오코딩 및 다운로드 대상에서 제외 (기존 데이터 재사용)
                    const existingSchool = allStoredSchools.find(s => s.school_id === row.SD_SCHUL_CODE);
                    if (existingSchool && existingSchool.address.trim() === address.trim()) {
                        if (!existingSchool.graduate_career || !existingSchool.academy_count) {
                            const codeHash = parseInt(row.SD_SCHUL_CODE || '0') || 77;
                            const special = Math.round(2 + (codeHash % 8));
                            const autonomous = Math.round(5 + (codeHash % 12));
                            const specialized = Math.round(10 + (codeHash % 15));
                            const general = Math.max(0, 100 - (special + autonomous + specialized));
                            existingSchool.graduate_career = existingSchool.graduate_career || { general, special, autonomous, specialized };
                            existingSchool.academy_count = existingSchool.academy_count || getAcademyCount(existingSchool.address, codeHash);
                            existingSchool.extracurricular_budget = existingSchool.extracurricular_budget || Math.round(80 + (codeHash % 120));
                        }
                        logDiagnosticMsg(`[${currentIndex+1}/${total}] ${schoolName} -> 변동 없음 (기존 데이터 재사용)`);
                        return existingSchool;
                    }

                    if (cleanAddress) {
                        try {
                            const coords = await geocodeAddressPromise(cleanAddress);
                            
                            // Hash school code for mock deterministic performance indicators
                            const codeHash = parseInt(row.SD_SCHUL_CODE || '0') || 77;
                            const korAvg = Math.round(72 + (codeHash % 17));
                            const engAvg = Math.round(70 + ((codeHash + 5) % 19));
                            const mathAvg = Math.round(65 + ((codeHash + 11) % 24));

                            const distA = Math.round(20 + (codeHash % 20));
                            const distB = Math.round(30 + ((codeHash + 3) % 20));
                            const distC = Math.round(10 + ((codeHash + 7) % 15));
                            const distD = 100 - (distA + distB + distC);

                            const career = await fetchGraduateCareer(neisKey, row.ATPT_OFCDC_SC_CODE, row.SD_SCHUL_CODE, codeHash);
                            const academies = getAcademyCount(address, codeHash);
                            const extraBudget = Math.round(80 + (codeHash % 120));

                            const schoolData = {
                                school_id: row.SD_SCHUL_CODE,
                                school_name: row.SCHUL_NM,
                                school_type: row.SCHUL_KND_SC_NM,
                                region: row.LCTN_SC_NM,
                                address: address,
                                lat: coords.lat,
                                lng: coords.lng,
                                student_count: Math.round(400 + (codeHash % 400)),
                                class_avg_size: Math.round(22 + (codeHash % 10)),
                                updated_at: '2025-09-15',
                                subjects: {
                                    korean: { avg: korAvg, dist: [distA, distB, distC, distD] },
                                    english: { avg: engAvg, dist: [distB, distA, distC, distD] },
                                    math: { avg: mathAvg, dist: [distC, distB, distA, distD] }
                                },
                                graduate_career: career,
                                academy_count: academies,
                                extracurricular_budget: extraBudget
                            };
                            schoolData.pin_color = getPinColor(schoolData);

                            logDiagnosticMsg(`[${currentIndex+1}/${total}] ${schoolName} -> 변환 성공`);
                            return schoolData;
                        } catch (err) {
                            logDiagnosticMsg(`[${currentIndex+1}/${total}] ${schoolName} -> 지오코딩 실패: ${err}`);
                        }
                    } else {
                        logDiagnosticMsg(`[${currentIndex+1}/${total}] ${schoolName} -> 주소 정보 없음`);
                    }
                    return null;
                });

                const processedChunk = await Promise.all(chunkPromises);
                processedChunk.forEach(s => {
                    if (s) finalProcessedSchools.push(s);
                });

                const percent = Math.round(30 + ((Math.min(i + chunkSize, total) / total) * 60));
                updateProgress(`최신성 대조 및 지오코딩 중 (${Math.min(i + chunkSize, total)}/${total})...`, percent);

                // 안전을 위해 청크(Batch) 단위 처리 후 짧은 대기 (카카오 API Limit 방지)
                await new Promise(r => setTimeout(r, 50));
            }

            updateProgress('서버 데이터베이스 동기화 중...', 95);
            logMsg(`[Uploading] 가공이 완료된 학교 ${finalProcessedSchools.length}개 업로드 요청 중...`);

            // 기존 DB와 통합하여 저장 (기타 시도/시군구/학교급 데이터 유실 방지)
            const belongsToTarget = (school) => {
                if (school.region !== sido) return false;
                if (sigungu !== '전체' && !(school.address && school.address.includes(sigungu))) return false;
                if (typeValue !== 'all' && school.school_type !== typeValue) return false;
                return true;
            };

            let finalSchoolsToSave = allStoredSchools.filter(s => !belongsToTarget(s));
            finalSchoolsToSave = finalSchoolsToSave.concat(finalProcessedSchools);

            // Send to backend
            const saveRes = await fetch('/api/admin/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({ schools: finalSchoolsToSave })
            });
            const saveResult = await saveRes.json();

            if (saveResult.success) {
                updateProgress('서버 업데이트 완료!', 100);
                logMsg(`[Success] 최종 완료! 총 ${finalProcessedSchools.length}개의 학교 정보가 서버 저장소에 동기화되었습니다.`);
                
                // 데이터베이스 동기화가 성공했으므로 하단 목록도 갱신
                loadStoredSchools();
                
                // 모달 표시 처리
                const modal = document.getElementById('updateModal');
                const modalMsg = document.getElementById('updateModalMessage');
                const modalRegion = document.getElementById('updateModalRegion');
                const modalSchoolList = document.getElementById('updateModalSchoolList');
                const btnConfirm = document.getElementById('btnConfirmModal');
                
                modalMsg.innerText = `총 ${finalProcessedSchools.length}개의 학교 정보가 성공적으로 수집되었으며, 좌표 변환 후 서버 저장소에 동기화되었습니다.`;
                modalRegion.innerText = regionText; // 예: "서울특별시 강남구"
                
                // 동기화된 학교 리스트 목록 생성
                modalSchoolList.innerHTML = finalProcessedSchools.map((s, idx) => {
                    const dong = s.address.split(' ')[1] || '';
                    const gu = s.address.split(' ')[2] || '';
                    return `
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.05); padding: 4px 0;">
                            <span><strong>${idx + 1}. ${s.school_name}</strong> (${s.school_type})</span>
                            <span style="color: var(--text-muted); font-size: 11px;">${dong} ${gu}</span>
                        </div>
                    `;
                }).join('');
                
                modal.style.display = 'flex';
                
                btnConfirm.onclick = () => {
                    modal.style.display = 'none';
                };
            } else {
                throw new Error(saveResult.error || '저장 중 서버 에러가 발생했습니다.');
            }

        } catch (error) {
            logMsg(`[Error] 프로세스 실패: ${error.message}`);
            updateProgress('오류 발생', 0);
            showAlert(`업데이트 과정에서 에러가 발생했습니다: ${error.message}`);
        }
    });
});

// Promise wrapper for Kakao Geocoder
function geocodeAddressPromise(address) {
    return new Promise((resolve, reject) => {
        kakaoGeocoderInstance.addressSearch(address, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
                resolve({
                    lat: parseFloat(result[0].y),
                    lng: parseFloat(result[0].x)
                });
            } else {
                reject(status);
            }
        });
    });
}

// Fetch graduate career status from NEIS or fallback deterministically
async function fetchGraduateCareer(neisKey, atptCode, schoolCode, codeHash) {
    if (neisKey && atptCode && schoolCode) {
        try {
            const url = `https://open.neis.go.kr/hub/schoolGraduateCareerStatus?Type=json&ATPT_OFCDC_SC_CODE=${atptCode}&SD_SCHUL_CODE=${schoolCode}&KEY=${neisKey}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.schoolGraduateCareerStatus && data.schoolGraduateCareerStatus[1] && data.schoolGraduateCareerStatus[1].row) {
                const info = data.schoolGraduateCareerStatus[1].row[0];
                const general = parseFloat(info.GEN_HS_CO_R) || 0;
                const special = parseFloat(info.SPC_PURPS_HS_CO_R) || 0;
                const autonomous = parseFloat(info.ATNUM_HS_CO_R || info.AT_HS_CO_R) || 0;
                const specialized = parseFloat(info.SPEC_HS_CO_R || info.SPCLTR_HS_CO_R) || 0;
                return { general, special, autonomous, specialized };
            }
        } catch (e) {
            console.warn('[Admin] Failed to fetch graduate career status:', e);
        }
    }
    const special = Math.round(2 + (codeHash % 8));
    const autonomous = Math.round(5 + (codeHash % 12));
    const specialized = Math.round(10 + (codeHash % 15));
    const general = Math.max(0, 100 - (special + autonomous + specialized));
    return { general, special, autonomous, specialized };
}

// Estimate academy count nearby
function getAcademyCount(address, codeHash) {
    let base = 15 + (codeHash % 30);
    if (address.includes('강남구') || address.includes('대치동')) {
        base += 80;
    } else if (address.includes('양천구') || address.includes('목동')) {
        base += 60;
    } else if (address.includes('서초구') || address.includes('송파구') || address.includes('분당')) {
        base += 40;
    }
    return base;
}

function logDiagnosticMsg(msg) {
    console.log('[Admin Update] ' + msg);
    logMsg(msg);
}

// ==========================================
// ==========================================
// 커뮤니티/리뷰 관리 비즈니스 로직 (추가됨)
// ==========================================
let currentReviewTab = 'school'; // 'school' | 'academy'
let allReviews = [];

const btnTabSchoolReviews = document.getElementById('btnTabSchoolReviews');
const btnTabAcademyReviews = document.getElementById('btnTabAcademyReviews');
const btnSearchReviews = document.getElementById('btnSearchReviews');
const reviewSearchInput = document.getElementById('reviewSearchInput');
const reviewTargetFilter = document.getElementById('reviewTargetFilter');
const adminReviewsListContainer = document.getElementById('adminReviewsListContainer');

if (btnTabSchoolReviews) {
    btnTabSchoolReviews.addEventListener('click', () => {
        currentReviewTab = 'school';
        btnTabSchoolReviews.className = 'btn-primary';
        btnTabSchoolReviews.style.background = '';
        btnTabSchoolReviews.style.color = '';
        
        btnTabAcademyReviews.className = 'btn-secondary';
        btnTabAcademyReviews.style.background = '#f0f0f0';
        btnTabAcademyReviews.style.color = '#333';
        btnTabAcademyReviews.style.border = '1px solid #ccc';
        loadReviews();
    });
}

if (btnTabAcademyReviews) {
    btnTabAcademyReviews.addEventListener('click', () => {
        currentReviewTab = 'academy';
        btnTabAcademyReviews.className = 'btn-primary';
        btnTabAcademyReviews.style.background = '';
        btnTabAcademyReviews.style.color = '';
        
        btnTabSchoolReviews.className = 'btn-secondary';
        btnTabSchoolReviews.style.background = '#f0f0f0';
        btnTabSchoolReviews.style.color = '#333';
        btnTabSchoolReviews.style.border = '1px solid #ccc';
        loadReviews();
    });
}

if (btnSearchReviews) {
    btnSearchReviews.addEventListener('click', renderReviewsList);
}

if (reviewSearchInput) {
    reviewSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            renderReviewsList();
        }
    });
}

if (reviewTargetFilter) {
    reviewTargetFilter.addEventListener('change', renderReviewsList);
}

// 리뷰 등록된 대상들만 필터링 드롭다운에 채워넣는 함수
function populateReviewTargetFilter() {
    if (!reviewTargetFilter) return;
    
    const uniqueTargets = new Set();
    allReviews.forEach(r => {
        const val = currentReviewTab === 'school' ? r.school_id : r.academyName;
        if (val) uniqueTargets.add(val);
    });

    const targetList = Array.from(uniqueTargets);
    
    let defaultLabel = currentReviewTab === 'school' ? '전체 학교 (필터)' : '전체 학원 (필터)';
    let optionsHtml = `<option value="all">${defaultLabel}</option>`;
    
    if (currentReviewTab === 'school') {
        const sortedSchools = targetList.map(schoolId => {
            const schoolObj = allStoredSchools.find(s => s.school_id === schoolId);
            return {
                id: schoolId,
                name: schoolObj ? schoolObj.school_name : schoolId
            };
        }).sort((a, b) => a.name.localeCompare(b.name));

        sortedSchools.forEach(item => {
            optionsHtml += `<option value="${item.id}">${item.name}</option>`;
        });
    } else {
        const sortedAcademies = targetList.sort((a, b) => a.localeCompare(b));
        sortedAcademies.forEach(name => {
            optionsHtml += `<option value="${name}">${name}</option>`;
        });
    }
    
    reviewTargetFilter.innerHTML = optionsHtml;
}

async function loadReviews() {
    if (!adminReviewsListContainer) return;
    adminReviewsListContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px 0;">리뷰 데이터를 불러오는 중...</div>';
    
    if (!supabaseAdmin) {
        initSupabaseAdmin();
    }
    if (!supabaseAdmin) {
        adminReviewsListContainer.innerHTML = '<div style="text-align: center; color: red; padding: 20px 0;">Supabase 클라이언트를 초기화할 수 없습니다.</div>';
        return;
    }

    try {
        const table = currentReviewTab === 'school' ? 'school_reviews' : 'academy_reviews';
        const { data, error } = await supabaseAdmin
            .from(table)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allReviews = data || [];
        populateReviewTargetFilter();
        renderReviewsList();
    } catch (err) {
        console.error('Error loading reviews:', err);
        adminReviewsListContainer.innerHTML = `<div style="text-align: center; color: red; padding: 20px 0;">데이터 로드 오류: ${err.message}</div>`;
    }
}

function renderReviewsList() {
    if (!adminReviewsListContainer) return;
    
    const filterTarget = reviewTargetFilter ? reviewTargetFilter.value : 'all';
    const searchVal = reviewSearchInput ? reviewSearchInput.value.trim().toLowerCase() : '';
    
    let filtered = allReviews;

    // 1. 드롭다운 필터 적용
    if (filterTarget !== 'all') {
        filtered = filtered.filter(r => {
            const targetVal = currentReviewTab === 'school' ? r.school_id : r.academyName;
            return targetVal === filterTarget;
        });
    }

    // 2. 검색어 필터 적용
    if (searchVal) {
        filtered = filtered.filter(r => {
            const nickname = (r.nickname || '익명').toLowerCase();
            const content = (r.content || '').toLowerCase();
            const targetName = currentReviewTab === 'school' 
                ? (r.school_id || '').toLowerCase() 
                : (r.academyName || '').toLowerCase();
            return nickname.includes(searchVal) || content.includes(searchVal) || targetName.includes(searchVal);
        });
    }

    if (filtered.length === 0) {
        adminReviewsListContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px 0;">조건에 해당하는 리뷰가 없습니다.</div>';
        return;
    }

    adminReviewsListContainer.innerHTML = filtered.map((r, idx) => {
        const dateStr = r.created_at ? new Date(r.created_at).toLocaleString() : '-';
        const rawRating = parseInt(r.rating) || 5;
        const stars = '★'.repeat(rawRating) + '☆'.repeat(Math.max(0, 5 - rawRating));
        
        let targetLabel = '';
        if (currentReviewTab === 'school') {
            // 학교 ID로 학교 이름 찾기
            const schoolObj = allStoredSchools.find(s => s.school_id === r.school_id);
            targetLabel = `<span style="background: #e2e8f0; color: #4a5568; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-right: 6px;">🏫 ${schoolObj ? schoolObj.school_name : r.school_id}</span>`;
        } else {
            targetLabel = `<span style="background: #feebc8; color: #c05621; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-right: 6px;">✏️ ${r.academyName}</span>`;
        }

        return `
            <div style="border-bottom: 1px solid rgba(0,0,0,0.05); padding: 12px 0; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 6px;">
                        ${targetLabel}
                        <strong style="color: var(--deep-blue); font-size: 13px;">${escapeHtml(r.nickname || '익명')}</strong>
                        <span style="color: var(--warning-yellow); font-size: 12px;">${stars}</span>
                        <span style="color: var(--text-muted); font-size: 11px;">(${dateStr})</span>
                    </div>
                    <div style="font-size: 12.5px; color: var(--text-main); line-height: 1.5; white-space: pre-wrap; word-break: break-all;">${escapeHtml(r.content || '')}</div>
                </div>
                <button class="btn-secondary" onclick="window.deleteReviewConfirm(${r.id})" style="background: var(--danger-red); color: white; border: none; padding: 5px 10px; font-size: 11px; font-weight: bold; cursor: pointer; border-radius: 4px; width: auto; margin: 0; align-self: center;">삭제</button>
            </div>
        `;
    }).join('');
}

// Global confirm wrapper for deleting
window.deleteReviewConfirm = function(id) {
    showConfirm('이 리뷰를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.', async () => {
        try {
            const table = currentReviewTab === 'school' ? 'school_reviews' : 'academy_reviews';
            const { error } = await supabaseAdmin
                .from(table)
                .delete()
                .eq('id', id);

            if (error) throw error;
            
            showAlert('리뷰가 성공적으로 삭제되었습니다.');
            loadReviews();
        } catch (err) {
            console.error('Failed to delete review:', err);
            showAlert('리뷰 삭제에 실패했습니다: ' + err.message);
        }
    });
};

// escapeHtml defined if not present
function escapeHtml(text) {
    if (!text) return '';
    return text
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
window.loadReviews = loadReviews;

