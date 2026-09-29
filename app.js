// Main entry point
import { Orchestrator } from './src/agents/orchestrator.js';
import { NEISAgent } from './src/agents/neis_agent.js';
import { isLocalEnvironment } from './src/services/neis_service.js';
import { authService } from './src/services/auth_service.js';
let defaultDistrictData = null;
let orchestrator;
let currentLoadedSchools = [];
window.customCommuteStart = null;
window.customCommuteEnd = null;
window.mapClickMode = 'none';

// 자녀 프로필 및 선택 자녀 상태 (전역 모듈 스코프)
let childProfiles = [];
let selectedChildId = null;
let defaultChildId = localStorage.getItem('learnmap_default_child_id');
window.childProfiles = childProfiles;
window.selectedChildId = selectedChildId;

const SUB_DISTRICT_MAP = {
    '고양시': ['덕양구', '일산동구', '일산서구'],
    '성남시': ['분당구', '수정구', '중원구'],
    '수원시': ['장안구', '권선구', '팔달구', '영통구'],
    '용인시': ['수지구', '기흥구', '처인구'],
    '안산시': ['상록구', '단원구'],
    '안양시': ['만안구', '동안구'],
    '부천시': ['원미구', '소사구', '오정구'],
    '청주시': ['상당구', '서원구', '흥덕구', '청원구'],
    '천안시': ['동남구', '서북구'],
    '전주시': ['완산구', '덕진구'],
    '포항시': ['남구', '북구'],
    '창원시': ['의창구', '성산구', '마산합포구', '마산회원구', '진해구']
};

function checkGugunMatch(address, selectedGugun, selectedSubGu = 'all') {
    if (!address) return false;
    if (selectedGugun && selectedGugun !== 'all') {
        if (!address.includes(selectedGugun)) return false;
    }
    if (selectedSubGu && selectedSubGu !== 'all') {
        if (!address.includes(selectedSubGu)) return false;
    }
    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    orchestrator = new Orchestrator();

    // --- Custom Alert Modal Override (Promise & Callback based) ---
    window.alert = function(message, callback) {
        return new Promise((resolve) => {
            // 다른 확인(confirm) 모달이 열려 있다면 겹치지 않도록 숨김
            const existingConfirm = document.getElementById('customConfirmModal');
            if (existingConfirm) {
                existingConfirm.style.opacity = '0';
                existingConfirm.style.pointerEvents = 'none';
            }

            let alertModal = document.getElementById('customAlertModal');
            if (!alertModal) {
                alertModal = document.createElement('div');
                alertModal.id = 'customAlertModal';
                alertModal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:999999; display:flex; justify-content:center; align-items:center; opacity:0; transition:opacity 0.2s; pointer-events:none;';
                alertModal.innerHTML = `
                    <div style="background:var(--bg-primary, #ffffff); padding:30px 40px; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,0.3); text-align:center; max-width:80%; transform:translateY(20px); transition:transform 0.2s; border:1px solid var(--border-color, #eee);">
                        <div id="customAlertMessage" style="font-size:16px; font-weight:600; color:var(--text-main, #333); margin-bottom:24px; line-height:1.5; white-space:pre-wrap;"></div>
                        <button id="btnCustomAlertOk" style="background:var(--primary-blue, #2563eb); color:white; border:none; border-radius:8px; padding:12px 30px; font-size:15px; font-weight:bold; cursor:pointer; outline:none; transition:background 0.2s;">확인</button>
                    </div>
                `;
                document.body.appendChild(alertModal);
            }
            document.getElementById('customAlertMessage').innerText = message;
            alertModal.style.opacity = '1';
            alertModal.style.pointerEvents = 'auto';
            alertModal.querySelector('div').style.transform = 'translateY(0)';

            const close = () => {
                alertModal.style.opacity = '0';
                alertModal.style.pointerEvents = 'none';
                const inner = alertModal.querySelector('div');
                if (inner) inner.style.transform = 'translateY(20px)';
                if (typeof callback === 'function') {
                    callback();
                }
                resolve();
            };

            const okBtn = document.getElementById('btnCustomAlertOk') || alertModal.querySelector('button');
            if (okBtn) {
                okBtn.onclick = (e) => {
                    if (e) e.stopPropagation();
                    close();
                };
            }
        });
    };

    // --- Custom Confirm Modal Override (Promise based) ---
    window.confirm = function(message) {
        return new Promise((resolve) => {
            // 다른 알림(alert) 모달이 열려 있다면 겹치지 않도록 숨김
            const existingAlert = document.getElementById('customAlertModal');
            if (existingAlert) {
                existingAlert.style.opacity = '0';
                existingAlert.style.pointerEvents = 'none';
            }

            let confirmModal = document.getElementById('customConfirmModal');
            if (!confirmModal) {
                confirmModal = document.createElement('div');
                confirmModal.id = 'customConfirmModal';
                confirmModal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:999999; display:flex; justify-content:center; align-items:center; opacity:0; transition:opacity 0.2s; pointer-events:none;';
                confirmModal.innerHTML = `
                    <div style="background:var(--bg-primary, #ffffff); padding:30px 40px; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,0.3); text-align:center; max-width:80%; transform:translateY(20px); transition:transform 0.2s; border:1px solid var(--border-color, #eee);">
                        <div id="customConfirmMessage" style="font-size:16px; font-weight:600; color:var(--text-main, #333); margin-bottom:24px; line-height:1.5; white-space:pre-wrap;"></div>
                        <div style="display:flex; gap:12px; justify-content:center;">
                            <button id="btnConfirmCancel" style="background:#e5e7eb; color:#374151; border:none; border-radius:8px; padding:12px 24px; font-size:15px; font-weight:bold; cursor:pointer; outline:none; transition:background 0.2s;">취소</button>
                            <button id="btnConfirmOk" style="background:var(--primary-blue, #2563eb); color:white; border:none; border-radius:8px; padding:12px 24px; font-size:15px; font-weight:bold; cursor:pointer; outline:none; transition:background 0.2s;">확인</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(confirmModal);
            }
            
            document.getElementById('customConfirmMessage').innerText = message;
            confirmModal.style.opacity = '1';
            confirmModal.style.pointerEvents = 'auto';
            confirmModal.querySelector('div').style.transform = 'translateY(0)';
            
            const close = (result) => {
                confirmModal.style.opacity = '0';
                confirmModal.style.pointerEvents = 'none';
                confirmModal.querySelector('div').style.transform = 'translateY(20px)';
                resolve(result);
            };
            
            const okBtn = document.getElementById('btnConfirmOk');
            const cancelBtn = document.getElementById('btnConfirmCancel');
            
            const onOk = (e) => {
                if (e) {
                    e.stopPropagation();
                }
                close(true);
            };
            
            const onCancel = (e) => {
                if (e) {
                    e.stopPropagation();
                }
                close(false);
            };
            
            okBtn.onclick = onOk;
            okBtn.ontouchstart = onOk;
            cancelBtn.onclick = onCancel;
            cancelBtn.ontouchstart = onCancel;
        });
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
    const btnCloseAnalysis = document.getElementById('btnCloseAnalysis');
    const btnRunDiagnosis = document.getElementById('btnRunDiagnosis');

    // Diagnosis Output Elements
    const diagnosticSummaryLabel = document.getElementById('diagnosticSummaryLabel');
    const diagnosticSummaryDesc = document.getElementById('diagnosticSummaryDesc');
    const subjectDiagnosisContainer = document.getElementById('subjectDiagnosisContainer');

    // Supabase & Review Elements
    const SUPABASE_URL = 'https://khwzgqnwlknawggugznd.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pncW53bGtuYXdnZ3Vnem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDQzNDksImV4cCI6MjA5NTc4MDM0OX0.P2g3Y_MYV_ca8ZRpfAT93pnEzP4osYWc2tfyBHKb7v4';
    const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
    window.supabaseInstance = supabase;
    const btnShowReviews = document.getElementById('btnShowReviews');

    // Comparison Overlay Elements
    const compareOverlay = document.getElementById('compareOverlay');
    const compareGrid = document.getElementById('compareGrid');
    const btnCloseCompare = document.getElementById('btnCloseCompare');
    const btnOpenCompareFloating = document.getElementById('btnOpenCompareFloating');
    const compareCountBadge = document.getElementById('compareCountBadge');
    const btnClearCompare = document.getElementById('btnClearCompare');
    let lastDiagnosisResult = null;

    document.getElementById('selCompareRegion').addEventListener('change', () => {
        if (lastDiagnosisResult) {
            renderDiagnosisResults(lastDiagnosisResult);
        }
    });

    // ------------------------------------
    // 학부모 맞춤 필터 UI 연동 및 이벤트 바인딩
    // ------------------------------------
    const parentsFilterToggle = document.getElementById('btnToggleParentsFilter');
    const btnCloseParentsFilter = document.getElementById('btnCloseParentsFilter');
    const parentsFilterContent = document.getElementById('parentsFilterContent');
    const parentsFilterIndicator = document.getElementById('parentsFilterIndicator');

    if (parentsFilterToggle && parentsFilterContent) {
        parentsFilterToggle.addEventListener('click', () => {
            // 모바일 환경에서는 다른 페이지(이야기/마이페이지)처럼 독립 페이지 형태이므로 헤더 클릭으로 접히지 않음
            if (window.innerWidth <= 1024) return;

            // 헤더 클릭 시 열기/닫기 토글 수행 (PC 데스크톱 전용)
            if (parentsFilterContent.style.display === 'none' || parentsFilterContent.style.display === '') {
                parentsFilterContent.style.display = 'flex';
                if (parentsFilterIndicator) parentsFilterIndicator.innerText = '▲';
                try { sessionStorage.setItem('learnmap_parents_filter_open', 'true'); } catch(e) {}
            } else {
                parentsFilterContent.style.display = 'none';
                if (parentsFilterIndicator) parentsFilterIndicator.innerText = '▼';
                try { sessionStorage.setItem('learnmap_parents_filter_open', 'false'); } catch(e) {}
            }
        });
    }

    if (btnCloseParentsFilter && parentsFilterContent) {
        btnCloseParentsFilter.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth <= 1024) {
                // 모바일 환경: 다른 모달 페이지와 동일하게 지도 탭으로 전환하여 페이지 닫기
                const mapTabBtn = document.querySelector('.mobile-bottom-nav .nav-item[onclick*="map"]');
                if (window.onMobileNavClick) {
                    window.onMobileNavClick('map', mapTabBtn);
                }
            } else {
                parentsFilterContent.style.display = 'none';
                if (parentsFilterIndicator) parentsFilterIndicator.innerText = '▼';
                try { sessionStorage.setItem('learnmap_parents_filter_open', 'false'); } catch(e) {}
            }
        });
    }

    const bindRangeText = (rangeId, textId, suffix = '') => {
        const range = document.getElementById(rangeId);
        const text = document.getElementById(textId);
        if (range && text) {
            range.addEventListener('input', () => {
                let val = range.value;
                if (rangeId.includes('weight')) {
                    val = (val / 10).toFixed(1);
                }
                text.innerText = val + suffix;
            });
            range.addEventListener('change', () => {
                if (typeof window.resetSafeCommute === 'function') {
                    window.resetSafeCommute();
                }
                onMapAction();
            });
        }
    };

    bindRangeText('currentLevelRange', 'valCurrentLevel', '점');
    bindRangeText('targetLevelRange', 'valTargetLevel', '점');
    bindRangeText('weightKorRange', 'valWeightKor', '');
    bindRangeText('weightEngRange', 'valWeightEng', '');
    bindRangeText('weightMathRange', 'valWeightMath', '');
    bindRangeText('envScoreRange', 'valEnvScore', '%');
    bindRangeText('envTeacherRange', 'valEnvTeacher', '%');
    bindRangeText('envViolenceRange', 'valEnvViolence', '%');
    bindRangeText('envBudgetRange', 'valEnvBudget', '%');

    // 동적 스코어 비율 컬러 바 갱신 함수
    const updateEnvProportionBar = () => {
        const s1 = parseInt(document.getElementById('envScoreRange')?.value || 40, 10);
        const s2 = parseInt(document.getElementById('envTeacherRange')?.value || 30, 10);
        const s3 = parseInt(document.getElementById('envViolenceRange')?.value || 20, 10);
        const s4 = parseInt(document.getElementById('envBudgetRange')?.value || 10, 10);
        const total = (s1 + s2 + s3 + s4) || 100;

        const b1 = document.getElementById('barEnvScore');
        const b2 = document.getElementById('barEnvTeacher');
        const b3 = document.getElementById('barEnvViolence');
        const b4 = document.getElementById('barEnvBudget');

        if (b1) b1.style.width = (s1 / total * 100).toFixed(1) + '%';
        if (b2) b2.style.width = (s2 / total * 100).toFixed(1) + '%';
        if (b3) b3.style.width = (s3 / total * 100).toFixed(1) + '%';
        if (b4) b4.style.width = (s4 / total * 100).toFixed(1) + '%';
    };

    ['envScoreRange', 'envTeacherRange', 'envViolenceRange', 'envBudgetRange'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateEnvProportionBar);
            el.addEventListener('change', updateEnvProportionBar);
        }
    });

    window.applyQuickProfilePreset = (type) => {
        const pills = document.querySelectorAll('.preset-pill-btn');
        pills.forEach(p => p.classList.remove('active'));
        if (typeof event !== 'undefined' && event && event.currentTarget && event.currentTarget.classList.contains('preset-pill-btn')) {
            const clickedBtn = event.currentTarget;
            clickedBtn.classList.add('active');
            try {
                clickedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } catch (e) {
                // fallback
            }
        }

        if (type === 'recommended') {
            if (typeof window.handleResetFilters === 'function') {
                window.handleResetFilters(false);
            }
            return;
        }

        const profileEl = document.getElementById('profileRecommendFilter');
        if (!profileEl) return;
        if (type === 'balanced') {
            profileEl.value = 'balanced';
        } else if (type === 'academic') {
            profileEl.value = 'academic';
        } else if (type === 'special' || type === 'safety') {
            profileEl.value = 'safety';
        }
        profileEl.dispatchEvent(new Event('change'));
        if (typeof updateEnvProportionBar === 'function') {
            updateEnvProportionBar();
        }
    };

    // 프리셋 알약 레일 마우스 드래그 가로 스크롤 지원
    const initPresetPillsDrag = () => {
        const pillsRow = document.getElementById('quickPresetPillsRow');
        if (!pillsRow) return;
        let isMouseDown = false;
        let startX = 0;
        let scrollLeft = 0;

        pillsRow.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            pillsRow.style.cursor = 'grabbing';
            startX = e.pageX - pillsRow.offsetLeft;
            scrollLeft = pillsRow.scrollLeft;
        });
        pillsRow.addEventListener('mouseleave', () => {
            isMouseDown = false;
            pillsRow.style.cursor = 'grab';
        });
        pillsRow.addEventListener('mouseup', () => {
            isMouseDown = false;
            pillsRow.style.cursor = 'grab';
        });
        pillsRow.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;
            e.preventDefault();
            const x = e.pageX - pillsRow.offsetLeft;
            const walk = (x - startX) * 1.5;
            pillsRow.scrollLeft = scrollLeft - walk;
        });
    };
    initPresetPillsDrag();

    // New Advanced Filters bindings
    bindRangeText('filterMinAvgScore', 'valMinAvgScore', '점');
    bindRangeText('filterMinSubjectScore', 'valMinSubjectScore', '점');
    bindRangeText('filterMinTopRatio', 'valMinTopRatio', '%');
    bindRangeText('filterMaxBottomRatio', 'valMaxBottomRatio', '%');
    bindRangeText('filterMaxStudentPerTeacher', 'valMaxStudentPerTeacher', '명');
    bindRangeText('filterMinGraduateRate', 'valMinGraduateRate', '%');
    bindRangeText('filterMinSpecialAdmission', 'valMinSpecialAdmission', '%');
    bindRangeText('filterMaxViolence', 'valMaxViolence', '건');
    // 자녀 맞춤 아코디언 설정값 변경 시 선택된 학교 적합도 실시간 갱신
    ['childGradeFilter', 'childScoreFilter', 'childTendencyFilter', 'currentLevelRange', 'targetLevelRange'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                if (typeof window.refreshSelectedSchoolDetails === 'function') {
                    window.refreshSelectedSchoolDetails();
                }
            });
        }
    });


    // 플로팅 창 알파값 조정 이벤트 연동 (PC / 모바일 동기화 및 로컬스토리지 저장)
    const opacityRange = document.getElementById('overlayOpacityRange');
    const opacityRangePc = document.getElementById('overlayOpacityRange-pc');
    const opacityValText = document.getElementById('valOverlayOpacity');
    const opacityValTextPc = document.getElementById('valOverlayOpacity-pc');
    if (opacityRange && opacityValText) {
        const updateOpacity = (value) => {
            const val = (value / 100).toFixed(2);
            if (opacityRange) opacityRange.value = value;
            if (opacityRangePc) opacityRangePc.value = value;
            if (opacityValText) opacityValText.innerText = val;
            if (opacityValTextPc) opacityValTextPc.innerText = val;
            document.documentElement.style.setProperty('--overlay-bg-alpha', val);
            
            // 로컬스토리지에 투명도 저장
            localStorage.setItem('learnmap_overlay_opacity', value);
        };
        opacityRange.addEventListener('input', (e) => updateOpacity(e.target.value));
        if (opacityRangePc) {
            opacityRangePc.addEventListener('input', (e) => updateOpacity(e.target.value));
        }
        
        // 새로고침 시 로컬스토리지 복구 또는 기본 범위값 적용
        const savedOpacity = localStorage.getItem('learnmap_overlay_opacity');
        if (savedOpacity !== null) {
            updateOpacity(parseInt(savedOpacity, 10));
        } else {
            updateOpacity(opacityRange.value); // 초기값 적용
        }
    }

    // 다중 자녀 상태 (등록된 자녀가 없을 경우 '자녀 없음' 기본 설정)
    childProfiles = window.childProfiles || [];
    selectedChildId = window.selectedChildId || null;
    defaultChildId = localStorage.getItem('learnmap_default_child_id');

    // Supabase DB 연동 설정
    const DB_SUPABASE_URL = 'https://khwzgqnwlknawggugznd.supabase.co';
    const DB_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pncW53bGtuYXdnZ3Vnem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDQzNDksImV4cCI6MjA5NTc4MDM0OX0.P2g3Y_MYV_ca8ZRpfAT93pnEzP4osYWc2tfyBHKb7v4';

    function getDbHeaders(extra = {}) {
        return {
            'apikey': DB_SUPABASE_KEY,
            'Authorization': `Bearer ${DB_SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            ...extra
        };
    }

    async function getEffectiveUserId() {
        const defaultUserId = '46771a9e-a080-4cb3-85df-dd47dd49842a';
        try {
            if (authService && typeof authService.getCurrentUser === 'function') {
                const user = authService.getCurrentUser();
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (user && user.id && uuidRegex.test(user.id)) {
                    return user.id;
                }
                if (user && user.email) {
                    const res = await fetch(`${DB_SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(user.email.toLowerCase())}&select=id`, {
                        headers: getDbHeaders()
                    });
                    if (res.ok) {
                        const rows = await res.json();
                        if (rows && rows.length > 0 && rows[0].id) {
                            return rows[0].id;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('사용자 UUID 취득 중 알림:', e);
        }
        return defaultUserId;
    }

    function calcAchievement(score) {
        const s = Number(score) || 0;
        if (s >= 90) return 'A';
        if (s >= 80) return 'B';
        if (s >= 70) return 'C';
        if (s >= 60) return 'D';
        return 'E';
    }

    // Supabase DB 자녀 프로필 및 성적 데이터 동기화 (user_neis_profiles & user_student_grades)
    async function loadChildProfilesFromSupabase() {
        try {
            const userId = await getEffectiveUserId();
            const url = `${DB_SUPABASE_URL}/rest/v1/user_neis_profiles?user_id=eq.${userId}&select=*,user_student_grades(*)&order=created_at.asc`;
            const res = await fetch(url, { headers: getDbHeaders() });

            if (!res.ok) {
                console.error('Supabase DB 자녀 프로필 조회 실패:', res.status, await res.text());
                return;
            }

            const data = await res.json();

            if (Array.isArray(data) && data.length > 0) {
                childProfiles = data.map(item => {
                    let kor = 80, eng = 80, math = 80, soc = 80, his = 80, sci = 80;
                    if (Array.isArray(item.user_student_grades)) {
                        item.user_student_grades.forEach(g => {
                            if (g.subject_name === '국어') kor = Number(g.raw_score) || 0;
                            if (g.subject_name === '영어') eng = Number(g.raw_score) || 0;
                            if (g.subject_name === '수학') math = Number(g.raw_score) || 0;
                            if (g.subject_name === '사회') soc = Number(g.raw_score) || 0;
                            if (g.subject_name === '역사') his = Number(g.raw_score) || 0;
                            if (g.subject_name === '과학') sci = Number(g.raw_score) || 0;
                        });
                    }
                    let resolvedGrade = 'm2';
                    let targetMajor = '';
                    let schoolId = '';
                    let schoolRegion = '';
                    if (item.target_major) {
                        if (item.target_major.startsWith('grade:')) {
                            const rawTarget = item.target_major.replace('grade:', '').trim();
                            const parts = rawTarget.split(':::');
                            resolvedGrade = (parts[0] || 'm2').trim().toLowerCase();
                            targetMajor = (parts[1] || '').trim();
                            schoolId = (parts[2] || '').trim();
                            schoolRegion = (parts[3] || '').trim();
                        } else {
                            targetMajor = item.target_major.trim();
                        }
                    } else {
                        const sName = item.school_name || '';
                        if (sName.includes('초등')) {
                            resolvedGrade = 'e' + (item.grade || 1);
                        } else if (sName.includes('고등')) {
                            resolvedGrade = 'h' + (item.grade || 1);
                        } else {
                            resolvedGrade = 'm' + (item.grade || 2);
                        }
                    }

                    let allergies = [];
                    if (Array.isArray(item.allergies)) {
                        allergies = item.allergies;
                    } else if (typeof item.allergies === 'string') {
                        try {
                            const parsed = JSON.parse(item.allergies);
                            allergies = Array.isArray(parsed) ? parsed : [item.allergies];
                        } catch (e) {
                            allergies = item.allergies.split(',').map(s => s.trim()).filter(Boolean);
                        }
                    }

                    return {
                        id: item.id,
                        name: item.student_name || '자녀',
                        schoolName: item.school_name || '서운중학교',
                        schoolId: schoolId,
                        schoolRegion: schoolRegion,
                        grade: resolvedGrade,
                        korean: kor,
                        english: eng,
                        math: math,
                        society: soc,
                        history: his,
                        science: sci,
                        targetMajor: targetMajor,
                        allergies: allergies
                    };
                });
            } else {
                // DB에 등록된 자녀가 없을 경우 자동 생성/저장하지 않고 빈 목록 유지 (저장 버튼 클릭 시에만 저장)
                childProfiles = [];
            }

            const hasDefault = childProfiles.some(c => c.id === defaultChildId);
            selectedChildId = hasDefault ? defaultChildId : (childProfiles.length > 0 ? childProfiles[0].id : null);
            window.childProfiles = childProfiles;
            window.selectedChildId = selectedChildId;

            // 로컬스토리지 잔여 자녀 데이터 제거 (DB 우선 원칙)
            localStorage.removeItem('learnmap_child_profiles');

            refreshChildSelectUI();
            if (typeof window.centerMapOnChildSchool === 'function') {
                window.centerMapOnChildSchool();
            }
        } catch (err) {
            console.error('DB 자녀 목록 동기화 오류:', err);
        }
    }
    window.loadChildProfilesFromSupabase = loadChildProfilesFromSupabase;

    function centerMapOnChildSchool() {
        let currentUser = (typeof authService !== 'undefined' && authService.getCurrentUser) ? authService.getCurrentUser() : null;
        if (!currentUser) {
            try {
                currentUser = JSON.parse(localStorage.getItem('learnmap_current_user') || 'null');
            } catch(e) {}
        }
        if (!currentUser || localStorage.getItem('learnmap_logged_out')) {
            return false;
        }

        let currentProfiles = (typeof childProfiles !== 'undefined' && Array.isArray(childProfiles) && childProfiles.length > 0)
            ? childProfiles 
            : (window.childProfiles || []);
        if (currentProfiles.length === 0) {
            try {
                currentProfiles = JSON.parse(localStorage.getItem('learnmap_child_profiles') || '[]');
            } catch(e) {}
        }

        let curChildId = (typeof selectedChildId !== 'undefined' && selectedChildId) 
            ? selectedChildId 
            : (window.selectedChildId || localStorage.getItem('learnmap_default_child_id'));
        let activeChild = currentProfiles.find(c => c.id === curChildId) || currentProfiles[0] || null;

        if (!activeChild && typeof orchestrator !== 'undefined' && orchestrator.state?.childProfile) {
            activeChild = orchestrator.state.childProfile;
        }

        const db = window.schoolsDatabase || window.allSchoolsCache || [];
        let targetSchool = window.selectedTargetSchool || null;

        if (!targetSchool && db.length > 0 && activeChild) {
            if (activeChild.schoolId) {
                targetSchool = db.find(s => String(s.school_id || s.id) === String(activeChild.schoolId));
            }
            if (!targetSchool && activeChild.schoolName) {
                targetSchool = db.find(s => s.school_name === activeChild.schoolName && ((s.region || '').includes(activeChild.schoolRegion || '') || !activeChild.schoolRegion));
            }
            if (!targetSchool && activeChild.schoolName) {
                targetSchool = db.find(s => s.school_name === activeChild.schoolName);
            }
        }

        if (targetSchool && targetSchool.lat && targetSchool.lng) {
            window.selectedTargetSchool = targetSchool;
            if (typeof orchestrator !== 'undefined' && orchestrator.state) {
                orchestrator.state.selectedSchool = targetSchool;
            }

            const regionFilter = document.getElementById('regionFilter');
            if (regionFilter && targetSchool.region && regionFilter.value !== targetSchool.region) {
                regionFilter.value = targetSchool.region;
            }

            const mapObj = window.kakaoMapInstance || (typeof kakaoMap !== 'undefined' ? kakaoMap : null);
            if (mapObj && typeof mapObj.setCenter === 'function') {
                const coords = new kakao.maps.LatLng(targetSchool.lat, targetSchool.lng);
                mapObj.setCenter(coords);
                if (typeof mapObj.setLevel === 'function') {
                    mapObj.setLevel(6); // 자녀 학교 이동 시에도 500m 축척 유지
                }
            }

            // 지도 중심/줌 변경 후 학교 핀 마크 렌더링 강제 실행
            if (typeof onMapAction === 'function') {
                onMapAction();
            } else if (typeof window.onMapAction === 'function') {
                window.onMapAction();
            }

            if (typeof highlightSelectedPin === 'function') {
                highlightSelectedPin(targetSchool.school_id || targetSchool.id);
            }
            if (typeof showSchoolCard === 'function') {
                showSchoolCard(targetSchool);
            }

            return true;
        } else {
            if (typeof onMapAction === 'function') {
                onMapAction();
            } else if (typeof window.onMapAction === 'function') {
                window.onMapAction();
            }
        }
        return false;
    }
    window.centerMapOnChildSchool = centerMapOnChildSchool;

    function loadChildProfilesFromLocalStorage() {
        // 로컬스토리지 방식 제거: Supabase DB에서 로드
        loadChildProfilesFromSupabase();
    }

    function saveChildProfilesToLocalStorage() {
        // 로컬스토리지 저장 방식 제거: 더 이상 localStorage에 프로필을 저장하지 않음
        localStorage.removeItem('learnmap_child_profiles');
    }

    async function saveChildProfileToSupabase(child) {
        if (!child) return;
        try {
            const userId = await getEffectiveUserId();
            const fullGradeCode = String(child.grade || 'm2').toLowerCase();
            const gradeDigits = fullGradeCode.replace(/\D/g, '');
            const parsedGrade = parseInt(gradeDigits, 10);
            let dbGrade = 2;
            if (!isNaN(parsedGrade) && parsedGrade >= 1 && parsedGrade <= 6) {
                dbGrade = parsedGrade; // 초등 1~6학년, 중·고등 1~3학년 정직하게 저장
            } else if (!isNaN(parsedGrade) && parsedGrade >= 1) {
                dbGrade = Math.min(Math.max(parsedGrade, 1), 6);
            }

            const schoolIdVal = child.schoolId || '';
            const schoolRegionVal = child.schoolRegion || '';
            const majorStr = (child.targetMajor || '').trim();
            const targetMajorVal = `grade:${fullGradeCode}:::${majorStr}:::${schoolIdVal}:::${schoolRegionVal}`;
            const allergiesVal = Array.isArray(child.allergies) 
                ? child.allergies 
                : (typeof child.allergies === 'string' ? child.allergies.split(',').map(s => s.trim()).filter(Boolean) : []);

            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const isUuid = uuidRegex.test(child.id);

            let profileId = child.id;

            if (!isUuid) {
                // 신규 자녀 DB INSERT
                const res = await fetch(`${DB_SUPABASE_URL}/rest/v1/user_neis_profiles`, {
                    method: 'POST',
                    headers: getDbHeaders({ 'Prefer': 'return=representation' }),
                    body: JSON.stringify({
                        user_id: userId,
                        student_name: child.name || '자녀',
                        school_name: child.schoolName || '서운중학교',
                        grade: dbGrade,
                        target_major: targetMajorVal,
                        allergies: allergiesVal,
                        class_num: 1,
                        student_num: 1,
                        is_connected: true
                    })
                });

                if (res.ok) {
                    const inserted = await res.json();
                    if (inserted && inserted.length > 0) {
                        profileId = inserted[0].id;
                        child.id = profileId;
                        if (selectedChildId === child.id) {
                            selectedChildId = profileId;
                        }
                    }
                } else {
                    console.error('DB 자녀 프로필 추가 실패:', await res.text());
                    return;
                }
            } else {
                // 기존 자녀 DB UPDATE (PATCH)
                const patchRes = await fetch(`${DB_SUPABASE_URL}/rest/v1/user_neis_profiles?id=eq.${profileId}`, {
                    method: 'PATCH',
                    headers: getDbHeaders(),
                    body: JSON.stringify({
                        student_name: child.name || '자녀',
                        school_name: child.schoolName || '서운중학교',
                        grade: dbGrade,
                        target_major: targetMajorVal,
                        allergies: allergiesVal,
                        updated_at: new Date().toISOString()
                    })
                });
                if (!patchRes.ok) {
                    console.error('DB 자녀 프로필 수정 실패:', await patchRes.text());
                }
            }

            // 과목별 성적 DB 저장 (user_student_grades)
            // 1. 기존 성적 레코드 삭제
            await fetch(`${DB_SUPABASE_URL}/rest/v1/user_student_grades?profile_id=eq.${profileId}`, {
                method: 'DELETE',
                headers: getDbHeaders()
            });

            // 2. 신규 성적 6과목(국어, 영어, 수학, 사회, 역사, 과학) DB INSERT
            const korScore = Number(child.korean) || 0;
            const engScore = Number(child.english) || 0;
            const mathScore = Number(child.math) || 0;
            const socScore = Number(child.society) || 0;
            const hisScore = Number(child.history) || 0;
            const sciScore = Number(child.science) || 0;

            const gradesPayload = [
                {
                    profile_id: profileId,
                    semester: '2026-1',
                    subject_name: '국어',
                    raw_score: korScore,
                    school_avg: 75,
                    std_dev: 12,
                    achievement: calcAchievement(korScore)
                },
                {
                    profile_id: profileId,
                    semester: '2026-1',
                    subject_name: '영어',
                    raw_score: engScore,
                    school_avg: 72,
                    std_dev: 14,
                    achievement: calcAchievement(engScore)
                },
                {
                    profile_id: profileId,
                    semester: '2026-1',
                    subject_name: '수학',
                    raw_score: mathScore,
                    school_avg: 70,
                    std_dev: 15,
                    achievement: calcAchievement(mathScore)
                },
                {
                    profile_id: profileId,
                    semester: '2026-1',
                    subject_name: '사회',
                    raw_score: socScore,
                    school_avg: 74,
                    std_dev: 14,
                    achievement: calcAchievement(socScore)
                },
                {
                    profile_id: profileId,
                    semester: '2026-1',
                    subject_name: '역사',
                    raw_score: hisScore,
                    school_avg: 73,
                    std_dev: 14.5,
                    achievement: calcAchievement(hisScore)
                },
                {
                    profile_id: profileId,
                    semester: '2026-1',
                    subject_name: '과학',
                    raw_score: sciScore,
                    school_avg: 71,
                    std_dev: 15,
                    achievement: calcAchievement(sciScore)
                }
            ];

            const gradesRes = await fetch(`${DB_SUPABASE_URL}/rest/v1/user_student_grades`, {
                method: 'POST',
                headers: getDbHeaders({ 'Prefer': 'return=representation' }),
                body: JSON.stringify(gradesPayload)
            });

            if (!gradesRes.ok) {
                console.error('DB 자녀 성적 저장 실패:', await gradesRes.text());
            }

            // 전역 상태 갱신
            window.childProfiles = childProfiles;
            window.selectedChildId = selectedChildId;
            localStorage.removeItem('learnmap_child_profiles');
        } catch (err) {
            console.error('DB 자녀 및 성적 저장 중 오류 발생:', err);
        }
    }

    async function deleteChildProfileFromSupabase(id) {
        if (!id) return;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) return;

        try {
            const res = await fetch(`${DB_SUPABASE_URL}/rest/v1/user_neis_profiles?id=eq.${id}`, {
                method: 'DELETE',
                headers: getDbHeaders()
            });
            if (!res.ok) {
                console.error('DB 자녀 삭제 실패:', await res.text());
            }
        } catch (err) {
            console.error('DB 자녀 삭제 중 오류 발생:', err);
        }
    }

    const settingsChildSelect = document.getElementById('settingsChildSelect');
    const settingsChildSelectPc = document.getElementById('settingsChildSelect-pc');
    const settingsChildName = document.getElementById('settingsChildName');
    const settingsChildNamePc = document.getElementById('settingsChildName-pc');
    const settingsChildGrade = document.getElementById('settingsChildGrade');
    const settingsChildGradePc = document.getElementById('settingsChildGrade-pc');
    const settingsChildTargetMajor = document.getElementById('settingsChildTargetMajor');
    const settingsChildTargetMajorPc = document.getElementById('settingsChildTargetMajor-pc');
    const settingsChildAllergies = document.getElementById('settingsChildAllergies');
    const settingsChildAllergiesPc = document.getElementById('settingsChildAllergies-pc');
    const settingsChildKor = document.getElementById('settingsChildKor');
    const settingsChildKorPc = document.getElementById('settingsChildKor-pc');
    const settingsChildEng = document.getElementById('settingsChildEng');
    const settingsChildEngPc = document.getElementById('settingsChildEng-pc');
    const settingsChildMath = document.getElementById('settingsChildMath');
    const settingsChildMathPc = document.getElementById('settingsChildMath-pc');
    const settingsChildSoc = document.getElementById('settingsChildSoc');
    const settingsChildSocPc = document.getElementById('settingsChildSoc-pc');
    const settingsChildHis = document.getElementById('settingsChildHis');
    const settingsChildHisPc = document.getElementById('settingsChildHis-pc');
    const settingsChildSci = document.getElementById('settingsChildSci');
    const settingsChildSciPc = document.getElementById('settingsChildSci-pc');

    // 분석 결과창 내 자녀 변경 시 실시간 분석 실행 바인딩
    const analysisChildSelect = document.getElementById('analysisChildSelect');
    if (analysisChildSelect) {
        analysisChildSelect.addEventListener('change', () => {
            const targetId = analysisChildSelect.value;
            const child = childProfiles.find(c => c.id === targetId);
            if (child) {
                selectedChildId = targetId;
                // 통합 설정 양방향 동기화 (PC 및 모바일 둘다 동기화)
                if (settingsChildSelect) settingsChildSelect.value = targetId;
                if (settingsChildSelectPc) settingsChildSelectPc.value = targetId;
                updateFormWithSelectedChild();
                renderChildPillTabs();
                
                // 새로운 자녀의 성적으로 즉각 재분석 실행
                if (orchestrator.state.selectedSchool && typeof orchestrator.childPerformanceDiagnosis === 'function') {
                    const result = orchestrator.childPerformanceDiagnosis(orchestrator.state.childProfile.scores);
                    if (typeof renderDiagnosisResults === 'function') {
                        renderDiagnosisResults(result);
                    }
                }
                
                // 비교 보드 또한 해당 자녀 기준으로 자동 업데이트
                if (orchestrator.state.comparisonList.length > 0) {
                    const comparisonTable = orchestrator.compareAgent.generateComparisonMatrix(orchestrator.state.comparisonList, orchestrator.state.childProfile.scores);
                    renderComparisonBoard(comparisonTable);
                }
            }
        });
    }

    function getGradeShort(grade) {
        if (!grade) return '중2';
        const g = String(grade).toLowerCase();
        if (g === 'e1') return '초1';
        if (g === 'e2') return '초2';
        if (g === 'e3') return '초3';
        if (g === 'e4') return '초4';
        if (g === 'e5') return '초5';
        if (g === 'e6') return '초6';
        if (g === 'm1') return '중1';
        if (g === 'm2') return '중2';
        if (g === 'm3') return '중3';
        if (g === 'h1') return '고1';
        if (g === 'h2') return '고2';
        if (g === 'h3') return '고3';
        return grade;
    }

    function getOrdinalKo(idx) {
        const ordinals = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째'];
        return ordinals[idx] || `${idx + 1}째`;
    }

    // 자녀 알약(Pill) 탭 바 동적 렌더링 (시안 100% 매칭 - PC 및 모바일 공용)
    function renderChildPillTabs() {
        const containers = [
            document.getElementById('childPillTabsContainer'),
            document.getElementById('childPillTabsContainerMobile')
        ].filter(Boolean);

        if (containers.length === 0) return;

        containers.forEach(container => {
            container.innerHTML = '';

            childProfiles.forEach((child, index) => {
                const isActive = child.id === selectedChildId;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `child-pill-tab ${isActive ? 'active' : ''}`;
                
                const bullet = isActive ? '<span class="pill-bullet"></span>' : '';
                const ord = getOrdinalKo(index);
                const gr = getGradeShort(child.grade);
                btn.innerHTML = `${bullet}<span>${ord} · ${child.name} (${gr})</span>`;

                btn.addEventListener('click', () => {
                    selectedChildId = child.id;
                    if (settingsChildSelect) settingsChildSelect.value = child.id;
                    if (settingsChildSelectPc) settingsChildSelectPc.value = child.id;
                    updateFormWithSelectedChild();
                    renderChildPillTabs();
                });

                container.appendChild(btn);
            });

            // + 새 자녀 추가 알약 버튼
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'child-pill-tab add-tab';
            addBtn.innerHTML = '<span>+ 새 자녀</span>';
            addBtn.addEventListener('click', () => {
                if (typeof onAddNewChild === 'function') {
                    onAddNewChild();
                }
            });
            container.appendChild(addBtn);
        });
    }

    // 성적 등급 및 5과목 평균 분석 실시간 계산 및 UI 렌더링
    function updateScoreAnalysisUI(kor, eng, math, soc, his, sci) {
        kor = parseInt(kor) || 0;
        eng = parseInt(eng) || 0;
        math = parseInt(math) || 0;
        soc = (soc !== undefined && soc !== null) ? (parseInt(soc) || 0) : 80;
        his = (his !== undefined && his !== null) ? (parseInt(his) || 0) : 80;
        sci = (sci !== undefined && sci !== null) ? (parseInt(sci) || 0) : 80;

        const calcGrade = (score) => {
            if (score >= 90) return { text: 'A 등급', color: '#2563eb', bg: '#eff6ff', border: '#dbeafe' };
            if (score >= 85) return { text: 'B+ 등급', color: '#7c3aed', bg: '#f3e8ff', border: '#e9d5ff' };
            if (score >= 80) return { text: 'B 등급', color: '#4f46e5', bg: '#eef2ff', border: '#e0e7ff' };
            if (score >= 75) return { text: 'C+ 등급', color: '#ea580c', bg: '#fff7ed', border: '#ffedd5' };
            if (score >= 70) return { text: 'C 등급', color: '#d97706', bg: '#fef3c7', border: '#fde68a' };
            if (score >= 60) return { text: 'D 등급', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };
            return { text: 'E 등급', color: '#dc2626', bg: '#fef2f2', border: '#fee2e2' };
        };

        const gKor = calcGrade(kor);
        const gEng = calcGrade(eng);
        const gSoc = calcGrade(soc);
        const gHis = calcGrade(his);
        const gSci = calcGrade(sci);

        const badgeKor = document.getElementById('badgeKorGrade');
        const badgeEng = document.getElementById('badgeEngGrade');
        const badgeMath = document.getElementById('badgeMathGrade');
        const badgeSoc = document.getElementById('badgeSocGrade');
        const badgeHis = document.getElementById('badgeHisGrade');
        const badgeSci = document.getElementById('badgeSciGrade');

        const setBadgeStyle = (elements, text, color, bg, border) => {
            elements.filter(Boolean).forEach(b => {
                b.innerText = text;
                b.style.color = color;
                b.style.background = bg;
                b.style.borderColor = border;
            });
        };

        const badgesKor = [document.getElementById('badgeKorGrade'), document.getElementById('badgeKorGradeMobile')];
        const badgesEng = [document.getElementById('badgeEngGrade'), document.getElementById('badgeEngGradeMobile')];
        const badgesMath = [document.getElementById('badgeMathGrade'), document.getElementById('badgeMathGradeMobile')];
        const badgesSoc = [document.getElementById('badgeSocGrade'), document.getElementById('badgeSocGradeMobile')];
        const badgesHis = [document.getElementById('badgeHisGrade'), document.getElementById('badgeHisGradeMobile')];
        const badgesSci = [document.getElementById('badgeSciGrade'), document.getElementById('badgeSciGradeMobile')];

        setBadgeStyle(badgesKor, gKor.text, gKor.color, gKor.bg, gKor.border);
        setBadgeStyle(badgesEng, gEng.text, gEng.color, gEng.bg, gEng.border);
        setBadgeStyle(badgesSoc, gSoc.text, gSoc.color, gSoc.bg, gSoc.border);
        setBadgeStyle(badgesHis, gHis.text, gHis.color, gHis.bg, gHis.border);
        setBadgeStyle(badgesSci, gSci.text, gSci.color, gSci.bg, gSci.border);

        if (math >= 90) {
            setBadgeStyle(badgesMath, 'A 등급', '#059669', '#ecfdf5', '#a7f3d0');
        } else {
            const gMath = calcGrade(math);
            setBadgeStyle(badgesMath, gMath.text, gMath.color, gMath.bg, gMath.border);
        }

        // 라벨 숫자 동기화
        const lblKorPc = document.getElementById('valSettingsChildKor-pc');
        const lblEngPc = document.getElementById('valSettingsChildEng-pc');
        const lblMathPc = document.getElementById('valSettingsChildMath-pc');
        const lblSocPc = document.getElementById('valSettingsChildSoc-pc');
        const lblHisPc = document.getElementById('valSettingsChildHis-pc');
        const lblSciPc = document.getElementById('valSettingsChildSci-pc');
        if (lblKorPc) lblKorPc.innerText = kor;
        if (lblEngPc) lblEngPc.innerText = eng;
        if (lblMathPc) lblMathPc.innerText = math;
        if (lblSocPc) lblSocPc.innerText = soc;
        if (lblHisPc) lblHisPc.innerText = his;
        if (lblSciPc) lblSciPc.innerText = sci;

        // 6과목 평균 분석 계산
        const avg = ((kor + eng + math + soc + his + sci) / 6).toFixed(1);
        const avgEl = document.getElementById('avgScoreDisplay');
        const avgElMobile = document.getElementById('avgScoreDisplayMobile');
        if (avgEl) avgEl.innerText = avg;
        if (avgElMobile) avgElMobile.innerText = avg;

        // 학교명 및 상위 백분위 예측 (현재 자녀의 목표 학교 기준)
        const activeChild = (typeof childProfiles !== 'undefined' && Array.isArray(childProfiles)) ? childProfiles.find(c => c.id === selectedChildId) : null;
        const mapSchoolObj = (typeof orchestrator !== 'undefined' && orchestrator.state && orchestrator.state.selectedSchool) || null;
        
        let targetSchoolObj = null;

        // 1순위: window.selectedTargetSchool이 현재 자녀의 학교 정보와 일치하거나 사용자가 방금 명시적으로 선택한 경우
        if (window.selectedTargetSchool) {
            const selSchoolId = String(window.selectedTargetSchool.school_id || window.selectedTargetSchool.id || '');
            const childSchoolId = activeChild ? String(activeChild.schoolId || '') : '';
            if (childSchoolId && selSchoolId === childSchoolId) {
                targetSchoolObj = window.selectedTargetSchool;
            } else if (activeChild && window.selectedTargetSchool.school_name === activeChild.schoolName) {
                targetSchoolObj = window.selectedTargetSchool;
            } else if (!activeChild) {
                targetSchoolObj = window.selectedTargetSchool;
            }
        }

        // 2순위: 데이터베이스에서 활성 자녀의 학교를 정밀 탐색 (schoolId 우선 -> region+name 일치 -> name 완전 일치)
        if (!targetSchoolObj && activeChild && window.schoolsDatabase && window.schoolsDatabase.length > 0) {
            if (activeChild.schoolId) {
                targetSchoolObj = window.schoolsDatabase.find(s => String(s.school_id || s.id) === String(activeChild.schoolId)) || null;
            }
            if (!targetSchoolObj && activeChild.schoolRegion && activeChild.schoolName) {
                targetSchoolObj = window.schoolsDatabase.find(s => 
                    s.school_name === activeChild.schoolName && 
                    ((s.region || '').includes(activeChild.schoolRegion) || (s.district || '').includes(activeChild.schoolRegion) || activeChild.schoolRegion.includes(s.region || ''))
                ) || null;
            }
            if (!targetSchoolObj && activeChild.schoolName) {
                // 주의: includes() 사용 금지! (신원초등학교 검색 시 서울신원초등학교가 가로채는 문제 방지)
                targetSchoolObj = window.schoolsDatabase.find(s => s.school_name === activeChild.schoolName) || null;
            }
        }

        // 3순위: fallback
        if (!targetSchoolObj) {
            targetSchoolObj = window.selectedTargetSchool || mapSchoolObj;
        }

        const schoolName = targetSchoolObj ? targetSchoolObj.school_name : (activeChild?.schoolName || '서운중');
        const shortSchool = schoolName.replace('학교', '');

        let rankPercent = 18;
        if (avg >= 95) rankPercent = 8;
        else if (avg >= 90) rankPercent = 18;
        else if (avg >= 85) rankPercent = 28;
        else if (avg >= 80) rankPercent = 38;
        else if (avg >= 75) rankPercent = 48;
        else if (avg >= 70) rankPercent = 58;
        else rankPercent = 75;

        const rankEl = document.getElementById('schoolRankEstimateDisplay');
        const rankElMobile = document.getElementById('schoolRankEstimateDisplayMobile');
        const rankText = `${shortSchool} 상위 ${rankPercent}% 예상`;
        if (rankEl) rankEl.innerText = rankText;
        if (rankElMobile) rankElMobile.innerText = rankText;

        // 안정성 배지
        const stabEl = document.getElementById('stabilityBadgeDisplay');
        if (stabEl) {
            if (avg >= 90) {
                stabEl.innerText = '상위권 안정';
                stabEl.style.background = '#2563eb';
            } else if (avg >= 80) {
                stabEl.innerText = '중상위권 안정';
                stabEl.style.background = '#3b82f6';
            } else if (avg >= 70) {
                stabEl.innerText = '중위권 유지';
                stabEl.style.background = '#64748b';
            } else {
                stabEl.innerText = '보충 필요';
                stabEl.style.background = '#ef4444';
            }
        }

        // 배정/목표 학교 카드 표시
        const targetSchoolDisplays = [
            document.getElementById('targetSchoolNameDisplay'),
            document.getElementById('targetSchoolNameDisplayMobile')
        ].filter(Boolean);

        if (targetSchoolDisplays.length > 0) {
            const chosen = targetSchoolObj || window.selectedTargetSchool;
            let finalSchoolName = '서초구 서운중학교';
            if (chosen) {
                const reg = chosen.region || chosen.district || '';
                if (reg && !chosen.school_name.startsWith(reg)) {
                    finalSchoolName = `${reg} ${chosen.school_name}`;
                } else {
                    finalSchoolName = chosen.school_name;
                }
            } else if (activeChild && activeChild.schoolName) {
                const reg = activeChild.schoolRegion || '';
                if (reg && !activeChild.schoolName.startsWith(reg)) {
                    finalSchoolName = `${reg} ${activeChild.schoolName}`;
                } else {
                    finalSchoolName = activeChild.schoolName;
                }
            }
            targetSchoolDisplays.forEach(el => el.innerText = finalSchoolName);
        }
    }

    // ==========================================
    // 배정 / 목표 학교 검색 및 선택 모달 제어 로직
    // ==========================================
    const targetSchoolSelectModal = document.getElementById('targetSchoolSelectModal');
    const inputTargetSchoolModalSearch = document.getElementById('inputTargetSchoolModalSearch');
    const targetSchoolModalList = document.getElementById('targetSchoolModalList');

    function openTargetSchoolSelectModal() {
        if (!targetSchoolSelectModal) return;
        targetSchoolSelectModal.style.display = 'flex';
        if (inputTargetSchoolModalSearch) {
            inputTargetSchoolModalSearch.value = '';
            setTimeout(() => inputTargetSchoolModalSearch.focus(), 60);
        }

        // 학교 데이터 로딩 여부 체크
        const allSchools = window.schoolsDatabase || (typeof schoolsDatabase !== 'undefined' ? schoolsDatabase : []) || (window.allSchoolsCache || []) || [];
        if ((!allSchools || allSchools.length === 0) && typeof loadSchoolsDatabase === 'function') {
            loadSchoolsDatabase().then(() => {
                renderTargetSchoolModalList('');
            }).catch(e => console.warn('학교 데이터 로드 대기 중 에러:', e));
        }

        renderTargetSchoolModalList('');
    }
    window.openTargetSchoolSelectModal = openTargetSchoolSelectModal;

    function closeTargetSchoolSelectModal() {
        if (targetSchoolSelectModal) {
            targetSchoolSelectModal.style.display = 'none';
        }
    }
    window.closeTargetSchoolSelectModal = closeTargetSchoolSelectModal;

    if (targetSchoolSelectModal) {
        targetSchoolSelectModal.addEventListener('click', (e) => {
            if (e.target === targetSchoolSelectModal) {
                closeTargetSchoolSelectModal();
            }
        });
    }

    if (inputTargetSchoolModalSearch) {
        inputTargetSchoolModalSearch.addEventListener('input', (e) => {
            renderTargetSchoolModalList(e.target.value.trim());
        });
    }

    function renderTargetSchoolModalList(query) {
        if (!targetSchoolModalList) return;
        targetSchoolModalList.innerHTML = '';

        const allSchools = window.schoolsDatabase || (typeof schoolsDatabase !== 'undefined' ? schoolsDatabase : []) || (window.allSchoolsCache || []) || [];
        const cleanQuery = (query || '').toLowerCase().trim();

        // 아직 학교 데이터가 비어있는 경우 비동기 로딩 대기
        if ((!allSchools || allSchools.length === 0) && typeof loadSchoolsDatabase === 'function') {
            targetSchoolModalList.innerHTML = `
                <div style="text-align: center; padding: 40px 10px; color: #64748b; font-size: 13px;">
                    학교 데이터베이스를 불러오는 중입니다... 잠시만 기다려주세요.
                </div>
            `;
            loadSchoolsDatabase().then(() => {
                renderTargetSchoolModalList(query);
            }).catch(err => {
                console.warn('학교 DB 로드 실패:', err);
            });
            return;
        }

        let filtered = [];
        const queryTerms = cleanQuery.split(/\s+/).filter(Boolean);

        if (queryTerms.length > 0) {
            filtered = allSchools.filter(s => {
                const name = (s.school_name || '').toLowerCase();
                const region = (s.region || s.district || '').toLowerCase();
                const fullText = `${region} ${name}`;
                return queryTerms.every(term => fullText.includes(term));
            }).slice(0, 50);
        } else {
            // 기본 인기 및 주요 중학교 추천 목록
            const defaultKeywords = ['서운중', '대치중', '역삼중', '원촌중', '단국', '휘문', '중동', '압구정', '신사', '반포', '세화', '방배'];
            filtered = allSchools.filter(s => defaultKeywords.some(k => (s.school_name || '').includes(k))).slice(0, 20);
            if (filtered.length === 0) {
                filtered = allSchools.slice(0, 20);
            }
        }

        if (filtered.length === 0) {
            targetSchoolModalList.innerHTML = `
                <div style="text-align: center; padding: 40px 10px; color: #94a3b8; font-size: 13px;">
                    검색된 학교가 없습니다.<br>
                    <span style="font-size: 11.5px; color: #cbd5e1; margin-top: 4px; display: inline-block;">정확한 학교명이나 구(예: 서초구, 강남구, 고양시)를 입력해 보세요.</span>
                </div>
            `;
            return;
        }

        const child = (typeof childProfiles !== 'undefined' && Array.isArray(childProfiles)) ? childProfiles.find(c => c.id === selectedChildId) : null;
        const currentTargetSchoolId = (child && child.schoolId) || (window.selectedTargetSchool && (window.selectedTargetSchool.school_id || window.selectedTargetSchool.id)) || '';
        const currentTargetName = child?.schoolName || window.selectedTargetSchool?.school_name || (typeof orchestrator !== 'undefined' && orchestrator?.state?.selectedSchool?.school_name) || '';

        filtered.forEach(school => {
            const schoolId = String(school.school_id || school.id || '');
            const isSelected = currentTargetSchoolId
                ? (schoolId === String(currentTargetSchoolId))
                : (currentTargetName && school.school_name === currentTargetName);

            const item = document.createElement('div');
            item.style.cssText = `
                background: ${isSelected ? '#eff6ff' : '#ffffff'};
                border: 1px solid ${isSelected ? '#3b82f6' : '#e2e8f0'};
                border-radius: 12px;
                padding: 10px 14px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
                transition: all 0.15s ease;
            `;
            item.onmouseover = () => { if (!isSelected) item.style.borderColor = '#93c5fd'; };
            item.onmouseout = () => { if (!isSelected) item.style.borderColor = '#e2e8f0'; };

            const regionText = school.region || school.district || '서울';
            const rateText = school.achievement_rate ? `성취도 ${school.achievement_rate}%` : (school.school_type || '중학교');

            item.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 13px; font-weight: 700; color: #1e293b;">${school.school_name}</span>
                        ${isSelected ? '<span style="font-size: 10px; background: #2563eb; color: white; padding: 1px 5px; border-radius: 4px; font-weight: 700;">현재 목표</span>' : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #64748b;">
                        <span>📍 ${regionText}</span>
                        <span>·</span>
                        <span style="color: #2563eb; font-weight: 600;">${rateText}</span>
                    </div>
                </div>
                <button type="button" class="btn-select-school-action" style="background: ${isSelected ? '#2563eb' : '#f1f5f9'}; color: ${isSelected ? '#ffffff' : '#334155'}; border: none; border-radius: 6px; padding: 5px 12px; font-size: 11.5px; font-weight: 700; cursor: pointer;">
                    ${isSelected ? '선택됨' : '선택'}
                </button>
            `;

            // 카드 영역 클릭 시 학교 선택
            item.onclick = (e) => {
                e.preventDefault();
                selectTargetSchoolForChild(school);
            };

            // 내부 버튼 클릭 시에도 확실하게 학교 선택
            const actionBtn = item.querySelector('.btn-select-school-action');
            if (actionBtn) {
                actionBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectTargetSchoolForChild(school);
                };
            }

            targetSchoolModalList.appendChild(item);
        });
    }

    async function selectTargetSchoolForChild(school) {
        if (!school) return;

        // 1. 현재 선택된 자녀 조회 (자녀 목록이 있으면 첫 번째 자녀를 기본 타겟으로 보완)
        let child = (typeof childProfiles !== 'undefined' && Array.isArray(childProfiles)) ? childProfiles.find(c => c.id === selectedChildId) : null;
        if (!child && typeof childProfiles !== 'undefined' && Array.isArray(childProfiles) && childProfiles.length > 0) {
            child = childProfiles[0];
            selectedChildId = child.id;
        }

        // 2. 전역 목표 학교 상태 즉시 지정
        window.selectedTargetSchool = school;

        // 3. 자녀가 있는 경우: 해당 자녀의 학교명, 고유 ID, 지역 갱신 및 DB 저장 (비동기 안전 처리)
        if (child) {
            child.schoolName = school.school_name;
            child.schoolId = String(school.school_id || school.id || '');
            child.schoolRegion = school.region || school.district || '';
            try {
                saveChildProfileToSupabase(child).catch(err => console.warn('자녀 프로필 DB 저장 비동기 오류:', err));
            } catch (err) {
                console.warn('saveChildProfileToSupabase 호출 실패:', err);
            }
            refreshChildSelectUI();
        }

        // 4. 대시보드 배정 / 목표 학교 텍스트 즉시 갱신 (자녀 유무 무관)
        const targetSchoolDisplay = document.getElementById('targetSchoolNameDisplay');
        if (targetSchoolDisplay) {
            const reg = school.region || school.district || '';
            if (reg && !school.school_name.startsWith(reg)) {
                targetSchoolDisplay.innerText = `${reg} ${school.school_name}`;
            } else {
                targetSchoolDisplay.innerText = school.school_name;
            }
        }

        // 5. 점수 분석 UI 갱신 (6과목 완벽 전달)
        try {
            const kor = child ? child.korean : 80;
            const eng = child ? child.english : 80;
            const math = child ? child.math : 80;
            const soc = child ? (child.society ?? 80) : 80;
            const his = child ? (child.history ?? 80) : 80;
            const sci = child ? (child.science ?? 80) : 80;
            updateScoreAnalysisUI(kor, eng, math, soc, his, sci);
        } catch (err) {
            console.warn('updateScoreAnalysisUI 갱신 오류:', err);
        }

        // 6. 오케스트레이터 및 진단 연동 (예외 방어)
        try {
            if (typeof orchestrator !== 'undefined' && orchestrator.state) {
                orchestrator.state.selectedSchool = school;
                if (typeof orchestrator.selectSchool === 'function') {
                    try {
                        orchestrator.selectSchool(school);
                    } catch (e) {
                        console.warn('orchestrator.selectSchool 오류 무시:', e);
                    }
                }
                const scores = (child && { 
                    korean: child.korean || 80, 
                    english: child.english || 80, 
                    math: child.math || 80,
                    society: child.society ?? 80,
                    history: child.history ?? 80,
                    science: child.science ?? 80
                }) ||
                (orchestrator.state.childProfile && orchestrator.state.childProfile.scores) ||
                { korean: 80, english: 80, math: 80, society: 80, history: 80, science: 80 };
                
                if (typeof orchestrator.childPerformanceDiagnosis === 'function') {
                    const result = orchestrator.childPerformanceDiagnosis(scores);
                    if (typeof renderDiagnosisResults === 'function') {
                        renderDiagnosisResults(result);
                    }
                }
            }
        } catch (err) {
            console.warn('오케스트레이터 진단 연동 오류 무시:', err);
        }

        // 7. 지도 부드러운 이동 (카카오맵 및 Leaflet 안전 연동)
        try {
            if (school.lat && school.lng) {
                if (typeof kakao !== 'undefined' && kakao.maps && typeof kakaoMap !== 'undefined' && kakaoMap) {
                    kakaoMap.panTo(new kakao.maps.LatLng(school.lat, school.lng));
                } else if (window.map && typeof window.map.flyTo === 'function') {
                    window.map.flyTo([school.lat, school.lng], 15);
                }
            }
        } catch (err) {
            console.warn('지도 이동 오류 무시:', err);
        }

        // 8. 모달 즉시 닫기
        closeTargetSchoolSelectModal();

        // 9. 사용자 알림
        const displayName = child ? `${child.name}의 ` : '';
        const regText = school.region || school.district || '';
        const fullDisplay = (regText && !school.school_name.startsWith(regText)) ? `${regText} ${school.school_name}` : school.school_name;
        alert(`${displayName}목표 학교가 [${fullDisplay}](으)로 설정되었습니다.`);
    }
    window.selectTargetSchoolForChild = selectTargetSchoolForChild;

    // 학교 변경 버튼 클릭 핸들러 (모달 오픈)
    window.handleChangeSchoolClick = function() {
        openTargetSchoolSelectModal();
    };

    function refreshChildSelectUI() {
        if (settingsChildSelect) settingsChildSelect.innerHTML = '';
        if (settingsChildSelectPc) settingsChildSelectPc.innerHTML = '';
        if (analysisChildSelect) analysisChildSelect.innerHTML = '';

        const appendNoneOption = (selectEl) => {
            if (!selectEl) return;
            const opt = document.createElement('option');
            opt.value = '';
            opt.innerText = '자녀 없음';
            if (!selectedChildId || !childProfiles.some(c => c.id === selectedChildId)) {
                opt.selected = true;
            }
            selectEl.appendChild(opt);
        };

        appendNoneOption(settingsChildSelect);
        appendNoneOption(settingsChildSelectPc);
        appendNoneOption(analysisChildSelect);

        childProfiles.forEach(child => {
            const isDefault = child.id === defaultChildId;
            
            // 모바일용 옵션
            if (settingsChildSelect) {
                const opt1 = document.createElement('option');
                opt1.value = child.id;
                opt1.innerText = `${child.name} (${child.grade.toUpperCase()})` + (isDefault ? ' 👑' : '');
                if (child.id === selectedChildId) {
                    opt1.selected = true;
                }
                settingsChildSelect.appendChild(opt1);
            }

            // PC용 옵션
            if (settingsChildSelectPc) {
                const optPc = document.createElement('option');
                optPc.value = child.id;
                optPc.innerText = `${child.name} (${child.grade.toUpperCase()})` + (isDefault ? ' 👑' : '');
                if (child.id === selectedChildId) {
                    optPc.selected = true;
                }
                settingsChildSelectPc.appendChild(optPc);
            }

            // 분석 결과창용 옵션
            if (analysisChildSelect) {
                const opt2 = document.createElement('option');
                opt2.value = child.id;
                opt2.innerText = child.name + (isDefault ? ' (기본)' : '');
                if (child.id === selectedChildId) {
                    opt2.selected = true;
                }
                analysisChildSelect.appendChild(opt2);
            }
        });

        renderChildPillTabs();
        updateFormWithSelectedChild();
    }

    function updateFormWithSelectedChild() {
        const child = childProfiles.find(c => c.id === selectedChildId);
        const profileNameEl = document.getElementById('mypageProfileName');
        const profileScoresEl = document.getElementById('mypageProfileScores');

        if (!child) {
            if (profileNameEl) profileNameEl.innerText = '자녀 없음';
            if (profileScoresEl) profileScoresEl.innerText = '자녀 설정 미등록';

            // 모바일 및 PC 폼 초기화
            if (settingsChildName) settingsChildName.value = '';
            if (settingsChildNamePc) settingsChildNamePc.value = '';
            if (settingsChildGrade) settingsChildGrade.value = 'm2';
            if (settingsChildGradePc) settingsChildGradePc.value = 'm2';
            if (settingsChildTargetMajor) settingsChildTargetMajor.value = '';
            if (settingsChildTargetMajorPc) settingsChildTargetMajorPc.value = '';
            if (settingsChildAllergies) settingsChildAllergies.value = '';
            if (settingsChildAllergiesPc) settingsChildAllergiesPc.value = '';
            if (settingsChildKor) settingsChildKor.value = 80;
            if (settingsChildKorPc) settingsChildKorPc.value = 80;
            if (settingsChildEng) settingsChildEng.value = 80;
            if (settingsChildEngPc) settingsChildEngPc.value = 80;
            if (settingsChildMath) settingsChildMath.value = 80;
            if (settingsChildMathPc) settingsChildMathPc.value = 80;
            if (settingsChildSoc) settingsChildSoc.value = 80;
            if (settingsChildSocPc) settingsChildSocPc.value = 80;
            if (settingsChildHis) settingsChildHis.value = 80;
            if (settingsChildHisPc) settingsChildHisPc.value = 80;
            if (settingsChildSci) settingsChildSci.value = 80;
            if (settingsChildSciPc) settingsChildSciPc.value = 80;

            const lblKor = document.getElementById('valSettingsChildKor');
            const lblEng = document.getElementById('valSettingsChildEng');
            const lblMath = document.getElementById('valSettingsChildMath');
            const lblSoc = document.getElementById('valSettingsChildSoc');
            const lblHis = document.getElementById('valSettingsChildHis');
            const lblSci = document.getElementById('valSettingsChildSci');
            if (lblKor) lblKor.innerText = '-점';
            if (lblEng) lblEng.innerText = '-점';
            if (lblMath) lblMath.innerText = '-점';
            if (lblSoc) lblSoc.innerText = '-점';
            if (lblHis) lblHis.innerText = '-점';
            if (lblSci) lblSci.innerText = '-점';

            updateScoreAnalysisUI(80, 80, 80, 80, 80, 80);
            syncActiveChildWithOrchestrator(null);
            return;
        }

        if (profileNameEl) {
            profileNameEl.innerText = `${child.name} 학부모님 (${child.grade.toUpperCase().replace('E', '초등 ').replace('M', '중등 ').replace('H', '고등 ')})`;
        }
        if (profileScoresEl) {
            const socVal = child.society ?? 80;
            const hisVal = child.history ?? 80;
            const sciVal = child.science ?? 80;
            profileScoresEl.innerText = `성적: 국 ${child.korean} / 영 ${child.english} / 수 ${child.math} / 사 ${socVal} / 역 ${hisVal} / 과 ${sciVal}`;
        }

        const childAllergiesText = Array.isArray(child.allergies) ? child.allergies.join(', ') : (child.allergies || '');
        const currentSoc = (child.society !== undefined && child.society !== null) ? child.society : 80;
        const currentHis = (child.history !== undefined && child.history !== null) ? child.history : 80;
        const currentSci = (child.science !== undefined && child.science !== null) ? child.science : 80;
        child.society = currentSoc;
        child.history = currentHis;
        child.science = currentSci;

        // 모바일 입력 폼 바인딩
        if (settingsChildName) settingsChildName.value = child.name || '';
        if (settingsChildGrade) settingsChildGrade.value = child.grade || 'm2';
        if (settingsChildTargetMajor) settingsChildTargetMajor.value = child.targetMajor || '';
        if (settingsChildAllergies) settingsChildAllergies.value = childAllergiesText;
        if (settingsChildKor) settingsChildKor.value = child.korean;
        if (settingsChildEng) settingsChildEng.value = child.english;
        if (settingsChildMath) settingsChildMath.value = child.math;
        if (settingsChildSoc) settingsChildSoc.value = child.society;
        if (settingsChildHis) settingsChildHis.value = child.history;
        if (settingsChildSci) settingsChildSci.value = child.science;

        // PC 입력 폼 바인딩
        if (settingsChildNamePc) settingsChildNamePc.value = child.name || '';
        if (settingsChildGradePc) settingsChildGradePc.value = child.grade || 'm2';
        if (settingsChildTargetMajorPc) settingsChildTargetMajorPc.value = child.targetMajor || '';
        if (settingsChildAllergiesPc) settingsChildAllergiesPc.value = childAllergiesText;
        if (settingsChildKorPc) settingsChildKorPc.value = child.korean;
        if (settingsChildEngPc) settingsChildEngPc.value = child.english;
        if (settingsChildMathPc) settingsChildMathPc.value = child.math;
        if (settingsChildSocPc) settingsChildSocPc.value = child.society;
        if (settingsChildHisPc) settingsChildHisPc.value = child.history;
        if (settingsChildSciPc) settingsChildSciPc.value = child.science;

        // PC & 모바일 숫자 직접 입력 인풋 바인딩
        const inputChildKorPc = document.getElementById('inputSettingsChildKor-pc');
        const inputChildEngPc = document.getElementById('inputSettingsChildEng-pc');
        const inputChildMathPc = document.getElementById('inputSettingsChildMath-pc');
        const inputChildSocPc = document.getElementById('inputSettingsChildSoc-pc');
        const inputChildHisPc = document.getElementById('inputSettingsChildHis-pc');
        const inputChildSciPc = document.getElementById('inputSettingsChildSci-pc');
        const inputChildKorMobile = document.getElementById('inputSettingsChildKor');
        const inputChildEngMobile = document.getElementById('inputSettingsChildEng');
        const inputChildMathMobile = document.getElementById('inputSettingsChildMath');
        const inputChildSocMobile = document.getElementById('inputSettingsChildSoc');
        const inputChildHisMobile = document.getElementById('inputSettingsChildHis');
        const inputChildSciMobile = document.getElementById('inputSettingsChildSci');

        if (inputChildKorPc) inputChildKorPc.value = child.korean;
        if (inputChildEngPc) inputChildEngPc.value = child.english;
        if (inputChildMathPc) inputChildMathPc.value = child.math;
        if (inputChildSocPc) inputChildSocPc.value = child.society;
        if (inputChildHisPc) inputChildHisPc.value = child.history;
        if (inputChildSciPc) inputChildSciPc.value = child.science;
        if (inputChildKorMobile) inputChildKorMobile.value = child.korean;
        if (inputChildEngMobile) inputChildEngMobile.value = child.english;
        if (inputChildMathMobile) inputChildMathMobile.value = child.math;
        if (inputChildSocMobile) inputChildSocMobile.value = child.society;
        if (inputChildHisMobile) inputChildHisMobile.value = child.history;
        if (inputChildSciMobile) inputChildSciMobile.value = child.science;
        
        // 자녀설정의 학년에 따라 학교급 필터 기본값 자동 선택
        const schoolTypeFilter = document.getElementById('schoolTypeFilter');
        if (schoolTypeFilter && child.grade) {
            const firstChar = child.grade.charAt(0).toLowerCase();
            if (firstChar === 'e') {
                schoolTypeFilter.value = 'elementary';
            } else if (firstChar === 'm') {
                schoolTypeFilter.value = 'middle';
            } else if (firstChar === 'h') {
                schoolTypeFilter.value = 'high';
            }
            const event = new Event('change');
            schoolTypeFilter.dispatchEvent(event);
        }

        // 모바일 점수 텍스트(Label) 동적 갱신
        const lblKor = document.getElementById('valSettingsChildKor');
        const lblEng = document.getElementById('valSettingsChildEng');
        const lblMath = document.getElementById('valSettingsChildMath');
        const lblSoc = document.getElementById('valSettingsChildSoc');
        const lblHis = document.getElementById('valSettingsChildHis');
        const lblSci = document.getElementById('valSettingsChildSci');
        if (lblKor) lblKor.innerText = `${child.korean}점`;
        if (lblEng) lblEng.innerText = `${child.english}점`;
        if (lblMath) lblMath.innerText = `${child.math}점`;
        if (lblSoc) lblSoc.innerText = `${child.society}점`;
        if (lblHis) lblHis.innerText = `${child.history}점`;
        if (lblSci) lblSci.innerText = `${child.science}점`;

        // 자녀의 목표 학교 객체를 window.selectedTargetSchool에 동기화 (schoolId 및 지역 우선 매칭)
        if (window.schoolsDatabase && window.schoolsDatabase.length > 0) {
            let matched = null;
            if (child.schoolId) {
                matched = window.schoolsDatabase.find(s => String(s.school_id || s.id) === String(child.schoolId));
            }
            if (!matched && child.schoolRegion && child.schoolName) {
                matched = window.schoolsDatabase.find(s => 
                    s.school_name === child.schoolName && 
                    ((s.region || '').includes(child.schoolRegion) || (s.district || '').includes(child.schoolRegion) || child.schoolRegion.includes(s.region || ''))
                );
            }
            if (!matched && child.schoolName) {
                matched = window.schoolsDatabase.find(s => s.school_name === child.schoolName);
            }
            if (matched) {
                window.selectedTargetSchool = matched;
            }
        }

        // PC 점수, 등급, 평균 분석 실시간 갱신 (시안 100% 매칭)
        updateScoreAnalysisUI(child.korean, child.english, child.math, child.society, child.history, child.science);

        // 현재 선택된 자녀 정보로 Orchestrator 상태 동기화 및 사이드바 인풋 동기화
        syncActiveChildWithOrchestrator(child);
    }

    // 이름 및 학년 입력 필드 PC-모바일 실시간 양방향 동기화
    const syncTextInputs = (el1, el2, key) => {
        if (!el1 || !el2) return;
        const update = (val) => {
            el1.value = val;
            el2.value = val;
            const child = childProfiles.find(c => c.id === selectedChildId);
            if (child) {
                child[key] = val;
                renderChildPillTabs();
            }
        };
        el1.addEventListener('input', (e) => update(e.target.value));
        el2.addEventListener('input', (e) => update(e.target.value));
        el1.addEventListener('change', (e) => update(e.target.value));
        el2.addEventListener('change', (e) => update(e.target.value));
    };

    syncTextInputs(settingsChildName, settingsChildNamePc, 'name');
    syncTextInputs(settingsChildGrade, settingsChildGradePc, 'grade');
    syncTextInputs(settingsChildTargetMajor, settingsChildTargetMajorPc, 'targetMajor');
    syncTextInputs(settingsChildAllergies, settingsChildAllergiesPc, 'allergies');

    // 과목 점수 실시간 양방향 동기화 (숫자 직접 입력 인풋 + 슬라이더 + 라벨 + 학업 진단)
    function bindScoreSync(subjectKey, sliderMobile, sliderPc, inputMobile, inputPc, labelMobile, labelPc) {
        const update = (rawVal) => {
            let val = parseInt(rawVal, 10);
            if (isNaN(val)) val = 0;
            val = Math.max(0, Math.min(100, val));

            if (sliderMobile && Number(sliderMobile.value) !== val) sliderMobile.value = val;
            if (sliderPc && Number(sliderPc.value) !== val) sliderPc.value = val;
            if (inputMobile && Number(inputMobile.value) !== val) inputMobile.value = val;
            if (inputPc && Number(inputPc.value) !== val) inputPc.value = val;
            if (labelMobile) labelMobile.innerText = `${val}점`;
            if (labelPc) labelPc.innerText = val;

            const child = childProfiles.find(c => c.id === selectedChildId);
            if (child) {
                child[subjectKey] = val;
                updateScoreAnalysisUI(child.korean, child.english, child.math, child.society, child.history, child.science);
                syncActiveChildWithOrchestrator(child);
            }
        };

        [sliderMobile, sliderPc, inputMobile, inputPc].forEach(el => {
            if (el) {
                el.addEventListener('input', (e) => update(e.target.value));
                if (el.type === 'number') {
                    el.addEventListener('change', (e) => update(e.target.value));
                }
            }
        });
    }

    bindScoreSync(
        'korean',
        settingsChildKor,
        settingsChildKorPc,
        document.getElementById('inputSettingsChildKor'),
        document.getElementById('inputSettingsChildKor-pc'),
        document.getElementById('valSettingsChildKor'),
        document.getElementById('valSettingsChildKor-pc')
    );

    bindScoreSync(
        'english',
        settingsChildEng,
        settingsChildEngPc,
        document.getElementById('inputSettingsChildEng'),
        document.getElementById('inputSettingsChildEng-pc'),
        document.getElementById('valSettingsChildEng'),
        document.getElementById('valSettingsChildEng-pc')
    );

    bindScoreSync(
        'math',
        settingsChildMath,
        settingsChildMathPc,
        document.getElementById('inputSettingsChildMath'),
        document.getElementById('inputSettingsChildMath-pc'),
        document.getElementById('valSettingsChildMath'),
        document.getElementById('valSettingsChildMath-pc')
    );

    bindScoreSync(
        'society',
        settingsChildSoc,
        settingsChildSocPc,
        document.getElementById('inputSettingsChildSoc'),
        document.getElementById('inputSettingsChildSoc-pc'),
        document.getElementById('valSettingsChildSoc'),
        document.getElementById('valSettingsChildSoc-pc')
    );

    bindScoreSync(
        'history',
        settingsChildHis,
        settingsChildHisPc,
        document.getElementById('inputSettingsChildHis'),
        document.getElementById('inputSettingsChildHis-pc'),
        document.getElementById('valSettingsChildHis'),
        document.getElementById('valSettingsChildHis-pc')
    );

    bindScoreSync(
        'science',
        settingsChildSci,
        settingsChildSciPc,
        document.getElementById('inputSettingsChildSci'),
        document.getElementById('inputSettingsChildSci-pc'),
        document.getElementById('valSettingsChildSci'),
        document.getElementById('valSettingsChildSci-pc')
    );

    function syncActiveChildWithOrchestrator(child) {
        if (!child) return;
        orchestrator.state.childProfile.name = child.name;
        orchestrator.state.childProfile.grade = child.grade;
        orchestrator.state.childProfile.scores = {
            korean: child.korean,
            english: child.english,
            math: child.math,
            society: child.society ?? 80,
            history: child.history ?? 80,
            science: child.science ?? 80
        };

        const elGrade = document.getElementById('childGrade');
        const elKor = document.getElementById('childKor');
        const elEng = document.getElementById('childEng');
        const elMath = document.getElementById('childMath');
        if (elGrade) elGrade.value = child.grade;
        if (elKor) elKor.value = child.korean;
        if (elEng) elEng.value = child.english;
        if (elMath) elMath.value = child.math;
        
        // 분석 결과창 내 자녀 선택 상태값도 싱크 처리
        if (analysisChildSelect && analysisChildSelect.value !== child.id) {
            analysisChildSelect.value = child.id;
        }

        // ★★★ 필터 아코디언 카드 1번 (자녀 맞춤 추천) 데이터 완벽 동기화 ★★★
        const korScore = Number(child.korean) || 0;
        const engScore = Number(child.english) || 0;
        const mathScore = Number(child.math) || 0;
        const avgScore = (korScore > 0 || engScore > 0 || mathScore > 0)
            ? Math.round((korScore + engScore + mathScore) / 3)
            : 70;

        const childTargetGradeSelect = document.getElementById('childTargetGradeSelect');
        const childScoreFilter = document.getElementById('childScoreFilter');
        const currentLevelRange = document.getElementById('currentLevelRange');
        const valCurrentLevel = document.getElementById('valCurrentLevel');
        const targetLevelRange = document.getElementById('targetLevelRange');
        const valTargetLevel = document.getElementById('valTargetLevel');

        if (childTargetGradeSelect && child.grade) {
            const firstChar = String(child.grade).charAt(0).toLowerCase();
            if (firstChar === 'e') childTargetGradeSelect.value = 'elementary';
            else if (firstChar === 'h') childTargetGradeSelect.value = 'high';
            else childTargetGradeSelect.value = 'middle';
        }

        if (currentLevelRange) {
            currentLevelRange.value = avgScore;
        }
        if (valCurrentLevel) {
            valCurrentLevel.innerText = `${avgScore}점`;
        }

        const targetAvg = Math.min(100, avgScore + 15);
        if (targetLevelRange) {
            targetLevelRange.value = targetAvg;
        }
        if (valTargetLevel) {
            valTargetLevel.innerText = `${targetAvg}점`;
        }

        if (childScoreFilter) {
            if (avgScore >= 85) childScoreFilter.value = 'high';
            else if (avgScore >= 70) childScoreFilter.value = 'mid';
            else childScoreFilter.value = 'low';
        }
    }


    // PC 및 모바일 셀렉트 변경 시 양방향 싱크
    if (settingsChildSelect) {
        settingsChildSelect.addEventListener('change', () => {
            selectedChildId = settingsChildSelect.value;
            if (settingsChildSelectPc) settingsChildSelectPc.value = selectedChildId;
            updateFormWithSelectedChild();
        });
    }
    if (settingsChildSelectPc) {
        settingsChildSelectPc.addEventListener('change', () => {
            selectedChildId = settingsChildSelectPc.value;
            if (settingsChildSelect) settingsChildSelect.value = selectedChildId;
            updateFormWithSelectedChild();
        });
    }

    // 자녀 추가 버튼 이벤트 (DB user_neis_profiles & user_student_grades 연동)
    const btnAddNewChild = document.getElementById('btnAddNewChild');
    const btnAddNewChildPc = document.getElementById('btnAddNewChild-pc');
    const onAddNewChild = async () => {
        try {
            const userId = await getEffectiveUserId();
            const childNum = childProfiles.length + 1;
            const newName = `자녀 ${childNum}`;

            // DB user_neis_profiles 테이블에 직접 자녀 생성
            const res = await fetch(`${DB_SUPABASE_URL}/rest/v1/user_neis_profiles`, {
                method: 'POST',
                headers: getDbHeaders({ 'Prefer': 'return=representation' }),
                body: JSON.stringify({
                    user_id: userId,
                    student_name: newName,
                    school_name: '서운중학교',
                    grade: 2,
                    class_num: 1,
                    student_num: 1,
                    is_connected: true
                })
            });

            if (res.ok) {
                const inserted = await res.json();
                if (inserted && inserted.length > 0) {
                    const newProfile = inserted[0];
                    const newChild = {
                        id: newProfile.id,
                        name: newProfile.student_name,
                        schoolName: newProfile.school_name,
                        grade: 'm' + (newProfile.grade || 2),
                        korean: 80,
                        english: 80,
                        math: 80,
                        society: 80,
                        history: 80,
                        science: 80
                    };

                    // DB user_student_grades 기본 성적 저장 (6과목)
                    await fetch(`${DB_SUPABASE_URL}/rest/v1/user_student_grades`, {
                        method: 'POST',
                        headers: getDbHeaders({ 'Prefer': 'return=representation' }),
                        body: JSON.stringify([
                            { profile_id: newProfile.id, semester: '2026-1', subject_name: '국어', raw_score: 80, school_avg: 75, std_dev: 12, achievement: 'B' },
                            { profile_id: newProfile.id, semester: '2026-1', subject_name: '영어', raw_score: 80, school_avg: 72, std_dev: 14, achievement: 'B' },
                            { profile_id: newProfile.id, semester: '2026-1', subject_name: '수학', raw_score: 80, school_avg: 70, std_dev: 15, achievement: 'B' },
                            { profile_id: newProfile.id, semester: '2026-1', subject_name: '사회', raw_score: 80, school_avg: 74, std_dev: 14, achievement: 'B' },
                            { profile_id: newProfile.id, semester: '2026-1', subject_name: '역사', raw_score: 80, school_avg: 73, std_dev: 14.5, achievement: 'B' },
                            { profile_id: newProfile.id, semester: '2026-1', subject_name: '과학', raw_score: 80, school_avg: 71, std_dev: 15, achievement: 'B' }
                        ])
                    });

                    childProfiles.push(newChild);
                    selectedChildId = newChild.id;
                    window.childProfiles = childProfiles;
                    window.selectedChildId = selectedChildId;
                    localStorage.removeItem('learnmap_child_profiles');
                    refreshChildSelectUI();
                }
            } else {
                console.error('DB 자녀 생성 실패:', await res.text());
            }
        } catch (e) {
            console.error('새 자녀 생성 중 오류 발생:', e);
        }
    };
    if (btnAddNewChild) btnAddNewChild.addEventListener('click', onAddNewChild);
    if (btnAddNewChildPc) btnAddNewChildPc.addEventListener('click', onAddNewChild);

    // 자녀 삭제 버튼 이벤트 (DB user_neis_profiles 삭제)
    const btnDeleteSelectedChild = document.getElementById('btnDeleteSelectedChild');
    const btnDeleteSelectedChildPc = document.getElementById('btnDeleteSelectedChild-pc');
    const onDeleteChild = async () => {
        if (!selectedChildId || selectedChildId === '') {
            alert('삭제할 자녀가 선택되지 않았습니다.');
            return;
        }
        const targetChild = childProfiles.find(c => c.id === selectedChildId);
        const childName = targetChild ? targetChild.name : '선택된 자녀';

        if (await confirm(`${childName} 자녀 정보를 정말 삭제하시겠습니까?`)) {
            const targetId = selectedChildId;
            childProfiles = childProfiles.filter(c => c.id !== targetId);
            
            if (childProfiles.length > 0) {
                selectedChildId = childProfiles[0].id;
                if (defaultChildId === targetId) {
                    defaultChildId = selectedChildId;
                    localStorage.setItem('learnmap_default_child_id', defaultChildId);
                }
            } else {
                selectedChildId = null;
                defaultChildId = null;
                localStorage.removeItem('learnmap_default_child_id');
            }
            
            window.childProfiles = childProfiles;
            window.selectedChildId = selectedChildId;

            // Supabase DB에서 삭제 (CASCADE 정책으로 성적 테이블도 자동 삭제)
            await deleteChildProfileFromSupabase(targetId);
            localStorage.removeItem('learnmap_child_profiles');
            refreshChildSelectUI();

            if (typeof window.updateAuthUI === 'function') {
                window.updateAuthUI();
            }

            alert(`${childName} 자녀 정보가 DB에서 성공적으로 삭제되었습니다.`);
        }
    };
    window.handleDeleteCurrentChild = onDeleteChild;
    if (btnDeleteSelectedChild) btnDeleteSelectedChild.addEventListener('click', onDeleteChild);
    if (btnDeleteSelectedChildPc) btnDeleteSelectedChildPc.addEventListener('click', onDeleteChild);

    // 기본 자녀 설정 버튼 이벤트
    const btnSetDefaultChild = document.getElementById('btnSetDefaultChild');
    const btnSetDefaultChildPc = document.getElementById('btnSetDefaultChild-pc');
    const onSetDefaultChild = () => {
        if (!selectedChildId) return;
        defaultChildId = selectedChildId;
        localStorage.setItem('learnmap_default_child_id', defaultChildId);
        refreshChildSelectUI();
        alert('선택한 자녀가 기본 분석 자녀로 설정되었습니다.');
    };
    if (btnSetDefaultChild) btnSetDefaultChild.addEventListener('click', onSetDefaultChild);
    if (btnSetDefaultChildPc) btnSetDefaultChildPc.addEventListener('click', onSetDefaultChild);

    // PC 닫기 버튼 이벤트
    const btnCloseSettingsPc = document.getElementById('btnCloseSettings-pc');
    if (btnCloseSettingsPc) {
        btnCloseSettingsPc.addEventListener('click', () => {
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) settingsModal.style.display = 'none';
        });
    }

    // 설정 모달이 열릴 때 Supabase 데이터를 기준으로 동기화
    const btnOpenSettings = document.getElementById('btnOpenSettings');
    if (btnOpenSettings) {
        btnOpenSettings.addEventListener('click', async () => {
            await loadChildProfilesFromSupabase();
            if (typeof updateMypageComparisonUI === 'function') {
                updateMypageComparisonUI();
            }
            if (typeof updateMypageSimulationUI === 'function') {
                updateMypageSimulationUI();
            }
        });
    }

    // 자녀 성적 저장 및 DB 동기화 버튼 클릭 이벤트 (PC/모바일 공용)
    const btnSaveSettingsScores = document.getElementById('btnSaveSettingsScores');
    const btnSaveSettingsScoresPc = document.getElementById('btnSaveSettingsScores-pc');
    const onSaveSettingsScores = async () => {
        let child = childProfiles.find(c => c.id === selectedChildId);
        if (!child) {
            const tempId = 'child_' + Date.now();
            child = {
                id: tempId,
                name: '자녀',
                schoolName: '서운중학교',
                grade: 'm2',
                korean: 80,
                english: 80,
                math: 80,
                society: 80,
                science: 80
            };
            childProfiles.push(child);
            selectedChildId = child.id;
        }

        const elModalNamePc = document.getElementById('settingsChildName-pc');
        const elModalNameMob = document.getElementById('settingsChildName');
        const elModalName = (elModalNamePc && elModalNamePc.offsetParent !== null) ? elModalNamePc : (elModalNameMob || elModalNamePc);

        const elModalGradePc = document.getElementById('settingsChildGrade-pc');
        const elModalGradeMob = document.getElementById('settingsChildGrade');
        const elModalGrade = (elModalGradePc && elModalGradePc.offsetParent !== null) ? elModalGradePc : (elModalGradeMob || elModalGradePc);

        const elModalMajorPc = document.getElementById('settingsChildTargetMajor-pc');
        const elModalMajorMob = document.getElementById('settingsChildTargetMajor');
        const elModalMajor = (elModalMajorPc && elModalMajorPc.offsetParent !== null) ? elModalMajorPc : (elModalMajorMob || elModalMajorPc);

        const elModalAllergiesPc = document.getElementById('settingsChildAllergies-pc');
        const elModalAllergiesMob = document.getElementById('settingsChildAllergies');
        const elModalAllergies = (elModalAllergiesPc && elModalAllergiesPc.offsetParent !== null) ? elModalAllergiesPc : (elModalAllergiesMob || elModalAllergiesPc);

        const elModalKor = document.getElementById('inputSettingsChildKor-pc') || document.getElementById('settingsChildKor-pc') || document.getElementById('settingsChildKor');
        const elModalEng = document.getElementById('inputSettingsChildEng-pc') || document.getElementById('settingsChildEng-pc') || document.getElementById('settingsChildEng');
        const elModalMath = document.getElementById('inputSettingsChildMath-pc') || document.getElementById('settingsChildMath-pc') || document.getElementById('settingsChildMath');
        const elModalSoc = document.getElementById('inputSettingsChildSoc-pc') || document.getElementById('settingsChildSoc-pc') || document.getElementById('settingsChildSoc');
        const elModalHis = document.getElementById('inputSettingsChildHis-pc') || document.getElementById('settingsChildHis-pc') || document.getElementById('settingsChildHis');
        const elModalSci = document.getElementById('inputSettingsChildSci-pc') || document.getElementById('settingsChildSci-pc') || document.getElementById('settingsChildSci');

        child.name = elModalName ? elModalName.value.trim() || '자녀' : '자녀';
        child.grade = elModalGrade ? elModalGrade.value : (child.grade || 'm2');
        child.targetMajor = elModalMajor ? elModalMajor.value.trim() : (child.targetMajor || '');
        const rawAllergies = elModalAllergies ? elModalAllergies.value.trim() : '';
        child.allergies = rawAllergies ? rawAllergies.split(',').map(s => s.trim()).filter(Boolean) : (child.allergies || []);
        child.korean = elModalKor ? parseInt(elModalKor.value) || 0 : (child.korean || 0);
        child.english = elModalEng ? parseInt(elModalEng.value) || 0 : (child.english || 0);
        child.math = elModalMath ? parseInt(elModalMath.value) || 0 : (child.math || 0);
        child.society = elModalSoc ? parseInt(elModalSoc.value) || 0 : (child.society || 80);
        child.history = elModalHis ? parseInt(elModalHis.value) || 0 : (child.history || 80);
        child.science = elModalSci ? parseInt(elModalSci.value) || 0 : (child.science || 80);

        // DB에 자녀 정보 및 성적 저장 (user_neis_profiles & user_student_grades)
        await saveChildProfileToSupabase(child);
        syncActiveChildWithOrchestrator(child);

        // 나이스(NEIS) 마이데이터 융합 진단 로컬 캐시도 함께 동기화
        const parsedGradeNum = parseInt(String(child.grade).replace(/\D/g, ''), 10) || 2;
        const avg6 = Math.round((child.korean + child.math + child.english + child.society + child.history + child.science) / 6);
        const neisProf = {
            isConnected: true,
            studentInfo: {
                name: child.name,
                schoolName: child.schoolName || '서운중학교',
                grade: parsedGradeNum,
                targetMajor: child.targetMajor || '일반 / 미정',
                allergies: child.allergies || []
            },
            grades: [
                { subject: '국어', rawScore: child.korean, writtenScore: child.korean, perfScore: child.korean, avg: 75.0, std: 14.0, achievement: calcAchievement(child.korean) },
                { subject: '수학', rawScore: child.math, writtenScore: child.math, perfScore: child.math, avg: 70.0, std: 16.0, achievement: calcAchievement(child.math) },
                { subject: '영어', rawScore: child.english, writtenScore: child.english, perfScore: child.english, avg: 72.0, std: 15.0, achievement: calcAchievement(child.english) },
                { subject: '사회', rawScore: child.society, writtenScore: child.society, perfScore: child.society, avg: 74.0, std: 14.0, achievement: calcAchievement(child.society) },
                { subject: '역사', rawScore: child.history, writtenScore: child.history, perfScore: child.history, avg: 73.0, std: 14.5, achievement: calcAchievement(child.history) },
                { subject: '과학', rawScore: child.science, writtenScore: child.science, perfScore: child.science, avg: 71.0, std: 15.0, achievement: calcAchievement(child.science) }
            ],
            schoolRecord: {
                strengths: ['수업 태도 우수', '자기주도 학습 적극성'],
                weaknesses: ['심화 서술형 문항 연습 권장'],
                competencyScores: { academic: avg6, majorSuitability: 82, community: 88 },
                keywords: ['성실성', '성장 잠재력']
            },
            schedule: [
                { type: 'exam', title: '중간고사 지필평가', date: '2026-10-15', detail: `${child.schoolName || '서운중학교'} 전 과목 지필평가` }
            ],
            attendance: { totalDays: 130, unexcusedAbsence: 0, unexcusedLateness: 0, status: '정상 (개근 유지 중)' },
            health: { papsGrade: 1, bmiStatus: '표준', todayMenu: [] }
        };
        try {
            localStorage.setItem('learnmap_neis_local_profile', JSON.stringify(neisProf));
        } catch(e) {}

        // 학업 진단 다시 실행 (선택된 학교가 있을 때)
        if (orchestrator.state.selectedSchool && typeof orchestrator.childPerformanceDiagnosis === 'function') {
            const result = orchestrator.childPerformanceDiagnosis(orchestrator.state.childProfile.scores);
            if (typeof renderDiagnosisResults === 'function') {
                renderDiagnosisResults(result);
            }
        }

        // 비교 보드 적합도 및 산출근거 실시간 갱신
        if (orchestrator.state.comparisonList.length > 0) {
            const comparisonTable = orchestrator.compareAgent.generateComparisonMatrix(orchestrator.state.comparisonList, orchestrator.state.childProfile.scores);
            renderComparisonBoard(comparisonTable);
        }

        // 자녀 선택 목록 옵션 텍스트 최신화
        refreshChildSelectUI();

        // 지도 추천 학교 및 자녀 맞춤 필터링 즉시 재실행
        if (typeof onMapAction === 'function') {
            onMapAction();
        }

        // NEIS 모달 및 진단 탭 콘텐츠 최신화 노출
        if (typeof window.renderNEISTabContent === 'function') {
            const activeTabBtn = document.querySelector('.neis-tab-btn.active');
            const curTab = activeTabBtn ? activeTabBtn.dataset.tab : 'grades';
            window.renderNEISTabContent(curTab);
        }

        alert('자녀 성적 정보가 성공적으로 저장되었습니다.');
    };
    if (btnSaveSettingsScores) btnSaveSettingsScores.addEventListener('click', onSaveSettingsScores);
    if (btnSaveSettingsScoresPc) btnSaveSettingsScoresPc.addEventListener('click', onSaveSettingsScores);

    // 초기 로딩 시 Supabase DB로부터 자녀 정보 및 성적 실시간 연동
    loadChildProfilesFromSupabase();

    const otherFilters = ['profileRecommendFilter', 'commuteRadiusFilter', 'trendUpwardCheckbox', 'filterClassSizePreset', 'filterStudentTrend', 'filterSpecialClass'];
    otherFilters.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                if (typeof window.resetSafeCommute === 'function') {
                    window.resetSafeCommute();
                }
                if (id === 'profileRecommendFilter') {
                    const profile = el.value;
                    const setVal = (sid, tid, val) => {
                        const s = document.getElementById(sid);
                        const t = document.getElementById(tid);
                        if (s && t) { s.value = val; t.innerText = val + '%'; }
                    };
                    if (profile === 'academic') {
                        setVal('envScoreRange', 'valEnvScore', 70);
                        setVal('envTeacherRange', 'valEnvTeacher', 10);
                        setVal('envViolenceRange', 'valEnvViolence', 10);
                        setVal('envBudgetRange', 'valEnvBudget', 10);
                    } else if (profile === 'balanced') {
                        setVal('envScoreRange', 'valEnvScore', 40);
                        setVal('envTeacherRange', 'valEnvTeacher', 30);
                        setVal('envViolenceRange', 'valEnvViolence', 20);
                        setVal('envBudgetRange', 'valEnvBudget', 10);
                    } else if (profile === 'safety') {
                        setVal('envScoreRange', 'valEnvScore', 10);
                        setVal('envTeacherRange', 'valEnvTeacher', 30);
                        setVal('envViolenceRange', 'valEnvViolence', 50);
                        setVal('envBudgetRange', 'valEnvBudget', 10);
                    }
                } else if (id === 'commuteRadiusFilter') {
                    if (el.value === 'off') {
                        commuteCenter = null;
                        if (commuteCenterMarker) {
                            commuteCenterMarker.setMap(null);
                            commuteCenterMarker = null;
                        }
                    }
                }
                onMapAction();
            });
        }
    });

    // 사이드바 내부 신규 학원 등록 요청 제출 버튼 바인딩
    const btnSubmitSidebarAca = document.getElementById('btnSubmitSidebarAca');
    if (btnSubmitSidebarAca) {
        btnSubmitSidebarAca.addEventListener('click', async () => {
            const name = document.getElementById('sidebarAcaName').value.trim();
            const address = document.getElementById('sidebarAcaAddress').value.trim();
            const type = document.getElementById('sidebarAcaType').value;
            const contact = document.getElementById('sidebarAcaContact').value.trim();
            const comments = document.getElementById('sidebarAcaComments').value.trim();

            if (!name || !address || !type) {
                alert('필수 항목(*)을 모두 입력해 주세요.');
                return;
            }

            const payload = {
                academyName: name,
                address: address,
                academyType: type,
                contact: contact,
                comments: comments
            };

            try {
                const response = await fetch('/api/academy-register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    alert('신규 학원 등록 제보가 성공적으로 제출되었습니다. 데이터 검토 후 신속히 반영해 드리겠습니다.');
                    // 폼 초기화
                    document.getElementById('sidebarAcaName').value = '';
                    document.getElementById('sidebarAcaAddress').value = '';
                    document.getElementById('sidebarAcaType').value = '';
                    document.getElementById('sidebarAcaContact').value = '';
                    document.getElementById('sidebarAcaComments').value = '';
                    // 웰컴 카드로 이동
                    if (typeof window.closeInquiryCard === 'function') {
                        window.closeInquiryCard('academyRegisterCard');
                    } else {
                        document.getElementById('academyRegisterCard').style.display = 'none';
                        document.getElementById('welcomeCard').style.display = 'block';
                    }
                } else {
                    alert('등록 요청 처리 중 서버 오류가 발생했습니다.');
                }
            } catch (err) {
                console.error(err);
                alert('네트워크 오류가 발생했습니다.');
            }
        });
    }

    // 잘못된 정보 수정 요청 제출 버튼 바인딩
    const btnSubmitSidebarEdit = document.getElementById('btnSubmitSidebarEdit');
    if (btnSubmitSidebarEdit) {
        btnSubmitSidebarEdit.addEventListener('click', async () => {
            const targetName = document.getElementById('sidebarEditTargetName').value.trim();
            const details = document.getElementById('sidebarEditDetails').value.trim();
            const contact = document.getElementById('sidebarEditContact').value.trim();

            if (!targetName || !details) {
                alert('필수 항목(*)을 모두 입력해 주세요.');
                return;
            }

            const payload = {
                targetName: targetName,
                details: details,
                contact: contact
            };

            try {
                const response = await fetch('/api/info-edit-request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    alert('정보 수정 요청이 제출되었습니다. 검토 후 신속하게 조치하겠습니다.');
                    document.getElementById('sidebarEditTargetName').value = '';
                    document.getElementById('sidebarEditDetails').value = '';
                    document.getElementById('sidebarEditContact').value = '';
                    if (typeof window.closeInquiryCard === 'function') {
                        window.closeInquiryCard('infoEditRequestCard');
                    } else {
                        document.getElementById('infoEditRequestCard').style.display = 'none';
                        document.getElementById('welcomeCard').style.display = 'block';
                    }
                } else {
                    alert('제출 중 서버 오류가 발생했습니다.');
                }
            } catch (err) {
                console.error(err);
                alert('네트워크 오류가 발생했습니다.');
            }
        });
    }

    // 광고 및 제휴 문의 제출 버튼 바인딩
    const btnSubmitSidebarAd = document.getElementById('btnSubmitSidebarAd');
    if (btnSubmitSidebarAd) {
        btnSubmitSidebarAd.addEventListener('click', async () => {
            const company = document.getElementById('sidebarAdCompanyName').value.trim();
            const contact = document.getElementById('sidebarAdContact').value.trim();
            const details = document.getElementById('sidebarAdDetails').value.trim();

            if (!company || !contact || !details) {
                alert('필수 항목(*)을 모두 입력해 주세요.');
                return;
            }

            const payload = {
                companyName: company,
                contact: contact,
                details: details
            };

            try {
                const response = await fetch('/api/ad-inquiry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    alert('광고 및 제휴 문의가 제출되었습니다. 확인 후 메일이나 연락처로 답변을 드리겠습니다.');
                    document.getElementById('sidebarAdCompanyName').value = '';
                    document.getElementById('sidebarAdContact').value = '';
                    document.getElementById('sidebarAdDetails').value = '';
                    if (typeof window.closeInquiryCard === 'function') {
                        window.closeInquiryCard('adInquiryCard');
                    } else {
                        document.getElementById('adInquiryCard').style.display = 'none';
                        document.getElementById('welcomeCard').style.display = 'block';
                    }
                } else {
                    alert('제출 중 서버 오류가 발생했습니다.');
                }
            } catch (err) {
                console.error(err);
                alert('네트워크 오류가 발생했습니다.');
            }
        });
    }

    // 도움말 및 CSV 내보내기 버튼 이벤트 연동
    const btnExportCSV = document.getElementById('btnExportCSV');
    const btnShowTutorial = document.getElementById('btnShowTutorial');
    const tutorialModal = document.getElementById('tutorialModal');

    window.switchTutorialTab = function(tabId) {
        const buttons = document.querySelectorAll('.tutorial-tab-btn');
        buttons.forEach(btn => {
            btn.style.background = '#f1f3f5';
            btn.style.color = 'var(--text-muted)';
        });
        
        const activeBtn = document.getElementById(`tab-${tabId}`);
        if (activeBtn) {
            activeBtn.style.background = 'var(--primary-blue)';
            activeBtn.style.color = 'white';
        }
        
        const panels = document.querySelectorAll('.tutorial-tab-panel');
        panels.forEach(p => p.style.display = 'none');
        
        const targetPanel = document.getElementById(`panel-${tabId}`);
        if (targetPanel) {
            targetPanel.style.display = 'flex';
        }
    };

    window.closeTutorialSidebar = function() {
        const tutorialCard = document.getElementById('tutorialSidebarCard');
        if (tutorialCard) tutorialCard.style.display = 'none';
    };

    if (btnShowTutorial) {
        btnShowTutorial.addEventListener('click', () => {
            const tutorialCard = document.getElementById('tutorialSidebarCard');
            const settingsModal = document.getElementById('settingsModal');
            
            // 도움말을 켤 때 설정창은 닫음
            if (settingsModal) {
                settingsModal.style.display = 'none';
            }
            
            if (tutorialCard) {
                if (tutorialCard.style.display === 'block') {
                    tutorialCard.style.display = 'none';
                } else {
                    tutorialCard.style.display = 'block';
                    window.switchTutorialTab('all'); // 기본값으로 전체 사용법 탭 선택
                }
            }
        });
    }

    if (btnExportCSV) {
        btnExportCSV.addEventListener('click', () => {
            if (!orchestrator.state.selectedSchool) {
                alert('선택된 학교가 없습니다.');
                return;
            }
            exportSchoolToCSV(orchestrator.state.selectedSchool);
        });
    }

    // 이사 시뮬레이션 및 동 단위 학군 레이팅 이벤트 바인딩
    const btnOpenSimulation = document.getElementById('btnOpenSimulation');
    const simulationModal = document.getElementById('simulationModal');
    const btnRunSimulation = document.getElementById('btnRunSimulation');

    if (btnOpenSimulation && simulationModal) {
        btnOpenSimulation.addEventListener('click', () => {
            if (typeof resetSafeCommute === 'function') resetSafeCommute();
            simulationModal.style.display = 'flex';
            document.getElementById('simulationResultPanel').style.display = 'none';
            initSimulationDropdowns(); // 모달 오픈 시 드롭다운 초기화
        });
    }

    if (btnRunSimulation) {
        btnRunSimulation.addEventListener('click', () => {
            const sidoA = document.getElementById('simSidoA').value;
            const gugunA = document.getElementById('simGugunA').value;
            const dongA = document.getElementById('simDongA').value;

            const sidoB = document.getElementById('simSidoB').value;
            const gugunB = document.getElementById('simGugunB').value;
            const dongB = document.getElementById('simDongB').value;

            if (!sidoA || !gugunA || !dongA || !sidoB || !gugunB || !dongB) {
                alert("두 후보 지역의 시도, 구군, 동을 모두 선택해 주세요.");
                return;
            }

            const valA = `${sidoA} ${gugunA} ${dongA}`;
            const valB = `${sidoB} ${gugunB} ${dongB}`;
            runMovingSimulation(valA, valB, dongA, dongB);
        });
    }

    const dongRatingCheckbox = document.getElementById('dongRatingCheckbox');
    if (dongRatingCheckbox) {
        dongRatingCheckbox.addEventListener('change', () => {
            if (dongRatingCheckbox.checked) {
                renderDistrictRatings();
                // 히트맵 시 지도 핀들 임시 제거
                mapMarkers.forEach(item => {
                    if (item.marker) item.marker.setMap(null);
                    else item.setMap(null);
                });
                mapMarkers = [];
                if (clusterer) clusterer.clear();
                const pinsContainer = document.getElementById('pinsContainer');
                if (pinsContainer) pinsContainer.innerHTML = '';
            } else {
                clearDistrictRatings();
                onMapAction();
            }
        });
    }

    function exportSchoolToCSV(school) {
        const headers = ['지표명', '상세 값'];
        const rows = [
            ['학교명', school.school_name],
            ['학교급', school.school_type],
            ['지역', school.region],
            ['주소', school.address],
            ['학생수', `${school.student_count}명`],
            ['학급당 학생수', `${school.class_avg_size}명`],
            ['국어 평균점수', `${school.subjects.korean.avg}점`],
            ['영어 평균점수', `${school.subjects.english.avg}점`],
            ['수학 평균점수', `${school.subjects.math.avg}점`],
            ['종합 가중평균', `${school.weightedAvg ?? '-'}점`],
            ['창체 활동비', `${school.extracurricular_budget ?? 0}만원`],
            ['학교폭력 건수(연)', `${school.violence_stats ? school.violence_stats.total_cases : 0}건`],
            ['종합 교육환경 스코어', `${school.envScore ?? '-'}점`],
        ];

        let csvContent = "\uFEFF"; // UTF-8 BOM
        csvContent += headers.join(',') + '\n';
        rows.forEach(row => {
            csvContent += row.map(val => `"${val}"`).join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `학업진단보고서_${school.school_name}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Event Listeners
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    regionFilter.addEventListener('change', () => {
        if (typeof resetSafeCommute === 'function') resetSafeCommute();
        onRegionFilterChange();
        // 지도가 이동한 후 영역 내 학교를 표시하기 위해 약간의 지연 후 호출
        setTimeout(onMapAction, 150);
    });
    schoolTypeFilter.addEventListener('change', () => {
        if (typeof resetSafeCommute === 'function') resetSafeCommute();
        onMapAction();
    });

    btnCompareChild.addEventListener('click', () => {
        // 자녀 선택 UI 목록 갱신
        refreshChildSelectUI();

        // 이미 저장된 성적 데이터가 있는지 확인
        const scores = orchestrator.state.childProfile.scores;
        
        // 성적이 아예 입력된 적이 없거나 모두 0인 경우 방어 처리
        const hasSavedScores = scores && (scores.korean > 0 || scores.english > 0 || scores.math > 0);
        
        if (!hasSavedScores) {
            alert('⚙️ 자녀의 최근 시험 성적 정보를 먼저 저장해 주세요.');
            if (typeof window.openChildSettingsModal === 'function') {
                window.openChildSettingsModal();
            } else {
                const settingsModal = document.getElementById('settingsModal');
                if (settingsModal) {
                    settingsModal.style.display = 'block';
                }
            }
            return;
        }

        // 저장된 성적으로 즉시 분석 수행
        const result = orchestrator.childPerformanceDiagnosis(scores);
        
        // Reset compare region dropdown to selected school's region
        const defaultRegion = orchestrator.state.selectedSchool ? orchestrator.state.selectedSchool.region : '서울특별시';
        const elCompareRegion = document.getElementById('selCompareRegion');
        if (elCompareRegion) {
            elCompareRegion.value = defaultRegion;
        }

        if (typeof renderDiagnosisResults === 'function') {
            renderDiagnosisResults(result);
        }

        // 사이드바의 입력 폼을 생략하고 바로 결과 카드를 노출
        schoolCard.style.display = 'none';
        childFormCard.style.display = 'none';
        diagnosisResultCard.style.display = 'block';
    });

    btnBackToSchool.addEventListener('click', () => {
        childFormCard.style.display = 'none';
        schoolCard.style.display = 'block';
    });

    btnBackToForm.addEventListener('click', () => {
        const btnOpenSettings = document.getElementById('btnOpenSettings');
        if (btnOpenSettings) {
            btnOpenSettings.click();
        } else {
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) {
                settingsModal.style.display = 'block';
            }
        }
    });

    if (btnCloseAnalysis) {
        btnCloseAnalysis.addEventListener('click', () => {
            diagnosisResultCard.style.display = 'none';
            schoolCard.style.display = 'block';
        });
    }

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

        // 성적 정보가 갱신되면 비교보드에 들어가 있는 학교들의 적합도도 실시간 갱신 처리
        if (orchestrator.state.comparisonList.length > 0) {
            const comparisonTable = orchestrator.compareAgent.generateComparisonMatrix(orchestrator.state.comparisonList, orchestrator.state.childProfile.scores);
            renderComparisonBoard(comparisonTable);
        }
    });

    let isCompareBoardAdding = false;
    const handleCompareBoardAdd = async (e) => {
        if (e) {
            e.stopPropagation();
        }
        if (isCompareBoardAdding) return;
        isCompareBoardAdding = true;
        
        try {
            if (!orchestrator.state.selectedSchool) {
                isCompareBoardAdding = false;
                return;
            }
            
            const exists = orchestrator.state.comparisonList.some(s => {
                const sId = s.school_id || s.id;
                const selId = orchestrator.state.selectedSchool.school_id || orchestrator.state.selectedSchool.id;
                if (!sId || !selId) return false;
                return String(sId) === String(selId);
            });
            
            if (window.innerWidth <= 1024) {
                // 모바일 환경: 모달창을 띄우지 않고 마이페이지의 '비교중인 학교' 탭으로 즉시 전환
                if (exists) {
                    alert('이미 비교 보드에 추가된 학교입니다.');
                } else {
                    const res = orchestrator.addToComparison(orchestrator.state.selectedSchool);
                    if (res.success) {
                        updateCompareFloatingButton();
                        // 대기시간 없이 즉시 메모리 목록 기준으로 모바일 마이페이지 갱신
                        if (typeof window.updateMypageComparisonUI === 'function') {
                            window.updateMypageComparisonUI(orchestrator.state.comparisonList);
                        }
                        
                        if (await confirm('비교보드에 추가되었습니다. 이동하시겠습니까?')) {
                            // 마이페이지 탭 활성화
                            const mypageTabBtn = document.querySelector('.mobile-bottom-nav .nav-item[onclick*="mypage"]');
                            if (typeof window.onMobileNavClick === 'function') {
                                window.onMobileNavClick('mypage', mypageTabBtn);
                            }
                            
                            // 비교 아코디언 강제 오픈
                            const compArrow = document.getElementById('mypageAccordionArrow-comparison');
                            const compContent = document.getElementById('mypageAccordionContent-comparison');
                            if (compArrow && compContent) {
                                compArrow.innerText = '▲';
                                compContent.style.display = 'block';
                            }
                            
                            // 아코디언 개방 직후 메모리 리스트 기준으로 지연 렌더링 한 번 더 확인 조율
                            if (typeof window.updateMypageComparisonUI === 'function') {
                                setTimeout(() => window.updateMypageComparisonUI(orchestrator.state.comparisonList), 150);
                            }
                        }
                    } else {
                        alert(res.message);
                    }
                }
            } else {
                // PC 환경: 기존 모달창 노출 유지
                if (exists) {
                    const comparisonTable = orchestrator.compareAgent.generateComparisonMatrix(orchestrator.state.comparisonList, orchestrator.state.childProfile.scores);
                    renderComparisonBoard(comparisonTable);
                    compareOverlay.style.display = 'flex';
                    updateCompareFloatingButton();
                } else {
                    const res = orchestrator.addToComparison(orchestrator.state.selectedSchool);
                    if (res.success) {
                        renderComparisonBoard(res.data);
                        compareOverlay.style.display = 'flex';
                        updateCompareFloatingButton();
                    } else {
                        alert(res.message);
                    }
                }
            }
        } catch (err) {
            console.error("Error in handleCompareBoardAdd:", err);
            alert("비교보드 추가 중 오류가 발생했습니다: " + err.message);
        } finally {
            // 중복 클릭 해제용 딜레이 부여
            setTimeout(() => {
                isCompareBoardAdding = false;
            }, 300);
        }
    };

    if (btnCompareBoard) {
        btnCompareBoard.addEventListener('click', handleCompareBoardAdd);
        btnCompareBoard.addEventListener('touchstart', handleCompareBoardAdd, { passive: true });
    }

    btnCloseCompare.addEventListener('click', () => {
        compareOverlay.style.display = 'none';
        updateCompareFloatingButton();
    });

    function updateCompareFloatingButton() {
        const count = (orchestrator && orchestrator.state && orchestrator.state.comparisonList) 
            ? orchestrator.state.comparisonList.length 
            : 0;
        const isOverlayVisible = compareOverlay && compareOverlay.style.display !== 'none';
        
        if (btnOpenCompareFloating) {
            if (window.innerWidth <= 1024) {
                btnOpenCompareFloating.style.display = 'none';
            } else {
                if (count > 0 && !isOverlayVisible) {
                    btnOpenCompareFloating.style.display = 'flex';
                    if (compareCountBadge) {
                        compareCountBadge.innerText = count;
                    }
                } else {
                    btnOpenCompareFloating.style.display = 'none';
                }
            }
        }

            if (typeof window.updateMypageComparisonUI === 'function') {
                window.updateMypageComparisonUI();
            }
    }
    window.updateCompareFloatingButton = updateCompareFloatingButton;

    if (btnOpenCompareFloating) {
        btnOpenCompareFloating.addEventListener('click', () => {
            const comparisonTable = orchestrator.compareAgent.generateComparisonMatrix(orchestrator.state.comparisonList, orchestrator.state.childProfile.scores);
            renderComparisonBoard(comparisonTable);
            if (compareOverlay) {
                compareOverlay.style.display = 'flex';
            }
            updateCompareFloatingButton();
        });
    }

    if (btnClearCompare) {
        btnClearCompare.addEventListener('click', async () => {
            if (await confirm('비교 보드에 담긴 모든 학교를 삭제하시겠습니까?')) {
                orchestrator.state.comparisonList = [];
                try {
                    localStorage.setItem('learnmap_comparison_list', JSON.stringify([]));
                } catch (err) {
                    console.error('Failed to sync comparisonList to localStorage', err);
                }
                if (compareOverlay) {
                    compareOverlay.style.display = 'none';
                }
                updateCompareFloatingButton();
            }
        });
    }

    if (btnShowReviews) {
        btnShowReviews.addEventListener('click', () => {
            if (!orchestrator.state.selectedSchool) return;
            document.getElementById('schoolReviewListModal').style.display = 'flex';
            fetchSchoolReviews(orchestrator.state.selectedSchool.school_id);
        });
    }

    // --- School Review Rating & Escape Logic ---
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

    // Initialize school review star container triggers inside DOMContentLoaded
    const schoolStarContainer = document.getElementById('schoolStarContainer');
    if (schoolStarContainer) {
        const stars = schoolStarContainer.querySelectorAll('span');
        const ratingInput = document.getElementById('schoolReviewRating');
        let currentVal = ratingInput ? parseInt(ratingInput.value) || 5 : 5;
        
        function updateSchoolStars(val) {
            stars.forEach(s => {
                const starVal = parseInt(s.getAttribute('data-val'));
                s.style.color = starVal <= val ? '#FFB800' : '#e4e4e7';
                s.style.transform = starVal <= val ? 'scale(1.1)' : 'scale(1)';
                s.style.textShadow = starVal <= val ? '0 0 10px rgba(255,184,0,0.3)' : 'none';
            });
        }
        updateSchoolStars(currentVal);
        
        stars.forEach(star => {
            star.addEventListener('mouseover', () => updateSchoolStars(parseInt(star.getAttribute('data-val'))));
            star.addEventListener('mouseout', () => updateSchoolStars(currentVal));
            star.addEventListener('click', () => {
                currentVal = parseInt(star.getAttribute('data-val'));
                if (ratingInput) ratingInput.value = currentVal;
                updateSchoolStars(currentVal);
            });
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

        let html = currentData.map(review => {
            const safeNickname = escapeHtml(review.nickname || '익명');
            const safeContent = escapeHtml(review.content || '').replace(/\n/g, '<br>');
            const rawRating = parseInt(review.rating) || 5;
            const starsHtml = '★'.repeat(rawRating) + '☆'.repeat(Math.max(0, 5 - rawRating));
            const formattedDate = review.created_at ? new Date(review.created_at).toLocaleDateString() : '';

            return `
                <div style="border-bottom: 1px solid var(--border-color); padding: 12px 0; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <strong>${safeNickname}</strong>
                        <span style="color: var(--warning-yellow);">${starsHtml}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">
                        ${formattedDate}
                    </div>
                    <div style="font-size: 13px; line-height: 1.5;">
                        ${safeContent}
                    </div>
                </div>
            `;
        }).join('');

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

        // --- XSS 및 스크립트 해킹 차단 로직 (추가됨) ---
        const xssPattern = /<script[^>]*>|onload|onerror|onclick|onmouseover|onfocus|onblur|onchange|onsubmit|onkeydown|onkeypress|onkeyup|javascript:|expression\(|<img|<iframe|<object|<embed|fetch\s*\(|xmlhttprequest/gi;
        if (xssPattern.test(content) || xssPattern.test(nickname)) {
            alert('보안 경고: 허용되지 않는 문자나 스크립트(HTML 태그, 이벤트 핸들러 등)가 포함되어 있습니다.');
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
    currentLoadedSchools = []; // Cache for currently loaded school data
    let schoolsDatabase = []; // In-memory database of all schools fetched from backend
    let schoolsLoadPromise = null;
    let commuteCircle = null; // 통학 반경 시각화용 원 객체
    let commuteCenter = null; // 통학 분석 기준 중심점 LatLng
    window.getCommuteCenter = () => commuteCenter;
    let commuteCenterMarker = null; // 통학 분석 기준 중심점 마커
    let lastMapCenter = null; // 마지막 지도 중심 좌표 캐시
    let lastDetectedRegion = null; // 마지막 감지된 시도 지역명 캐시
    let districtRatingOverlays = []; // 동 단위 학군 레이팅 오버레이 목록
    let isCompareDetailed = false; // 비교 보드 테이블/차트 상세 모드 여부

    const diagnosticLog = document.getElementById('diagnosticLog');
    function logDiagnostic(msg) {
        if (diagnosticLog) {
            diagnosticLog.innerHTML += `[${new Date().toLocaleTimeString()}] ${msg}<br>`;
            diagnosticLog.scrollTop = diagnosticLog.scrollHeight;
        }
        console.log(msg);
    }

    // 1. Dynamic Kakao SDK Loader (Multi-tier key loader: Server API -> Supabase DB -> Local config.json -> Fallback)
    function loadKakaoSdk() {
        return new Promise(async (resolve) => {
            logDiagnostic('백엔드/데이터베이스로부터 Kakao Maps API 키 조회 중...');
            let appkey = '';
            let shareAppkey = '';
            let safemapKey = '';

            // 1) /api/config/map-key 백엔드 API 시도
            try {
                const res = await fetch('/api/config/map-key');
                const contentType = res.headers.get('content-type');
                if (res.ok && contentType && contentType.includes('application/json')) {
                    const data = await res.json();
                    if (data.kakao_app_key) {
                        appkey = data.kakao_app_key;
                        shareAppkey = data.kakao_share_app_key;
                        safemapKey = data.safemap_key;
                    }
                }
            } catch (e) {
                console.warn('[SDK Loader] /api/config/map-key 조회 실패:', e);
            }

            // 2) Supabase DB 직접 조회 시도
            if (!appkey) {
                try {
                    const SUPABASE_URL = 'https://khwzgqnwlknawggugznd.supabase.co';
                    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pncW53bGtuYXdnZ3Vnem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDQzNDksImV4cCI6MjA5NTc4MDM0OX0.P2g3Y_MYV_ca8ZRpfAT93pnEzP4osYWc2tfyBHKb7v4';
                    const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/api_configs?id=eq.1`, {
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`
                        }
                    });
                    if (supaRes.ok) {
                        const supaData = await supaRes.json();
                        if (supaData && supaData.length > 0 && supaData[0].kakao_app_key) {
                            appkey = supaData[0].kakao_app_key;
                            shareAppkey = supaData[0].kakao_share_app_key;
                            safemapKey = supaData[0].safemap_key;
                        }
                    }
                } catch (supaErr) {
                    console.warn('[SDK Loader] Supabase DB 키 조회 실패:', supaErr);
                }
            }

            // 3) 로컬 config.json 파일 조회 시도
            if (!appkey) {
                try {
                    const configRes = await fetch('./config.json');
                    const contentType = configRes.headers.get('content-type');
                    if (configRes.ok && contentType && contentType.includes('application/json')) {
                        const configData = await configRes.json();
                        if (configData.kakao_app_key) {
                            appkey = configData.kakao_app_key;
                            shareAppkey = configData.kakao_share_app_key;
                            safemapKey = configData.safemap_key;
                        }
                    }
                } catch (configErr) {
                    console.warn('[SDK Loader] config.json 조회 실패:', configErr);
                }
            }

            // 4) 기본 카카오 앱 키 폴백
            if (!appkey) {
                appkey = "a1395655b7d4904b57ff20a90998c001";
            }

            window.GLOBAL_KAKAO_APP_KEY = appkey;
            window.GLOBAL_KAKAO_SHARE_APP_KEY = shareAppkey || "3a00cd76a8e0492b9271a21aa2c37994";
            window.GLOBAL_SAFEMAP_KEY = safemapKey || "8N7ELUCO-8N7E-8N7E-8N7E-8N7ELUCOQY";

            logDiagnostic(`Kakao Maps SDK 스크립트 삽입 중... (AppKey: ${appkey.substring(0, 6)}***)`);
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
                            level: 6 // 기본 500m 축척 유지
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

                        kakao.maps.event.addListener(clusterer, 'clusterclick', (cluster) => {
                            const level = kakaoMap.getLevel() - 1;
                            kakaoMap.setLevel(level, { anchor: cluster.getCenter() });
                        });

                        // Register Map Interaction events
                        kakao.maps.event.addListener(kakaoMap, 'dragend', () => {
                            onMapAction();
                            if (compareOverlay) {
                                compareOverlay.style.display = 'none';
                                updateCompareFloatingButton();
                            }
                        });
                        kakao.maps.event.addListener(kakaoMap, 'zoom_changed', () => {
                            onMapAction();
                        });
                        kakao.maps.event.addListener(kakaoMap, 'click', (mouseEvent) => {
                            if (compareOverlay && compareOverlay.style.display !== 'none') {
                                compareOverlay.style.display = 'none';
                                updateCompareFloatingButton();
                            }
                            
                            if (window.mapClickMode === 'setStart') {
                                window.customCommuteStart = mouseEvent.latLng;
                                window.mapClickMode = 'none';

                                const chkCommute = document.getElementById('chkCommutePath');
                                const chkCommuteAca = document.getElementById('chkCommutePathAcademy');
                                const panelSettings = document.getElementById('commutePathSettings');
                                if (chkCommute) chkCommute.checked = true;
                                if (chkCommuteAca) chkCommuteAca.checked = true;
                                if (panelSettings) panelSettings.style.display = 'flex';

                                if (orchestrator.state.selectedSchool) {
                                    window.updateMapLayers(orchestrator.state.selectedSchool);
                                }
                                if (typeof window.updatePointSelectorButtons === 'function') {
                                    window.updatePointSelectorButtons();
                                }
                                if (typeof window.hideMobileMapSelectGuide === 'function') {
                                    window.hideMobileMapSelectGuide();
                                }

                                const container = document.querySelector('.app-container');
                                if (window.innerWidth <= 1024) {
                                    if (container) container.classList.remove('sidebar-open');
                                } else {
                                    if (container) container.classList.add('sidebar-open');
                                }

                                const guideEl = document.getElementById('commutePathSafetyGuide');
                                if (guideEl) guideEl.style.display = 'flex';

                                if (typeof window.showMobileCommuteResultGuide === 'function') {
                                    window.showMobileCommuteResultGuide();
                                }
                                return;
                            } else if (window.mapClickMode === 'setEnd') {
                                window.customCommuteEnd = mouseEvent.latLng;
                                window.mapClickMode = 'none';
                                if (orchestrator.state.selectedSchool) {
                                    window.updateMapLayers(orchestrator.state.selectedSchool);
                                }
                                if (typeof window.updatePointSelectorButtons === 'function') {
                                    window.updatePointSelectorButtons();
                                }
                                if (window.innerWidth <= 1024) {
                                    const container = document.querySelector('.app-container');
                                    if (container) container.classList.remove('sidebar-open');
                                    if (typeof window.showMobileCommuteResultGuide === 'function') {
                                        window.showMobileCommuteResultGuide();
                                    }
                                }
                                return;
                            }
                            
                            const commuteMode = document.getElementById('commuteRadiusFilter').value;
                            if (commuteMode !== 'off') {
                                commuteCenter = mouseEvent.latLng;
                                onMapAction();
                            }
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

    // 3. Load Schools Database with Multi-Tier Fallback (Local static JSON -> Server API -> Supabase REST API)
    async function loadSchoolsDatabase() {
        // 1) 로컬 static JSON 파일 우선 시도 (빠르고 404 콘솔 에러 없음)
        const pathsToTry = [
            './src/data/schools_seoul.json',
            './data/schools_seoul.json',
            '/src/data/schools_seoul.json',
            '/data/schools_seoul.json'
        ];
        for (const p of pathsToTry) {
            try {
                logDiagnostic('로컬 static JSON 파일로부터 학교 데이터 로딩 중...');
                const localResp = await fetch(p);
                const contentType = localResp.headers.get('content-type') || '';
                if (localResp.ok && !contentType.includes('text/html')) {
                    const text = await localResp.text();
                    if (text && !text.trim().startsWith('<')) {
                        const parsed = JSON.parse(text);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            schoolsDatabase = parsed;
                            window.schoolsDatabase = parsed;
                            window.allSchoolsCache = parsed;
                            logDiagnostic(`데이터베이스 로드 완료 (로컬 JSON). 총 학교 수: ${schoolsDatabase.length}개`);
                            return;
                        }
                    }
                }
            } catch (err) {
                // 다음 경로 시도
            }
        }

        // 2) /api/schools 백엔드 API 시도 (로컬 static JSON 없을 때만)
        try {
            logDiagnostic('서버로부터 최신 학교 데이터베이스 로딩 중...');
            const response = await fetch('/api/schools');
            const contentType = response.headers.get('content-type');
            if (response.ok && contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    schoolsDatabase = data;
                    window.schoolsDatabase = data;
                    window.allSchoolsCache = data;
                    logDiagnostic(`데이터베이스 로드 완료 (서버 API). 총 학교 수: ${schoolsDatabase.length}개`);
                    return;
                }
            }
        } catch (e) {
            console.warn('[DB Loader] /api/schools 백엔드 조회 실패:', e);
        }

        // 3) Supabase REST API 직접 조회 시도 (폴백)
        try {
            logDiagnostic('Supabase DB로부터 학교 데이터베이스 로딩 시도 중...');
            const SUPABASE_URL = 'https://khwzgqnwlknawggugznd.supabase.co';
            const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pncW53bGtuYXdnZ3Vnem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDQzNDksImV4cCI6MjA5NTc4MDM0OX0.P2g3Y_MYV_ca8ZRpfAT93pnEzP4osYWc2tfyBHKb7v4';
            const supaResp = await fetch(`${SUPABASE_URL}/rest/v1/schools_seoul?select=*&limit=3000`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });
            if (supaResp.ok) {
                const supaSchools = await supaResp.json();
                if (Array.isArray(supaSchools) && supaSchools.length > 0) {
                    schoolsDatabase = supaSchools;
                    window.schoolsDatabase = supaSchools;
                    window.allSchoolsCache = supaSchools;
                    logDiagnostic(`데이터베이스 로드 완료 (Supabase). 총 학교 수: ${schoolsDatabase.length}개`);
                    return;
                }
            }
        } catch (supaErr) {
            console.warn('[DB Loader] Supabase 학교 데이터 조회 실패:', supaErr);
        }
    }

    function hideLoadingOverlay() {
        const overlay = document.getElementById('mapLoadingOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 400); // fade out 애니메이션 속도
        }
    }

    // Dynamic Startup Flow
    loadKakaoSdk().then((success) => {
        if (success) {
            initMap().then(() => {
                schoolsLoadPromise = loadSchoolsDatabase();
                schoolsLoadPromise.then(() => {
                    logDiagnostic('지도 및 로컬 DB 연동 완료.');
                    window.schoolsDatabase = schoolsDatabase;
                    window.allSchoolsCache = schoolsDatabase;
                    onMapAction();
                    if (typeof window.centerMapOnChildSchool === 'function') {
                        window.centerMapOnChildSchool();
                    }
                    updateCompareFloatingButton();
                    hideLoadingOverlay();
                    if (typeof window.checkAndOpenDeepLinkFromURL === 'function') {
                        window.checkAndOpenDeepLinkFromURL();
                    }
                });
            });
        } else {
            logDiagnostic('오프라인 대체 모드로 시뮬레이션을 작동합니다.');
            schoolsLoadPromise = loadSchoolsDatabase();
            schoolsLoadPromise.then(() => {
                window.schoolsDatabase = schoolsDatabase;
                window.allSchoolsCache = schoolsDatabase;
                renderPins(schoolsDatabase.slice(0, 10), false);
                updateCompareFloatingButton();
                hideLoadingOverlay();
                if (typeof window.checkAndOpenDeepLinkFromURL === 'function') {
                    window.checkAndOpenDeepLinkFromURL();
                }
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
            kakaoMap.setLevel(target.level + (window.innerWidth <= 1024 ? 1 : 0));
        }
    }

    // 4. Memory-based School Search
    async function performSearch(overrideQuery) {
        if (typeof resetSafeCommute === 'function') resetSafeCommute();
        const query = (overrideQuery !== undefined && !(overrideQuery instanceof Event)) ? overrideQuery : searchInput.value;
        
        if (typeof query === 'string' && query.trim() === '') {
            alert("검색어를 입력해주세요.");
            return;
        }
        
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
        const zoomLevel = kakaoMap.getLevel();
        orchestrator.state.filters.schoolType = schoolTypeFilter ? schoolTypeFilter.value : 'middle';

        lastMapCenter = center;

        const targetRegion = (regionFilter && regionFilter.value) ? regionFilter.value : '서울특별시';
        lastDetectedRegion = targetRegion;
        
        // 지오코더 지연 없이 즉시 동기적 핀 마크 렌더링 수행
        _renderMapForRegion(zoomLevel, targetRegion);

        if (geocoder && typeof geocoder.coord2RegionCode === 'function') {
            geocoder.coord2RegionCode(center.getLng(), center.getLat(), (result, status) => {
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
                            if (regionFilter && Array.from(regionFilter.options).some(opt => opt.value === mapped)) {
                                if (regionFilter.value !== mapped) {
                                    regionFilter.value = mapped;
                                    _renderMapForRegion(zoomLevel, mapped);
                                }
                            }
                            break;
                        }
                    }
                }
            });
        }
    }
    window.onMapAction = onMapAction;

    // 학부모 맞춤 필터 및 가중치 기반 학교 필터링 함수
    function filterSchools(schools, selectedRegion, typeLabel, isClusterMode = false) {
        const curLevel = parseFloat(document.getElementById('currentLevelRange').value);
        const tarLevel = parseFloat(document.getElementById('targetLevelRange').value);
        
        const wKor = parseFloat(document.getElementById('weightKorRange').value) / 10;
        const wEng = parseFloat(document.getElementById('weightEngRange').value) / 10;
        const wMath = parseFloat(document.getElementById('weightMathRange').value) / 10;
        const sumW = wKor + wEng + wMath;

        const pScore = parseFloat(document.getElementById('envScoreRange').value) / 100;
        const pTeacher = parseFloat(document.getElementById('envTeacherRange').value) / 100;
        const pViolence = parseFloat(document.getElementById('envViolenceRange').value) / 100;
        const pBudget = parseFloat(document.getElementById('envBudgetRange').value) / 100;

        const profile = document.getElementById('profileRecommendFilter').value;
        const commuteMode = document.getElementById('commuteRadiusFilter').value;
        const showTrendUpward = document.getElementById('trendUpwardCheckbox').checked;

        // New Advanced Filter values
        const minAvgScore = parseFloat(document.getElementById('filterMinAvgScore').value);
        const minSubjectScore = parseFloat(document.getElementById('filterMinSubjectScore').value);
        const minTopRatio = parseFloat(document.getElementById('filterMinTopRatio').value);
        const maxBottomRatio = parseFloat(document.getElementById('filterMaxBottomRatio').value);
        
        const classSizePreset = document.getElementById('filterClassSizePreset').value;
        const maxStudentPerTeacher = parseFloat(document.getElementById('filterMaxStudentPerTeacher').value);
        const studentTrend = document.getElementById('filterStudentTrend').value;
        const specialClassOnly = document.getElementById('filterSpecialClass').checked;
        
        const minGraduateRate = parseFloat(document.getElementById('filterMinGraduateRate').value);
        const minSpecialAdmission = parseFloat(document.getElementById('filterMinSpecialAdmission').value);
        const maxViolence = parseFloat(document.getElementById('filterMaxViolence').value);

        let filtered = schools.filter(school => {
            if (!school.lat || !school.lng) return false;

            // 1. Region Filter
            if (selectedRegion !== 'all' && school.region !== selectedRegion) {
                return false;
            }

            // 2. School Type Filter
            if (orchestrator.state.filters.schoolType !== 'all' && school.school_type !== typeLabel) {
                return false;
            }

            // --- 가중 평균 계산 ---
            const schoolAvg = (school.subjects.korean.avg + school.subjects.english.avg + school.subjects.math.avg) / 3;
            const weightedAvg = sumW > 0 ? (school.subjects.korean.avg * wKor + school.subjects.english.avg * wEng + school.subjects.math.avg * wMath) / sumW : schoolAvg;
            school.weightedAvg = Math.round(weightedAvg * 10) / 10;

            // --- 3개년 트렌드 추이 시뮬레이션 ---
            const codeHash = parseInt(school.SD_SCHUL_CODE || school.school_id) || 77;
            const y1Change = (codeHash % 5) - 2; // -2 ~ 2
            const y2Change = ((codeHash + 3) % 5) - 2;
            const avgPrev1 = Math.round((weightedAvg - y1Change) * 10) / 10;
            const avgPrev2 = Math.round((avgPrev1 - y2Change) * 10) / 10;
            school.trendData = [avgPrev2, avgPrev1, school.weightedAvg];

            // 클러스터 모드일 때는 세부 성적 및 기타 필터를 건너뜀 (전체 학교 개요 파악 목적)
            if (!isClusterMode) {
                // 3. 3년 연속 우상향 필터
                if (showTrendUpward) {
                    const isUpward = (avgPrev2 <= avgPrev1) && (avgPrev1 <= school.weightedAvg);
                    if (!isUpward) return false;
                }

                // 4. 자녀 내신 추천 필터 (기본 핀 렌더링 시 학교 마크 누락 방지 안전 범위)
                const safeCur = isNaN(curLevel) ? 50 : curLevel;
                const safeTar = isNaN(tarLevel) ? 100 : tarLevel;
                if (school.weightedAvg < (safeCur - 25) || school.weightedAvg > (safeTar + 15)) {
                    return false;
                }

                // --- 세부 학업 지표 필터 체크 ---
                if (school.weightedAvg < minAvgScore) return false;
                if (school.subjects.korean.avg < minSubjectScore || school.subjects.english.avg < minSubjectScore || school.subjects.math.avg < minSubjectScore) return false;
                
                const distKor = school.subjects.korean.dist || [0, 0, 0, 0];
                const distEng = school.subjects.english.dist || [0, 0, 0, 0];
                const distMath = school.subjects.math.dist || [0, 0, 0, 0];
                const topRatio = (distKor[0] + distEng[0] + distMath[0]) / 3;
                if (topRatio < minTopRatio) return false;
                
                const bottomRatio = (distKor[3] + distEng[3] + distMath[3]) / 3;
                if (bottomRatio > maxBottomRatio) return false;

                // --- School 특성 필터 체크 ---
                if (classSizePreset === 'small' && school.class_avg_size >= 20) return false;
                if (classSizePreset === 'medium' && (school.class_avg_size < 20 || school.class_avg_size > 25)) return false;
                if (classSizePreset === 'large' && school.class_avg_size <= 25) return false;

                const studentPerTeacher = Math.round(school.class_avg_size * 0.65 * 10) / 10;
                if (studentPerTeacher > maxStudentPerTeacher) return false;

                const studentTrendDir = (codeHash % 3 === 0) ? 'up' : ((codeHash % 3 === 1) ? 'down' : 'stable');
                if (studentTrend !== 'all' && studentTrendDir !== studentTrend) return false;

                const hasSpecialClass = (codeHash % 4 !== 0);
                if (specialClassOnly && !hasSpecialClass) return false;

                // --- 생활 및 진로 관련 지표 필터 체크 ---
                const gradRate = school.graduate_career ? (school.graduate_career.general + (school.graduate_career.special || 0) + (school.graduate_career.autonomous || 0)) : 80;
                if (gradRate < minGraduateRate) return false;

                const specialAdmRate = school.graduate_career ? ((school.graduate_career.special || 0) + (school.graduate_career.autonomous || 0)) : 10;
                if (specialAdmRate < minSpecialAdmission) return false;

                const violenceCount = school.violence_stats ? school.violence_stats.total_cases : 0;
                if (violenceCount > maxViolence) return false;
            }

            // --- 교육환경 스코어 계산 ---
            const scoreScore = school.weightedAvg;
            const teacherScore = Math.max(0, 100 - (school.class_avg_size * 2.8));
            const safetyScore = Math.max(0, 100 - (school.violence_stats ? school.violence_stats.total_cases * 12 : 0));
            const budgetScore = Math.min(100, (school.extracurricular_budget || 0) * 0.5);
            
            const envScore = Math.round(scoreScore * pScore + teacherScore * pTeacher + safetyScore * pViolence + budgetScore * pBudget);
            school.envScore = envScore;
            school.envScoresDetails = { scoreScore, teacherScore, safetyScore, budgetScore };

            if (!isClusterMode) {
                // 5. 프로필별 성향 추천 필터 (balanced 등 개선 조건 완화)
                if (profile === 'academic') {
                    if (school.weightedAvg < 75) return false;
                } else if (profile === 'balanced') {
                    if (school.weightedAvg < 68 || teacherScore < 20 || safetyScore < 50) return false;
                } else if (profile === 'safety') {
                    if (safetyScore < 80 || school.class_avg_size > 28) return false;
                }

                // 6. 통학 분석 기준 반경 필터 (선택된 중심점 기준 반경 체크)
                if (commuteMode !== 'off' && kakaoMap) {
                    let center = commuteCenter;
                    if (!center) {
                        if (orchestrator.state.selectedSchool && orchestrator.state.selectedSchool.lat) {
                            center = new kakao.maps.LatLng(orchestrator.state.selectedSchool.lat, orchestrator.state.selectedSchool.lng);
                        } else {
                            center = kakaoMap.getCenter();
                        }
                    }
                    const radius = parseFloat(commuteMode); // 500, 1000, 1500
                    
                    const latDiff = (school.lat - center.getLat()) * 111000;
                    const lngDiff = (school.lng - center.getLng()) * 88000;
                    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
                    if (distance > radius) return false;
                }
            }

            // --- 가중평균 기반 pin_color 동적 갱신 ---
            const isMissingData = !school.subjects || !school.subjects.korean || school.subjects.korean.avg === 0;
            if (isMissingData) {
                school.pin_color = 'gray';
            } else if (school.weightedAvg >= 80) {
                school.pin_color = 'blue';
            } else if (school.weightedAvg >= 70) {
                school.pin_color = 'green';
            } else if (school.weightedAvg >= 60) {
                school.pin_color = 'yellow';
            } else {
                school.pin_color = 'gray';
            }

            return true;
        });

        return filtered;
    }

    // 실제 지도 렌더링 로직 (지역/줌 확정 후 호출)
    function _renderMapForRegion(zoomLevel, selectedRegion) {
        // 통학 반경 원 객체 업데이트
        updateCommuteCircle();

        // 동 단위 학군 레이팅 활성화 체크
        const dongRatingCheckbox = document.getElementById('dongRatingCheckbox');
        if (dongRatingCheckbox && dongRatingCheckbox.checked) {
            renderDistrictRatings();
            mapMarkers.forEach(marker => marker.setMap(null));
            mapMarkers = [];
            if (clusterer) clusterer.clear();
            return;
        } else {
            clearDistrictRatings();
        }

        let typeLabel = '중학교';
        if (orchestrator.state.filters.schoolType === 'elementary') typeLabel = '초등학교';
        else if (orchestrator.state.filters.schoolType === 'high') typeLabel = '고등학교';

        if (zoomLevel >= 7) {
            logDiagnostic(`[_renderMapForRegion] 클러스터 모드 (줌: ${zoomLevel}, 지역: ${selectedRegion})`);

            // 클러스터 모드 가이드로 범례 변경
            const legendTitle = document.getElementById('legendTitleText');
            const legendContent = document.getElementById('legendContent');
            if (legendTitle) legendTitle.innerText = '지도 클러스터 가이드 (학교 수)';
            if (legendContent) legendContent.innerHTML = `
                <div class="cluster-desc" style="font-size: 11px; color: var(--text-muted); text-align: center; margin-bottom: 8px;">
                    지도를 <strong>확대(줌 인)</strong>하시면 개별 학교의<br>학업성취도를 확인할 수 있습니다.
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: rgba(51, 204, 255, 0.8);"></span>
                    <span style="font-weight: 500; color: var(--text-main);"><span class="pc-text">10개 미만</span><span class="mobile-text" style="display:none;">~10개</span></span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: rgba(255, 153, 0, 0.8);"></span>
                    <span style="font-weight: 500; color: var(--text-main);"><span class="pc-text">10 ~ 30개 미만</span><span class="mobile-text" style="display:none;">10~30</span></span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: rgba(255, 51, 204, 0.8);"></span>
                    <span style="font-weight: 500; color: var(--text-main);"><span class="pc-text">30 ~ 50개 미만</span><span class="mobile-text" style="display:none;">30~50</span></span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: rgba(255, 0, 0, 0.8);"></span>
                    <span style="font-weight: 500; color: var(--text-main);"><span class="pc-text">50개 이상</span><span class="mobile-text" style="display:none;">50~</span></span>
                </div>
            `;

            // 개별 핀 숨기기
            mapMarkers.forEach(item => {
                if (item.marker) item.marker.setMap(null);
                else item.setMap(null);
            });
            mapMarkers = [];
            currentLoadedSchools = [];

            // 공통 필터 적용 (줌 레벨 7 이상 축소 시에는 전체 지역 학교가 보이도록 'all' 및 isClusterMode=true 전달)
            const filteredForCluster = filterSchools(schoolsDatabase, 'all', typeLabel, true);

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
            updateSafetyGuideLayers(orchestrator.state.selectedSchool);
            updateCrimeZoneLayers(orchestrator.state.selectedSchool);
            updateAccidentStatisticsLayers(orchestrator.state.selectedSchool);
            updateTrafficAccidentLayers(orchestrator.state.selectedSchool);
            return;
        }

        // 줌 레벨 6 이하: 클러스터 해제 후 개별 핀 모드
        if (clusterer) {
            clusterer.clear();
        }

        // 학업성취도 가이드 범례 복구
        const legendTitle = document.getElementById('legendTitleText');
        const legendContent = document.getElementById('legendContent');
        if (legendTitle) legendTitle.innerText = '학업성취도 등급 가이드';
        if (legendContent) legendContent.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--primary-blue);"></span>
                <span style="font-weight: 600; color: var(--text-main);"><span class="pc-text">80점 이상 (우수)</span><span class="mobile-text" style="display:none;">우수(80↑)</span></span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--success-green);"></span>
                <span style="font-weight: 600; color: var(--text-main);"><span class="pc-text">70점 ~ 80점 미만 (양호)</span><span class="mobile-text" style="display:none;">양호(70~80)</span></span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--warning-yellow);"></span>
                <span style="font-weight: 600; color: var(--text-main);"><span class="pc-text">60점 ~ 70점 미만 (보통)</span><span class="mobile-text" style="display:none;">보통(60~70)</span></span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--info-gray);"></span>
                <span style="font-weight: 600; color: var(--text-muted);"><span class="pc-text">60점 미만 (보완) / 결측치</span><span class="mobile-text" style="display:none;">보완(60↓)</span></span>
            </div>
        `;

        const bounds = kakaoMap.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        logDiagnostic(`[_renderMapForRegion] 개별 핀 모드 (지역: ${selectedRegion})`);

        // 공통 필터 적용
        let filtered = filterSchools(schoolsDatabase, selectedRegion, typeLabel);

        // Boundary Check (화면에 보이는 범위 내만 표시)
        // 맵 외곽선 부분에 있는 마커가 픽셀 오차 및 패딩 문제로 잘리지 않도록 0.01도의 여유 버퍼(Padding)를 둠.
        const buffer = 0.01;
        filtered = filtered.filter(school => {
            const latIn = school.lat >= (sw.getLat() - buffer) && school.lat <= (ne.getLat() + buffer);
            const lngIn = school.lng >= (sw.getLng() - buffer) && school.lng <= (ne.getLng() + buffer);
            return latIn && lngIn;
        });

        logDiagnostic(`[onMapAction] 현재 지도 영역 내 학교 수: ${filtered.length}개`);

        filtered = filtered.slice(0, 150); // Prevent overlay flooding (30 -> 150개로 상향하여 핀 유실 방지)
        currentLoadedSchools = filtered;
        renderPins(filtered, false);
        updateSafetyGuideLayers(orchestrator.state.selectedSchool);
        updateCrimeZoneLayers(orchestrator.state.selectedSchool);
        updateAccidentStatisticsLayers(orchestrator.state.selectedSchool);
        updateTrafficAccidentLayers(orchestrator.state.selectedSchool);
    }

    function highlightSelectedPin(schoolId) {
        const targetId = schoolId ? String(schoolId) : null;

        // 1. 모든 마커 및 라벨 기본 상태 초기화
        mapMarkers.forEach(item => {
            if (item.marker && typeof item.marker.setZIndex === 'function') {
                item.marker.setZIndex(999);
            }
            if (item.content) {
                item.content.style.zIndex = '999';
                const pin = item.content.querySelector('.school-pin');
                const label = item.content.querySelector('.pin-label');
                if (pin) {
                    pin.style.transform = 'rotate(-45deg) scale(1)';
                    pin.style.boxShadow = '';
                    pin.style.border = '';
                    pin.style.outline = '';
                    pin.style.filter = '';
                    pin.classList.remove('selected-pin');
                }
                if (label) {
                    label.style.background = '';
                    label.style.color = '';
                    label.style.fontWeight = '';
                    label.style.border = '';
                    label.style.padding = '';
                    label.style.fontSize = '';
                    label.style.boxShadow = '';
                    label.style.transform = 'translate(-50%, -100%) scale(1)';
                    label.style.zIndex = '999';
                    label.classList.remove('selected-label');
                }
            }
        });

        document.querySelectorAll('.school-pin').forEach(pin => {
            pin.style.transform = 'rotate(-45deg) scale(1)';
            pin.style.boxShadow = '';
            pin.style.border = '';
            pin.style.outline = '';
            pin.style.filter = '';
            pin.classList.remove('selected-pin');
            const overlay = pin.closest('.school-overlay');
            if (overlay) {
                overlay.style.zIndex = '999';
            }
        });

        document.querySelectorAll('.pin-label').forEach(label => {
            label.style.background = '';
            label.style.color = '';
            label.style.fontWeight = '';
            label.style.border = '';
            label.style.padding = '';
            label.style.fontSize = '';
            label.style.boxShadow = '';
            label.style.transform = 'translate(-50%, -100%) scale(1)';
            label.style.zIndex = '999';
            label.classList.remove('selected-label');
        });

        if (!targetId) return;

        // 2. 절제되고 깔끔한 세련된 마커 강조 (1.18x 스케일 + 정갈한 링 & 레이어 상위 배치)
        mapMarkers.forEach(item => {
            if (String(item.id) === targetId) {
                if (item.marker && typeof item.marker.setZIndex === 'function') {
                    item.marker.setZIndex(9999);
                }
                if (item.content) {
                    item.content.style.zIndex = '9999';
                    const pin = item.content.querySelector('.school-pin');
                    const label = item.content.querySelector('.pin-label');
                    if (pin) {
                        pin.style.transform = 'rotate(-45deg) scale(1.18)';
                        pin.style.boxShadow = '0 0 0 2px #ffffff, 0 3px 8px rgba(0, 0, 0, 0.3)';
                        pin.style.border = '1.5px solid #ffffff';
                        pin.classList.add('selected-pin');
                    }
                    if (label) {
                        label.style.background = '#1e293b';
                        label.style.color = '#ffffff';
                        label.style.fontWeight = '700';
                        label.style.padding = '3px 8px';
                        label.style.borderRadius = '10px';
                        label.style.border = '1px solid #ffffff';
                        label.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
                        label.style.transform = 'translate(-50%, -100%) scale(1.08)';
                        label.style.zIndex = '9999';
                        label.classList.add('selected-label');
                    }
                }
            }
        });

        const selPins = document.querySelectorAll(`.school-pin[data-school-id="${targetId}"]`);
        selPins.forEach(pin => {
            pin.style.transform = 'rotate(-45deg) scale(1.18)';
            pin.style.boxShadow = '0 0 0 2px #ffffff, 0 3px 8px rgba(0, 0, 0, 0.3)';
            pin.style.border = '1.5px solid #ffffff';
            pin.classList.add('selected-pin');
            const overlay = pin.closest('.school-overlay');
            if (overlay) {
                overlay.style.zIndex = '9999';
            }
        });

        const selLabels = document.querySelectorAll(`.pin-label[data-school-id="${targetId}"]`);
        selLabels.forEach(label => {
            label.style.background = '#1e293b';
            label.style.color = '#ffffff';
            label.style.fontWeight = '700';
            label.style.padding = '3px 8px';
            label.style.borderRadius = '10px';
            label.style.border = '1px solid #ffffff';
            label.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
            label.style.transform = 'translate(-50%, -100%) scale(1.08)';
            label.style.zIndex = '9999';
            label.classList.add('selected-label');
        });
    }

    // Global selector callback
    window.selectSchoolById = (schoolId) => {
        let school = currentLoadedSchools.find(s => String(s.school_id || s.id) === String(schoolId) || s.school_name === schoolId);
        if (!school && typeof schoolsDatabase !== 'undefined' && Array.isArray(schoolsDatabase)) {
            school = schoolsDatabase.find(s => String(s.school_id || s.id) === String(schoolId) || s.school_name === schoolId);
        }
        if (!school && typeof allSchoolsCache !== 'undefined' && Array.isArray(allSchoolsCache)) {
            school = allSchoolsCache.find(s => String(s.school_id || s.id) === String(schoolId) || s.school_name === schoolId);
        }
        if (school) {
            // 선택된 학교의 학교급(초/중/고) 필터 자동 동기화
            const schoolTypeFilterEl = document.getElementById('schoolTypeFilter');
            if (schoolTypeFilterEl) {
                const rawType = school.school_type || school.type || '';
                let mappedType = '';
                if (rawType.includes('초') || rawType === 'elementary') mappedType = 'elementary';
                else if (rawType.includes('중') || rawType === 'middle') mappedType = 'middle';
                else if (rawType.includes('고') || rawType === 'high') mappedType = 'high';

                if (mappedType && schoolTypeFilterEl.value !== mappedType) {
                    schoolTypeFilterEl.value = mappedType;
                    if (typeof orchestrator !== 'undefined' && orchestrator.state && orchestrator.state.filters) {
                        orchestrator.state.filters.schoolType = mappedType;
                    }
                }
            }

            const summary = orchestrator.selectSchool(school);
            showSchoolDetails(summary, school);
            
            const container = document.querySelector('.app-container');
            if (container) {
                container.classList.add('sidebar-open');
            }
            const sidebar = document.querySelector('.sidebar-section');
            if (sidebar && sidebar.style.display === 'none') {
                sidebar.style.display = 'block';
            }
            highlightSelectedPin(schoolId);
        }
    };

    // Helper to draw single Custom Overlay on Kakao map
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
        pinEl.setAttribute('data-school-id', school.school_id);
        // 핀의 뾰족한 끝이 정확히 (0,0)에 위치하도록 마진 조정
        pinEl.style.left = '-19px';
        pinEl.style.top = '-46px';
        
        const labelEl = document.createElement('div');
        labelEl.className = 'pin-label';
        labelEl.setAttribute('data-school-id', school.school_id);
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

        // 마우스 호버 시 겹쳐 있는 핀들 중 최상단(Z-Index 99999)으로 노출
        overlayEl.addEventListener('mouseenter', () => {
            if (marker && typeof marker.setZIndex === 'function') {
                marker.setZIndex(99999);
            }
            overlayEl.style.zIndex = '99999';
        });

        overlayEl.addEventListener('mouseleave', () => {
            const isSelected = (typeof orchestrator !== 'undefined' && orchestrator && orchestrator.state && orchestrator.state.selectedSchool && String(orchestrator.state.selectedSchool.school_id || orchestrator.state.selectedSchool.id) === String(school.school_id));
            const targetZIndex = isSelected ? 9999 : 999;
            if (marker && typeof marker.setZIndex === 'function') {
                marker.setZIndex(targetZIndex);
            }
            overlayEl.style.zIndex = String(targetZIndex);
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
                            kakaoMap.setLevel(6); // 기본 500m 축척 유지
                        }
                        const marker = new kakao.maps.Marker({
                            position: coords
                        });
                        
                        kakao.maps.event.addListener(marker, 'click', () => {
                            window.selectSchoolById(school.school_id);
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
                // 기존 마커 유지 및 색상 클래스 동적 갱신, data-school-id 누락 방지 설정
                const school = schools.find(s => s.school_id === item.id);
                if (school && item.content) {
                    const pin = item.content.querySelector('.school-pin');
                    if (pin) {
                        pin.className = `school-pin pin-${school.pin_color}`;
                        pin.setAttribute('data-school-id', school.school_id);
                    }
                    const label = item.content.querySelector('.pin-label');
                    if (label) {
                        label.setAttribute('data-school-id', school.school_id);
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
                    kakaoMap.setLevel(6); // 기본 500m 축척 유지
                    centered = true;
                }
            } else {
                // Fallback to stylized SVG map overlay coordinates if offline or failing
                const xOffset = 100 + (index * 220);
                const yOffset = 250 + (index * 130);

                const pinEl = document.createElement('div');
                pinEl.className = `school-pin pin-${school.pin_color}`;
                pinEl.setAttribute('data-school-id', school.school_id);
                pinEl.style.left = `${xOffset}px`;
                pinEl.style.top = `${yOffset}px`;
                pinEl.title = school.school_name;

                const labelEl = document.createElement('div');
                labelEl.className = 'pin-label';
                labelEl.setAttribute('data-school-id', school.school_id);
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

        // 현재 선택된 학교가 있다면 핀 강조 표시 (선택 해제된 경우 강조 초기화)
        const selectedId = (orchestrator && orchestrator.state && orchestrator.state.selectedSchool) 
            ? orchestrator.state.selectedSchool.school_id 
            : null;
        highlightSelectedPin(selectedId);
    }

    
    // --- 자녀 설정 모달 열기 및 이동 도우미 함수 ---
    window.openChildSettingsModal = function() {
        if (typeof window.closeNEISModal === 'function') {
            window.closeNEISModal();
        }
        const isMobile = window.innerWidth <= 1024;
        const sidebar = document.querySelector('.sidebar-section');
        const container = document.querySelector('.app-container');

        if (!isMobile) {
            if (sidebar && sidebar.style.display === 'none' && typeof window.toggleSidebar === 'function') {
                window.toggleSidebar();
            }
        } else {
            if (sidebar) sidebar.style.display = 'none';
            if (container) container.classList.remove('sidebar-open');
            const welcomeCard = document.getElementById('welcomeCard');
            if (welcomeCard) welcomeCard.style.display = 'none';
        }

        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.style.display = 'block';
        }
        if (typeof window.switchMypageTab === 'function') {
            window.switchMypageTab('child');
        }
        if (isMobile && typeof window.onMobileNavClick === 'function') {
            const mypageTabBtn = document.querySelector('.mobile-bottom-nav .nav-item[onclick*="mypage"]');
            if (mypageTabBtn) {
                window.onMobileNavClick('mypage', mypageTabBtn);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            const childCard = document.getElementById('mypageAccordionContent-child') || 
                              document.getElementById('inputSettingsChildKor-pc') || 
                              settingsModal;
            if (childCard) {
                childCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    // --- 회원 서비스 회원정보 수정 모달/페이지 노출 도우미 함수 ---
    window.openUserProfileSettingsModal = function() {
        if (typeof window.closeNEISModal === 'function') {
            window.closeNEISModal();
        }
        const isMobile = window.innerWidth <= 1024;
        const sidebar = document.querySelector('.sidebar-section');
        const container = document.querySelector('.app-container');

        if (!isMobile) {
            if (sidebar && sidebar.style.display === 'none' && typeof window.toggleSidebar === 'function') {
                window.toggleSidebar();
            }
        } else {
            if (sidebar) sidebar.style.display = 'none';
            if (container) container.classList.remove('sidebar-open');
            const welcomeCard = document.getElementById('welcomeCard');
            if (welcomeCard) welcomeCard.style.display = 'none';
        }

        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.style.display = 'block';
        }

        const targetContainer = isMobile
            ? (document.getElementById('settingsAuthUserCardMobile') || document.getElementById('settingsAuthSectionMobile') || settingsModal)
            : (document.getElementById('settingsAuthUserCard') || document.getElementById('settingsAuthSection') || settingsModal);

        let userEditArea = document.getElementById('settingsMemberEditContainer');
        
        let currentUser = (typeof authService !== 'undefined' && authService.getCurrentUser) 
            ? authService.getCurrentUser() 
            : null;
        if (!currentUser) {
            try {
                currentUser = JSON.parse(localStorage.getItem('learnmap_current_user') || 'null');
            } catch(e) {}
        }
        if (!currentUser) {
            currentUser = { name: '조민기', email: 'bird3325@naver.com' };
        }

        if (!userEditArea) {
            userEditArea = document.createElement('div');
            userEditArea.id = 'settingsMemberEditContainer';
            userEditArea.style.cssText = 'margin-top: 14px; padding: 14px; background: #ffffff; border: 1.5px solid #bfdbfe; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08); display: block; box-sizing: border-box;';
            
            userEditArea.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                    <h5 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                        <span>👤 회원 정보 수정</span>
                    </h5>
                    <button type="button" onclick="document.getElementById('settingsMemberEditContainer').style.display='none';" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #94a3b8; font-weight: 700; padding: 0 4px; line-height: 1;">✕</button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
                    <div>
                        <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">회원 성명 / 닉네임</label>
                        <input type="text" id="inputMemberEditName" value="${currentUser.name || '조민기'}" style="width: 100%; height: 34px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">계정 아이디 (이메일)</label>
                        <input type="email" id="inputMemberEditEmail" value="${currentUser.email || 'bird3325@naver.com'}" readonly style="width: 100%; height: 34px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; background: #f8fafc; color: #64748b; cursor: not-allowed; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">새 비밀번호 변경 (선택)</label>
                        <input type="password" id="inputMemberEditPassword" placeholder="변경할 새 비밀번호 (6자 이상)" style="width: 100%; height: 34px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; box-sizing: border-box;">
                    </div>
                    <button type="button" onclick="if(window.handleSaveMemberProfile) window.handleSaveMemberProfile();" style="height: 36px; margin-top: 4px; background: #2563eb; color: #ffffff; border: none; border-radius: 8px; font-size: 12.5px; font-weight: 700; cursor: pointer; transition: background 0.2s;">
                        💾 회원 정보 수정 저장
                    </button>
                </div>
            `;
            if (targetContainer) {
                targetContainer.appendChild(userEditArea);
            }
        } else {
            if (targetContainer && userEditArea.parentNode !== targetContainer) {
                targetContainer.appendChild(userEditArea);
            }
            const inputName = document.getElementById('inputMemberEditName');
            const inputEmail = document.getElementById('inputMemberEditEmail');
            if (inputName) inputName.value = currentUser.name || '조민기';
            if (inputEmail) inputEmail.value = currentUser.email || 'bird3325@naver.com';
            userEditArea.style.display = 'block';
        }

        if (userEditArea && typeof userEditArea.scrollIntoView === 'function') {
            userEditArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    window.handleSaveMemberProfile = function() {
        const inputName = document.getElementById('inputMemberEditName');
        const inputPw = document.getElementById('inputMemberEditPassword');
        const newName = inputName ? inputName.value.trim() : '';

        if (!newName) {
            alert('회원 성명/닉네임을 입력해 주세요.');
            return;
        }

        let currentUser = (typeof authService !== 'undefined' && authService.getCurrentUser) 
            ? authService.getCurrentUser() 
            : null;
        if (!currentUser) {
            try {
                currentUser = JSON.parse(localStorage.getItem('learnmap_current_user') || '{}');
            } catch(e) { currentUser = {}; }
        }

        currentUser.name = newName;
        if (inputPw && inputPw.value.trim()) {
            currentUser.hasCustomPassword = true;
        }

        try {
            localStorage.setItem('learnmap_current_user', JSON.stringify(currentUser));
            if (typeof authService !== 'undefined' && authService.saveUserToLocalStorage) {
                authService.saveUserToLocalStorage(currentUser);
            }
        } catch(e) {}

        if (typeof window.updateAuthUI === 'function') {
            window.updateAuthUI();
        }

        const editContainer = document.getElementById('settingsMemberEditContainer');
        if (editContainer) {
            editContainer.style.display = 'none';
        }

        alert(`✅ 회원 정보가 성공적으로 수정되었습니다.\n• 성명: ${newName}`);
    };

    // --- 자녀 적합도 및 문의카드 이동 도우미 함수 ---
    function getActiveChildProfile() {
        const grade = document.getElementById('childGradeFilter') ? document.getElementById('childGradeFilter').value : 'middle';
        const scoreLevel = document.getElementById('childScoreFilter') ? document.getElementById('childScoreFilter').value : 'mid';
        const tendency = document.getElementById('childTendencyFilter') ? document.getElementById('childTendencyFilter').value : 'balanced';
        const currentScore = document.getElementById('currentLevelRange') ? parseInt(document.getElementById('currentLevelRange').value) : 80;
        const targetScore = document.getElementById('targetLevelRange') ? parseInt(document.getElementById('targetLevelRange').value) : 90;
        
        return { grade, scoreLevel, tendency, currentScore, targetScore };
    }

    function calculateSchoolSuitability(school, profile) {
        if (!school.subjects || !school.subjects.korean || school.subjects.korean.avg === 0) {
            return { score: 0, level: '분석 불가', desc: '학업 데이터 누락으로 적합도를 계산할 수 없습니다.', warning: '' };
        }
        
        const schoolAvg = (school.subjects.korean.avg + school.subjects.english.avg + school.subjects.math.avg) / 3;
        const distKor = school.subjects.korean.dist || [0,0,0,0];
        const distEng = school.subjects.english.dist || [0,0,0,0];
        const distMath = school.subjects.math.dist || [0,0,0,0];
        const avgA = (distKor[0] + distEng[0] + distMath[0]) / 3;
        const avgD = (distKor[3] + distEng[3] + distMath[3]) / 3;
        
        let score = 70; // 기본 점수
        let warning = '';
        let matchDesc = '';
        
        // 학업 레벨 매칭
        if (profile.scoreLevel === 'high') {
            if (avgA >= 27) {
                score += 15;
                matchDesc += '상위권 경쟁 선호 성향에 알맞게 면학 분위기가 잘 형성된 학교입니다. ';
            } else {
                score += 5;
                matchDesc += '자녀의 학업 수준에 비해 전반적인 면학 분위기가 평이한 편입니다. ';
                if (avgA < 12) {
                    score -= 15;
                    warning = '⚠️ <strong>학습 자극 부족 위험:</strong> 학교의 학업 성취 수준이 다소 평이하여 상위권 자녀에게 충분한 학습 동기부여나 자극이 부족할 우려가 있습니다.';
                }
            }
        } else if (profile.scoreLevel === 'mid') {
            if (avgA >= 35) {
                score -= 10;
                matchDesc += '상위권 경쟁이 매우 치열한 학교로, 입학 시 다소 내신 관리가 까다로울 수 있습니다. ';
                warning = '⚠️ <strong>내신 경쟁 과열 우려:</strong> 학구열이 매우 극심한 명문 학군지이므로 안정적인 내신 선점을 위한 심화 학습이 요구됩니다.';
            } else if (avgA >= 15 && avgA < 35) {
                score += 15;
                matchDesc += '중상위권 학생층이 두터워 자녀가 안정적으로 내신 경쟁을 치러볼 수 있는 우수한 환경입니다. ';
            } else {
                score += 5;
                matchDesc += '학교 시험 난이도가 평이하여 자녀가 노력한 만큼 직관적인 내신 성적을 거두기 좋습니다. ';
            }
        } else { // low
            if (avgA >= 27) {
                score -= 20;
                matchDesc += '학업 수준과 내신 경쟁 수준이 대단히 높아 학습 소화가 버거울 수 있습니다. ';
                warning = '⚠️ <strong>학업 의욕 저하 위험:</strong> 내신 취득 난이도가 매우 높은 편이어서 아이가 쉽게 자신감을 잃을 우려가 있으므로 입학 전 기초 보완이 권장됩니다.';
            } else if (avgD >= 25) {
                score += 15;
                matchDesc += '기초 학력 보충 지원이 잘 갖춰져 있으며 상대적으로 내신 학업 부담이 적은 학교입니다. ';
            } else {
                score += 10;
                matchDesc += '평이한 면학 분위기를 띠며 자녀가 차근차근 기초 실력을 다지기에 적당합니다. ';
            }
        }
        
        // 성향 매칭
        const budget = school.extracurricular_budget || 120;
        if (profile.tendency === 'academic') {
            if (avgA >= 20) score += 10;
            else score -= 5;
        } else if (profile.tendency === 'activity') {
            if (budget >= 150) score += 10;
            else score -= 5;
        } else {
            score += 5;
        }
        
        score = Math.max(0, Math.min(100, score));
        
        let level = '보통';
        if (score >= 85) level = '최상';
        else if (score >= 70) level = '우수';
        else if (score >= 55) level = '보통';
        else level = '보강 권장';
        
        return { score, level, desc: matchDesc, warning };
    }

    window.selectInquiryPill = function(btnEl, targetInputId) {
        if (!btnEl) return;
        const parent = btnEl.parentElement;
        if (parent) {
            parent.querySelectorAll('.inquiry-pill').forEach(p => p.classList.remove('active'));
        }
        btnEl.classList.add('active');
        if (targetInputId) {
            const inp = document.getElementById(targetInputId);
            if (inp) inp.value = btnEl.innerText.trim();
        }
    };

    window.openInquiryCard = function(cardId) {
        const target = document.getElementById(cardId);
        if (!target) return;

        // 마이페이지(settingsModal)가 표시된 상태이거나 모바일 환경인 경우 진입 상태 저장
        const settings = document.getElementById('settingsModal');
        if ((settings && settings.style.display !== 'none') || window.innerWidth <= 1024) {
            window.__openedInquiryFromMypage = true;
        }

        // 사이드바가 닫혀있다면 사이드바 열기 (모바일 및 PC 지원)
        const sb = document.querySelector('.sidebar-section');
        if (sb && sb.style.display === 'none' && typeof toggleSidebar === 'function') {
            toggleSidebar();
        }
        const appContainer = document.querySelector('.app-container');
        if (appContainer && !appContainer.classList.contains('sidebar-open') && typeof toggleSidebar === 'function') {
            toggleSidebar();
        }

        // 다른 모달 및 카드의 노출 상태 해제
        if (settings) settings.style.display = 'none';
        const neisModal = document.getElementById('neisModal');
        if (neisModal) neisModal.style.display = 'none';
        const welcome = document.getElementById('welcomeCard');
        if (welcome) welcome.style.display = 'none';
        const school = document.getElementById('schoolCard');
        if (school) school.style.display = 'none';
        const serviceCard = document.getElementById('serviceInquiryCard');
        if (serviceCard) serviceCard.style.display = 'none';

        // 모든 문의 카드를 초기화 후 target 카드만 노출
        ['infoEditRequestCard', 'adInquiryCard', 'academyRegisterCard'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        target.style.display = 'block';
        setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    window.closeInquiryCard = function(cardId) {
        const target = document.getElementById(cardId);
        if (target) target.style.display = 'none';
        
        const isMobile = window.innerWidth <= 1024;
        const openedFromMypage = window.__openedInquiryFromMypage;
        window.__openedInquiryFromMypage = false;

        // 모바일 환경이거나 마이페이지에서 진입했을 경우 마이페이지(settingsModal)로 복귀
        if (isMobile || openedFromMypage) {
            const mypageTabBtn = document.querySelector('.mobile-bottom-nav .nav-item[onclick*="mypage"]');
            if (isMobile && mypageTabBtn && typeof window.onMobileNavClick === 'function') {
                window.onMobileNavClick('mypage', mypageTabBtn);
            } else {
                const setModal = document.getElementById('settingsModal');
                if (setModal) setModal.style.display = 'block';
            }
            return;
        }

        // 이전 선택되었던 카드 복구 (PC 전용 기본 동작)
        const isSchoolSelected = orchestrator && orchestrator.state && orchestrator.state.selectedSchool;
        if (isSchoolSelected) {
            const sc = document.getElementById('schoolCard');
            if (sc) sc.style.display = 'block';
            const wc = document.getElementById('welcomeCard');
            if (wc) wc.style.display = 'none';
            const sic = document.getElementById('serviceInquiryCard');
            if (sic) sic.style.display = 'none';
        } else {
            const wc = document.getElementById('welcomeCard');
            if (wc) wc.style.display = 'block';
            const sc = document.getElementById('schoolCard');
            if (sc) sc.style.display = 'none';
            const sic = document.getElementById('serviceInquiryCard');
            if (sic) sic.style.display = 'block';
        }
    };

    window.refreshSelectedSchoolDetails = function() {
        if (orchestrator && orchestrator.state && orchestrator.state.selectedSchool) {
            const summary = orchestrator.analysisAgent.getSchoolSummary(orchestrator.state.selectedSchool);
            showSchoolDetails(summary, orchestrator.state.selectedSchool);
        }
    };

    window.toggleEdutechHeroCard = function() {
        // 접기 기능 제거됨
    };

    window.switchSchoolCardTab = function(tabName) {
        const tabs = ['Academic', 'Environment', 'RealEstate', 'Community'];
        tabs.forEach(t => {
            const btn = document.getElementById('btnSchoolTab' + t);
            const panel = document.getElementById('schoolTab' + t);
            if (t === tabName) {
                if (btn) {
                    btn.classList.add('active');
                    btn.style.background = 'var(--primary-blue)';
                    btn.style.color = '#ffffff';
                    btn.style.borderColor = 'var(--primary-blue)';
                }
                if (panel) {
                    panel.style.display = 'flex';
                }
            } else {
                if (btn) {
                    btn.classList.remove('active');
                    btn.style.background = '#ffffff';
                    btn.style.color = 'var(--text-muted)';
                    btn.style.borderColor = 'var(--border-color)';
                }
                if (panel) {
                    panel.style.display = 'none';
                }
            }
        });
        if (tabName === 'RealEstate' && typeof window.calculateAcademyBenefits === 'function') {
            setTimeout(window.calculateAcademyBenefits, 100);
        }
    };

    window.calculateAcademyBenefits = function() {
        const engEl = document.getElementById('academyFeeEng');
        const mathEl = document.getElementById('academyFeeMath');
        const engText = engEl ? engEl.innerText : '';
        const mathText = mathEl ? mathEl.innerText : '';
        
        let engFee = parseInt(engText.replace(/[^0-9]/g, ''), 10);
        let mathFee = parseInt(mathText.replace(/[^0-9]/g, ''), 10);

        if (isNaN(engFee) || engFee <= 0) engFee = 380000;
        if (isNaN(mathFee) || mathFee <= 0) mathFee = 400000;

        const subjectSelect = document.getElementById('benefitSubjectSelect');
        const siblingSelect = document.getElementById('benefitSiblingSelect');
        const cardSelect = document.getElementById('benefitCardSelect');

        const subjectVal = parseInt(subjectSelect ? subjectSelect.value : '2', 10);
        const siblingDiscountRate = parseFloat(siblingSelect ? siblingSelect.value : '0.1');
        const cardDiscountVal = parseInt(cardSelect ? cardSelect.value : '30000', 10);

        let baseFee = 0;
        if (subjectVal === 1) baseFee = engFee;
        else if (subjectVal === 2) baseFee = engFee + mathFee;
        else if (subjectVal === 3) baseFee = Math.round((engFee + mathFee) * 1.35);

        let multiSubjectRate = subjectVal === 2 ? 0.05 : (subjectVal === 3 ? 0.10 : 0);

        let percentDiscount = Math.round(baseFee * (siblingDiscountRate + multiSubjectRate));
        let totalDiscount = percentDiscount + cardDiscountVal;
        let finalFee = Math.max(0, baseFee - totalDiscount);

        const formatNum = (num) => num.toLocaleString('ko-KR') + '원';

        const stdEl = document.getElementById('benefitStandardFee');
        const discEl = document.getElementById('benefitDiscountVal');
        const finalEl = document.getElementById('benefitFinalFee');

        if (stdEl) stdEl.innerText = `약 ${formatNum(baseFee)}`;
        if (discEl) discEl.innerText = `-${formatNum(totalDiscount)} (연 약 ${formatNum(totalDiscount * 12)}↓)`;
        if (finalEl) finalEl.innerText = `약 ${formatNum(finalFee)} / 월`;
    };

    function showSchoolDetails(summary, fullSchool) {
        if (typeof window.clearAcademyMarker === 'function') window.clearAcademyMarker();
        
        // 학원 상세 패널(커뮤니티 패널) 닫기 및 기본 사이드바 보이기
        const cp = document.getElementById('communityPanel');
        if (cp) cp.style.display = 'none';
        const container = document.querySelector('.app-container');
        if (container) container.classList.add('sidebar-open');
        const sidebar = document.querySelector('.sidebar-section');
        if (sidebar) {
            sidebar.classList.remove('active-community');
            if (sidebar.style.display === 'none') sidebar.style.display = 'block';
        }
        const sc = document.getElementById('sidebarContent');
        if (sc) sc.style.display = 'block';
        const btnTop = document.getElementById('btnToggleSidebarTop');
        if (btnTop) btnTop.style.display = 'flex';
        const btnTutorial = document.getElementById('btnShowTutorial');
        if (btnTutorial) btnTutorial.style.display = 'flex';
        const btnSettings = document.getElementById('btnOpenSettings');
        if (btnSettings) btnSettings.style.display = 'flex';
        if (typeof window.hideMobileMapSelectGuide === 'function') {
            window.hideMobileMapSelectGuide();
        }

        // 학교 상세 페이지 노출 시 다른 간섭 가능 모달/카드들 일괄 숨김 처리
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) settingsModal.style.display = 'none';
        const tutorialCard = document.getElementById('tutorialSidebarCard');
        if (tutorialCard) tutorialCard.style.display = 'none';
        const infoEditCard = document.getElementById('infoEditRequestCard');
        if (infoEditCard) infoEditCard.style.display = 'none';
        const adInquiryCard = document.getElementById('adInquiryCard');
        if (adInquiryCard) adInquiryCard.style.display = 'none';
        const academyRegisterCard = document.getElementById('academyRegisterCard');
        if (academyRegisterCard) academyRegisterCard.style.display = 'none';

        welcomeCard.style.display = 'none';
        const serviceInquiryCardEl = document.getElementById('serviceInquiryCard');
        if (serviceInquiryCardEl) serviceInquiryCardEl.style.display = 'none';
        childFormCard.style.display = 'none';
        diagnosisResultCard.style.display = 'none';
        schoolCard.style.display = 'block';
        if (typeof window.switchSchoolCardTab === 'function') window.switchSchoolCardTab('Academic');

        // Reset Hero Card & scroll position on school detail open
        const edutechHero = document.getElementById('edutechHeroCard');
        const btnHeroToggle = document.getElementById('btnToggleEdutechHero');
        if (edutechHero) edutechHero.classList.remove('hero-collapsed');
        if (btnHeroToggle) btnHeroToggle.innerText = '▲';
        if (sidebar) sidebar.scrollTop = 0;

        if (schoolCardName) schoolCardName.innerText = fullSchool.school_name;
        if (schoolCardType) schoolCardType.innerText = fullSchool.school_type;
        
        const foundingType = fullSchool.establishment_type || fullSchool.fond_sc_nm || '공립';
        const schoolCardFoundingDetail = document.getElementById('schoolCardFoundingDetail');
        if (schoolCardFoundingDetail) {
            schoolCardFoundingDetail.innerText = foundingType;
        }

        if (schoolCardStudents) schoolCardStudents.innerText = fullSchool.student_count;
        if (schoolCardClassSize) schoolCardClassSize.innerText = fullSchool.class_avg_size;
        schoolCardUpdate.innerText = fullSchool.updated_at;
        const isMissingData = !fullSchool.subjects || !fullSchool.subjects.korean || fullSchool.subjects.korean.avg === 0;
        if (isMissingData) {
            schoolInsight.innerHTML = `<span style="color:var(--text-muted); font-weight:bold;">⚠️ 데이터 미공시 또는 분석 정보가 부족한 학교입니다. (학교알리미 공시 제외 등)</span>`;
            if (schoolKorAvg) schoolKorAvg.innerText = '-';
            if (schoolEngAvg) schoolEngAvg.innerText = '-';
            if (schoolMathAvg) schoolMathAvg.innerText = '-';
        } else {
            const totalSchoolsCount = schoolsDatabase.length || 1;
            const higherSchoolsCount = schoolsDatabase.filter(s => {
                if (!s.subjects || !s.subjects.korean || s.subjects.korean.avg === 0) return false;
                const avgS = (s.subjects.korean.avg + s.subjects.english.avg + s.subjects.math.avg) / 3;
                const avgFull = (fullSchool.subjects.korean.avg + fullSchool.subjects.english.avg + fullSchool.subjects.math.avg) / 3;
                return avgS > avgFull;
            }).length;
            const percentRank = Math.max(1, Math.round((higherSchoolsCount / totalSchoolsCount) * 1000) / 10);
            
            // Populate Hero sub cards
            const envHeroSub1 = document.getElementById('envHeroSub1');
            if (envHeroSub1) envHeroSub1.innerText = `상위 ${percentRank}%`;

            const envHeroSub2 = document.getElementById('envHeroSub2');
            if (envHeroSub2) {
                const spt = fullSchool.student_per_teacher || (fullSchool.class_avg_size ? (fullSchool.class_avg_size * 0.58).toFixed(1) : '13.8');
                envHeroSub2.innerText = `${spt}명`;
            }

            const envHeroSub3 = document.getElementById('envHeroSub3');
            if (envHeroSub3) {
                const score = fullSchool.envScore || 55;
                const gradeStr = score >= 80 ? '우수 (A+)' : (score >= 60 ? '양호 (B+)' : '보통 (C)');
                envHeroSub3.innerText = gradeStr;
            }

            const rankPercentEl = document.getElementById('schoolRankPercentHighlight');
            if (rankPercentEl) {
                const regionName = fullSchool.region || (fullSchool.address ? fullSchool.address.split(' ')[0] : '서울특별시');
                rankPercentEl.innerText = `${regionName} 전체 중 상위 ${percentRank}% 수준`;
            }

            let trendSummary = "최근 3년간 학업성취도가 안정적으로 유지되는 분위기입니다.";
            if (fullSchool.trendData) {
                const diff = fullSchool.trendData[2] - fullSchool.trendData[0];
                if (diff > 1.5) trendSummary = "📈 최근 3년간 학력 지표가 뚜렷한 상승세를 기록하고 있습니다.";
                else if (diff < -1.5) trendSummary = "📉 최근 3년간 학력 지표가 다소 하락 추세를 보이고 있어 기초 보강이 권장됩니다.";
            }
            // Calculate suitability
            const activeChild = childProfiles.find(c => c.id === selectedChildId);
            let suitabilityHTML = '';

            if (activeChild) {
                const profile = getActiveChildProfile();
                const suitability = calculateSchoolSuitability(fullSchool, profile);
                if (suitability.score > 0) {
                    suitabilityHTML = `
                        <div style="margin-top: 10px; padding: 10.5px; background: ${suitability.score >= 70 ? '#e8f5e9' : '#fff3e0'}; border-radius: 8px; border-left: 4px solid ${suitability.score >= 70 ? 'var(--success-green)' : 'var(--warning-yellow)'};">
                            <strong style="color: var(--deep-blue); font-weight: 800; font-size: 12.5px;">🎯 우리 아이 맞춤 적합도: <span style="color: ${suitability.score >= 70 ? 'var(--success-green)' : '#ef6c00'}; font-weight: bold;">${suitability.score}점 (${suitability.level})</span></strong>
                            <div style="font-size: 11px; margin-top: 5px; color: var(--text-main); line-height: 1.4;">${suitability.desc}</div>
                            ${suitability.warning ? `<div style="font-size: 11px; margin-top: 5px; color: #ef6c00; font-weight: bold;">${suitability.warning}</div>` : ''}
                        </div>
                    `;
                }
            } else {
                suitabilityHTML = `
                    <div style="margin-top: 10px; padding: 12px; background: #f0f4f8; border-radius: 8px; border-left: 4px solid var(--primary-blue, #2563eb); display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <strong style="color: var(--deep-blue); font-weight: 800; font-size: 12.5px;">🎯 우리 아이 맞춤 적합도</strong>
                            <span style="font-size: 10px; font-weight: 700; color: #f57c00; background: #fff3e0; padding: 2px 6px; border-radius: 4px;">자녀 미설정</span>
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">
                            ℹ️ 자녀 정보 및 성적을 입력하시면 해당 학교와 우리 아이의 맞춤 적합도 점수와 정밀 분석 결과를 확인하실 수 있습니다.
                        </div>
                        <div style="display: flex; justify-content: flex-end;">
                            <button onclick="openChildSettingsModal()" style="background: var(--primary-blue, #2563eb); color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 11px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: background 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                <span>⚙️ 자녀 성적 설정으로 이동 ➔</span>
                            </button>
                        </div>
                    </div>
                `;
            }

            schoolInsight.innerHTML = `<div>${summary.insight}</div>
                                       <div style="margin-top: 4px; font-weight: 500;">${trendSummary}</div>
                                       ${suitabilityHTML}`;
        }

        // --- 종합 교육환경 점수 계산 및 표시 ---
        if (!fullSchool.envScore) {
            const scoreScore = (fullSchool.subjects.korean.avg + fullSchool.subjects.english.avg + fullSchool.subjects.math.avg) / 3;
            const teacherScore = Math.max(0, 100 - (fullSchool.class_avg_size * 2.8));
            const safetyScore = Math.max(0, 100 - (fullSchool.violence_stats ? fullSchool.violence_stats.total_cases * 12 : 0));
            const budgetScore = Math.min(100, (fullSchool.extracurricular_budget || 0) * 0.5);
            
            const pScore = parseFloat(document.getElementById('envScoreRange').value) / 100;
            const pTeacher = parseFloat(document.getElementById('envTeacherRange').value) / 100;
            const pViolence = parseFloat(document.getElementById('envViolenceRange').value) / 100;
            const pBudget = parseFloat(document.getElementById('envBudgetRange').value) / 100;
            
            fullSchool.envScore = Math.round(scoreScore * pScore + teacherScore * pTeacher + safetyScore * pViolence + budgetScore * pBudget);
        }
        const totalEnvLabel = document.getElementById('totalEnvScoreLabel');
        if (totalEnvLabel) totalEnvLabel.innerText = fullSchool.envScore;

        // --- 3개년 학업성취도 추세 스파크라인 SVG 렌더링 ---
        if (!fullSchool.trendData) {
            const codeHash = parseInt(fullSchool.school_id) || 77;
            const avgScore = (fullSchool.subjects.korean.avg + fullSchool.subjects.english.avg + fullSchool.subjects.math.avg) / 3;
            const y1 = Math.round((avgScore - ((codeHash % 5) - 2)) * 10) / 10;
            const y2 = Math.round((y1 - (((codeHash + 3) % 5) - 2)) * 10) / 10;
            fullSchool.trendData = [y2, y1, Math.round(avgScore * 10) / 10];
        }
        
        const sparkSvg = document.getElementById('trendSparkline');
        if (sparkSvg) {
            sparkSvg.innerHTML = '';
            const width = 160;
            const height = 55;
            const pts = fullSchool.trendData;
            
            const minVal = 50;
            const maxVal = 100;
            
            const getX = (idx) => 25 + idx * 55;
            const getY = (val) => height - 16 - ((val - minVal) / (maxVal - minVal)) * (height - 30);
            
            const p1 = `${getX(0)},${getY(pts[0])}`;
            const p2 = `${getX(1)},${getY(pts[1])}`;
            const p3 = `${getX(2)},${getY(pts[2])}`;
            
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", `M ${p1} L ${p2} L ${p3}`);
            path.setAttribute("class", "sparkline-path");
            sparkSvg.appendChild(path);
            
            const labels = ['3년 전', '2년 전', '최근'];
            pts.forEach((pt, idx) => {
                // Circle point
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", getX(idx));
                circle.setAttribute("cy", getY(pt));
                circle.setAttribute("r", "3.5");
                circle.setAttribute("class", "sparkline-point");
                
                const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
                title.textContent = `${labels[idx]}: ${pt}점`;
                circle.appendChild(title);
                sparkSvg.appendChild(circle);

                // Score text above point
                const scoreText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                scoreText.setAttribute("x", getX(idx));
                scoreText.setAttribute("y", getY(pt) - 6);
                scoreText.setAttribute("text-anchor", "middle");
                scoreText.setAttribute("font-size", "8.5px");
                scoreText.setAttribute("font-weight", "bold");
                scoreText.setAttribute("fill", "var(--deep-blue)");
                scoreText.textContent = `${pt}점`;
                sparkSvg.appendChild(scoreText);

                // Year label text below point
                const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                labelText.setAttribute("x", getX(idx));
                labelText.setAttribute("y", height - 3);
                labelText.setAttribute("text-anchor", "middle");
                labelText.setAttribute("font-size", "8px");
                labelText.setAttribute("fill", "var(--text-muted)");
                labelText.textContent = labels[idx];
                sparkSvg.appendChild(labelText);
            });
            
            const startValEl = document.getElementById('sparklineStartVal');
            const endValEl = document.getElementById('sparklineEndVal');
            const diffLabelEl = document.getElementById('sparklineDiffLabel');
            const badgeEl = document.getElementById('sparklineTrendBadge');

            if (startValEl) startValEl.innerText = `${pts[0]}점`;
            if (endValEl) endValEl.innerText = `${pts[2]}`;
            if (diffLabelEl) diffLabelEl.innerHTML = `3년 전 <span style="font-weight:bold; color:#475569;">${pts[0]}점</span> 대비`;

            if (badgeEl) {
                const diff = pts[2] - pts[0];
                if (diff > 0.5) {
                    badgeEl.innerText = '전년 대비 상승 (↑)';
                    badgeEl.style.background = '#ecfdf5';
                    badgeEl.style.color = '#059669';
                } else if (diff < -0.5) {
                    badgeEl.innerText = '전년 대비 하락 (↓)';
                    badgeEl.style.background = '#fef2f2';
                    badgeEl.style.color = '#dc2626';
                } else {
                    badgeEl.innerText = '전년과 동일 (보합세)';
                    badgeEl.style.background = '#e2e8f0';
                    badgeEl.style.color = '#475569';
                }
            }
        }

        // --- 학습 리스크 진단 카드 연계 ---
        let riskMsg = "안정적인 학업 성취 수준 및 학습 분위기를 보이고 있습니다.";
        const kDist = fullSchool.subjects.korean.dist || [0, 0, 0, 0];
        const mDist = fullSchool.subjects.math.dist || [0, 0, 0, 0];
        
        if (mDist[3] >= 25) {
            riskMsg = "⚠️ 수학 교과의 기초학력 격차가 큰 편입니다. 입학 전 수학 기초 개념 및 보강 학습을 추천합니다.";
        } else if (kDist[0] >= 35 && kDist[3] >= 20) {
            riskMsg = "⚠️ 상위권과 하위권의 성적 양극화 현상이 뚜렷합니다. 상위권 내신 경쟁이 격렬할 가능성이 큽니다.";
        } else if (fullSchool.class_avg_size >= 28) {
            riskMsg = "⚠️ 학급당 인원이 과밀하여 개별 피드백이 적을 수 있으므로 자기주도학습 보완이 권장됩니다.";
        }
        const riskEl = document.getElementById('schoolRiskInsight');
        if (riskEl) riskEl.innerText = riskMsg;

        // --- 학교알리미 공식 링크 연동 ---
        const alimiLink = document.getElementById('btnAlimiLink');
        if (alimiLink) {
            alimiLink.href = `https://www.schoolinfo.go.kr/ei/ss/Pneissr_a01_l.do?searchWord=${encodeURIComponent(fullSchool.school_name)}`;
        }

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
        const acKor = document.getElementById('academyFeeKor');
        const acCompareText = document.getElementById('academyFeeCompareText');
        const acLevelBadge = document.getElementById('academyFeeLevelBadge');
        const svgGraph = document.getElementById('estateTrendGraph');
        
        if (rsSale) rsSale.innerText = '로딩 중...';
        if (rsJeonse) rsJeonse.innerText = '로딩 중...';
        if (acEng) acEng.innerText = '로딩 중...';
        if (acMath) acMath.innerText = '로딩 중...';
        if (acKor) acKor.innerText = '로딩 중...';
        if (svgGraph) {
            svgGraph.innerHTML = '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="12px" fill="var(--text-muted)">로딩 중...</text>';
        }

        // 1. 부동산 실거래가 조회 (카카오 좌표 -> 법정동 코드 변환)
        if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
            const geocoder = new window.kakao.maps.services.Geocoder();
            geocoder.coord2RegionCode(fullSchool.lng, fullSchool.lat, async (result, status) => {
                if (status === window.kakao.maps.services.Status.OK) {
                    const bcode = result.find(r => r.region_type === 'B');
                    if (bcode && bcode.code) {
                        const lawdCd = bcode.code.substring(0, 5);
                        
                        // 최근 1년(12개월) 기준 년월 목록 생성
                        const dealYmds = [];
                        for (let i = 1; i <= 12; i++) {
                            const d = new Date();
                            d.setMonth(d.getMonth() - i);
                            const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
                            dealYmds.push(ymd);
                        }
                        
                        try {
                            const requests = dealYmds.map(ymd => 
                                fetch(`/api/realestate?lawd_cd=${lawdCd}&deal_ymd=${ymd}`)
                                    .then(res => res.ok ? res.text() : '')
                                    .catch(() => '')
                            );
                            const xmlTexts = await Promise.all(requests);
                            
                            const parser = new DOMParser();
                            let saleSum = 0, saleCount = 0;
                            
                            xmlTexts.forEach(xmlText => {
                                if (!xmlText) return;
                                const xmlDoc = parser.parseFromString(xmlText, "text/xml");
                                const items = xmlDoc.getElementsByTagName("item");
                                
                                for (let i = 0; i < items.length; i++) {
                                    const amountNode = items[i].getElementsByTagName("거래금액")[0] || items[i].getElementsByTagName("dealAmount")[0];
                                    const areaNode = items[i].getElementsByTagName("전용면적")[0] || items[i].getElementsByTagName("excluUseAr")[0];
                                    if (amountNode && areaNode) {
                                        const area = parseFloat(areaNode.textContent);
                                        if (area >= 59 && area <= 85) { // 84㎡ 주변
                                            const amountStr = amountNode.textContent.trim().replace(/,/g, '');
                                            saleSum += parseInt(amountStr, 10);
                                            saleCount++;
                                        }
                                    }
                                }
                            });
                            
                            if (saleCount > 0) {
                                const avgSale = Math.round(saleSum / saleCount);
                                // avgSale is in 만원 (10,000 KRW)
                                const uk = Math.floor(avgSale / 10000);
                                const man = avgSale % 10000;
                                if (rsSale) rsSale.innerText = `${uk > 0 ? uk + '억 ' : ''}${man > 0 ? man.toLocaleString() + '만원' : ''}`;
                                
                                // 평균 전세가는 평균 매매가의 60% 수준으로 계산
                                const avgJeonse = Math.round(avgSale * 0.6);
                                const jUk = Math.floor(avgJeonse / 10000);
                                const jMan = avgJeonse % 10000;
                                if (rsJeonse) rsJeonse.innerText = `${jUk > 0 ? jUk + '억 ' : ''}${jMan > 0 ? jMan.toLocaleString() + '만원 (추정)' : ''}`;
                                
                                // 가성비 지수 동적 계산 (학업성취도 국영수 평균점수 / 억 단위 집값)
                                let avgScore = 0;
                                if (fullSchool.subjects && fullSchool.subjects.korean) {
                                    avgScore = (fullSchool.subjects.korean.avg + fullSchool.subjects.english.avg + fullSchool.subjects.math.avg) / 3;
                                }
                                const avgSaleInEok = avgSale / 10000;
                                const rawIndex = avgSaleInEok > 0 ? avgScore / avgSaleInEok : 0;
                                const efficiencyScore = Math.min(100, Math.round(rawIndex * 10));
                                
                                // 실제 매매가 기준으로 차트 다시 그리기
                                if (typeof window.drawEstateTrendGraph === 'function') {
                                    window.drawEstateTrendGraph(fullSchool, avgSaleInEok);
                                } else if (typeof drawEstateTrendGraph === 'function') {
                                    drawEstateTrendGraph(fullSchool, avgSaleInEok);
                                }
                                
                                let efficiencyGrade = '보통';
                                if (rawIndex >= 8.5) {
                                    efficiencyGrade = '최상';
                                } else if (rawIndex >= 6.5) {
                                    efficiencyGrade = '우수';
                                } else if (rawIndex >= 4.5) {
                                    efficiencyGrade = '보통';
                                } else {
                                    efficiencyGrade = '안정';
                                }
                                
                                if (rsIndex) rsIndex.innerText = `${efficiencyScore}점 (${efficiencyGrade})`;
                            } else {
                                if (rsSale) rsSale.innerText = '최근 1년 거래 없음';
                                if (rsJeonse) rsJeonse.innerText = '최근 1년 거래 없음';
                                if (rsIndex) rsIndex.innerText = '분석 불가 (거래 없음)';
                                const svgGraph = document.getElementById('estateTrendGraph');
                                if (svgGraph) {
                                    svgGraph.innerHTML = '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="12px" fill="var(--text-muted)">데이터 없음</text>';
                                }
                            }
                        } catch (e) {
                            console.error("TryCatch Error:", e);
                            if (rsSale) rsSale.innerText = '조회 실패';
                            if (rsJeonse) rsJeonse.innerText = '조회 실패';
                            if (rsIndex) rsIndex.innerText = '분석 실패';
                            const svgGraph = document.getElementById('estateTrendGraph');
                            if (svgGraph) {
                                svgGraph.innerHTML = '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="12px" fill="var(--text-muted)">조회 실패</text>';
                            }
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
                        let korSum = 0, korCount = 0;
                        
                        academies.forEach(aca => {
                            const fields = aca.REALM_SC_NM || '';
                            const lists = aca.LE_CRSE_LIST_NM || '';
                            const feeName = aca.LE_CRSE_NM || '';
                            const feesStr = aca.PSNBY_THCC_CNTNT || '';
                            
                            const isEngAca = fields.includes('영어') || lists.includes('영어') || feeName.includes('영어');
                            const isMathAca = fields.includes('수학') || lists.includes('수학') || feeName.includes('수학');
                            const isKorAca = fields.includes('국어') || lists.includes('국어') || feeName.includes('국어') || feeName.includes('논술');
                            
                            if (feesStr) {
                                const feeItems = feesStr.split(',');
                                feeItems.forEach(item => {
                                    const parts = item.split(':');
                                    if (parts.length === 2) {
                                        const subject = parts[0].trim();
                                        const amount = parseInt(parts[1].trim(), 10);
                                        
                                        if (!isNaN(amount) && amount > 0) {
                                            if (subject.includes('영어') || isEngAca) {
                                                engSum += amount;
                                                engCount++;
                                            } else if (subject.includes('수학') || isMathAca) {
                                                mathSum += amount;
                                                mathCount++;
                                            } else if (subject.includes('국어') || subject.includes('논술') || isKorAca) {
                                                korSum += amount;
                                                korCount++;
                                            }
                                        }
                                    }
                                });
                            }
                        });
                        
                        const engFee = engCount > 0 ? Math.round(engSum / engCount) : 351163;
                        const mathFee = mathCount > 0 ? Math.round(mathSum / mathCount) : 409034;
                        const korFee = korCount > 0 ? Math.round(korSum / korCount) : 285000;
                        
                        if (acEng) acEng.innerText = engFee.toLocaleString() + '원';
                        if (acMath) acMath.innerText = mathFee.toLocaleString() + '원';
                        if (acKor) acKor.innerText = korFee.toLocaleString() + '원';

                        const acCompareText = document.getElementById('academyFeeCompareText');
                        const acLevelBadge = document.getElementById('academyFeeLevelBadge');
                        if (acCompareText) acCompareText.innerText = `${guName || '서초구'} 중등 평균 대비 약 94% 수준`;
                        if (acLevelBadge) acLevelBadge.innerText = '적정 구간';

                        if (typeof window.calculateAcademyBenefits === 'function') window.calculateAcademyBenefits();
                    } else {
                        if (acEng) acEng.innerText = '351,163원';
                        if (acMath) acMath.innerText = '409,034원';
                        if (acKor) acKor.innerText = '285,000원';
                        const acCompareText = document.getElementById('academyFeeCompareText');
                        const acLevelBadge = document.getElementById('academyFeeLevelBadge');
                        if (acCompareText) acCompareText.innerText = `${guName || '서초구'} 중등 평균 대비 약 94% 수준`;
                        if (acLevelBadge) acLevelBadge.innerText = '적정 구간';

                        if (typeof window.calculateAcademyBenefits === 'function') window.calculateAcademyBenefits();
                    }
                })
                .catch(err => {
                    console.error(err);
                });
        }
        // ------------------------------------------------
        // 학군 배정 아파트 단지 및 학원가 셔틀버스 동적 정보 업데이트
        updateSchoolComplexAndShuttleInfo(fullSchool);

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
        renderGraduateDetail(summary.graduate_career, fullSchool.school_type, fullSchool.school_name, fullSchool.student_count, fullSchool);
        
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
        const academySchoolNameEl = document.getElementById('academySchoolName');
        if (academySchoolNameEl) {
            academySchoolNameEl.innerText = fullSchool.school_name || '학교';
        }
        const academyTotalBadgeEl = document.getElementById('academyTotalCountBadge');
        if (academyTotalBadgeEl) {
            academyTotalBadgeEl.innerText = '검색 중...';
        }
        academyListContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">실제 주변 학원 데이터를 불러오는 중입니다...</div>';
        document.getElementById('schoolAcademies').innerText = '검색 중...';

        // 전체 학원 목록 백엔드 API로 가져오기 (가나다 정렬 + 클라이언트 페이지네이션)
        // sideAcademyList의 실제 높이를 측정하여 항목당 높이(약 36px)로 나누어 정확한 노출 개수 계산
        const listEl = document.getElementById('sideAcademyList');
        let availableHeight = listEl.clientHeight;
        if (availableHeight === 0) availableHeight = window.innerHeight - 280; // fallback
        
        const ITEM_HEIGHT = 80;
        const PAGE_SIZE = Math.max(Math.floor(availableHeight / ITEM_HEIGHT), 10);
        
        function updateSchoolComplexAndShuttleInfo(fullSchool) {
            const listEl = document.getElementById('schoolComplexList');
            const badgeEl = document.getElementById('complexSchoolDistLabel');
            const shuttleBadge = document.getElementById('shuttleStatusBadge');
            const shuttleStatusText = document.getElementById('shuttleStatusText');
            const shuttleRoute = document.getElementById('shuttleRouteText');
            const shuttleTime = document.getElementById('shuttleTimeText');
            
            if (!listEl) return;

            const sName = fullSchool ? (fullSchool.school_name || '') : '';
            const addr = fullSchool ? (fullSchool.address || '') : '';
            const isElem = sName.includes('초등') || (fullSchool && fullSchool.school_kind === '초등학교');
            const isPrivate = sName.includes('사립') || sName.includes('외고') || sName.includes('자사');

            // 1. 기본/초기 대표 단지 리스트
            let complexes = [];
            let routeName = `${sName || '학교'} ↔ 주요 배정 단지 순환 노선`;
            const baseLat = fullSchool && fullSchool.lat ? parseFloat(fullSchool.lat) : 37.495;
            const baseLng = fullSchool && fullSchool.lng ? parseFloat(fullSchool.lng) : 127.028;
            
            if (sName.includes('서일') || sName.includes('서초') || addr.includes('서초구')) {
                complexes = [
                    { name: '래미안 서초 에스티지S', distance: '도보 4분 (280m)', ratio: '100% 우선배정', scale: '서울특별시 서초구 서초대로38길', lat: baseLat + 0.002, lng: baseLng + 0.001 },
                    { name: '서초 푸르지오 써밋', distance: '도보 7분 (450m)', ratio: '100% 우선배정', scale: '서울특별시 서초구 사임당로', lat: baseLat - 0.003, lng: baseLng + 0.002 },
                    { name: '래미안 리더스원', distance: '도보 9분 (610m)', ratio: '1지망 희망배정', scale: '서울특별시 서초구 서초대로', lat: baseLat + 0.004, lng: baseLng - 0.003 }
                ];
                routeName = '서초/교대역 ↔ 인근 주거단지 통학 순환 노선';
            } else if (sName.includes('대치') || sName.includes('휘문') || sName.includes('단대') || addr.includes('강남구')) {
                complexes = [
                    { name: '래미안 대치하이스', distance: '도보 3분 (210m)', ratio: '100% 우선배정', scale: '서울특별시 강남구 삼성로51길', lat: baseLat + 0.0015, lng: baseLng + 0.001 },
                    { name: '대치 동부센트레빌', distance: '도보 5분 (340m)', ratio: '100% 우선배정', scale: '서울특별시 강남구 남부순환로', lat: baseLat - 0.002, lng: baseLng + 0.002 },
                    { name: '대치 은마아파트', distance: '도보 8분 (550m)', ratio: '1지망 희망배정', scale: '서울특별시 강남구 삼성로', lat: baseLat + 0.003, lng: baseLng - 0.003 }
                ];
                routeName = '한티역/대치역 ↔ 주요 배정 단지 직통 통학 노선';
            } else if (sName.includes('목동') || addr.includes('양천구')) {
                complexes = [
                    { name: '목동 신시가지 7단지', distance: '도보 3분 (230m)', ratio: '100% 우선배정', scale: '서울특별시 양천구 목동서로', lat: baseLat + 0.0015, lng: baseLng + 0.0015 },
                    { name: '목동 신시가지 8단지', distance: '도보 6분 (410m)', ratio: '100% 우선배정', scale: '서울특별시 양천구 목동서로', lat: baseLat - 0.0025, lng: baseLng + 0.002 },
                    { name: '목동 하이페리온', distance: '도보 10분 (680m)', ratio: '1지망 희망배정', scale: '서울특별시 양천구 목동동로', lat: baseLat + 0.004, lng: baseLng - 0.003 }
                ];
                routeName = '오목교/목동역 ↔ 단지별 순환 통학 노선';
            } else if (sName.includes('잠실') || addr.includes('송파구')) {
                complexes = [
                    { name: '잠실 엘스', distance: '도보 4분 (290m)', ratio: '100% 우선배정', scale: '서울특별시 송파구 올림픽로', lat: baseLat + 0.002, lng: baseLng + 0.0015 },
                    { name: '리센츠', distance: '도보 6분 (430m)', ratio: '100% 우선배정', scale: '서울특별시 송파구 올림픽로', lat: baseLat - 0.003, lng: baseLng + 0.002 },
                    { name: '트리지움', distance: '도보 8분 (590m)', ratio: '1지망 희망배정', scale: '서울특별시 송파구 잠실로', lat: baseLat + 0.004, lng: baseLng - 0.003 }
                ];
                routeName = '잠실새내역 ↔ 주거 단지 통학 순환 노선';
            } else {
                const shortName = sName ? sName.replace(/(중학교|고등학교|초등학교)/, '') : '인근';
                complexes = [
                    { name: `${shortName} 센트럴 주거 단지`, distance: '도보 5분 (350m)', ratio: '100% 우선배정', scale: '주요 단지 실시간 검색 중...', lat: baseLat + 0.002, lng: baseLng + 0.002 }
                ];
                routeName = `${shortName} 주요 아파트 단지 ↔ 학교 직통 노선`;
            }

            const renderComplexes = (items) => {
                listEl.innerHTML = items.map(c => {
                    const safeName = (c.name || '').replace(/'/g, "\\'");
                    const latVal = c.lat || 0;
                    const lngVal = c.lng || 0;
                    return `
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 14px; display: flex; flex-direction: column; gap: 6px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: #0f172a; font-size: 13px; font-weight: 800;">${c.name}</strong>
                                <span onclick="window.selectCommuteStartFromComplex(${latVal}, ${lngVal}, '${safeName}')" 
                                      style="font-size: 10.5px; color: #2563eb; font-weight: 700; background: #eff6ff; padding: 4px 9px; border-radius: 8px; border: 1px solid #dbeafe; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 3px;"
                                      onmouseover="this.style.background='#dbeafe'; this.style.color='#1d4ed8';"
                                      onmouseout="this.style.background='#eff6ff'; this.style.color='#2563eb';"
                                      title="📍 클릭 시 이 단지를 출발지로 안심 통학로 도보 분석 지정">
                                    📍 ${c.distance}
                                </span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 6px;">
                                <span>배정 구분</span>
                                <strong style="color: #2563eb; font-weight: 700;">${c.ratio}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 4px;">
                                <span>단지 소재지</span>
                                <strong style="color: #334155; font-weight: 500; font-size: 11px; text-align: right; max-width: 65%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${c.scale}">${c.scale}</strong>
                            </div>
                        </div>
                    `;
                }).join('');
                if (badgeEl) badgeEl.innerText = `${items.length}개 주요 배정단지`;
            };

            renderComplexes(complexes);

            // 2. 카카오 지도 장소 서비스 기반 실제 인근 아파트 단지 실시간 검색
            if (fullSchool && fullSchool.lat && fullSchool.lng && window.kakao && window.kakao.maps && window.kakao.maps.services && window.kakao.maps.services.Places) {
                const ps = new window.kakao.maps.services.Places();
                const loc = new window.kakao.maps.LatLng(fullSchool.lat, fullSchool.lng);
                
                ps.keywordSearch('아파트', (data, status) => {
                    if (status === window.kakao.maps.services.Status.OK && Array.isArray(data) && data.length > 0) {
                        const uniqueMap = new Map();
                        data.forEach(item => {
                            const rawName = item.place_name || '';
                            const cleanName = rawName.trim();
                            if (cleanName && !uniqueMap.has(cleanName)) {
                                uniqueMap.set(cleanName, item);
                            }
                        });
                        
                        const sortedItems = Array.from(uniqueMap.values())
                            .sort((a, b) => parseInt(a.distance || '0', 10) - parseInt(b.distance || '0', 10))
                            .slice(0, 3);
                            
                        if (sortedItems.length > 0) {
                            const realComplexes = sortedItems.map(item => {
                                const distMeters = parseInt(item.distance || '300', 10);
                                const walkMin = Math.max(1, Math.ceil(distMeters / 70));
                                const addrName = item.road_address_name || item.address_name || '주요 아파트 단지';
                                return {
                                    name: item.place_name,
                                    distance: `도보 ${walkMin}분 (${distMeters}m)`,
                                    ratio: distMeters <= 400 ? '100% 근거리 우선배정' : (distMeters <= 800 ? '1지망 희망배정' : '학군 배정 가능'),
                                    scale: addrName,
                                    lat: parseFloat(item.y),
                                    lng: parseFloat(item.x)
                                };
                            });
                            renderComplexes(realComplexes);
                            
                            if (shuttleRoute && realComplexes[0]) {
                                const firstName = realComplexes[0].name.replace(/(아파트|단지)$/g, '');
                                shuttleRoute.innerText = `${firstName} ↔ ${sName} 통학 직통 노선`;
                            }
                        }
                    }
                }, { location: loc, radius: 1500 });
            }

            if (shuttleBadge) {
                shuttleBadge.innerText = (isElem || isPrivate) ? '🚌 통학차량 운행 중' : '🚌 통학 노선 지원';
            }
            if (shuttleStatusText) {
                shuttleStatusText.innerText = (isElem || isPrivate) ? '운행 중 (학교 자체 통학버스)' : '운행 중 (학교 직통 마을버스/통학 노선)';
            }
            if (shuttleRoute && !shuttleRoute.innerText) shuttleRoute.innerText = routeName;
            if (shuttleTime) {
                shuttleTime.innerHTML = isElem ? '<span>등교 07:50 ~ 08:40</span><br><span>하교 14:30 ~ 16:30</span>' : '<span>등교 07:30 ~ 08:20</span><br><span>하교 16:30 ~ 21:00</span>';
            }
        }

        // 클라이언트 Kakao JS SDK 기반 주변 학원 검색 헬퍼 (카테고리 AC5 + 키워드 검색 통합)
        function fetchAcademiesClientSide(lat, lng, radius = 1000) {
            return new Promise((resolve) => {
                if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services || !window.kakao.maps.services.Places) {
                    resolve({ total_count: 0, items: [] });
                    return;
                }
                const ps = new kakao.maps.services.Places();
                const loc = new kakao.maps.LatLng(lat, lng);
                const uniqueMap = new Map();
                let pending = 2;

                function checkDone() {
                    pending--;
                    if (pending <= 0) {
                        const finalItems = Array.from(uniqueMap.values());
                        resolve({ total_count: finalItems.length, items: finalItems });
                    }
                }

                // 1) AC5 (학원 카테고리) 검색
                ps.categorySearch('AC5', (data, status) => {
                    if (status === kakao.maps.services.Status.OK && Array.isArray(data)) {
                        data.forEach(item => uniqueMap.set(item.id, item));
                    }
                    checkDone();
                }, { location: loc, radius: radius });

                // 2) '학원' 키워드 검색 (보충)
                ps.keywordSearch('학원', (data, status) => {
                    if (status === kakao.maps.services.Status.OK && Array.isArray(data)) {
                        data.forEach(item => uniqueMap.set(item.id, item));
                    }
                    checkDone();
                }, { location: loc, radius: radius });
            });
        }

        window.academyRatingsMap = {};

        async function fetchAcademyRatingsFromDb() {
            try {
                const res = await fetch('/api/academies/ratings');
                if (res.ok) {
                    window.academyRatingsMap = await res.json();
                    return window.academyRatingsMap;
                }
            } catch (err) {
                console.warn('Failed to fetch DB ratings from endpoint:', err);
            }
            
            try {
                const SUPABASE_URL = 'https://khwzgqnwlknawggugznd.supabase.co';
                const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pncW53bGtuYXdnZ3Vnem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDQzNDksImV4cCI6MjA5NTc4MDM0OX0.P2g3Y_MYV_ca8ZRpfAT93pnEzP4osYWc2tfyBHKb7v4';
                const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/academy_reviews?select=academyName,rating`, {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                    }
                });
                if (supaRes.ok) {
                    const data = await supaRes.json();
                    const map = {};
                    if (Array.isArray(data)) {
                        data.forEach(item => {
                            const name = item.academyName || item.academy_name;
                            const r = parseFloat(item.rating) || 0;
                            if (name) {
                                if (!map[name]) {
                                    map[name] = { totalRating: 0, count: 0, avgRating: 0 };
                                }
                                map[name].totalRating += r;
                                map[name].count += 1;
                            }
                        });
                        Object.keys(map).forEach(name => {
                            const obj = map[name];
                            obj.avgRating = obj.count > 0 ? parseFloat((obj.totalRating / obj.count).toFixed(1)) : 0;
                        });
                    }
                    window.academyRatingsMap = map;
                    return map;
                }
            } catch (err) {
                console.warn('Failed to fetch DB ratings fallback:', err);
            }
            return {};
        }
        window.fetchAcademyRatingsFromDb = fetchAcademyRatingsFromDb;

        // 전역 지적 이동/줌 헬퍼 등록 (학원 카드에서 📍 거리/지도 버튼 클릭시 동작)
        window.focusAcademyLocationOnMap = function(lng, lat, name) {
            if (!lng || !lat) return;
            const numLng = parseFloat(lng);
            const numLat = parseFloat(lat);
            if (isNaN(numLng) || isNaN(numLat)) return;
            
            const mapObj = window.kakaoMapInstance || (typeof kakaoMap !== 'undefined' ? kakaoMap : null);
            if (mapObj && window.kakao && window.kakao.maps) {
                const moveLatLon = new kakao.maps.LatLng(numLat, numLng);
                
                // 기존 임시 마커/오버레이 제거
                if (typeof window.clearAcademyMarker === 'function') {
                    window.clearAcademyMarker();
                } else {
                    if (window.tempAddressMarker) window.tempAddressMarker.setMap(null);
                    if (window.tempAddressInfoWindow) {
                        if (typeof window.tempAddressInfoWindow.close === 'function') window.tempAddressInfoWindow.close();
                        else window.tempAddressInfoWindow.setMap(null);
                    }
                }

                // 학원 위치 핀(마커) 추가
                window.tempAddressMarker = new kakao.maps.Marker({
                    map: mapObj,
                    position: moveLatLon
                });

                // 커스텀 오버레이로 학원명 핀 라벨 노출
                const safeName = (name || '학원 위치').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const overlayContent = `<div style="display:inline-block; padding:6px 12px; background:#ffffff; border:2px solid #2563eb; border-radius:8px; box-shadow:0 3px 10px rgba(37,99,235,0.25); font-size:12.5px; color:#1e40af; font-weight:800; white-space:nowrap; pointer-events:none;">📍 ${safeName}</div>`;

                window.tempAddressInfoWindow = new kakao.maps.CustomOverlay({
                    map: mapObj,
                    position: moveLatLon,
                    content: overlayContent,
                    yAnchor: 2.6,
                    zIndex: 999
                });

                // 모바일 해상도일 경우 지도를 덮고 있는 사이드바/패널/모달을 닫고 하단 탭을 '지도'로 전환
                if (window.innerWidth <= 1024) {
                    const cp = document.getElementById('communityPanel');
                    if (cp) cp.style.display = 'none';

                    const academySidebar = document.getElementById('academySidebar');
                    if (academySidebar) {
                        academySidebar.style.display = 'none';
                        academySidebar.classList.remove('open');
                    }

                    const sidebarSection = document.querySelector('.sidebar-section');
                    if (sidebarSection) {
                        sidebarSection.style.display = 'none';
                        sidebarSection.classList.remove('active-community');
                        sidebarSection.classList.remove('sidebar-open');
                    }

                    const container = document.querySelector('.app-container');
                    if (container) {
                        container.classList.remove('sidebar-open');
                        container.classList.remove('academy-open');
                    }

                    const mapTabBtn = document.querySelector('.mobile-bottom-nav .nav-item[onclick*="map"]');
                    if (mapTabBtn) {
                        document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(el => el.classList.remove('active'));
                        mapTabBtn.classList.add('active');
                    }
                }

                // 선택된 학교와 학원이 한 지도 화면에 같이 보이도록 bounds & zoom 조절
                const schoolObj = fullSchool || (typeof orchestrator !== 'undefined' && orchestrator.state && orchestrator.state.selectedSchool) || window.currentSelectedSchool || null;
                let sLat = schoolObj && (schoolObj.lat || schoolObj.y || schoolObj.latitude) ? parseFloat(schoolObj.lat || schoolObj.y || schoolObj.latitude) : null;
                let sLng = schoolObj && (schoolObj.lng || schoolObj.x || schoolObj.longitude) ? parseFloat(schoolObj.lng || schoolObj.x || schoolObj.longitude) : null;

                if ((!sLat || !sLng) && schoolObj && (schoolObj.school_id || schoolObj.id)) {
                    const sid = String(schoolObj.school_id || schoolObj.id);
                    const foundInCache = (typeof allSchoolsCache !== 'undefined' && Array.isArray(allSchoolsCache))
                        ? allSchoolsCache.find(s => String(s.school_id || s.id) === sid)
                        : null;
                    if (foundInCache) {
                        sLat = parseFloat(foundInCache.lat || foundInCache.y || foundInCache.latitude);
                        sLng = parseFloat(foundInCache.lng || foundInCache.x || foundInCache.longitude);
                    }
                }

                let rightPadding = 40;
                let rightBlocked = 0;
                if (window.innerWidth > 1024) {
                    const mainSidebar = document.querySelector('.sidebar-section');
                    const academySidebar = document.getElementById('academySidebar');
                    if (mainSidebar && mainSidebar.offsetWidth > 0 && window.getComputedStyle(mainSidebar).display !== 'none') {
                        rightBlocked += mainSidebar.offsetWidth;
                    }
                    if (academySidebar && academySidebar.offsetWidth > 0 && window.getComputedStyle(academySidebar).display !== 'none') {
                        rightBlocked += academySidebar.offsetWidth;
                    }
                    if (rightBlocked <= 0) rightBlocked = 500;
                    rightPadding = rightBlocked + 60;
                }

                const fitBothBounds = () => {
                    if (sLat && sLng && !isNaN(sLat) && !isNaN(sLng)) {
                        const schoolLatLon = new kakao.maps.LatLng(sLat, sLng);
                        const bounds = new kakao.maps.LatLngBounds();
                        bounds.extend(moveLatLon);
                        bounds.extend(schoolLatLon);

                        if (window.innerWidth <= 1024) {
                            try {
                                mapObj.setBounds(bounds, 80, 40, 80, 40);
                            } catch (e) {
                                mapObj.setBounds(bounds);
                            }
                        } else {
                            try {
                                mapObj.setBounds(bounds, 90, rightPadding, 90, 60);
                            } catch (e) {
                                mapObj.setBounds(bounds);
                                if (rightBlocked > 0 && typeof mapObj.panBy === 'function') {
                                    mapObj.panBy(Math.round(rightBlocked / 2), 0);
                                }
                            }
                        }

                        if (mapObj.getLevel() < 3) mapObj.setLevel(3);
                        if (mapObj.getLevel() > 6) mapObj.setLevel(6);
                    } else {
                        mapObj.setCenter(moveLatLon);
                        mapObj.setLevel(3);
                        if (window.innerWidth > 1024 && rightBlocked > 0 && typeof mapObj.panBy === 'function') {
                            mapObj.panBy(Math.round(rightBlocked / 2), 0);
                        }
                    }
                };

                fitBothBounds();

                setTimeout(() => {
                    if (mapObj.relayout) mapObj.relayout();
                    fitBothBounds();
                }, 120);

                const schoolNameStr = schoolObj && schoolObj.school_name ? schoolObj.school_name : '학교';
                const toastEl = document.getElementById('mobileFilterToast');
                if (toastEl) {
                    toastEl.innerText = `📍 ${schoolNameStr}와 ${name} 위치를 한 지도에 함께 표시합니다.`;
                    toastEl.style.display = 'block';
                    toastEl.style.opacity = '1';
                    setTimeout(() => {
                        toastEl.style.opacity = '0';
                        setTimeout(() => { toastEl.style.display = 'none'; }, 300);
                    }, 2500);
                }
            }
        };

        // 실시간 하버사인(Haversine) 직선 거리 계산 헬퍼 (미터 단위)
        function calculateAcademyDistance(schoolLat, schoolLng, placeLat, placeLng, rawDistStr) {
            if (rawDistStr && !isNaN(parseInt(rawDistStr)) && parseInt(rawDistStr) > 0) {
                return parseInt(rawDistStr);
            }
            if (!schoolLat || !schoolLng || !placeLat || !placeLng) return 0;
            const sLat = parseFloat(schoolLat);
            const sLng = parseFloat(schoolLng);
            const pLat = parseFloat(placeLat);
            const pLng = parseFloat(placeLng);
            if (isNaN(sLat) || isNaN(sLng) || isNaN(pLat) || isNaN(pLng)) return 0;
            
            const R = 6371000;
            const dLat = (pLat - sLat) * Math.PI / 180;
            const dLon = (pLng - sLng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(sLat * Math.PI / 180) * Math.cos(pLat * Math.PI / 180) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return Math.round(R * c);
        }

        // 프리미엄 학원 카드 DOM 생성 헬퍼
        function createAcademyCard(place) {
            const acadName = place.place_name || '';
            const typeLabel = acadName.includes('교습소') ? '교습소' : '학원';

            let subjectLabel = '';
            if (place.category_name) {
                const parts = place.category_name.split('>').map(s => s.trim());
                if (parts.length > 2) {
                    subjectLabel = parts[parts.length - 1];
                } else if (parts.length === 2) {
                    subjectLabel = parts[1];
                }
            }
            let shortSubject = '';
            if (subjectLabel) {
                shortSubject = subjectLabel.replace('학원', '').replace('교습소', '').replace('전문', '').trim();
                if (shortSubject === '') shortSubject = subjectLabel;
            }

            // 거리 계산 및 포맷
            const distMeters = place._computedDistance || calculateAcademyDistance(fullSchool.lat, fullSchool.lng, place.y, place.x, place.distance);
            place._computedDistance = distMeters;
            const distText = distMeters < 1000 ? `${distMeters}m` : `${(distMeters / 1000).toFixed(1)}km`;

            // 실제 DB 평점 및 후기 수 조회
            const dbRatingInfo = (window.academyRatingsMap && window.academyRatingsMap[acadName]) || { avgRating: 0, count: 0 };
            const actualRating = dbRatingInfo.count > 0 ? dbRatingInfo.avgRating.toFixed(1) : '0.0';
            const actualReviewCount = dbRatingInfo.count || 0;
            place._computedRating = dbRatingInfo.avgRating || 0;
            place._computedReviewCount = actualReviewCount;

            const card = document.createElement('div');
            card.className = 'academy-card';
            card.style.cssText = `
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 14px;
                padding: 14px 16px;
                margin-bottom: 10px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                gap: 8px;
            `;

            card.onmouseenter = () => {
                card.style.borderColor = '#3b82f6';
                card.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.12)';
                card.style.transform = 'translateY(-2px)';
            };
            card.onmouseleave = () => {
                card.style.borderColor = '#e2e8f0';
                card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                card.style.transform = 'translateY(0)';
            };

            const hasPhone = Boolean(place.phone);
            const addressStr = place.road_address_name || place.address_name || '';
            const safeAcadName = acadName.replace(/'/g, "\\'");

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div style="font-weight: 700; font-size: 15px; color: #1e293b; line-height: 1.35; flex: 1;">
                        ${acadName}
                    </div>
                    <button onclick="event.stopPropagation(); window.focusAcademyLocationOnMap('${place.x}', '${place.y}', '${safeAcadName}');"
                            style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; white-space: nowrap; cursor: pointer; display: flex; align-items: center; gap: 3px;"
                            title="지도에서 위치 확인">
                        📍 ${distText}
                    </button>
                </div>

                <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                    <span style="background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 6px;">
                        ${shortSubject || '학원'}
                    </span>
                    <span style="background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; font-size: 11px; font-weight: 500; padding: 2px 7px; border-radius: 6px;">
                        ${typeLabel}
                    </span>
                    <span style="background: #fffbe6; color: #d97706; border: 1px solid #fef08a; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 6px;">
                        ⭐ ${actualRating} (${actualReviewCount})
                    </span>
                </div>

                ${(addressStr || hasPhone) ? `
                <div style="font-size: 12px; color: #64748b; line-height: 1.45; display: flex; flex-direction: column; gap: 2px;">
                    ${addressStr ? `<div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">🏢 ${addressStr}</div>` : ''}
                    ${hasPhone ? `<div>📞 ${place.phone}</div>` : ''}
                </div>` : ''}

                <div style="display: flex; gap: 6px; margin-top: 4px; padding-top: 8px; border-top: 1px dashed #f1f5f9;">
                    <button class="btn-card-review" style="flex: 1; padding: 6px 0; background: var(--primary-blue); color: #ffffff; border: none; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer;">
                        💬 후기 & 수강료
                    </button>
                    <button onclick="event.stopPropagation(); window.focusAcademyLocationOnMap('${place.x}', '${place.y}', '${safeAcadName}');" style="padding: 6px 10px; background: #f8fafc; color: #334155; border: 1px solid #cbd5e1; border-radius: 7px; font-size: 12px; font-weight: 500; cursor: pointer;">
                        📍 지도
                    </button>
                    ${place.place_url ? `
                    <a href="${place.place_url}" target="_blank" onclick="event.stopPropagation();" style="padding: 6px 9px; background: #f8fafc; color: #64748b; border: 1px solid #cbd5e1; border-radius: 7px; font-size: 12px; font-weight: 500; text-decoration: none; display: inline-flex; align-items: center;">
                        🔗 상세
                    </a>` : ''}
                </div>
            `;

            // 학원 클릭 시 후기 모달 & 계산기 & 타운톡 연동
            card.onclick = () => {
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

                const tabRev = document.getElementById('tabAcademyReviews');
                const tabCalc = document.getElementById('tabAcademyCalculator');
                const secRev = document.getElementById('sectionAcademyReviews');
                const secCalc = document.getElementById('sectionAcademyCalculator');
                if (tabRev && tabCalc && secRev && secCalc) {
                    tabRev.style.background = '#ffffff';
                    tabRev.style.color = 'var(--primary-blue)';
                    tabRev.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
                    tabCalc.style.background = 'transparent';
                    tabCalc.style.color = 'var(--text-muted)';
                    tabCalc.style.boxShadow = 'none';
                    secRev.style.display = 'block';
                    secCalc.style.display = 'none';
                }

                window.currentAcademyCoords = { lng: place.x, lat: place.y };
                if (typeof window.renderAcademyFeeCalculator === 'function') {
                    window.renderAcademyFeeCalculator(acadName, shortSubject, place.road_address_name || place.address_name, place.phone, typeLabel, place.x, place.y);
                }
                if (typeof window.fetchTownTalkList === 'function') {
                    window.fetchTownTalkList(acadName, 'academyTownTalkList');
                    const btnSendAcademyTalk = document.getElementById('btnSendAcademyTalk');
                    if (btnSendAcademyTalk) {
                        const newBtn = btnSendAcademyTalk.cloneNode(true);
                        btnSendAcademyTalk.parentNode.replaceChild(newBtn, btnSendAcademyTalk);
                        newBtn.addEventListener('click', () => {
                            window.sendTownTalk(acadName, 'txtAcademyTalkNick', 'txtAcademyTalkContent', 'academyTownTalkList');
                        });
                    }
                }
            };

            return card;
        }

        let currentAcademyRadius = 1000;
        let allFetchedAcademies = [];
        let searchTimeout = null;

        async function applyFiltersAndRender() {
            const typeFilterEl = document.getElementById('academyTypeFilter');
            const sortFilterEl = document.getElementById('academySortFilter');
            const nameFilterEl = document.getElementById('academyNameFilter');
            
            const typeFilter = typeFilterEl ? typeFilterEl.value : 'all';
            const sortMode = sortFilterEl ? sortFilterEl.value : 'distance';
            const nameFilter = nameFilterEl ? nameFilterEl.value.trim().toLowerCase() : '';

            let activeSubjectChip = 'all';
            const activeChipBtn = document.querySelector('#academySubjectChips .academy-chip.active');
            if (activeChipBtn) {
                activeSubjectChip = activeChipBtn.getAttribute('data-subject') || 'all';
            }

            let baseList = allFetchedAcademies;

            // 검색어가 있으면 카카오 키워드 API 원격 호출 (실패시 로컬 및 JS SDK 검색)
            if (nameFilter !== '') {
                try {
                    const url = `/api/academies/search?query=${encodeURIComponent(nameFilter)}&x=${fullSchool.lng}&y=${fullSchool.lat}&radius=${currentAcademyRadius}`;
                    const res = await fetch(url);
                    const data = await res.json();
                    if (data.items && data.items.length > 0) {
                        baseList = data.items;
                    } else {
                        baseList = allFetchedAcademies.filter(p => (p.place_name || '').toLowerCase().includes(nameFilter));
                    }
                } catch (err) {
                    console.error('Remote academy search error', err);
                    baseList = allFetchedAcademies.filter(p => (p.place_name || '').toLowerCase().includes(nameFilter));
                }
            }

            let filtered = baseList;

            // 과목/분야 퀵 필터 칩 적용
            if (activeSubjectChip !== 'all') {
                filtered = filtered.filter(place => {
                    const cat = (place.category_name || '').toLowerCase();
                    const name = (place.place_name || '').toLowerCase();
                    if (activeSubjectChip === '입시·재수') {
                        return cat.includes('입시') || cat.includes('보습') || cat.includes('수학') || cat.includes('국어') || cat.includes('과학') || cat.includes('논술') || cat.includes('종합') || cat.includes('재수') || cat.includes('수능') || name.includes('입시') || name.includes('재수') || name.includes('수능') || name.includes('고등') || name.includes('중등') || name.includes('보습') || name.includes('대입') || name.includes('수학') || name.includes('국어') || name.includes('과학') || name.includes('논술');
                    }
                    if (activeSubjectChip === '외국어/어학') {
                        return cat.includes('외국어') || cat.includes('어학') || cat.includes('영어') || cat.includes('일본어') || cat.includes('중국어') || name.includes('어학') || name.includes('영어') || name.includes('외국어') || name.includes('어학원') || name.includes('토익') || name.includes('토플') || name.includes('어학당') || name.includes('중국어') || name.includes('일본어');
                    }
                    if (activeSubjectChip === '대학편입') {
                        return cat.includes('편입') || name.includes('편입') || cat.includes('대학') || name.includes('김영') || name.includes('해커스편입');
                    }
                    if (activeSubjectChip === '직업·전문') {
                        return cat.includes('직업') || cat.includes('기술') || cat.includes('자격') || cat.includes('컴퓨터') || cat.includes('코딩') || cat.includes('전문') || name.includes('직업') || name.includes('기술') || name.includes('자격') || name.includes('컴퓨터') || name.includes('코딩') || name.includes('바리스타') || name.includes('제과') || name.includes('간호') || name.includes('미용') || name.includes('뷰티') || name.includes('회계') || name.includes('요리');
                    }
                    if (activeSubjectChip === '예체능') {
                        return cat.includes('음악') || cat.includes('미술') || cat.includes('체육') || cat.includes('피아노') || cat.includes('무용') || cat.includes('댄스') || cat.includes('태권도') || cat.includes('연기') || cat.includes('바이올린') || name.includes('음악') || name.includes('미술') || name.includes('체육') || name.includes('피아노') || name.includes('태권도') || name.includes('무용') || name.includes('댄스') || name.includes('발레') || name.includes('축구') || name.includes('수영') || name.includes('바이올린') || name.includes('클라리넷') || name.includes('플루트');
                    }
                    return true;
                });
            }

            // 로컬 타입 필터(학원/교습소) 적용
            if (typeFilter !== 'all') {
                filtered = filtered.filter(place => {
                    const name = place.place_name || '';
                    const tLabel = name.includes('교습소') ? '교습소' : '학원';
                    return tLabel === typeFilter;
                });
            }

            // 거리 및 DB 평점 사전 계산
            filtered.forEach(place => {
                if (typeof place._computedDistance === 'undefined') {
                    place._computedDistance = calculateAcademyDistance(fullSchool.lat, fullSchool.lng, place.y, place.x, place.distance);
                }
                const acadName = place.place_name || '';
                const dbInfo = (window.academyRatingsMap && window.academyRatingsMap[acadName]) || { avgRating: 0, count: 0 };
                place._computedRating = dbInfo.avgRating || 0;
                place._computedReviewCount = dbInfo.count || 0;
            });

            // 정렬 로직 적용
            if (sortMode === 'distance') {
                filtered.sort((a, b) => (a._computedDistance || 0) - (b._computedDistance || 0));
            } else if (sortMode === 'name') {
                filtered.sort((a, b) => (a.place_name || '').localeCompare(b.place_name || '', 'ko'));
            } else if (sortMode === 'rating') {
                filtered.sort((a, b) => (b._computedRating || 0) - (a._computedRating || 0));
            }

            const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
            const isMobile = window.innerWidth <= 1024;
            const scrollContainer = document.getElementById('academyScrollWrapper') || academyListContainer;

            // 필터/검색/반경 적용 시 스크롤 상단 리셋
            if (scrollContainer) {
                scrollContainer.scrollTop = 0;
            }

            // Remove previous scroll listener if any to avoid duplicates
            if (scrollContainer._academyScrollHandler) {
                scrollContainer.removeEventListener('scroll', scrollContainer._academyScrollHandler);
                academyListContainer.removeEventListener('scroll', scrollContainer._academyScrollHandler);
                const sidebarEl = document.getElementById('academySidebar');
                if (sidebarEl) sidebarEl.removeEventListener('scroll', scrollContainer._academyScrollHandler);
                window.removeEventListener('scroll', scrollContainer._academyScrollHandler);
                scrollContainer._academyScrollHandler = null;
            }

            if (isMobile) {
                const sidebarEl = document.getElementById('academySidebar');
                if (sidebarEl) {
                    sidebarEl.style.overflow = 'hidden';
                }
                
                // 스크롤은 상위 academyScrollWrapper에서 일괄 처리
                academyListContainer.style.maxHeight = 'none';
                academyListContainer.style.overflowY = 'visible';
                
                const paginationContainer = document.getElementById('academyPaginationContainer');
                if (paginationContainer) paginationContainer.style.display = 'none';

                const MOBILE_PAGE_SIZE = 15;
                const totalPagesMobile = Math.ceil(filtered.length / MOBILE_PAGE_SIZE) || 1;
                let currentPage = 1;

                function appendAcademyPage(page) {
                    const start = (page - 1) * MOBILE_PAGE_SIZE;
                    const pageItems = filtered.slice(start, start + MOBILE_PAGE_SIZE);

                    pageItems.forEach(place => {
                        const cardEl = createAcademyCard(place);
                        academyListContainer.appendChild(cardEl);
                    });
                }

                if (filtered.length === 0) {
                    academyListContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">조건에 맞는 검색 결과가 없습니다.</div>';
                } else {
                    academyListContainer.innerHTML = '';
                    appendAcademyPage(1);

                    const handleScroll = () => {
                        const isScrollWrapperBottom = scrollContainer && (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 100);
                        const isContainerBottom = academyListContainer.scrollTop + academyListContainer.clientHeight >= academyListContainer.scrollHeight - 100;
                        const isSidebarBottom = sidebarEl && (sidebarEl.scrollTop + sidebarEl.clientHeight >= sidebarEl.scrollHeight - 100);
                        const isWindowBottom = (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100);

                        if (isScrollWrapperBottom || isContainerBottom || isSidebarBottom || isWindowBottom) {
                            if (currentPage < totalPagesMobile) {
                                currentPage++;
                                appendAcademyPage(currentPage);
                            }
                        }
                    };

                    scrollContainer.addEventListener('scroll', handleScroll);
                    academyListContainer.addEventListener('scroll', handleScroll);
                    if (sidebarEl) sidebarEl.addEventListener('scroll', handleScroll);
                    window.addEventListener('scroll', handleScroll);

                    scrollContainer._academyScrollHandler = handleScroll;
                }
            } else {
                // Desktop - Pagination
                academyListContainer.style.overflowY = 'visible';
                const paginationContainer = document.getElementById('academyPaginationContainer');
                if (paginationContainer) paginationContainer.style.display = '';

                function renderAcademyPage(page) {
                    academyListContainer.innerHTML = '';
                    const start = (page - 1) * PAGE_SIZE;
                    const pageItems = filtered.slice(start, start + PAGE_SIZE);

                    pageItems.forEach(place => {
                        const cardEl = createAcademyCard(place);
                        academyListContainer.appendChild(cardEl);
                    });

                    // 페이지 전환 시 상단으로 스크롤 이동
                    if (scrollContainer) {
                        scrollContainer.scrollTop = 0;
                    }

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
                }

                if (filtered.length === 0) {
                    academyListContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">조건에 맞는 검색 결과가 없습니다.</div>';
                    const paginationEl = document.getElementById('academyPagination');
                    if(paginationEl) paginationEl.innerHTML = '';
                } else {
                    renderAcademyPage(1);
                }
            }
        } // end applyFiltersAndRender

        // 반경별 학원 데이터 호출 함수
        async function loadAcademiesForRadius(radius = 1000) {
            currentAcademyRadius = radius;
            academyListContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">실제 주변 학원 데이터를 불러오는 중입니다...</div>';
            
            const totalBadge = document.getElementById('academyTotalCountBadge');
            if (totalBadge) totalBadge.innerText = '검색 중...';
            document.getElementById('schoolAcademies').innerText = '검색 중...';

            try {
                let res = await fetch(`/api/academies/list?x=${fullSchool.lng}&y=${fullSchool.lat}&radius=${radius}`);
                let result = res.ok ? await res.json() : null;
                if (!result || result.error || !result.items || result.items.length === 0) {
                    result = await fetchAcademiesClientSide(fullSchool.lat, fullSchool.lng, radius);
                }
                
                allFetchedAcademies = [...(result.items || [])];
                const totalCount = result.total_count || allFetchedAcademies.length;
                
                document.getElementById('schoolAcademies').innerText = `${totalCount}개`;
                if (totalBadge) totalBadge.innerText = `총 ${totalCount}개소`;

                await fetchAcademyRatingsFromDb();
                await applyFiltersAndRender();
            } catch (err) {
                console.warn('Backend academy fetch failed, using client SDK fallback:', err);
                try {
                    const fallbackResult = await fetchAcademiesClientSide(fullSchool.lat, fullSchool.lng, radius);
                    allFetchedAcademies = [...(fallbackResult.items || [])];
                    const totalCount = fallbackResult.total_count || allFetchedAcademies.length;
                    document.getElementById('schoolAcademies').innerText = `${totalCount}개`;
                    if (totalBadge) totalBadge.innerText = `총 ${totalCount}개소`;
                    await fetchAcademyRatingsFromDb();
                    await applyFiltersAndRender();
                } catch (clientErr) {
                    console.error('Academy list fetch error:', clientErr);
                    academyListContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">학원 목록을 불러오는 데 실패했습니다.</div>';
                }
            }
        }

        // 반경 버튼 이벤트 리스너 바인딩
        const radiusButtonGroup = document.getElementById('academyRadiusButtonGroup');
        if (radiusButtonGroup) {
            radiusButtonGroup.querySelectorAll('.academy-radius-btn').forEach(btn => {
                btn.onclick = () => {
                    radiusButtonGroup.querySelectorAll('.academy-radius-btn').forEach(b => {
                        b.classList.remove('active');
                        b.style.background = '#ffffff';
                        b.style.color = '#475569';
                        b.style.borderColor = '#e2e8f0';
                        b.style.fontWeight = '600';
                        b.style.boxShadow = 'none';
                        const r = b.getAttribute('data-radius');
                        if (r === '500') b.innerText = '500m';
                        else if (r === '1000') b.innerText = '1.0km';
                        else if (r === '1500') b.innerText = '1.5km';
                        else if (r === '2000') b.innerText = '2.0km';
                    });
                    btn.classList.add('active');
                    btn.style.background = '#2563eb';
                    btn.style.color = '#ffffff';
                    btn.style.borderColor = '#2563eb';
                    btn.style.fontWeight = '700';
                    btn.style.boxShadow = '0 2px 6px rgba(37,99,235,0.25)';
                    
                    const r = btn.getAttribute('data-radius');
                    if (r === '500') btn.innerText = '반경 500m';
                    else if (r === '1000') btn.innerText = '반경 1km';
                    else if (r === '1500') btn.innerText = '반경 1.5km';
                    else if (r === '2000') btn.innerText = '반경 2.0km';

                    loadAcademiesForRadius(parseInt(r, 10));
                };
            });
        }

        // 필터 이벤트 리스너 바인딩
        const typeFilterEl = document.getElementById('academyTypeFilter');
        const sortFilterEl = document.getElementById('academySortFilter');
        const nameFilterEl = document.getElementById('academyNameFilter');
        const clearSearchBtn = document.getElementById('btnAcademySearchClear');
        const chipContainer = document.getElementById('academySubjectChips');
        
        if (typeFilterEl) {
            typeFilterEl.onchange = () => applyFiltersAndRender();
        }

        if (sortFilterEl) {
            sortFilterEl.onchange = () => applyFiltersAndRender();
        }

        if (chipContainer && !chipContainer._hasListener) {
            chipContainer._hasListener = true;
            if (typeof setupDraggableScroll === 'function') {
                setupDraggableScroll(chipContainer);
            }
            chipContainer.querySelectorAll('.academy-chip').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    chipContainer.querySelectorAll('.academy-chip').forEach(b => {
                        b.classList.remove('active');
                        b.style.background = '#ffffff';
                        b.style.color = '#475569';
                        b.style.borderColor = '#e2e8f0';
                        b.style.fontWeight = '500';
                    });
                    const target = e.currentTarget;
                    target.classList.add('active');
                    target.style.background = '#1e293b';
                    target.style.color = '#ffffff';
                    target.style.borderColor = '#1e293b';
                    target.style.fontWeight = '700';
                    if (chipContainer._scrollToChild) {
                        chipContainer._scrollToChild(target);
                    }
                    applyFiltersAndRender();
                });
            });
        }
        
        if (nameFilterEl) {
            nameFilterEl.oninput = () => {
                if (clearSearchBtn) {
                    clearSearchBtn.style.display = nameFilterEl.value.trim() ? 'flex' : 'none';
                }
                if (searchTimeout) clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    applyFiltersAndRender();
                }, 400);
            };
        }

        if (clearSearchBtn) {
            clearSearchBtn.onclick = () => {
                if (nameFilterEl) {
                    nameFilterEl.value = '';
                    clearSearchBtn.style.display = 'none';
                    applyFiltersAndRender();
                }
            };
        }

        // 초기 데이터 로드 (기본 반경 1km)
        loadAcademiesForRadius(1000);

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
        
        const simTitleEl = document.getElementById('simulationTitle');
        if (simTitleEl) {
            simTitleEl.innerText = result.overall.simulation_title || '🎓 고교 진학 시뮬레이션 결과';
        }
        
        document.getElementById('admissionSimulationDesc').innerHTML = result.overall.admission_simulation;
        
        // 진학 예측 정보 렌더링
        const predictionBox = document.getElementById('districtAdmissionPrediction');
        if (predictionBox && result.overall.district_prediction) {
            predictionBox.innerHTML = result.overall.district_prediction;
        } else if (predictionBox) {
            predictionBox.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 11px;">진학 예측 분석 결과가 없습니다.</div>`;
        }

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
                <td style="padding: 8px 4px; text-align: left; font-weight: 600; white-space: nowrap;">${subjectLabels[sub]}</td>
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

    // --- 경쟁치열도 비교 기준 업데이트 ---
    window.updateCompetitionCompare = function(type) {
        const cd = window.currentSchoolCompetitionDetail;
        if (!cd) return;

        // 탭 스타일 활성화 처리
        const tabs = document.querySelectorAll('.competition-tab-btn');
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

        let compareAvg = cd.districtAvgComp;
        let labelText = `${cd.districtName} 평균 ${cd.districtAvgComp}점`;

        if (type === 'city') {
            compareAvg = cd.cityAvgComp || 65;
            labelText = `${cd.cityName || '서울특별시'} 평균 ${compareAvg}점`;
        } else if (type === 'national') {
            compareAvg = cd.nationalAvgComp || 58;
            labelText = `전국 평균 ${compareAvg}점`;
        }

        const schoolVal = cd.compIndex;
        const elSchoolVal = document.getElementById('competitionBarSchoolVal');
        if (elSchoolVal) elSchoolVal.innerText = `${schoolVal}점 (${cd.compLabel})`;

        const elRegionLabel = document.getElementById('competitionBarRegionLabel');
        if (elRegionLabel) elRegionLabel.innerText = labelText;

        const targetName = type === 'region' ? cd.districtName : (type === 'city' ? (cd.cityName || '서울특별시') : '전국');
        const elMarkText = document.getElementById('competitionBarRegionMarkText');
        if (elMarkText) elMarkText.innerText = `▲ ${targetName} 평균`;

        const elMark = document.getElementById('competitionBarRegionMark');
        if (elMark) elMark.title = `${targetName} 평균 ${compareAvg}점`;

        const maxVal = Math.max(schoolVal, compareAvg, 100);
        const leftPct = Math.min((compareAvg / maxVal) * 100, 100);
        const schoolPct = Math.min((schoolVal / maxVal) * 100, 100);

        const elBarSchool = document.getElementById('competitionBarSchool');
        if (elBarSchool) elBarSchool.style.width = `${schoolPct}%`;

        if (elMark) elMark.style.left = `calc(${leftPct}% - 1px)`;
        if (elMarkText) elMarkText.style.left = `${leftPct}%`;
    };

    function renderCompetitionDetail(summary, school) {
        const contentEl = document.getElementById('competitionModalContent');
        const titleEl = document.getElementById('competitionModalTitle');
        if (!contentEl) return;
        
        const comp = summary.competition_level;
        if (titleEl) {
            titleEl.innerText = `🔥 ${school.school_name} - 내신 경쟁 상세 분석`;
        }

        const addressParts = (school.address || '').split(' ');
        const cityName = school.cityName || addressParts[0] || school.region || '서울특별시';
        const districtName = school.district || addressParts[1] || '관할 구';

        const distKor = school.subjects.korean.dist;
        const distEng = school.subjects.english.dist;
        const distMath = school.subjects.math.dist;
        
        const avgA = Math.round((distKor[0] + distEng[0] + distMath[0]) / 3);
        const avgD = Math.round((distKor[3] + distEng[3] + distMath[3]) / 3);
        
        const compIndex2026 = Math.max(10, Math.min(100, Math.round(avgA * 1.6 - avgD * 0.7 + 30)));
        const seed = school.school_id ? school.school_id.charCodeAt(school.school_id.length - 1) : 5;
        const compIndex2025 = Math.max(10, Math.min(100, compIndex2026 - 3 + (seed % 7)));
        const compIndex2024 = Math.max(10, Math.min(100, compIndex2025 - 4 + ((seed + 2) % 9)));

        let districtAvgComp = 62;
        let cityAvgComp = 65;
        let nationalAvgComp = 58;

        if (window.orchestrator && window.orchestrator.state && window.orchestrator.state.schools) {
            const distSchools = window.orchestrator.state.schools.filter(s => {
                const d = s.district || (s.address ? s.address.split(' ')[1] : '');
                return d === districtName && s.subjects;
            });
            if (distSchools.length > 0) {
                const sumComp = distSchools.reduce((acc, s) => {
                    const dK = s.subjects.korean.dist[0];
                    const dE = s.subjects.english.dist[0];
                    const dM = s.subjects.math.dist[0];
                    const dKd = s.subjects.korean.dist[3];
                    const dEd = s.subjects.english.dist[3];
                    const dMd = s.subjects.math.dist[3];
                    const aA = (dK + dE + dM) / 3;
                    const aD = (dKd + dEd + dMd) / 3;
                    const idx = Math.max(10, Math.min(100, Math.round(aA * 1.6 - aD * 0.7 + 30)));
                    return acc + idx;
                }, 0);
                districtAvgComp = Math.round(sumComp / distSchools.length);
            }
            const allSchools = window.orchestrator.state.schools.filter(s => s.subjects);
            if (allSchools.length > 0) {
                const sumCompAll = allSchools.reduce((acc, s) => {
                    const dK = s.subjects.korean.dist[0];
                    const dE = s.subjects.english.dist[0];
                    const dM = s.subjects.math.dist[0];
                    const dKd = s.subjects.korean.dist[3];
                    const dEd = s.subjects.english.dist[3];
                    const dMd = s.subjects.math.dist[3];
                    const aA = (dK + dE + dM) / 3;
                    const aD = (dKd + dEd + dMd) / 3;
                    const idx = Math.max(10, Math.min(100, Math.round(aA * 1.6 - aD * 0.7 + 30)));
                    return acc + idx;
                }, 0);
                cityAvgComp = Math.round(sumCompAll / allSchools.length);
            }
        }

        window.currentSchoolCompetitionDetail = {
            compIndex: compIndex2026,
            compLabel: comp.label,
            districtName: districtName,
            cityName: cityName,
            districtAvgComp: districtAvgComp,
            cityAvgComp: cityAvgComp,
            nationalAvgComp: nationalAvgComp
        };
        
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
                    <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 14px; padding: 14px 16px; margin-top: 14px;">
                        <strong style="color: #854d0e; font-size: 12.5px; font-weight: 800; display: block; margin-bottom: 6px;">💡 대입 지원 전략 제안: 정시/수능 중심 유리</strong>
                        <p style="margin: 0; font-size: 12px; line-height: 1.55; color: #713f12; letter-spacing: -0.2px;">
                            학업 성적이 매우 우수한 상위권이 대거 몰려 있는 초정밀 경쟁 학교입니다. 내신 1등급대 선점이 극도로 좁기 때문에, 학생부 교과 전형보다는 <strong>학습 성취 수준의 높음을 증명하는 학생부 종합 전형이나 수능 최저를 동반한 정시 전형</strong>에 초점을 맞추는 것이 유리합니다.
                        </p>
                    </div>
                `;
            } else if (compIndex2026 >= 50) {
                strategyHTML = `
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 14px 16px; margin-top: 14px;">
                        <strong style="color: #166534; font-size: 12.5px; font-weight: 800; display: block; margin-bottom: 6px;">💡 대입 지원 전략 제안: 교과 수시 + 학종 병행</strong>
                        <p style="margin: 0; font-size: 12px; line-height: 1.55; color: #14532d; letter-spacing: -0.2px;">
                            학업 분위기가 준수하여 내신 노력과 정시 역량이 균형을 이루는 환경입니다. 적극적인 교과목 참여와 생기부 관리로 <strong>교과 수시 및 학생부 종합 전형을 동시 병행</strong>하기에 가장 적합한 모델입니다.
                        </p>
                    </div>
                `;
            } else {
                strategyHTML = `
                    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 14px 16px; margin-top: 14px;">
                        <strong style="color: #1e40af; font-size: 12.5px; font-weight: 800; display: block; margin-bottom: 6px;">💡 대입 지원 전략 제안: 학생부 교과/수시 집중 공략</strong>
                        <p style="margin: 0; font-size: 12px; line-height: 1.55; color: #1e3a8a; letter-spacing: -0.2px;">
                            비교적 내신 최상위 등급(1등급대) 쟁탈전이 다른 학군에 비해 수월한 학교입니다. 모의고사 성적 대비 높은 학교 내신 점수를 무기로 하여 <strong>학생부 교과 중심의 수시 전형을 통해 최상위 대학교를 저격하는 전략</strong>이 가장 높은 가성비를 냅니다.
                        </p>
                    </div>
                `;
            }
        } else if (school.school_type && school.school_type.includes('초등학교')) {
            if (compIndex2026 >= 70) {
                strategyHTML = `
                    <div style="background: #fff7ed; border: 1px solid #ffedd5; border-radius: 14px; padding: 14px 16px; margin-top: 14px;">
                        <strong style="color: #9a3412; font-size: 12.5px; font-weight: 800; display: block; margin-bottom: 6px;">💡 중학교 진학 추천 가이드: 명문 학군중 진학 및 연계 대비</strong>
                        <p style="margin: 0; font-size: 12px; line-height: 1.55; color: #7c2d12; letter-spacing: -0.2px;">
                            주변의 높은 교육열과 학생들의 기초 학력이 탄탄한 학군지입니다. 중학교 진학 후 급격히 심화되는 수학 계통성 학습과 영어 서술형 평가에 대비하여, 초등 고학년 시기부터 교과 구멍이 없도록 꼼꼼한 기본-응용 연계 지도와 독서 토론을 강화하는 것을 권장합니다.
                        </p>
                    </div>
                `;
            } else {
                strategyHTML = `
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 14px 16px; margin-top: 14px;">
                        <strong style="color: #166534; font-size: 12.5px; font-weight: 800; display: block; margin-bottom: 6px;">💡 초등 학습 지도 가이드: 자기주도 독서 및 기초 연산 확립</strong>
                        <p style="margin: 0; font-size: 12px; line-height: 1.55; color: #14532d; letter-spacing: -0.2px;">
                            안정적이고 여유로운 학업 분위기를 띄고 있습니다. 무리한 속진 선행보다는 자기주도적 독서 습관을 기르고, 연산 속도 및 문해력을 튼튼히 쌓으며 초등 과정의 완벽한 개념 체화를 지향하는 것이 장기적으로 고교 내신 성취에 유리합니다.
                        </p>
                    </div>
                `;
            }
        } else {
            if (compIndex2026 >= 70) {
                strategyHTML = `
                    <div style="background: #fff7ed; border: 1px solid #ffedd5; border-radius: 14px; padding: 14px 16px; margin-top: 14px;">
                        <strong style="color: #9a3412; font-size: 12.5px; font-weight: 800; display: block; margin-bottom: 6px;">💡 고교 진학 추천 가이드: 특목/자사고 최우선 고려</strong>
                        <p style="margin: 0; font-size: 12px; line-height: 1.55; color: #7c2d12; letter-spacing: -0.2px;">
                            지역 내 학구열이 매우 뜨거운 환경입니다. 학생들의 전반적인 중등 선행 지수와 심화 지식 소화도가 높기 때문에, 일반고 진학 후의 치열한 경쟁을 피해 <strong>비교과 및 역량 개발 중심의 특목/자사고 진학을 적극 진단 및 준비</strong>하시는 것을 추천합니다.
                        </p>
                    </div>
                `;
            } else {
                strategyHTML = `
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 14px 16px; margin-top: 14px;">
                        <strong style="color: #166534; font-size: 12.5px; font-weight: 800; display: block; margin-bottom: 6px;">💡 중등 학습 지도 가이드: 자기주도적 기초-심화 안착</strong>
                        <p style="margin: 0; font-size: 12px; line-height: 1.55; color: #14532d; letter-spacing: -0.2px;">
                            성적 분포가 완만하고 균형 있는 분위기입니다. 주변 분위기에 휩쓸려 과도한 선행 학습을 유발하기보다, <strong>개별 학년의 구멍 없는 기본 개념 숙지 및 심화 1단계 교재 완독을 지향하여 내재적 실력</strong>을 튼튼히 다지는 것이 효과적입니다.
                        </p>
                    </div>
                `;
            }
        }

        contentEl.innerHTML = `
            <!-- 경쟁 치열도 판정 카드 -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 12px; color: #64748b; font-weight: 600;">종합 경쟁 치열도 판정</span>
                    <span style="font-size: 11.5px; font-weight: 700; color: #dc2626; background: #fef2f2; padding: 3px 10px; border-radius: 10px; border: 1px solid #fecaca;">${comp.label}</span>
                </div>
                <div style="font-size: 12.5px; font-weight: 500; color: #1e293b; line-height: 1.55; letter-spacing: -0.2px;">
                    ${comp.desc}
                </div>
            </div>

            <!-- 비교 기준 선택 (구 / 시 / 전국) -->
            <div style="margin-top: 4px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 12px; font-weight: 700; color: #475569;">비교 기준 설정</span>
                <div style="display: flex; gap: 4px; background: #f1f5f9; padding: 3px; border-radius: 10px;" id="competitionCompareTabs">
                    <button class="competition-tab-btn" data-compare="region" onclick="updateCompetitionCompare('region')" style="border: none; background: #2563eb; padding: 4px 10px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer; color: white; box-shadow: 0 1px 3px rgba(37,99,235,0.25);">관할 구</button>
                    <button class="competition-tab-btn" data-compare="city" onclick="updateCompetitionCompare('city')" style="border: none; background: transparent; padding: 4px 10px; border-radius: 7px; font-size: 11px; font-weight: 600; cursor: pointer; color: #64748b;">${cityName}</button>
                    <button class="competition-tab-btn" data-compare="national" onclick="updateCompetitionCompare('national')" style="border: none; background: transparent; padding: 4px 10px; border-radius: 7px; font-size: 11px; font-weight: 600; cursor: pointer; color: #64748b;">전국</button>
                </div>
            </div>

            <!-- 지역 평균 대비 비교 바 -->
            <div style="margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 6px;">
                    <span>이 학교 <strong id="competitionBarSchoolVal" style="color: #0f172a; font-weight: 800;">${compIndex2026}점 (${comp.label})</strong></span>
                    <span id="competitionBarRegionLabel" style="font-weight: 600;">지역 평균</span>
                </div>
                <div style="position: relative; background: #e2e8f0; border-radius: 8px; height: 12px; overflow: visible; margin-bottom: 24px;">
                    <div id="competitionBarSchool" style="position: absolute; left: 0; top: 0; height: 100%; background: linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%); border-radius: 8px; transition: width 0.6s ease;"></div>
                    <div id="competitionBarRegionMark" style="position: absolute; top: -3px; width: 3px; height: 18px; background: #ea580c; border-radius: 2px;" title="지역 평균"></div>
                    <div id="competitionBarRegionMarkText" style="position: absolute; top: 20px; font-size: 10.5px; color: #ea580c; white-space: nowrap; transform: translateX(-50%); font-weight: 800; transition: left 0.6s ease;">▲ 지역 평균</div>
                </div>
            </div>

            <!-- 성적 편차 분위기 (A~D 비율) -->
            <div style="margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px;">
                <strong style="font-size: 13.5px; color: #0f172a; font-weight: 800; display: block; margin-bottom: 10px;">📊 과목별 성적 성취 분포 (우수 vs 기초)</strong>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: #334155; margin-bottom: 4px; font-weight: 600;">
                            <span>국어 (우수 A: ${distKor[0]}% | 기초 D: ${distKor[3]}%)</span>
                        </div>
                        <div style="display: flex; height: 12px; border-radius: 6px; overflow: hidden; background: #e2e8f0;">
                            <div style="width: ${distKor[0]}%; background: #2563eb;" title="우수 (A)"></div>
                            <div style="width: ${distKor[1]}%; background: #60a5fa;" title="보통 (B)"></div>
                            <div style="width: ${distKor[2]}%; background: #f59e0b;" title="기초 (C)"></div>
                            <div style="width: ${distKor[3]}%; background: #ef4444;" title="기초미달 (D)"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: #334155; margin-bottom: 4px; font-weight: 600;">
                            <span>영어 (우수 A: ${distEng[0]}% | 기초 D: ${distEng[3]}%)</span>
                        </div>
                        <div style="display: flex; height: 12px; border-radius: 6px; overflow: hidden; background: #e2e8f0;">
                            <div style="width: ${distEng[0]}%; background: #2563eb;" title="우수 (A)"></div>
                            <div style="width: ${distEng[1]}%; background: #60a5fa;" title="보통 (B)"></div>
                            <div style="width: ${distEng[2]}%; background: #f59e0b;" title="기초 (C)"></div>
                            <div style="width: ${distEng[3]}%; background: #ef4444;" title="기초미달 (D)"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: #334155; margin-bottom: 4px; font-weight: 600;">
                            <span>수학 (우수 A: ${distMath[0]}% | 기초 D: ${distMath[3]}%)</span>
                        </div>
                        <div style="display: flex; height: 12px; border-radius: 6px; overflow: hidden; background: #e2e8f0;">
                            <div style="width: ${distMath[0]}%; background: #2563eb;" title="우수 (A)"></div>
                            <div style="width: ${distMath[1]}%; background: #60a5fa;" title="보통 (B)"></div>
                            <div style="width: ${distMath[2]}%; background: #f59e0b;" title="기초 (C)"></div>
                            <div style="width: ${distMath[3]}%; background: #ef4444;" title="기초미달 (D)"></div>
                        </div>
                    </div>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px; font-size: 10.5px; color: #64748b; margin-top: 8px; font-weight: 600;">
                    <span style="display: flex; align-items: center; gap: 4px;"><span style="width:8px; height:8px; background:#2563eb; border-radius:2px; display:inline-block;"></span>A (우수)</span>
                    <span style="display: flex; align-items: center; gap: 4px;"><span style="width:8px; height:8px; background:#60a5fa; border-radius:2px; display:inline-block;"></span>B (보통)</span>
                    <span style="display: flex; align-items: center; gap: 4px;"><span style="width:8px; height:8px; background:#f59e0b; border-radius:2px; display:inline-block;"></span>C (기초)</span>
                    <span style="display: flex; align-items: center; gap: 4px;"><span style="width:8px; height:8px; background:#ef4444; border-radius:2px; display:inline-block;"></span>D·E (미달)</span>
                </div>
            </div>

            <!-- 사교육 의존 지수 -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 13px; color: #0f172a; font-weight: 800;">📚 학원 인프라 밀도</strong>
                    <span style="font-size: 11.5px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 3px 10px; border-radius: 10px; border: 1px solid #dbeafe;">${school.academy_count || 0}개 등록</span>
                </div>
                <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.5; letter-spacing: -0.2px;">
                    학교 반경 내 배치된 보습/입시 관련 등록 학원 수입니다. 밀도가 높을수록 방과 후 보충 학습 인프라가 풍부하고, 지역 전반의 사교육 의존도가 높음을 뜻합니다.
                </p>
            </div>

            <!-- 3개년 경쟁 압박 추이 차트 -->
            <div style="margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 14px 12px 14px;">
                <strong style="font-size: 13.5px; color: #0f172a; font-weight: 800; display: block; margin-bottom: 10px;">📈 3개년 경쟁 압력 추이</strong>
                <div style="display: flex; align-items: flex-end; justify-content: space-around; background: white; border-radius: 12px; height: 115px; padding: 16px 12px 8px 12px; border: 1px solid #e2e8f0;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1;">
                        <span style="font-size: 10.5px; color: #64748b; font-weight: 600;">${getPressureLabel(compIndex2024)} (${compIndex2024})</span>
                        <div style="width: 28px; height: ${Math.round(compIndex2024 * 0.6)}px; background: #cbd5e1; border-radius: 6px 6px 0 0; transition: height 0.6s ease;"></div>
                        <span style="font-size: 11px; color: #64748b; font-weight: 600;">2024년</span>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1;">
                        <span style="font-size: 10.5px; color: #64748b; font-weight: 600;">${getPressureLabel(compIndex2025)} (${compIndex2025})</span>
                        <div style="width: 28px; height: ${Math.round(compIndex2025 * 0.6)}px; background: #94a3b8; border-radius: 6px 6px 0 0; transition: height 0.6s ease;"></div>
                        <span style="font-size: 11px; color: #64748b; font-weight: 600;">2025년</span>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1;">
                        <span style="font-size: 10.5px; color: #2563eb; font-weight: 800;">${getPressureLabel(compIndex2026)} (${compIndex2026})</span>
                        <div style="width: 28px; height: ${Math.round(compIndex2026 * 0.6)}px; background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%); border-radius: 6px 6px 0 0; transition: height 0.6s ease;"></div>
                        <span style="font-size: 11px; font-weight: 800; color: #0f172a;">현재</span>
                    </div>
                </div>
            </div>

            <!-- 전략 제안 -->
            ${strategyHTML}
        `;

        if (typeof window.updateCompetitionCompare === 'function') {
            window.updateCompetitionCompare('region');
        }
    }

    // --- 졸업생/중학교/고교 진학률 비교 항목 변경 ---
    window.setGraduateSubMetric = function(subKey) {
        const gd = window.currentSchoolGraduateDetail;
        if (!gd || !gd.subMetrics || !gd.subMetrics[subKey]) return;

        gd.selectedSubMetric = subKey;
        const sub = gd.subMetrics[subKey];
        gd.schoolRate = sub.schoolRate;
        gd.metricName = sub.metricName;
        gd.districtAvgRate = sub.districtAvgRate;
        gd.cityAvgRate = sub.cityAvgRate;
        gd.nationalAvgRate = sub.nationalAvgRate;

        // 칩 버튼 활성화 스타일 업데이트
        const chips = document.querySelectorAll('.graduate-submetric-chip');
        chips.forEach(btn => {
            if (btn.getAttribute('data-submetric') === subKey) {
                btn.style.background = 'var(--primary-blue, #1976d2)';
                btn.style.color = 'white';
                btn.style.fontWeight = 'bold';
            } else {
                btn.style.background = '#f0f4f8';
                btn.style.color = 'var(--text-muted)';
                btn.style.fontWeight = 'normal';
            }
        });

        const labelHeader = document.getElementById('graduateSubMetricHeader');
        if (labelHeader) labelHeader.innerText = `${sub.metricName} 비교 기준`;

        window.updateGraduateCompare(gd.currentCompareType || 'region');
    };

    // --- 졸업생/중학교/고교 진학률 비교 기준 업데이트 ---
    window.updateGraduateCompare = function(type) {
        const gd = window.currentSchoolGraduateDetail;
        if (!gd) return;
        gd.currentCompareType = type;

        // 탭 스타일 활성화 처리
        const tabs = document.querySelectorAll('.graduate-tab-btn');
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

        let compareAvg = gd.districtAvgRate;
        let labelText = `${gd.districtName} 평균 ${gd.districtAvgRate}%`;

        if (type === 'city') {
            compareAvg = gd.cityAvgRate;
            labelText = `${gd.cityName || '서울특별시'} 평균 ${compareAvg}%`;
        } else if (type === 'national') {
            compareAvg = gd.nationalAvgRate;
            labelText = `전국 평균 ${compareAvg}%`;
        }

        const schoolVal = gd.schoolRate;
        const elSchoolVal = document.getElementById('graduateBarSchoolVal');
        if (elSchoolVal) elSchoolVal.innerText = `${schoolVal}% (${gd.metricName})`;

        const elRegionLabel = document.getElementById('graduateBarRegionLabel');
        if (elRegionLabel) elRegionLabel.innerText = labelText;

        const targetName = type === 'region' ? gd.districtName : (type === 'city' ? (gd.cityName || '서울특별시') : '전국');
        const elMarkText = document.getElementById('graduateBarRegionMarkText');
        if (elMarkText) elMarkText.innerText = `▲ ${targetName} 평균`;

        const elMark = document.getElementById('graduateBarRegionMark');
        if (elMark) elMark.title = `${targetName} 평균 ${compareAvg}%`;

        const maxVal = Math.max(schoolVal, compareAvg, 10) * 1.25;
        const leftPct = Math.min((compareAvg / maxVal) * 100, 100);
        const schoolPct = Math.min((schoolVal / maxVal) * 100, 100);

        const elBarSchool = document.getElementById('graduateBarSchool');
        if (elBarSchool) elBarSchool.style.width = `${schoolPct}%`;

        if (elMark) elMark.style.left = `calc(${leftPct}% - 1px)`;
        if (elMarkText) elMarkText.style.left = `${leftPct}%`;
    };

    function renderGraduateDetail(career, schoolType, schoolName, studentCount, school) {
        const contentEl = document.getElementById('graduateModalContent');
        const titleEl = document.getElementById('graduateModalTitle');
        if (!contentEl) return;
        
        if (!career) {
            contentEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">진학 데이터가 없습니다.</div>';
            return;
        }

        const addressParts = ((school && school.address) || '').split(' ');
        const cityName = (school && school.cityName) || addressParts[0] || (school && school.region) || '서울특별시';
        const districtName = (school && school.district) || addressParts[1] || '관할 구';

        // 학교 유형에 맞는 헤더 라벨
        let label = '졸업생 진학률 상세';
        const isHigh = schoolType && schoolType.includes('고등학교');
        const isElem = schoolType && schoolType.includes('초등학교');

        if (isHigh) {
            label = `🎓 ${schoolName} - 대학교 진학률 상세`;
        } else if (isElem) {
            label = `🎓 ${schoolName} - 중학교 진학률`;
        } else {
            label = `🎓 ${schoolName} - 특목/자사 진학률 상세`;
        }
        if (titleEl) titleEl.innerText = label;

        // 서브 항목 정의 및 각 항목별 지역/시도/전국 평균 산출
        let subMetricsConfig = [];
        if (isElem) {
            subMetricsConfig = [
                { key: 'in_district', label: '관내 중학교', getVal: (gc) => gc.general || 0 },
                { key: 'out_district', label: '관외 중학교', getVal: (gc) => gc.specialized || 0 },
                { key: 'other', label: '기타', getVal: (gc) => Math.round(((gc.special || 0) + (gc.autonomous || 0)) * 10) / 10 }
            ];
        } else if (isHigh) {
            subMetricsConfig = [
                { key: 'general', label: '4년제 대학', getVal: (gc) => gc.general || 0 },
                { key: 'specialized', label: '전문대학', getVal: (gc) => gc.specialized || 0 },
                { key: 'special', label: '취업률', getVal: (gc) => gc.special || 0 },
                { key: 'autonomous', label: '기타 (재수 등)', getVal: (gc) => gc.autonomous || 0 }
            ];
        } else {
            subMetricsConfig = [
                { key: 'special_auto', label: '특목/자사고', getVal: (gc) => Math.round(((gc.special || 0) + (gc.autonomous || 0)) * 10) / 10 },
                { key: 'general', label: '일반고', getVal: (gc) => gc.general || 0 },
                { key: 'specialized', label: '특성화고', getVal: (gc) => gc.specialized || 0 }
            ];
        }

        const subMetricsData = {};

        let targetSchools = [];
        if (window.orchestrator && window.orchestrator.state && window.orchestrator.state.schools) {
            targetSchools = window.orchestrator.state.schools.filter(s => {
                if (!s.summary || !s.summary.graduate_career) return false;
                if (isHigh) return s.school_type && s.school_type.includes('고등학교');
                if (isElem) return s.school_type && s.school_type.includes('초등학교');
                return !s.school_type || (!s.school_type.includes('고등학교') && !s.school_type.includes('초등학교'));
            });
        }

        subMetricsConfig.forEach(item => {
            const schoolVal = item.getVal(career);
            let distAvg = isHigh ? (item.key === 'general' ? 65.4 : 18.2) : (isElem ? (item.key === 'in_district' ? 88.2 : 9.5) : (item.key === 'special_auto' ? 12.5 : 75.0));
            let cityAvg = isHigh ? (item.key === 'general' ? 62.8 : 17.5) : (isElem ? (item.key === 'in_district' ? 85.5 : 11.0) : (item.key === 'special_auto' ? 10.8 : 72.0));
            let natAvg = isHigh ? (item.key === 'general' ? 60.5 : 16.0) : (isElem ? (item.key === 'in_district' ? 83.0 : 12.5) : (item.key === 'special_auto' ? 9.2 : 70.0));

            if (targetSchools.length > 0) {
                const distSchools = targetSchools.filter(s => {
                    const d = s.district || (s.address ? s.address.split(' ')[1] : '');
                    return d === districtName;
                });
                if (distSchools.length > 0) {
                    const sum = distSchools.reduce((acc, s) => acc + item.getVal(s.summary.graduate_career), 0);
                    distAvg = Math.round((sum / distSchools.length) * 10) / 10;
                }

                const citySchools = targetSchools.filter(s => {
                    const c = s.cityName || (s.address ? s.address.split(' ')[0] : '') || s.region;
                    return c === cityName;
                });
                if (citySchools.length > 0) {
                    const sum = citySchools.reduce((acc, s) => acc + item.getVal(s.summary.graduate_career), 0);
                    cityAvg = Math.round((sum / citySchools.length) * 10) / 10;
                }

                const sumNat = targetSchools.reduce((acc, s) => acc + item.getVal(s.summary.graduate_career), 0);
                natAvg = Math.round((sumNat / targetSchools.length) * 10) / 10;
            }

            subMetricsData[item.key] = {
                label: item.label,
                metricName: `${item.label} 진학률`,
                schoolRate: schoolVal,
                districtAvgRate: distAvg,
                cityAvgRate: cityAvg,
                nationalAvgRate: natAvg
            };
        });

        const defaultSubKey = subMetricsConfig[0].key;
        const currentSub = subMetricsData[defaultSubKey];

        window.currentSchoolGraduateDetail = {
            districtName,
            cityName,
            subMetrics: subMetricsData,
            selectedSubMetric: defaultSubKey,
            currentCompareType: 'region',
            schoolRate: currentSub.schoolRate,
            metricName: currentSub.metricName,
            districtAvgRate: currentSub.districtAvgRate,
            cityAvgRate: currentSub.cityAvgRate,
            nationalAvgRate: currentSub.nationalAvgRate
        };

        let html = `
            <!-- 세부 비교 항목 선택 칩 (관내 / 관외 / 기타 등) -->
            <div style="margin-top: 4px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--deep-blue);" id="graduateSubMetricHeader">${currentSub.metricName} 비교 기준</span>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;" id="graduateSubMetricChips">
                    ${subMetricsConfig.map((item, idx) => `
                        <button class="graduate-submetric-chip" data-submetric="${item.key}" onclick="setGraduateSubMetric('${item.key}')" style="border: none; background: ${idx === 0 ? 'var(--primary-blue, #1976d2)' : '#f0f4f8'}; color: ${idx === 0 ? 'white' : 'var(--text-muted)'}; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: ${idx === 0 ? 'bold' : 'normal'}; cursor: pointer; transition: all 0.2s ease;">${item.label}</button>
                    `).join('')}
                </div>
            </div>

            <!-- 비교 지역 선택 (관할 구 / 시·도 / 전국) -->
            <div style="margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 10px; color: var(--text-muted);">지역 비교 범위 설정</span>
                <div style="display: flex; gap: 4px; background: #f0f4f8; padding: 2px; border-radius: 6px;" id="graduateCompareTabs">
                    <button class="graduate-tab-btn" data-compare="region" onclick="updateGraduateCompare('region')" style="border: none; background: white; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; color: var(--deep-blue); box-shadow: 0 1px 3px rgba(0,0,0,0.1);">${districtName}</button>
                    <button class="graduate-tab-btn" data-compare="city" onclick="updateGraduateCompare('city')" style="border: none; background: transparent; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; color: var(--text-muted);">${cityName}</button>
                    <button class="graduate-tab-btn" data-compare="national" onclick="updateGraduateCompare('national')" style="border: none; background: transparent; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; color: var(--text-muted);">전국</button>
                </div>
            </div>
            <!-- 지역 평균 대비 비교 바 -->
            <div style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
                    <span>이 학교 <strong id="graduateBarSchoolVal">${currentSub.schoolRate}% (${currentSub.metricName})</strong></span>
                    <span id="graduateBarRegionLabel">지역 평균</span>
                </div>
                <div style="position: relative; background: #f0f4f8; border-radius: 6px; height: 10px; overflow: visible; margin-bottom: 24px;">
                    <div id="graduateBarSchool" style="position: absolute; left: 0; top: 0; height: 100%; background: var(--primary-blue, #1976d2); border-radius: 6px; transition: width 0.6s ease;"></div>
                    <div id="graduateBarRegionMark" style="position: absolute; top: -3px; width: 2px; height: 16px; background: #f57c00; border-radius: 2px;" title="지역 평균"></div>
                    <div id="graduateBarRegionMarkText" style="position: absolute; top: 16px; font-size: 10px; color: #f57c00; white-space: nowrap; transform: translateX(-50%); font-weight: bold; transition: left 0.6s ease;">▲ 지역 평균</div>
                </div>
            </div>
        `;
        
        const colors = {
            general: '#1976d2',
            special: '#7b1fa2',
            autonomous: '#f57c00',
            specialized: '#388e3c',
            other: '#607d8b'
        };

        if (isHigh) {
            const general = career.general || 0;
            const specialized = career.specialized || 0;
            const special = career.special || 0;
            const autonomous = career.autonomous || 0;
            
            html += `
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
        } else if (isElem) {
            const general = career.general || 0;
            const specialized = career.specialized || 0;
            const special = career.special || 0;
            const autonomous = career.autonomous || 0;
            const other = Math.round(special + autonomous);

            html += `
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
                            <span style="font-weight:600; color:var(--deep-blue);">기타</span>
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
            
            html += `
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

        if (typeof window.updateGraduateCompare === 'function') {
            window.updateGraduateCompare('region');
        }
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

    function drawRadarChart(canvasId, matrix) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const center = { x: canvas.width / 2, y: canvas.height / 2 };
        const radius = Math.min(canvas.width, canvas.height) * 0.35;
        
        // 3 axes: Korean, English, Math
        const axes = ['국어', '영어', '수학'];
        const numAxes = axes.length;
        
        // Draw grid concentric triangles (50, 60, 70, 80, 90, 100)
        const steps = [50, 60, 70, 80, 90, 100];
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        steps.forEach(step => {
            ctx.beginPath();
            for (let i = 0; i < numAxes; i++) {
                const angle = (i * 2 * Math.PI / numAxes) - Math.PI / 2;
                const r = ((step - 50) / 50) * radius;
                const x = center.x + r * Math.cos(angle);
                const y = center.y + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            
            // Draw scale values
            ctx.fillStyle = '#94a3b8';
            ctx.font = '9px sans-serif';
            ctx.fillText(step, center.x + 4, center.y - ((step - 50) / 50) * radius);
        });
        
        // Draw axes lines and labels
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#cbd5e1';
        ctx.font = 'bold 11px sans-serif';
        for (let i = 0; i < numAxes; i++) {
            const angle = (i * 2 * Math.PI / numAxes) - Math.PI / 2;
            const x = center.x + radius * Math.cos(angle);
            const y = center.y + radius * Math.sin(angle);
            ctx.beginPath();
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            // Labels
            const labelX = center.x + (radius + 15) * Math.cos(angle);
            const labelY = center.y + (radius + 15) * Math.sin(angle);
            ctx.textAlign = (i === 0) ? 'center' : ((i === 1) ? 'left' : 'right');
            ctx.textBaseline = 'middle';
            ctx.fillText(axes[i], labelX, labelY);
        }
        
        // Draw each school data
        const colors = [
            'rgba(37, 99, 235, 0.15)', // blue
            'rgba(22, 165, 74, 0.15)',  // green
            'rgba(202, 138, 4, 0.15)',  // yellow
            'rgba(217, 83, 79, 0.15)',  // red
            'rgba(123, 31, 162, 0.15)'  // purple
        ];
        const strokeColors = [
            'rgba(37, 99, 235, 0.85)',
            'rgba(22, 165, 74, 0.85)',
            'rgba(202, 138, 4, 0.85)',
            'rgba(217, 83, 79, 0.85)',
            'rgba(123, 31, 162, 0.85)'
        ];
        
        matrix.forEach((school, sIdx) => {
            const scores = [school.korean_avg, school.english_avg, school.math_avg];
            ctx.fillStyle = colors[sIdx % colors.length];
            ctx.strokeStyle = strokeColors[sIdx % strokeColors.length];
            ctx.lineWidth = 2.5;
            
            ctx.beginPath();
            scores.forEach((score, i) => {
                const angle = (i * 2 * Math.PI / numAxes) - Math.PI / 2;
                const r = (Math.max(50, Math.min(100, score)) - 50) / 50 * radius;
                const x = center.x + r * Math.cos(angle);
                const y = center.y + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Draw points
            scores.forEach((score, i) => {
                const angle = (i * 2 * Math.PI / numAxes) - Math.PI / 2;
                const r = (Math.max(50, Math.min(100, score)) - 50) / 50 * radius;
                const x = center.x + r * Math.cos(angle);
                const y = center.y + r * Math.sin(angle);
                ctx.fillStyle = strokeColors[sIdx % strokeColors.length];
                ctx.beginPath();
                ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
                ctx.fill();
            });
        });
        
        // Draw Legend in canvas top-left
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'left';
        matrix.forEach((school, sIdx) => {
            const yOffset = 10 + sIdx * 12;
            ctx.fillStyle = strokeColors[sIdx % strokeColors.length];
            ctx.fillRect(8, yOffset, 8, 8);
            ctx.fillStyle = '#334155';
            ctx.fillText(school.school_name, 20, yOffset + 7);
        });
    }

    function populateComparisonTable(matrix) {
        const table = document.getElementById('compareDetailTable');
        if (!table) return;
        
        let html = `
            <thead>
                <tr style="background: var(--bg-primary); border-bottom: 2px solid var(--border-color); font-weight: bold; color: var(--deep-blue);">
                    <th style="padding: 10px; text-align: left;">비교 항목</th>
        `;
        
        matrix.forEach(school => {
            html += `<th style="padding: 10px; font-weight: 800;">${school.school_name}</th>`;
        });
        html += `</tr></thead><tbody>`;
        
        const rows = [
            { label: '🧑‍🎓 학생 수', key: 'student_count' },
            { label: '🏫 학급 평균 규모', key: 'class_avg_size' },
            { label: '📖 국어 평균점', key: 'korean_avg', suffix: '점' },
            { label: '🇬🇧 영어 평균점', key: 'english_avg', suffix: '점' },
            { label: '📐 수학 평균점', key: 'math_avg', suffix: '점' },
            { label: '⚖️ 가중 평균점', key: 'weightedAvg', suffix: '점' },
            { label: '🎯 강점 교과', key: 'strong_subject' },
            { label: '🏠 평균 매매가', key: 'housing_sale' },
            { label: '🔑 평균 전세가', key: 'housing_jeonse' },
            { label: '📚 주변 학원 수', key: 'academy_count_est', suffix: '개' },
            { label: '💳 평균 영어 학원비', key: 'fee_eng' },
            { label: '💳 평균 수학 학원비', key: 'fee_math' },
            { label: '💰 창체 활동비', key: 'extracurricular_budget', suffix: '만원' },
            { label: '🛡️ 학교폭력 발생 건수', key: 'violence_stats', callback: (val) => val ? `${val.total_cases}건` : '0건' },
            { label: '🏫 종합 교육환경 점수', key: 'envScore', suffix: '점' },
            { label: '✨ 자녀 매칭 적합도', key: 'suitability', callback: (val, school) => {
                const diffLabel = school.suitabilityDiff >= 0 ? `+${Math.round(school.suitabilityDiff*10)/10}` : `${Math.round(school.suitabilityDiff*10)/10}`;
                const color = val === '상' ? 'var(--success-green)' : (val === '중' ? 'var(--warning-yellow)' : 'var(--danger-red)');
                return `<span title="${school.suitabilityDesc}" style="cursor:help; border-bottom:1px dotted var(--text-muted);"><strong style="color:${color}">${val}</strong> (${diffLabel}점)</span>`;
            }}
        ];
        
        rows.forEach(row => {
            html += `<tr style="border-bottom: 1px solid var(--border-color);"><td style="padding: 8px; font-weight: 600; text-align: left; background: #fafafa;">${row.label}</td>`;
            matrix.forEach(school => {
                let val = school[row.key];
                if (row.callback) {
                    val = row.callback(val, school);
                } else if (val !== undefined && val !== null) {
                    val = val + (row.suffix || '');
                } else {
                    val = '-';
                }
                html += `<td style="padding: 8px;">${val}</td>`;
            });
            html += `</tr>`;
        });
        
        html += `</tbody>`;
        table.innerHTML = html;
    }

    function renderComparisonBoard(matrix) {
        // Toggle view button setup
        const btnToggleCompareView = document.getElementById('btnToggleCompareView');
        if (btnToggleCompareView && !btnToggleCompareView.dataset.hasListener) {
            btnToggleCompareView.dataset.hasListener = "true";
            btnToggleCompareView.addEventListener('click', () => {
                isCompareDetailed = !isCompareDetailed;
                if (isCompareDetailed) {
                    btnToggleCompareView.innerText = "🎴 카드형 비교 보기";
                    document.getElementById('compareGrid').style.display = 'none';
                    document.getElementById('compareDetailedView').style.display = 'flex';
                } else {
                    btnToggleCompareView.innerText = "📊 상세 표 & 레이더 차트 비교";
                    document.getElementById('compareGrid').style.display = 'grid';
                    document.getElementById('compareDetailedView').style.display = 'none';
                }
                if (orchestrator.state.comparisonList.length > 0) {
                    renderComparisonBoard(orchestrator.compareAgent.generateComparisonMatrix(orchestrator.state.comparisonList, orchestrator.state.childProfile.scores));
                }
            });
        }

        compareGrid.innerHTML = '';
        
        // 동적 그리드 열 크기 조절 (최대 5개)
        compareGrid.style.gridTemplateColumns = `repeat(${matrix.length}, 1fr)`;
        
        if (isCompareDetailed) {
            drawRadarChart('compareRadarCanvas', matrix);
            populateComparisonTable(matrix);
        }

        matrix.forEach(item => {
            const col = document.createElement('div');
            col.className = 'compare-col';
            col.style.position = 'relative';
            
            // 3개년 성적 스파크라인 SVG 렌더링
            let sparklineHtml = '';
            if (item.trendData && item.trendData.length >= 3) {
                const pts = item.trendData;
                const width = 120;
                const height = 30;
                const minVal = 50;
                const maxVal = 100;
                
                const getX = (idx) => 10 + idx * 50;
                const getY = (val) => height - 6 - ((val - minVal) / (maxVal - minVal)) * (height - 12);
                
                const p1 = `${getX(0)},${getY(pts[0])}`;
                const p2 = `${getX(1)},${getY(pts[1])}`;
                const p3 = `${getX(2)},${getY(pts[2])}`;
                
                sparklineHtml = `
                    <div style="margin: 8px 0; background: #f8f9fa; border-radius: 4px; border: 1px solid var(--border-color); padding: 4px; display: flex; align-items: center; justify-content: space-between;">
                        <svg width="${width}" height="${height}">
                            <path d="M ${p1} L ${p2} L ${p3}" fill="none" stroke="var(--primary-blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                            <circle cx="${getX(0)}" cy="${getY(pts[0])}" r="3" fill="var(--deep-blue)" stroke="white" stroke-width="1"></circle>
                            <circle cx="${getX(1)}" cy="${getY(pts[1])}" r="3" fill="var(--deep-blue)" stroke="white" stroke-width="1"></circle>
                            <circle cx="${getX(2)}" cy="${getY(pts[2])}" r="3" fill="var(--deep-blue)" stroke="white" stroke-width="1"></circle>
                        </svg>
                        <div style="font-size: 9px; color: var(--text-muted); text-align: right; line-height: 1.2;">
                            3년 전: ${pts[0]}점<br>
                            최근: <strong>${pts[2]}점</strong>
                        </div>
                    </div>
                `;
            }

            // 가중평균 및 가성비
            const weightedAvgLabel = item.weightedAvg !== undefined ? `${item.weightedAvg}점` : '-';
            const envScoreLabel = item.envScore !== undefined ? `${item.envScore}점` : '-';
            const violenceCases = item.violence_stats ? `${item.violence_stats.total_cases}건` : '0건';

            // 세부 환경 스코어 정보
            let envDetailsHtml = '';
            if (item.envScoresDetails) {
                const details = item.envScoresDetails;
                envDetailsHtml = `
                    <div style="font-size:10px; color:var(--text-muted); margin-top: 4px; background:#f1f3f5; padding:6px; border-radius:6px; display:flex; flex-direction:column; gap:2px;">
                        <div style="display:flex; justify-content:space-between;"><span>학업 성적:</span> <span>${Math.round(details.scoreScore)}점</span></div>
                        <div style="display:flex; justify-content:space-between;"><span>교사 비율:</span> <span>${Math.round(details.teacherScore)}점</span></div>
                        <div style="display:flex; justify-content:space-between;"><span>학폭 안전:</span> <span>${Math.round(details.safetyScore)}점</span></div>
                        <div style="display:flex; justify-content:space-between;"><span>창체 예산:</span> <span>${Math.round(details.budgetScore)}점</span></div>
                    </div>
                `;
            }

            const infoContent = document.createElement('div');
            infoContent.innerHTML = `
                <div class="compare-school-name" style="padding-right: 20px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10; background: white; margin-top: 0; border-top-left-radius: 9px; border-top-right-radius: 9px;">
                    <span>${item.school_name}</span>
                    <button class="compare-card-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:var(--text-muted); padding:0 4px; line-height:1; font-weight:bold;">&times;</button>
                </div>
                <div style="font-size:12px;margin-bottom:5px; margin-top:8px;">🧑‍🎓 학생수: <strong>${item.student_count}</strong></div>
                <div style="font-size:12px;margin-bottom:5px;">🏫 학급 평균: <strong>${item.class_avg_size}</strong></div>
                <div style="font-size:12px;margin-bottom:5px;">📊 국·영·수 평균: <strong>${item.korean_avg} / ${item.english_avg} / ${item.math_avg}</strong></div>
                <div style="font-size:12px;margin-bottom:5px;">⚖️ 가중 평균 점수: <strong>${weightedAvgLabel}</strong></div>
                <div style="font-size:12px;margin-bottom:5px;">🎯 강점 과목: <strong>${item.strong_subject}</strong></div>
                <div style="font-size:12px;margin-bottom:5px;">🏠 평균 매매가: <strong style="color:var(--success-green);">${item.housing_sale}</strong></div>
                <div style="font-size:12px;margin-bottom:5px;">🔑 평균 전세가: <strong style="color:var(--success-green);">${item.housing_jeonse}</strong></div>
                <div style="font-size:12px;margin-bottom:5px;">📚 주변 학원 수: <strong>${item.academy_count_est}개</strong></div>
                <div style="font-size:12px;margin-bottom:5px;">💰 창체 활동비: <strong>${item.extracurricular_budget}만원</strong></div>
                <div style="font-size:12px;margin-bottom:5px;">🛡️ 학교폭력 건수: <strong style="color:${item.violence_stats && item.violence_stats.total_cases > 3 ? 'var(--danger-red)' : 'var(--text-main)'}">${violenceCases}</strong></div>
                <div style="font-size:12px;margin-bottom:5px; margin-top:8px; border-top:1px solid var(--border-color); padding-top:6px;">
                    🏫 교육환경 스코어: <strong style="color:var(--primary-blue); font-size:13px;">${envScoreLabel}</strong>
                    ${envDetailsHtml}
                </div>
                
                <div style="font-size:11px; color:var(--text-muted); margin-top:6px;">📈 성취도 추세</div>
                ${sparklineHtml}

                <div style="font-size:12px;margin-top:8px;border-top:1px solid var(--border-color);padding-top:6px; display:flex; justify-content:space-between; align-items:center;" title="${item.suitabilityDesc}">
                    <span style="border-bottom: 1px dotted var(--text-muted); cursor: help;">✨ 우리 아이 적합도:</span>
                    <strong style="color:${item.suitability === '상' ? 'var(--success-green)' : (item.suitability === '중' ? 'var(--warning-yellow)' : 'var(--danger-red)')}; font-size:13px;">${item.suitability} (${item.suitabilityDiff >= 0 ? '+' : ''}${Math.round(item.suitabilityDiff * 10) / 10}점)</strong>
                </div>
            `;
            
            // 삭제 버튼 클릭 리스너 연결
            const closeBtn = infoContent.querySelector('.compare-card-close');
            if (closeBtn) {
                closeBtn.onclick = (e) => {
                    e.stopPropagation();
                    const newMatrix = orchestrator.removeFromComparison(item.school_id);
                    renderComparisonBoard(newMatrix);
                    if (newMatrix.length === 0) {
                        compareOverlay.style.display = 'none';
                    }
                    updateCompareFloatingButton();
                };
            }

            col.appendChild(infoContent);
            compareGrid.appendChild(col);
        });

        // 우리 아이 적합도 산출근거 실시간 바인딩
        const basisContainer = document.getElementById('compareSuitabilityBasis');
        const basisList = document.getElementById('compareSuitabilityBasisList');
        if (basisContainer && basisList) {
            if (matrix.length > 0) {
                let listHtml = '';
                let hasValidScore = false;

                // 자녀 성적 데이터가 유효한지 검증하기 위한 점수 확인
                const scores = orchestrator.state.childProfile.scores;
                const elKor = document.getElementById('childKor');
                const elEng = document.getElementById('childEng');
                const elMath = document.getElementById('childMath');
                const currentScores = {
                    korean: scores.korean !== null ? scores.korean : (elKor ? parseInt(elKor.value) || 0 : 0),
                    english: scores.english !== null ? scores.english : (elEng ? parseInt(elEng.value) || 0 : 0),
                    math: scores.math !== null ? scores.math : (elMath ? parseInt(elMath.value) || 0 : 0)
                };

                if (currentScores.korean > 0 || currentScores.english > 0 || currentScores.math > 0) {
                    hasValidScore = true;
                }

                if (hasValidScore) {
                    matrix.forEach(item => {
                        const totalAvg = Math.round(((item.korean_avg + item.english_avg + item.math_avg) / 3) * 10) / 10;
                        const childAvg = Math.round(((currentScores.korean + currentScores.english + currentScores.math) / 3) * 10) / 10;
                        const diff = Math.round((childAvg - totalAvg) * 10) / 10;
                        const diffSign = diff >= 0 ? '+' : '';
                        
                        let badgeColor = 'var(--warning-yellow)';
                        if (item.suitability === '상') badgeColor = 'var(--success-green)';
                        if (item.suitability === '하') badgeColor = 'var(--danger-red)';

                        listHtml += `
                            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; padding: 2px 0;">
                                <span>🏫 <strong>${item.school_name}</strong>: 자녀 평균 (${childAvg}점) - 학교 평균 (${totalAvg}점) = 편차 (<strong>${diffSign}${diff}점</strong>)</span>
                                <span style="background: ${badgeColor}; color: white; padding: 1px 6px; border-radius: 4px; font-weight: bold; font-size: 9px;">적합도: ${item.suitability}</span>
                            </div>
                        `;
                    });
                    basisList.innerHTML = listHtml;
                    basisContainer.style.display = 'flex';
                } else {
                    basisList.innerHTML = '<div style="color: var(--text-muted); font-style: italic;">* 성적 입력란에 자녀의 성적을 입력하시면 학교별 편차 및 산출 근거가 이곳에 실시간 노출됩니다.</div>';
                    basisContainer.style.display = 'flex';
                }
            } else {
                basisContainer.style.display = 'none';
            }
        }
    }

    function updateCommuteCircle() {
        if (!kakaoMap) return;
        
        if (commuteCircle) {
            commuteCircle.setMap(null);
            commuteCircle = null;
        }
        if (commuteCenterMarker) {
            commuteCenterMarker.setMap(null);
            commuteCenterMarker = null;
        }

        const commuteMode = document.getElementById('commuteRadiusFilter').value;
        if (commuteMode !== 'off') {
            let center = commuteCenter;
            let showMarker = true;
            if (!center) {
                if (orchestrator.state.selectedSchool && orchestrator.state.selectedSchool.lat) {
                    center = new kakao.maps.LatLng(orchestrator.state.selectedSchool.lat, orchestrator.state.selectedSchool.lng);
                    showMarker = false;
                } else {
                    center = kakaoMap.getCenter();
                    showMarker = false;
                }
            }

            const radius = parseFloat(commuteMode);

            commuteCircle = new kakao.maps.Circle({
                center: center,
                radius: radius,
                strokeWeight: 2,
                strokeColor: 'var(--primary-blue)',
                strokeOpacity: 0.8,
                strokeStyle: 'dashed',
                fillColor: 'var(--light-blue)',
                fillOpacity: 0.25
            });

            commuteCircle.setMap(kakaoMap);

            if (showMarker) {
                const markerImage = new kakao.maps.MarkerImage(
                    'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png',
                    new kakao.maps.Size(24, 35),
                    { offset: new kakao.maps.Point(12, 35) }
                );

                commuteCenterMarker = new kakao.maps.Marker({
                    position: center,
                    map: kakaoMap,
                    title: '통학 분석 기준 중심점',
                    image: markerImage
                });
            }
        }
    }

    function clearDistrictRatings() {
        districtRatingOverlays.forEach(overlay => overlay.setMap(null));
        districtRatingOverlays = [];
    }

    function renderDistrictRatings() {
        clearDistrictRatings();
        if (!kakaoMap) return;

        const zoomLevel = kakaoMap.getLevel();
        const isGuLevel = zoomLevel >= 7;

        // 범례 가이드 업데이트 (구 단위 또는 동 단위에 맞춰 타이틀 변경)
        const legendTitle = document.getElementById('legendTitleText');
        const legendContent = document.getElementById('legendContent');
        if (legendTitle) {
            legendTitle.innerText = isGuLevel ? '구 단위 학군 레이팅 히트맵 가이드' : '동 단위 학군 레이팅 히트맵 가이드';
        }
        if (legendContent) {
            legendContent.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: rgba(37,99,235,0.4); border: 2px solid var(--primary-blue);"></span>
                    <span style="font-weight: 600; color: var(--text-main);"><span class="pc-text">학군 우수 (85점 이상)</span><span class="mobile-text" style="display:none;">우수(85↑)</span></span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: rgba(22,165,74,0.4); border: 2px solid var(--success-green);"></span>
                    <span style="font-weight: 600; color: var(--text-main);"><span class="pc-text">학군 양호 (78점 ~ 85점 미만)</span><span class="mobile-text" style="display:none;">양호(78~85)</span></span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: rgba(202,138,4,0.4); border: 2px solid var(--warning-yellow);"></span>
                    <span style="font-weight: 600; color: var(--text-main);"><span class="pc-text">학군 보통 (70점 ~ 78점 미만)</span><span class="mobile-text" style="display:none;">보통(70~78)</span></span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: rgba(117,117,117,0.45); border: 2px solid #757575;"></span>
                    <span style="font-weight: 600; color: var(--text-muted);"><span class="pc-text">학군 보완 (70점 미만)</span><span class="mobile-text" style="display:none;">보완(70↓)</span></span>
                </div>
            `;
        }

        const bounds = kakaoMap.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        const ratingGroups = {};
        // 1. 데이터의 정확성과 일관성을 위해 전체 학교를 대상으로 그룹화 및 평균 점수를 계산합니다. (바운더리에 의해 값이 왜곡되지 않음)
        schoolsDatabase.forEach(school => {
            if (!school.address || !school.lat || !school.lng) return;

            const parts = school.address.split(' ');
            if (parts.length < 3) return;
            
            const gu = parts[1];
            const dong = parts[2];
            const key = isGuLevel ? gu : `${gu} ${dong}`;

            const schoolAvg = (school.subjects.korean.avg + school.subjects.english.avg + school.subjects.math.avg) / 3;
            
            if (!ratingGroups[key]) {
                ratingGroups[key] = {
                    name: isGuLevel ? gu : dong,
                    gu: gu,
                    sum: 0,
                    count: 0,
                    lats: 0,
                    lngs: 0
                };
            }
            ratingGroups[key].sum += schoolAvg;
            ratingGroups[key].count += 1;
            ratingGroups[key].lats += school.lat;
            ratingGroups[key].lngs += school.lng;
        });

        for (const [key, group] of Object.entries(ratingGroups)) {
            const avg = Math.round((group.sum / group.count) * 10) / 10;
            const centerLat = group.lats / group.count;
            const centerLng = group.lngs / group.count;

            // 2. 화면 렌더링 시점에만 현재 지도 영역에 노출되는 항목들만 선별하여 오버레이를 생성합니다. (성능 최적화 유지)
            const latIn = centerLat >= sw.getLat() && centerLat <= ne.getLat();
            const lngIn = centerLng >= sw.getLng() && centerLng <= ne.getLng();
            if (!latIn || !lngIn) continue;
            
            let color = '#757575';
            let bgColor = 'rgba(117,117,117,0.45)';
            if (avg >= 85) {
                color = 'var(--primary-blue, #2563eb)';
                bgColor = 'rgba(37,99,235,0.4)';
            } else if (avg >= 78) {
                color = 'var(--success-green, #16a34a)';
                bgColor = 'rgba(22,165,74,0.4)';
            } else if (avg >= 70) {
                color = 'var(--warning-yellow, #ca8a04)';
                bgColor = 'rgba(202,138,4,0.4)';
            }

            const overlayContent = document.createElement('div');
            const size = isGuLevel ? '70px' : '60px';
            const fontSize = isGuLevel ? '12px' : '11px';
            const titleFontSize = isGuLevel ? '11px' : '9.5px';
            const maxW = isGuLevel ? '64px' : '54px';

            overlayContent.style.cssText = `
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                width: ${size};
                height: ${size};
                border-radius: 50%;
                background: ${bgColor};
                border: 2px solid ${color};
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                color: #212529;
                font-family: var(--font-primary);
                font-size: ${fontSize};
                font-weight: bold;
                text-align: center;
                backdrop-filter: blur(2px);
            `;
            overlayContent.innerHTML = `
                <div style="font-size: ${titleFontSize}; color: #1e293b; text-shadow: 1px 1px 0px white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: ${maxW};">${group.name}</div>
                <div style="font-size: ${fontSize}; color: ${color}; font-weight: 800; text-shadow: 1px 1px 0px white; margin-top: 1px;">${avg}점</div>
            `;

            const coords = new kakao.maps.LatLng(centerLat, centerLng);
            const overlay = new kakao.maps.CustomOverlay({
                position: coords,
                content: overlayContent,
                xAnchor: 0.5,
                yAnchor: 0.5,
                zIndex: 90
            });

            overlay.setMap(kakaoMap);
            districtRatingOverlays.push(overlay);
        }
    }



    const districtData = [
        { "서울특별시": ["강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"] },
        { "경기도": ["수원시", "성남시", "고양시", "용인시", "부천시", "안산시", "안양시", "남양주시", "화성시", "평택시", "의정부시", "시흥시", "파주시", "김포시", "광명시", "광주시", "군포시", "오산시", "이천시", "양주시", "안성시", "구리시", "포천시", "의왕시", "하남시", "여주시", "동두천시", "양평군", "가평군", "연천군"] },
        { "부산광역시": ["중구", "서구", "동구", "영도구", "부산진구", "동래구", "남구", "북구", "강서구", "해운대구", "사하구", "금정구", "연제구", "수영구", "사상구", "기장군"] },
        { "인천광역시": ["중구", "동구", "미추홀구", "연수구", "남동구", "부평구", "계양구", "서구", "강화군", "옹진군"] },
        { "대구광역시": ["중구", "동구", "서구", "남구", "북구", "수성구", "달서구", "달성군", "군위군"] },
        { "광주광역시": ["동구", "서구", "남구", "북구", "광산구"] },
        { "대전광역시": ["동구", "중구", "서구", "유성구", "대덕구"] },
        { "울산광역시": ["중구", "남구", "동구", "북구", "울주군"] },
        { "세종특별자치시": ["세종시"] },
        { "강원특별자치도": ["원주시", "춘천시", "강릉시", "동해시", "속초시", "삼척시", "홍천군", "태백시", "철원군", "횡성군", "평창군", "영월군", "정선군", "인제군", "고성군", "양양군", "화천군", "양구군"] },
        { "충청북도": ["청주시", "충주시", "제천시", "보은군", "옥천군", "영동군", "증평군", "진천군", "괴산군", "음성군", "단양군"] },
        { "충청남도": ["천안시", "공주시", "보령시", "아산시", "서산시", "논산시", "계룡시", "당진시", "금산군", "부여군", "서천군", "청양군", "홍성군", "예산군", "태안군"] },
        { "전북특별자치도": ["전주시", "익산시", "군산시", "정읍시", "완주군", "김제시", "남원시", "고창군", "부안군", "임실군", "순창군", "진안군", "장수군", "무주군"] },
        { "전라남도": ["여수시", "순천시", "목포시", "광양시", "나주시", "무안군", "해남군", "고흥군", "화순군", "영암군", "영광군", "완도군", "담양군", "장성군", "보성군", "신안군", "장흥군", "강진군", "함평군", "진도군", "곡성군", "구례군"] },
        { "경상북도": ["포항시", "경주시", "김천시", "안동시", "구미시", "영주시", "영천시", "상주시", "문경시", "경산시", "의성군", "청송군", "영양군", "영덕군", "청도군", "고령군", "성주군", "칠곡군", "예천군", "봉화군", "울진군", "울릉군"] },
        { "경상남도": ["창원시", "김해시", "진주시", "양산시", "거제시", "통영시", "사천시", "밀양시", "함안군", "거창군", "창녕군", "고성군", "하동군", "합천군", "남해군", "함양군", "산청군", "의령군"] },
        { "제주특별자치도": ["제주시", "서귀포시"] }
    ];
    const simDongCache = {}; // 구군별 동 목록 캐시

    // 현재 활성화된 자녀 및 자녀 학교 객체 탐색 헬퍼
    function getActiveChildSchoolInfo() {
        let curChildId = (typeof selectedChildId !== 'undefined' && selectedChildId) 
            ? selectedChildId 
            : (window.selectedChildId || localStorage.getItem('learnmap_default_child_id'));
        let profiles = (typeof childProfiles !== 'undefined' && Array.isArray(childProfiles) && childProfiles.length > 0)
            ? childProfiles 
            : (window.childProfiles || []);
        if (profiles.length === 0) {
            try {
                profiles = JSON.parse(localStorage.getItem('learnmap_child_profiles') || '[]');
            } catch(e) {}
        }
        let activeChild = profiles.find(c => c.id === curChildId) || profiles[0] || null;
        if (!activeChild && typeof orchestrator !== 'undefined' && orchestrator.state?.childProfile) {
            activeChild = orchestrator.state.childProfile;
        }

        const db = window.schoolsDatabase || (typeof schoolsDatabase !== 'undefined' ? schoolsDatabase : []) || (window.allSchoolsCache || []) || [];
        let school = null;

        if (activeChild) {
            if (activeChild.schoolId && db.length > 0) {
                school = db.find(s => String(s.school_id || s.id) === String(activeChild.schoolId));
            }
            if (!school && activeChild.schoolRegion && activeChild.schoolName && db.length > 0) {
                school = db.find(s => 
                    s.school_name === activeChild.schoolName && 
                    ((s.region || '').includes(activeChild.schoolRegion) || 
                     (s.district || '').includes(activeChild.schoolRegion) || 
                     (s.address || '').includes(activeChild.schoolRegion) || 
                     activeChild.schoolRegion.includes(s.region || ''))
                );
            }
            if (!school && activeChild.schoolName && db.length > 0) {
                school = db.find(s => s.school_name === activeChild.schoolName);
            }
        }

        if (!school && window.selectedTargetSchool) {
            school = window.selectedTargetSchool;
        }

        if (!school && activeChild?.schoolName && db.length > 0) {
            school = db.find(s => s.school_name.includes(activeChild.schoolName) || activeChild.schoolName.includes(s.school_name));
        }

        // 기본 서운중학교 폴백 (등록된 학교가 없을 경우)
        if (!school && db.length > 0) {
            school = db.find(s => s.school_name === '서운중학교') || null;
        }

        return { activeChild, school };
    }

    // 학교 객체로부터 시도, 구군, 동, 학교급 자동 분석 헬퍼
    async function resolveSchoolRegionData(school) {
        if (!school) {
            return {
                sido: '서울특별시',
                gugun: '서초구',
                dong: '서초동',
                schoolType: '중학교',
                schoolName: '서운중학교'
            };
        }

        const addr = school.address || '';
        const reg = school.region || '';
        const dist = school.district || '';
        const sidos = districtData.map(item => Object.keys(item)[0]);

        // 1. 시도 판별
        let targetSido = '';
        for (const sido of sidos) {
            const short = sido.slice(0, 2);
            if (reg.includes(short) || addr.startsWith(sido) || addr.startsWith(short)) {
                targetSido = sido;
                break;
            }
        }
        if (!targetSido && addr) {
            for (const sido of sidos) {
                const short = sido.slice(0, 2);
                if (addr.includes(short)) {
                    targetSido = sido;
                    break;
                }
            }
        }
        if (!targetSido) targetSido = '서울특별시';

        // 2. 구군 판별
        let targetGugun = '';
        const sidoItem = districtData.find(item => Object.keys(item)[0] === targetSido);
        if (sidoItem) {
            const guguns = sidoItem[targetSido];
            // SUB_DISTRICT_MAP 세부구 우선 매칭
            for (const gugun of guguns) {
                if (SUB_DISTRICT_MAP[gugun]) {
                    for (const subG of SUB_DISTRICT_MAP[gugun]) {
                        if (addr.includes(subG) || dist.includes(subG)) {
                            targetGugun = subG;
                            break;
                        }
                    }
                }
                if (targetGugun) break;
            }
            // 일반 구군 매칭
            if (!targetGugun) {
                for (const gugun of guguns) {
                    if (addr.includes(gugun) || dist.includes(gugun) || reg.includes(gugun)) {
                        targetGugun = gugun;
                        break;
                    }
                }
            }
        }
        if (!targetGugun) targetGugun = '서초구';

        // 3. 학교급 (초등학교, 중학교, 고등학교)
        let schoolType = school.school_type || '중학교';
        if (!['초등학교', '중학교', '고등학교'].includes(schoolType)) {
            if (school.school_name?.endsWith('초등학교') || school.school_name?.endsWith('초')) schoolType = '초등학교';
            else if (school.school_name?.endsWith('고등학교') || school.school_name?.endsWith('고')) schoolType = '고등학교';
            else schoolType = '중학교';
        }

        // 4. 동 판별
        let targetDong = '';
        // 1순위: 카카오 Geocoder 비동기 역지오코딩
        if (school.lat && school.lng && typeof kakao !== 'undefined' && kakao.maps && kakao.maps.services) {
            try {
                const geocoderInstance = window.geocoder || (typeof geocoder !== 'undefined' ? geocoder : new kakao.maps.services.Geocoder());
                targetDong = await new Promise((resolve) => {
                    const timer = setTimeout(() => resolve(''), 800);
                    geocoderInstance.coord2RegionCode(school.lng, school.lat, (result, status) => {
                        clearTimeout(timer);
                        if (status === kakao.maps.services.Status.OK) {
                            const bRegion = result.find(r => r.region_type === 'B');
                            if (bRegion && bRegion.region_3depth_name) {
                                resolve(bRegion.region_3depth_name);
                                return;
                            }
                        }
                        resolve('');
                    });
                });
            } catch (e) {
                console.warn('카카오 지오코더 역지오코딩 예외:', e);
            }
        }

        // 2순위: 주소 내 동 텍스트 파싱
        if (!targetDong && addr) {
            const match = addr.match(/([가-힣\d]+(?:동|가|읍|면))(?:\s|[0-9,\(]|$)/);
            if (match && !match[1].endsWith('도') && !match[1].endsWith('시') && !match[1].endsWith('구')) {
                targetDong = match[1];
            }
        }

        // 3순위: 학교명 기반 대표 법정동 보정
        if (!targetDong) {
            if (school.school_name === '서운중학교' || school.school_name?.includes('서운중') || school.school_name?.includes('서일중')) targetDong = '서초동';
            else if (school.school_name?.includes('대치중') || school.school_name?.includes('대치')) targetDong = '대치동';
            else if (school.school_name?.includes('목운중') || school.school_name?.includes('목동')) targetDong = '목동';
            else if (school.school_name?.includes('수내중') || school.school_name?.includes('수내')) targetDong = '수내동';
            else if (targetGugun === '서초구') targetDong = '서초동';
        }

        return {
            sido: targetSido,
            gugun: targetGugun,
            dong: targetDong,
            schoolType: schoolType,
            schoolName: school.school_name || ''
        };
    }

    async function initSimulationDropdowns() {
        console.log('initSimulationDropdowns starting...');
        const sidoA = document.getElementById('simSidoA');
        const sidoB = document.getElementById('simSidoB');
        const gugunA = document.getElementById('simGugunA');
        const gugunB = document.getElementById('simGugunB');
        const dongA = document.getElementById('simDongA');
        const dongB = document.getElementById('simDongB');
        const simSchoolType = document.getElementById('simSchoolType');

        if (!sidoA || !sidoB || !gugunA || !gugunB || !dongA || !dongB) {
            console.error('Simulation DOM elements missing!');
            return;
        }

        // 드롭다운 초기 상태 설정
        sidoA.innerHTML = '<option value="">시도 선택</option>';
        sidoB.innerHTML = '<option value="">시도 선택</option>';
        gugunA.innerHTML = '<option value="">구군 선택</option>';
        gugunB.innerHTML = '<option value="">구군 선택</option>';
        dongA.innerHTML = '<option value="">동 선택</option>';
        dongB.innerHTML = '<option value="">동 선택</option>';

        try {
            // 시도 목록 채우기
            const sidos = districtData.map(item => Object.keys(item)[0]);
            sidos.forEach(sido => {
                const optA = document.createElement('option');
                const optB = document.createElement('option');
                optA.value = sido; optA.innerText = sido;
                optB.value = sido; optB.innerText = sido;
                sidoA.appendChild(optA);
                sidoB.appendChild(optB);
            });

            // 시도 변경 시 구군 채우기 핸들러
            const setupSidoChangeHandler = (sidoEl, gugunEl, dongEl) => {
                if (sidoEl.dataset.hasChangeListener) return;
                sidoEl.dataset.hasChangeListener = "true";
                sidoEl.addEventListener('change', () => {
                    const selectedSido = sidoEl.value;
                    gugunEl.innerHTML = '<option value="">구군 선택</option>';
                    dongEl.innerHTML = '<option value="">동 선택</option>';

                    if (selectedSido) {
                        const sidoItem = districtData.find(item => Object.keys(item)[0] === selectedSido);
                        if (sidoItem) {
                            const guguns = sidoItem[selectedSido];
                            guguns.forEach(gugun => {
                                const opt = document.createElement('option');
                                opt.value = gugun;
                                opt.innerText = SUB_DISTRICT_MAP[gugun] ? `${gugun} (전체)` : gugun;
                                gugunEl.appendChild(opt);

                                if (SUB_DISTRICT_MAP[gugun]) {
                                    SUB_DISTRICT_MAP[gugun].forEach(subGugun => {
                                        const subOpt = document.createElement('option');
                                        subOpt.value = subGugun;
                                        subOpt.innerText = `  └ ${subGugun}`;
                                        gugunEl.appendChild(subOpt);
                                    });
                                }
                            });
                        }
                    }
                    updateSimRegionSubInfo();
                });
            };

            // 구군 변경 시 동 채우기 핸들러
            const setupGugunChangeHandler = (sidoEl, gugunEl, dongEl) => {
                if (gugunEl.dataset.hasChangeListener) return;
                gugunEl.dataset.hasChangeListener = "true";
                gugunEl.addEventListener('change', () => {
                    const selectedSido = sidoEl.value;
                    const selectedGugun = gugunEl.value;
                    if (!selectedSido || !selectedGugun) {
                        dongEl.innerHTML = '<option value="">동 선택</option>';
                        updateSimRegionSubInfo();
                    } else {
                        updateDongDropdown(selectedSido, selectedGugun, dongEl);
                    }
                });
            };

            // 동 변경 시 실시간 세부정보 갱신 핸들러
            [dongA, dongB].forEach(dongEl => {
                if (dongEl && !dongEl.dataset.hasChangeListener) {
                    dongEl.dataset.hasChangeListener = "true";
                    dongEl.addEventListener('change', () => {
                        updateSimRegionSubInfo();
                    });
                }
            });

            // 이벤트 바인딩 적용
            setupSidoChangeHandler(sidoA, gugunA, dongA);
            setupSidoChangeHandler(sidoB, gugunB, dongB);
            setupGugunChangeHandler(sidoA, gugunA, dongA);
            setupGugunChangeHandler(sidoB, gugunB, dongB);

            // 공통 학교급 필터 변경 시 양측 동 목록 및 세부 정보 갱신
            if (simSchoolType && !simSchoolType.dataset.hasChangeListener) {
                simSchoolType.dataset.hasChangeListener = "true";
                simSchoolType.addEventListener('change', () => {
                    const sidoAVal = sidoA.value;
                    const gugunAVal = gugunA.value;
                    if (sidoAVal && gugunAVal) {
                        updateDongDropdown(sidoAVal, gugunAVal, dongA);
                    }

                    const sidoBVal = sidoB.value;
                    const gugunBVal = gugunB.value;
                    if (sidoBVal && gugunBVal) {
                        updateDongDropdown(sidoBVal, gugunBVal, dongB);
                    }
                    updateSimRegionSubInfo();
                });
            }

            // 1. 활성화된 자녀 학교 정보 조회 및 행정구역 분석 (학교 데이터베이스 로딩 대기)
            if (schoolsDatabase.length === 0 && schoolsLoadPromise) {
                await schoolsLoadPromise;
            }

            const { activeChild, school: childSchool } = getActiveChildSchoolInfo();
            const childRegion = await resolveSchoolRegionData(childSchool);

            // 2. 자녀 학교의 학교급(초/중/고)으로 비교 대상 탭 자동 동기화
            if (childRegion.schoolType && typeof window.setSimSchoolType === 'function') {
                window.setSimSchoolType(childRegion.schoolType);
            }

            // 3. 후보지역 A (현재 거주): 자녀 학교의 시도/구군/동 자동 선택
            sidoA.value = childRegion.sido;
            sidoA.dispatchEvent(new Event('change'));

            if (gugunA) {
                const gugunOpts = Array.from(gugunA.options).map(o => o.value);
                let matchedGugun = gugunOpts.find(v => v === childRegion.gugun) ||
                                  gugunOpts.find(v => v && childRegion.gugun && (v.includes(childRegion.gugun) || childRegion.gugun.includes(v))) ||
                                  (gugunOpts.length > 1 ? gugunOpts[1] : '');
                if (matchedGugun) {
                    gugunA.value = matchedGugun;
                    gugunA.dispatchEvent(new Event('change'));
                }

                // 자녀 학교의 동을 정확히 선택
                await updateDongDropdown(sidoA.value, gugunA.value, dongA, childRegion.dong);
            }

            // 4. 후보지역 B (이사 희망): 기본 분당권(경기도 성남시 분당구 수내동) 세팅
            if (!sidoB.value) {
                sidoB.value = '경기도';
                sidoB.dispatchEvent(new Event('change'));
                if (gugunB) {
                    const bdOpt = gugunB.querySelector('option[value="분당구"]');
                    if (bdOpt) {
                        gugunB.value = '분당구';
                    } else {
                        const snOpt = gugunB.querySelector('option[value="성남시"]');
                        if (snOpt) gugunB.value = '성남시';
                    }
                    gugunB.dispatchEvent(new Event('change'));
                    await updateDongDropdown(sidoB.value, gugunB.value, dongB, '수내동');
                }
            }

            updateSimRegionSubInfo();
            console.log('initSimulationDropdowns populated successfully with child school:', childSchool ? childSchool.school_name : 'default');
        } catch (e) {
            console.error('행정구역 데이터 초기화 에러:', e);
        }
    }
    window.initSimulationDropdowns = initSimulationDropdowns;

    window.setSimSchoolType = function(type, btnEl) {
        const sel = document.getElementById('simSchoolType');
        if (sel) {
            sel.value = type;
            sel.dispatchEvent(new Event('change'));
        }
        document.querySelectorAll('.sim-school-tab').forEach(btn => {
            btn.classList.remove('active');
            btn.style.background = 'transparent';
            btn.style.border = 'none';
            btn.style.color = '#64748b';
            btn.style.fontWeight = '600';
            btn.style.boxShadow = 'none';
            btn.innerText = btn.getAttribute('data-val') || btn.innerText.replace(' ●', '');
        });
        if (!btnEl && type) {
            btnEl = document.querySelector(`.sim-school-tab[data-val="${type}"]`);
        }
        if (btnEl) {
            btnEl.classList.add('active');
            btnEl.style.background = '#eff6ff';
            btnEl.style.border = '1px solid #bfdbfe';
            btnEl.style.color = '#2563eb';
            btnEl.style.fontWeight = '700';
            btnEl.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
            if (!btnEl.innerText.includes('●')) {
                btnEl.innerText = btnEl.innerText + ' ●';
            }
        }
        const infoText = document.getElementById('simSchoolTypeInfoText');
        if (infoText) {
            if (type === '초등학교') {
                infoText.innerText = '초등학교 기준: 학구 내 안전 통학 및 중학교 연계 입학 환경 분석';
            } else if (type === '고등학교') {
                infoText.innerText = '고등학교 기준: 4년제 대학 진학률 및 서울대/의대 진학 성과 분석';
            } else {
                infoText.innerText = '중학교 기준: 학업성취도 A등급 비율 · 특목고 진학률 분석';
            }
        }
        updateSimRegionSubInfo();
    };

    function getSimRegionCalculatedInfo(sido, gugun, dong, typeLabel) {
        if (!sido && !gugun) {
            return {
                subtitle: `(${typeLabel} / 지역 선택)`,
                schools: '지역 선택 필요',
                price: '-억'
            };
        }

        const fullKey = `${sido} ${gugun} ${dong}`.trim();

        // 1. 서브타이틀 별칭 계산
        let nick = '';
        if (gugun.includes('서초')) nick = '서초권';
        else if (gugun.includes('강남') || dong.includes('대치')) nick = '대치·강남권';
        else if (gugun.includes('송파') || dong.includes('잠실')) nick = '잠실·송파권';
        else if (gugun.includes('양천') || dong.includes('목동')) nick = '목동권';
        else if (gugun.includes('분당') || dong.includes('수내')) nick = '분당권';
        else if (gugun.includes('수지') || dong.includes('풍덕천')) nick = '수지권';
        else if (gugun.includes('동안') || dong.includes('평촌')) nick = '평촌권';
        else if (gugun.includes('수성') || dong.includes('범어')) nick = '대구 수성권';
        else if (gugun.includes('해운대') || dong.includes('우동')) nick = '부산 해운대권';
        else if (gugun.includes('유성') || dong.includes('도룡')) nick = '대전 유성권';
        else if (dong.includes('봉선')) nick = '광주 봉선권';
        else if (gugun.includes('연수') || dong.includes('송도')) nick = '송도 국제도시';
        else nick = dong ? `${dong}` : `${gugun}`;

        const subtitle = `(${typeLabel} / ${nick})`;

        // 2. 동적 주요 학군 검색
        const simType = document.getElementById('simSchoolType')?.value || '중학교';
        let matchedSchools = [];
        if (typeof schoolsDatabase !== 'undefined' && schoolsDatabase.length > 0) {
            matchedSchools = schoolsDatabase.filter(s => {
                if (simType !== 'all' && s.school_type !== simType) return false;
                const addr = s.address || '';
                const shortSido = sido ? sido.substring(0, 2) : '';
                const matchSido = !sido || addr.includes(shortSido);
                const matchGugun = !gugun || checkGugunMatch(addr, gugun);
                const matchDong = !dong || addr.includes(dong);
                return matchSido && matchGugun && matchDong;
            });

            if (matchedSchools.length < 2 && gugun) {
                matchedSchools = schoolsDatabase.filter(s => {
                    if (simType !== 'all' && s.school_type !== simType) return false;
                    const addr = s.address || '';
                    const shortSido = sido ? sido.substring(0, 2) : '';
                    return (!sido || addr.includes(shortSido)) && checkGugunMatch(addr, gugun);
                });
            }
        }

        let schoolsText = '';
        if (typeLabel === '현재 거주' && typeof getActiveChildSchoolInfo === 'function') {
            const { school: activeSchool } = getActiveChildSchoolInfo();
            if (activeSchool && activeSchool.school_name) {
                const foundIdx = matchedSchools.findIndex(s => s.school_name === activeSchool.school_name);
                if (foundIdx > -1) {
                    const [picked] = matchedSchools.splice(foundIdx, 1);
                    matchedSchools.unshift(picked);
                } else {
                    const activeShortSido = (sido || '').substring(0, 2);
                    const matchSido = !sido || (activeSchool.address && activeSchool.address.includes(activeShortSido)) || (activeSchool.region && activeSchool.region.includes(activeShortSido));
                    const matchGugun = !gugun || checkGugunMatch(activeSchool.address, gugun);
                    if (matchSido && matchGugun) {
                        matchedSchools.unshift(activeSchool);
                    }
                }
            }
        }

        if (matchedSchools.length >= 2) {
            matchedSchools.sort((a, b) => {
                if (typeLabel === '현재 거주' && typeof getActiveChildSchoolInfo === 'function') {
                    const { school: activeSchool } = getActiveChildSchoolInfo();
                    if (activeSchool) {
                        if (a.school_name === activeSchool.school_name) return -1;
                        if (b.school_name === activeSchool.school_name) return 1;
                    }
                }
                return (b.achievement_a_ratio || b.students_count || 0) - (a.achievement_a_ratio || a.students_count || 0);
            });
            const name1 = matchedSchools[0].school_name.replace(/(초등|중|고등)?학교$/, '');
            const name2 = matchedSchools[1].school_name.replace(/(초등|중|고등)?학교$/, '');
            const suffix = simType.includes('초') ? '초' : (simType.includes('고') ? '고' : '중');
            schoolsText = `${name1}·${name2}${suffix}`;
        } else if (matchedSchools.length === 1) {
            schoolsText = matchedSchools[0].school_name;
        } else {
            if (typeLabel === '현재 거주' && typeof getActiveChildSchoolInfo === 'function') {
                const { school: activeSchool } = getActiveChildSchoolInfo();
                if (activeSchool && activeSchool.school_name) {
                    schoolsText = activeSchool.school_name;
                }
            }
            if (!schoolsText) {
                if (gugun.includes('서초')) schoolsText = '서운중·서일중';
                else if (gugun.includes('분당')) schoolsText = '수내중·내정중';
                else if (gugun.includes('강남')) schoolsText = '대치중·휘문중';
                else if (gugun.includes('양천')) schoolsText = '목운중·신목중';
                else if (gugun.includes('송파')) schoolsText = '잠실중·신천중';
                else if (gugun.includes('수성')) schoolsText = '경신중·정화중';
                else schoolsText = `${dong || gugun || '해당'} 주요 학군`;
            }
        }

        // 3. 동적 평균 아파트 매매 시세 테이블 및 추정
        const PRICE_MAP = {
            '서울특별시 강남구 압구정동': '42.0억',
            '서울특별시 강남구 청담동': '35.0억',
            '서울특별시 강남구 대치동': '31.5억',
            '서울특별시 강남구 개포동': '28.5억',
            '서울특별시 서초구 반포동': '36.5억',
            '서울특별시 서초구 잠원동': '30.2억',
            '서울특별시 서초구 서초동': '26.8억',
            '서울특별시 서초구 방배동': '22.5억',
            '서울특별시 송파구 잠실동': '24.5억',
            '서울특별시 송파구 신천동': '23.8억',
            '서울특별시 송파구 가락동': '18.2억',
            '서울특별시 양천구 목동': '21.5억',
            '서울특별시 양천구 신정동': '17.8억',
            '서울특별시 용산구 한남동': '45.0억',
            '서울특별시 용산구 이촌동': '27.5억',
            '서울특별시 마포구 아현동': '18.5억',
            '서울특별시 마포구 공덕동': '17.2억',
            '경기도 성남시 분당구 백현동': '21.5억',
            '경기도 성남시 분당구 정자동': '17.8억',
            '경기도 성남시 분당구 수내동': '16.5억',
            '경기도 성남시 분당구 서현동': '15.2억',
            '경기도 용인시 수지구 성복동': '13.2억',
            '경기도 용인시 수지구 풍덕천동': '11.8억',
            '경기도 안양시 동안구 범계동': '12.5억',
            '경기도 안양시 동안구 평촌동': '11.8억',
            '인천광역시 연수구 송도동': '10.5억',
            '대구광역시 수성구 범어동': '14.8억',
            '대구광역시 수성구 만촌동': '12.5억',
            '부산광역시 해운대구 우동': '14.2억',
            '부산광역시 해운대구 중동': '11.5억',
            '대전광역시 유성구 도룡동': '11.2억',
            '광주광역시 남구 봉선동': '9.8억',
            '세종특별자치시 새롬동': '8.8억'
        };

        let priceText = PRICE_MAP[fullKey];
        if (!priceText) {
            if (gugun.includes('강남')) priceText = '29.5억';
            else if (gugun.includes('서초')) priceText = '26.8억';
            else if (gugun.includes('송파')) priceText = '22.4억';
            else if (gugun.includes('용산')) priceText = '28.0억';
            else if (gugun.includes('양천')) priceText = '19.5억';
            else if (gugun.includes('마포')) priceText = '16.8억';
            else if (gugun.includes('성동')) priceText = '17.5억';
            else if (gugun.includes('강동')) priceText = '14.2억';
            else if (gugun.includes('분당')) priceText = '16.5억';
            else if (gugun.includes('수지')) priceText = '11.8억';
            else if (gugun.includes('동안')) priceText = '11.2억';
            else if (gugun.includes('영통')) priceText = '10.5억';
            else if (gugun.includes('수성')) priceText = '11.5억';
            else if (gugun.includes('해운대')) priceText = '10.8억';
            else if (gugun.includes('유성')) priceText = '8.5억';
            else if (sido.includes('서울')) priceText = '13.5억';
            else if (sido.includes('경기')) priceText = '9.2억';
            else if (sido.includes('인천')) priceText = '7.5억';
            else priceText = '6.8억';
        }

        return { subtitle, schools: schoolsText, price: priceText };
    }

    function updateSimRegionSubInfo() {
        const sidoA = document.getElementById('simSidoA')?.value || '';
        const gugunA = document.getElementById('simGugunA')?.value || '';
        const dongA = document.getElementById('simDongA')?.value || '';

        const infoA = getSimRegionCalculatedInfo(sidoA, gugunA, dongA, '현재 거주');
        const subA = document.getElementById('simSubtitleA');
        const schA = document.getElementById('simSchoolsListA');
        const prcA = document.getElementById('simPriceA');

        if (subA) subA.innerText = infoA.subtitle;
        if (schA) schA.innerText = infoA.schools;
        if (prcA) prcA.innerText = infoA.price;

        const sidoB = document.getElementById('simSidoB')?.value || '';
        const gugunB = document.getElementById('simGugunB')?.value || '';
        const dongB = document.getElementById('simDongB')?.value || '';

        const infoB = getSimRegionCalculatedInfo(sidoB, gugunB, dongB, '이사 희망');
        const subB = document.getElementById('simSubtitleB');
        const schB = document.getElementById('simSchoolsListB');
        const prcB = document.getElementById('simPriceB');

        if (subB) subB.innerText = infoB.subtitle;
        if (schB) schB.innerText = infoB.schools;
        if (prcB) prcB.innerText = infoB.price;
    }
    window.updateSimRegionSubInfo = updateSimRegionSubInfo;

    async function updateDongDropdown(sido, gugun, dongSelectEl, targetDongToSelect = null) {
        if (schoolsDatabase.length === 0 && schoolsLoadPromise) {
            await schoolsLoadPromise;
        }
        const simSchoolTypeVal = document.getElementById('simSchoolType') ? document.getElementById('simSchoolType').value : 'all';
        const cacheKey = `${sido} ${gugun} ${simSchoolTypeVal}`;

        // 이미 캐시된 데이터가 있다면 즉시 로딩 후 반환
        if (simDongCache[cacheKey]) {
            dongSelectEl.innerHTML = '<option value="">동 선택</option>';
            simDongCache[cacheKey].forEach(dong => {
                const opt = document.createElement('option');
                opt.value = dong;
                opt.innerText = dong;
                dongSelectEl.appendChild(opt);
            });
            if (targetDongToSelect) {
                if (dongSelectEl.querySelector(`option[value="${targetDongToSelect}"]`)) {
                    dongSelectEl.value = targetDongToSelect;
                } else {
                    const opt = document.createElement('option');
                    opt.value = targetDongToSelect;
                    opt.innerText = targetDongToSelect;
                    dongSelectEl.appendChild(opt);
                    dongSelectEl.value = targetDongToSelect;
                }
            }
            updateSimRegionSubInfo();
            return;
        }

        dongSelectEl.innerHTML = '<option value="">동 로딩 중...</option>';

        // 해당 구군 및 학교급에 속하는 학교들만 추출
        let filteredSchools = schoolsDatabase.filter(s => {
            const shortSido = sido ? sido.substring(0, 2) : '';
            const matchSido = !sido || (s.region && s.region.includes(shortSido)) || (s.address && s.address.includes(shortSido));
            const matchGugun = !gugun || checkGugunMatch(s.address, gugun);
            if (!matchSido || !matchGugun) return false;

            if (simSchoolTypeVal !== 'all' && s.school_type !== simSchoolTypeVal) {
                return false;
            }
            return true;
        });

        if (filteredSchools.length === 0) {
            dongSelectEl.innerHTML = '<option value="">학교 없음</option>';
            if (targetDongToSelect) {
                const opt = document.createElement('option');
                opt.value = targetDongToSelect;
                opt.innerText = targetDongToSelect;
                dongSelectEl.appendChild(opt);
                dongSelectEl.value = targetDongToSelect;
            }
            updateSimRegionSubInfo();
            return;
        }

        // 전체 학교를 대상으로 법정동 역지오코딩 수행 (누락 동 방지)
        const dongSet = new Set();

        const promises = filteredSchools.map(school => {
            return new Promise((resolve) => {
                if (!geocoder || !school.lat || !school.lng) {
                    resolve();
                    return;
                }
                geocoder.coord2RegionCode(school.lng, school.lat, (result, status) => {
                    if (status === kakao.maps.services.Status.OK) {
                        const bRegion = result.find(r => r.region_type === 'B'); // 법정동
                        if (bRegion && bRegion.region_3depth_name) {
                            dongSet.add(bRegion.region_3depth_name);
                        }
                    }
                    resolve();
                });
            });
        });

        await Promise.all(promises);

        const sortedDongs = Array.from(dongSet).sort((a, b) => a.localeCompare(b, 'ko'));

        if (sortedDongs.length === 0) {
            dongSelectEl.innerHTML = '<option value="all">전체</option>';
            if (targetDongToSelect) {
                const opt = document.createElement('option');
                opt.value = targetDongToSelect;
                opt.innerText = targetDongToSelect;
                dongSelectEl.appendChild(opt);
                dongSelectEl.value = targetDongToSelect;
            }
        } else {
            // 캐시 데이터 저장
            simDongCache[cacheKey] = sortedDongs;

            dongSelectEl.innerHTML = '<option value="">동 선택</option>';
            sortedDongs.forEach(dong => {
                const opt = document.createElement('option');
                opt.value = dong;
                opt.innerText = dong;
                dongSelectEl.appendChild(opt);
            });

            if (targetDongToSelect) {
                if (dongSelectEl.querySelector(`option[value="${targetDongToSelect}"]`)) {
                    dongSelectEl.value = targetDongToSelect;
                } else {
                    const opt = document.createElement('option');
                    opt.value = targetDongToSelect;
                    opt.innerText = targetDongToSelect;
                    dongSelectEl.appendChild(opt);
                    dongSelectEl.value = targetDongToSelect;
                }
            }
        }
        updateSimRegionSubInfo();
    }

    function runMovingSimulation(regionA, regionB, labelA, labelB) {
        if (!regionA || !regionB) {
            alert("두 후보 지역을 모두 선택해 주세요.");
            return;
        }

        const nameA = labelA || regionA;
        const nameB = labelB || regionB;

        const getCoords = (address) => {
            return new Promise((resolve) => {
                if (!geocoder) {
                    resolve(null);
                    return;
                }
                geocoder.addressSearch(address, (result, status) => {
                    if (status === kakao.maps.services.Status.OK) {
                        resolve({
                            lat: parseFloat(result[0].y),
                            lng: parseFloat(result[0].x)
                        });
                    } else {
                        resolve(null);
                    }
                });
            });
        };

        const getDistance = (lat1, lng1, lat2, lng2) => {
            const R = 6371; // 지구 반경 (km)
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        };

        const resultPanel = document.getElementById('simulationResultPanel');
        resultPanel.style.display = 'block';
        resultPanel.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px 0; font-size: 13px;">두 지역의 학교 데이터를 수집하여 학군 분석 중입니다...</div>';
        if (typeof scrollSimulationToResult === 'function') scrollSimulationToResult();

        const simSchoolTypeVal = document.getElementById('simSchoolType') ? document.getElementById('simSchoolType').value : 'all';

        Promise.all([getCoords(regionA), getCoords(regionB)]).then(([coordsA, coordsB]) => {
            let schoolsA = [];
            let schoolsB = [];

            if (coordsA) {
                schoolsA = schoolsDatabase.filter(s => {
                    if (!s.lat || !s.lng) return false;
                    if (simSchoolTypeVal !== 'all' && s.school_type !== simSchoolTypeVal) return false;
                    return getDistance(coordsA.lat, coordsA.lng, s.lat, s.lng) <= 1.8;
                });
            } else {
                // 카카오 API 좌표 실패 시 폴백 (구군/동 매치)
                const partsA = regionA.split(' ');
                const dongTermA = partsA.length > 2 ? partsA[2] : '';
                const gugunTermA = partsA.length > 1 ? partsA[1] : '';
                schoolsA = schoolsDatabase.filter(s => {
                    if (simSchoolTypeVal !== 'all' && s.school_type !== simSchoolTypeVal) return false;
                    const addr = s.address || '';
                    if (dongTermA && addr.includes(dongTermA)) return true;
                    if (gugunTermA && addr.includes(gugunTermA)) return true;
                    return false;
                });
            }

            if (coordsB) {
                schoolsB = schoolsDatabase.filter(s => {
                    if (!s.lat || !s.lng) return false;
                    if (simSchoolTypeVal !== 'all' && s.school_type !== simSchoolTypeVal) return false;
                    return getDistance(coordsB.lat, coordsB.lng, s.lat, s.lng) <= 1.8;
                });
            } else {
                const partsB = regionB.split(' ');
                const dongTermB = partsB.length > 2 ? partsB[2] : '';
                const gugunTermB = partsB.length > 1 ? partsB[1] : '';
                schoolsB = schoolsDatabase.filter(s => {
                    if (simSchoolTypeVal !== 'all' && s.school_type !== simSchoolTypeVal) return false;
                    const addr = s.address || '';
                    if (dongTermB && addr.includes(dongTermB)) return true;
                    if (gugunTermB && addr.includes(gugunTermB)) return true;
                    return false;
                });
            }

            if (schoolsA.length === 0 && schoolsB.length === 0) {
                alert("선택하신 지역 근처의 학교 데이터를 찾을 수 없습니다.");
                resultPanel.style.display = 'none';
                return;
            }

            const calcStats = (schools) => {
                if (schools.length === 0) return { avg: 0, classSize: 0, budget: 0, violence: 0, count: 0 };
                let scoreSum = 0;
                let classSizeSum = 0;
                let budgetSum = 0;
                let violenceSum = 0;

                schools.forEach(s => {
                    const schoolAvg = (s.subjects.korean.avg + s.subjects.english.avg + s.subjects.math.avg) / 3;
                    scoreSum += schoolAvg;
                    classSizeSum += s.class_avg_size || 25;
                    budgetSum += s.extracurricular_budget || 0;
                    violenceSum += s.violence_stats ? s.violence_stats.total_cases : 0;
                });

                return {
                    avg: Math.round((scoreSum / schools.length) * 10) / 10,
                    classSize: Math.round((classSizeSum / schools.length) * 10) / 10,
                    budget: Math.round((budgetSum / schools.length)),
                    violence: Math.round((violenceSum / schools.length) * 10) / 10,
                    count: schools.length
                };
            };

            const statsA = calcStats(schoolsA);
            const statsB = calcStats(schoolsB);

            // 자녀 점수 획득 및 백분위 계산
            const childScore = document.getElementById('currentLevelRange') ? parseInt(document.getElementById('currentLevelRange').value) : 80;
            const getPercentile = (score, mean, stdDev = 15) => {
                if (stdDev <= 0) stdDev = 15;
                const z = (score - mean) / stdDev;
                const t = 1 / (1 + 0.2316419 * Math.abs(z));
                const d = 0.3989423 * Math.exp(-z * z / 2);
                let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
                if (z > 0) p = 1 - p;
                return Math.max(0.1, Math.min(99.9, (1 - p) * 100));
            };

            const percentileA = getPercentile(childScore, statsA.avg);
            const percentileB = getPercentile(childScore, statsB.avg);

            // 면학 분위기 지수 계산
            const atmosphereA = Math.round((statsA.avg * 0.5) + (Math.max(0, 100 - (statsA.classSize * 2.8)) * 0.2) + (Math.max(0, 100 - (statsA.violence * 12)) * 0.3));
            const atmosphereB = Math.round((statsB.avg * 0.5) + (Math.max(0, 100 - (statsB.classSize * 2.8)) * 0.2) + (Math.max(0, 100 - (statsB.violence * 12)) * 0.3));

            // 시세 및 지역 정보 가져오기
            const sidoAVal = document.getElementById('simSidoA')?.value || '';
            const gugunAVal = document.getElementById('simGugunA')?.value || '';
            const dongAVal = document.getElementById('simDongA')?.value || '';
            const infoA = getSimRegionCalculatedInfo(sidoAVal, gugunAVal, dongAVal, '현재 거주');

            const sidoBVal = document.getElementById('simSidoB')?.value || '';
            const gugunBVal = document.getElementById('simGugunB')?.value || '';
            const dongBVal = document.getElementById('simDongB')?.value || '';
            const infoB = getSimRegionCalculatedInfo(sidoBVal, gugunBVal, dongBVal, '이사 희망');

            const priceTextA = infoA.price;
            const priceTextB = infoB.price;
            const priceNumA = parseFloat(priceTextA) || 26.8;
            const priceNumB = parseFloat(priceTextB) || 16.5;
            const priceDiff = Math.max(0, Math.round((priceNumA - priceNumB) * 10) / 10);
            const priceSavePercent = priceNumA > 0 ? Math.round((priceDiff / priceNumA) * 100) : 49;
            const priceSaveText = priceSavePercent > 0 ? `${priceSavePercent}% 절감` : '유사 수준';

            // 카카오 카드 공유 및 리포트용 시뮬레이션 결과 데이터 보존
            window.lastSimulationData = {
                regionA,
                regionB,
                nameA,
                nameB,
                schoolType: simSchoolTypeVal,
                statsA,
                statsB,
                percentileA,
                percentileB,
                priceTextA,
                priceTextB,
                priceSaveText,
                sidoA: sidoAVal,
                gugunA: gugunAVal,
                dongA: dongAVal,
                sidoB: sidoBVal,
                gugunB: gugunBVal,
                dongB: dongBVal
            };

            resultPanel.innerHTML = `
                <!-- 1. Top Dark Banner Box -->
                <div style="background: #0f172a; border-radius: 20px; padding: 20px 22px; color: #ffffff; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2); margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: #f59e0b; color: #0f172a; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 12px; letter-spacing: -0.2px;">AI 분석 완료</span>
                            <span style="font-size: 15.5px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">시뮬레이션 비교 결론</span>
                        </div>
                        <span style="font-size: 12px; color: #94a3b8; font-weight: 500;">${nameA} (${statsA.count}교) vs ${nameB} (${statsB.count}교)</span>
                    </div>
                    <div style="font-size: 13.5px; line-height: 1.6; color: #f8fafc; letter-spacing: -0.2px;">
                        <strong style="color: #fbbf24;">${nameA}</strong>은 높은 면학 분위기와 특목 진학률의 프리미엄이 돋보이며, <strong style="color: #fbbf24;">${nameB}</strong>은 동일 예산 대비 주거비 <strong style="color: #fbbf24;">${priceSaveText} 및 우수한 내신 경쟁 여건</strong>을 갖추고 있습니다.
                    </div>
                </div>

                <!-- 2. 핵심 지표 1:1 비교 매트릭스 Card -->
                <div style="background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <span style="font-size: 15px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 8px; letter-spacing: -0.3px;">
                            <span>📊</span> 핵심 지표 1:1 비교 매트릭스
                        </span>
                        <span style="font-size: 11.5px; color: #94a3b8; font-weight: 500; letter-spacing: -0.2px;">동일 연도 표준화 수치</span>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="border-bottom: 1px solid #f1f5f9; text-align: center;">
                                <th style="padding: 10px 4px; text-align: left; color: #64748b; font-weight: 700; width: 40%;">비교 항목</th>
                                <th style="padding: 10px 4px; color: #2563eb; font-weight: 800; width: 30%;">● ${nameA}</th>
                                <th style="padding: 10px 4px; color: #059669; font-weight: 800; width: 30%;">● ${nameB}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Row 1: 대상 학교 수 -->
                            <tr style="border-bottom: 1px solid #f8fafc;">
                                <td style="padding: 12px 4px; color: #334155; font-weight: 700;">🏠 대상 학교 수</td>
                                <td style="padding: 12px 4px; text-align: center; font-weight: 700; color: #0f172a;">${statsA.count}개교</td>
                                <td style="padding: 12px 4px; text-align: center; font-weight: 700; color: #0f172a;">${statsB.count}개교</td>
                            </tr>

                            <!-- Row 2: 학업성취도 평균 -->
                            <tr style="border-bottom: 1px solid #f8fafc;">
                                <td style="padding: 12px 4px; color: #334155; font-weight: 700;">📈 학업성취도 평균</td>
                                <td style="padding: 12px 4px; text-align: center; vertical-align: middle;">
                                    <span style="font-weight: 800; color: ${statsA.avg >= statsB.avg ? '#2563eb' : '#0f172a'};">${statsA.avg}점</span>
                                    ${statsA.avg > statsB.avg ? `<span style="background: #eff6ff; color: #2563eb; font-size: 10.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: block; margin-top: 2px;">+${(statsA.avg - statsB.avg).toFixed(1)}점 우세</span>` : ''}
                                </td>
                                <td style="padding: 12px 4px; text-align: center; vertical-align: middle;">
                                    <span style="font-weight: 800; color: ${statsB.avg >= statsA.avg ? '#059669' : '#0f172a'};">${statsB.avg}점</span>
                                    ${statsB.avg > statsA.avg ? `<span style="background: #ecfdf5; color: #059669; font-size: 10.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: block; margin-top: 2px;">+${(statsB.avg - statsA.avg).toFixed(1)}점 우세</span>` : ''}
                                </td>
                            </tr>

                            <!-- Row 3: 자녀 예상 백분위 -->
                            <tr style="border-bottom: 1px solid #f8fafc;">
                                <td style="padding: 12px 4px; color: #334155; font-weight: 700;">🎯 자녀 예상 백분위</td>
                                <td style="padding: 12px 4px; text-align: center; vertical-align: middle;">
                                    <span style="font-weight: 800; color: ${percentileA <= percentileB ? '#2563eb' : '#0f172a'};">상위 ${percentileA.toFixed(1)}%</span>
                                    ${percentileA < percentileB ? `<span style="background: #eff6ff; color: #2563eb; font-size: 10.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: block; margin-top: 2px;">+${(percentileB - percentileA).toFixed(1)}%p 유리</span>` : ''}
                                </td>
                                <td style="padding: 12px 4px; text-align: center; vertical-align: middle;">
                                    <span style="font-weight: 800; color: ${percentileB <= percentileA ? '#059669' : '#0f172a'};">상위 ${percentileB.toFixed(1)}%</span>
                                    ${percentileB < percentileA ? `<span style="background: #ecfdf5; color: #059669; font-size: 10.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: block; margin-top: 2px;">+${(percentileA - percentileB).toFixed(1)}%p 유리</span>` : ''}
                                </td>
                            </tr>

                            <!-- Row 4: 종합 면학 분위기 -->
                            <tr style="border-bottom: 1px solid #f8fafc;">
                                <td style="padding: 12px 4px; color: #334155; font-weight: 700;">🧩 종합 면학 분위기</td>
                                <td style="padding: 12px 4px; text-align: center; vertical-align: middle;">
                                    <span style="font-weight: 800; color: ${atmosphereA >= atmosphereB ? '#2563eb' : '#0f172a'};">${atmosphereA}점 <span style="font-size: 11px; color: #94a3b8; font-weight: 400;">/100</span></span>
                                    ${atmosphereA > atmosphereB ? `<span style="background: #eff6ff; color: #2563eb; font-size: 10.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: block; margin-top: 2px;">+${atmosphereA - atmosphereB}점 우수</span>` : ''}
                                </td>
                                <td style="padding: 12px 4px; text-align: center; vertical-align: middle;">
                                    <span style="font-weight: 800; color: ${atmosphereB >= atmosphereA ? '#059669' : '#0f172a'};">${atmosphereB}점 <span style="font-size: 11px; color: #94a3b8; font-weight: 400;">/100</span></span>
                                    ${atmosphereB > atmosphereA ? `<span style="background: #ecfdf5; color: #059669; font-size: 10.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: block; margin-top: 2px;">+${atmosphereB - atmosphereA}점 우수</span>` : ''}
                                </td>
                            </tr>

                            <!-- Row 5: 학급 평균 학생수 -->
                            <tr style="border-bottom: 1px solid #f8fafc;">
                                <td style="padding: 12px 4px; color: #334155; font-weight: 700;">👨‍👩‍👧‍👦 학급 평균 학생수</td>
                                <td style="padding: 12px 4px; text-align: center; font-weight: 700; color: #0f172a;">${statsA.classSize}명</td>
                                <td style="padding: 12px 4px; text-align: center; font-weight: 700; color: #0f172a;">${statsB.classSize}명</td>
                            </tr>

                            <!-- Row 6: 평균 창체 예산 -->
                            <tr style="border-bottom: 1px solid #f8fafc;">
                                <td style="padding: 12px 4px; color: #334155; font-weight: 700;">💰 평균 창체 예산</td>
                                <td style="padding: 12px 4px; text-align: center; vertical-align: middle;">
                                    <span style="font-weight: 700; color: #0f172a;">${statsA.budget}만원</span>
                                    ${statsA.budget > statsB.budget ? `<span style="background: #eff6ff; color: #2563eb; font-size: 10.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: block; margin-top: 2px;">+${statsA.budget - statsB.budget}만원 여유</span>` : ''}
                                </td>
                                <td style="padding: 12px 4px; text-align: center; vertical-align: middle;">
                                    <span style="font-weight: 700; color: #0f172a;">${statsB.budget}만원</span>
                                    ${statsB.budget > statsA.budget ? `<span style="background: #ecfdf5; color: #059669; font-size: 10.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: block; margin-top: 2px;">+${statsB.budget - statsA.budget}만원 여유</span>` : ''}
                                </td>
                            </tr>

                            <!-- Row 7: 평균 학교폭력 발생 -->
                            <tr style="border-bottom: 1px solid #f8fafc;">
                                <td style="padding: 12px 4px; color: #334155; font-weight: 700;">🛡️ 평균 학교폭력 발생</td>
                                <td style="padding: 12px 4px; text-align: center; vertical-align: middle;">
                                    <span style="font-weight: 800; color: ${statsA.violence <= statsB.violence ? '#2563eb' : '#0f172a'};">${statsA.violence}건/년</span>
                                    ${statsA.violence <= statsB.violence ? `<span style="background: #eff6ff; color: #2563eb; font-size: 10.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: block; margin-top: 2px;">안심 우수</span>` : ''}
                                </td>
                                <td style="padding: 12px 4px; text-align: center; vertical-align: middle;">
                                    <span style="font-weight: 800; color: ${statsB.violence <= statsA.violence ? '#059669' : '#0f172a'};">${statsB.violence}건/년</span>
                                    ${statsB.violence <= statsA.violence ? `<span style="background: #ecfdf5; color: #059669; font-size: 10.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: block; margin-top: 2px;">안심 우수</span>` : ''}
                                </td>
                            </tr>

                            <!-- Row 8: 전용 84㎡ 평균 시세 -->
                            <tr>
                                <td style="padding: 12px 4px; color: #334155; font-weight: 700;">🏢 전용 84㎡ 평균 시세</td>
                                <td style="padding: 12px 4px; text-align: center; font-weight: 800; color: #0f172a;">${priceTextA}</td>
                                <td style="padding: 12px 4px; text-align: center; vertical-align: middle;">
                                    <span style="font-weight: 800; color: #059669;">${priceTextB}</span>
                                    ${priceSavePercent > 0 ? `<span style="background: #ecfdf5; color: #059669; font-size: 10.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: block; margin-top: 2px;">${priceSavePercent}% 세이브</span>` : ''}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- 3. 자녀 가상 학업 위치 비교 Card -->
                <div style="background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <span style="font-size: 15px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 8px; letter-spacing: -0.3px;">
                            <span>📊</span> 자녀 가상 학업 위치 비교
                        </span>
                        <span style="background: #f1f5f9; color: #64748b; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; letter-spacing: -0.2px;">상위 %가 낮을수록 우수</span>
                    </div>

                    <!-- Region A Progress Bar -->
                    <div style="margin-bottom: 14px;">
                        <div style="display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 700; margin-bottom: 6px;">
                            <span style="color: #2563eb;">● ${nameA}</span>
                            <span style="color: #2563eb; font-weight: 800;">상위 ${percentileA.toFixed(1)}%</span>
                        </div>
                        <div style="background: #f1f5f9; height: 10px; border-radius: 6px; overflow: hidden;">
                            <div style="background: #2563eb; width: ${Math.min(100, percentileA)}%; height: 100%; border-radius: 6px;"></div>
                        </div>
                    </div>

                    <!-- Region B Progress Bar -->
                    <div style="margin-bottom: 18px;">
                        <div style="display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 700; margin-bottom: 6px;">
                            <span style="color: #059669;">● ${nameB}</span>
                            <span style="color: #059669; font-weight: 800;">상위 ${percentileB.toFixed(1)}% ${percentileB < percentileA ? '(소폭 우위)' : ''}</span>
                        </div>
                        <div style="background: #f1f5f9; height: 10px; border-radius: 6px; overflow: hidden;">
                            <div style="background: #10b981; width: ${Math.min(100, percentileB)}%; height: 100%; border-radius: 6px;"></div>
                        </div>
                    </div>

                    <!-- AI Consultant Box -->
                    <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 14px; padding: 14px 16px; display: flex; gap: 10px; align-items: flex-start;">
                        <span style="font-size: 18px; line-height: 1;">💡</span>
                        <div style="font-size: 12.5px; color: #475569; line-height: 1.6; letter-spacing: -0.2px;">
                            <strong style="color: #1e293b;">학업 컨설턴트 의견:</strong> ${nameB}은 고교 진학 시 내신 산출에 상대적 우위를 선점할 수 있으며, 확보되는 주거 유보 자금${priceDiff > 0 ? `(약 ${priceDiff}억원)` : ''}을 특화 사교육 및 자녀 자산 형성으로 전환하는 전략이 유효합니다.
                        </div>
                    </div>
                </div>

                <!-- 4. Bottom Action Buttons Group (PDF 생성 시 제외) -->
                <div id="simResultActionButtons" data-html2canvas-ignore="true" style="display: flex; gap: 8px; margin-bottom: 10px;">
                    <button id="btnSaveSimulationMypage" onclick="window.saveSimulationToMypage(this);"
                        style="flex: 1; border: 1px solid #cbd5e1; background: #ffffff; color: #1e293b; font-weight: 700; font-size: 13px; padding: 12px 6px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: all 0.2s; white-space: nowrap;"
                        onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#ffffff'">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                        담기
                    </button>
                    <button onclick="window.downloadSimulationPdfReport(this);"
                        style="flex: 1; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; font-weight: 700; font-size: 13px; padding: 12px 6px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: all 0.2s; white-space: nowrap;"
                        onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#ffffff'">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        PDF 저장
                    </button>
                    <button onclick="window.shareSimulationResultKakao(this);"
                        style="flex: 1; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; font-weight: 700; font-size: 13px; padding: 12px 6px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: all 0.2s; white-space: nowrap;"
                        onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#ffffff'">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                        공유하기
                    </button>
                </div>

                <button id="simResultResetButton" data-html2canvas-ignore="true" onclick="window.resetSimulationResultView()"
                    style="width: 100%; background: #0f172a; color: #ffffff; font-weight: 800; font-size: 14.5px; padding: 15px; border-radius: 14px; border: none; cursor: pointer; transition: background 0.2s; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.2);"
                    onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#0f172a'">
                    새로운 학군 조건으로 다시 비교하기
                </button>
            `;
            if (typeof scrollSimulationToResult === 'function') scrollSimulationToResult();
        });
    }

    // 학군 이사 시뮬레이션 공식 PDF 리포트 다운로드 및 인쇄 핸들러
    window.downloadSimulationPdfReport = async function(btnEl) {
        const resultPanel = document.getElementById('simulationResultPanel');
        if (!resultPanel || !resultPanel.children.length) {
            alert('먼저 학군 비교 시뮬레이션을 실행해 주세요.');
            return;
        }

        const origHtml = btnEl ? btnEl.innerHTML : '';
        if (btnEl) {
            btnEl.disabled = true;
            btnEl.style.opacity = '0.7';
            btnEl.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>
                PDF 생성 중...
            `;
        }

        const sidoAVal = document.getElementById('simSidoA')?.value || '';
        const gugunAVal = document.getElementById('simGugunA')?.value || '';
        const dongAVal = document.getElementById('simDongA')?.value || '';
        const regionA = `${sidoAVal} ${gugunAVal} ${dongAVal}`.trim() || '후보지역 A';

        const sidoBVal = document.getElementById('simSidoB')?.value || '';
        const gugunBVal = document.getElementById('simGugunB')?.value || '';
        const dongBVal = document.getElementById('simDongB')?.value || '';
        const regionB = `${sidoBVal} ${gugunBVal} ${dongBVal}`.trim() || '후보지역 B';

        const schoolType = document.getElementById('simSchoolType')?.value || '중학교';
        const now = new Date();
        const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
        const fileDateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const safeNameA = (dongAVal || gugunAVal || '지역A').replace(/\s+/g, '_');
        const safeNameB = (dongBVal || gugunBVal || '지역B').replace(/\s+/g, '_');
        const fileName = `학군_이사_시뮬레이션_리포트_${safeNameA}_vs_${safeNameB}_${fileDateStr}.pdf`;

        // 캡처 전: 임시 공식 헤더 및 푸터 삽입, 액션 버튼 숨김, 스크롤 높이 제한 해제
        const tempHeader = document.createElement('div');
        tempHeader.id = 'tempPdfHeader';
        tempHeader.style.cssText = 'border-bottom: 2.5px solid #2563eb; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; background: #ffffff;';
        tempHeader.innerHTML = `
            <div>
                <div style="font-size: 13px; font-weight: 800; color: #2563eb; margin-bottom: 6px; letter-spacing: -0.2px;">
                    🗺️ 학업여지도 · 학군 이사 시뮬레이션 공식 리포트
                </div>
                <div style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                    ${regionA} vs ${regionB}
                </div>
            </div>
            <div style="text-align: right; font-size: 11.5px; color: #64748b; line-height: 1.6;">
                <div><strong>발행 일자:</strong> ${dateStr}</div>
                <div><strong>비교 학교급:</strong> <span style="color: #2563eb; font-weight: 700;">${schoolType}</span></div>
            </div>
        `;
        resultPanel.insertBefore(tempHeader, resultPanel.firstChild);

        const tempFooter = document.createElement('div');
        tempFooter.id = 'tempPdfFooter';
        tempFooter.style.cssText = 'border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 14px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.6; background: #ffffff;';
        tempFooter.innerHTML = `
            ⓘ 본 리포트는 학교알리미 공시 지표, 국토교통부 아파트 실거래가 및 학업여지도 맞춤형 학군 AI 분석 엔진을 통해 생성되었습니다.<br>
            Copyright © 학업여지도. All rights reserved.
        `;
        resultPanel.appendChild(tempFooter);

        const actionBtnsGroup = document.getElementById('simResultActionButtons') || (btnEl ? btnEl.closest('div') : resultPanel.querySelector('div[style*="display: flex; gap: 10px;"]'));
        const resetBtn = document.getElementById('simResultResetButton') || resultPanel.querySelector('button[onclick*="resetSimulationResultView"]');
        if (actionBtnsGroup) actionBtnsGroup.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'none';

        const origMaxHeight = resultPanel.style.maxHeight;
        const origOverflow = resultPanel.style.overflow;
        resultPanel.style.maxHeight = 'none';
        resultPanel.style.overflow = 'visible';

        const openPrintWindow = (contentHtml, title) => {
            const printWindow = window.open('', '_blank', 'width=800,height=900');
            if (printWindow) {
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html lang="ko">
                    <head>
                        <meta charset="UTF-8">
                        <title>${title.replace('.pdf', '')}</title>
                        <style>
                            @page { size: A4; margin: 12mm; }
                            body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Segoe UI", sans-serif; background: #ffffff; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            [data-html2canvas-ignore="true"], #simResultActionButtons, #simResultResetButton { display: none !important; }
                            @media print { body { padding: 0; } [data-html2canvas-ignore="true"], #simResultActionButtons, #simResultResetButton { display: none !important; } }
                        </style>
                    </head>
                    <body>
                        ${contentHtml}
                        <script>
                            window.onload = function() {
                                window.focus();
                                window.print();
                                setTimeout(function() { window.close(); }, 1000);
                            };
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            } else {
                alert('팝업 차단이 감지되었습니다. 팝업을 허용해 주시면 PDF 리포트를 인쇄 및 저장하실 수 있습니다.');
            }
        };

        try {
            let pdfLib = window.html2pdf;
            if (!pdfLib) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                    script.onload = () => resolve(window.html2pdf);
                    script.onerror = () => reject(new Error('CDN Load Failed'));
                    document.head.appendChild(script);
                }).catch(() => null);
                pdfLib = window.html2pdf;
            }

            if (pdfLib) {
                const opt = {
                    margin: [10, 8, 10, 8],
                    filename: fileName,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        letterRendering: true,
                        logging: false,
                        scrollY: 0,
                        scrollX: 0,
                        backgroundColor: '#ffffff',
                        ignoreElements: (el) => {
                            if (!el) return false;
                            if (el.getAttribute && el.getAttribute('data-html2canvas-ignore') === 'true') return true;
                            if (el.id === 'simResultActionButtons' || el.id === 'simResultResetButton') return true;
                            if (typeof el.closest === 'function' && el.closest('#simResultActionButtons')) return true;
                            return false;
                        }
                    },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                };

                await pdfLib().set(opt).from(resultPanel).save();
            } else {
                openPrintWindow(resultPanel.innerHTML, fileName);
            }
        } catch (err) {
            console.warn('html2pdf 생성 중 오류 발생, 인쇄 Fallback 실행:', err);
            openPrintWindow(resultPanel.innerHTML, fileName);
        } finally {
            // 원복 처리
            if (tempHeader.parentNode) tempHeader.remove();
            if (tempFooter.parentNode) tempFooter.remove();
            if (actionBtnsGroup) actionBtnsGroup.style.display = 'flex';
            if (resetBtn) resetBtn.style.display = 'block';
            resultPanel.style.maxHeight = origMaxHeight;
            resultPanel.style.overflow = origOverflow;

            if (btnEl) {
                btnEl.disabled = false;
                btnEl.style.opacity = '1';
                btnEl.innerHTML = origHtml;
            }
        }
    };

    // 학군 이사 시뮬레이션 결과 카카오톡 카드 공유 핸들러
    window.shareSimulationResultKakao = async function(btnEl) {
        const simData = window.lastSimulationData || {};
        const sidoAVal = simData.sidoA || document.getElementById('simSidoA')?.value || '';
        const gugunAVal = simData.gugunA || document.getElementById('simGugunA')?.value || '';
        const dongAVal = simData.dongA || document.getElementById('simDongA')?.value || '';
        const regionA = simData.regionA || `${sidoAVal} ${gugunAVal} ${dongAVal}`.trim() || '후보지역 A';
        const nameA = simData.nameA || dongAVal || gugunAVal || '지역A';

        const sidoBVal = simData.sidoB || document.getElementById('simSidoB')?.value || '';
        const gugunBVal = simData.gugunB || document.getElementById('simGugunB')?.value || '';
        const dongBVal = simData.dongB || document.getElementById('simDongB')?.value || '';
        const regionB = simData.regionB || `${sidoBVal} ${gugunBVal} ${dongBVal}`.trim() || '후보지역 B';
        const nameB = simData.nameB || dongBVal || gugunBVal || '지역B';

        const schoolType = simData.schoolType || document.getElementById('simSchoolType')?.value || '중학교';
        const priceTextA = simData.priceTextA || '26.8억';
        const priceTextB = simData.priceTextB || '16.5억';
        const priceSaveText = simData.priceSaveText || '유사 수준';
        const statsAAvg = simData.statsA ? `${simData.statsA.avg}점` : '우수';
        const statsBAvg = simData.statsB ? `${simData.statsB.avg}점` : '우수';
        const pctA = simData.percentileA !== undefined ? `상위 ${simData.percentileA.toFixed(1)}%` : '상위권';
        const pctB = simData.percentileB !== undefined ? `상위 ${simData.percentileB.toFixed(1)}%` : '상위권';

        // ① 공유 전 자동 담기 (silent — 알림 없이 저장만)
        let scrapId = null;
        try {
            scrapId = await window.saveSimulationToMypage(null, { silent: true });
        } catch (e) {
            console.warn('[Share] 자동 담기 실패 (무시):', e);
        }

        // ② 공유 URL 구성 (scrapId + 지역 파라미터 모두 포함)
        const baseUrl = 'https://leamap.vercel.app/';
        const params = new URLSearchParams({
            sim: '1',
            sidoA: sidoAVal, gugunA: gugunAVal, dongA: dongAVal,
            sidoB: sidoBVal, gugunB: gugunBVal, dongB: dongBVal,
            type: schoolType,
            scoreA: simData.statsA?.avg !== undefined ? String(simData.statsA.avg) : '',
            scoreB: simData.statsB?.avg !== undefined ? String(simData.statsB.avg) : '',
            pctA: simData.percentileA !== undefined ? simData.percentileA.toFixed(1) : '',
            pctB: simData.percentileB !== undefined ? simData.percentileB.toFixed(1) : '',
            priceA: priceTextA, priceB: priceTextB, saveTxt: priceSaveText
        });
        if (scrapId) params.set('scrapId', scrapId);
        const shareUrl = `${baseUrl}?${params.toString()}`;

        // ③ 버튼 피드백 헬퍼 (공유 완료 후 호출)
        function showShareFeedback() {
            if (!btnEl) return;
            const origHtml = btnEl.innerHTML;
            btnEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span style="color:#059669;font-weight:800;">공유 완료!</span>`;
            btnEl.style.borderColor = '#10b981';
            btnEl.style.background = '#ecfdf5';
            setTimeout(() => {
                btnEl.innerHTML = origHtml;
                btnEl.style.borderColor = '#cbd5e1';
                btnEl.style.background = '#ffffff';
            }, 2200);
        }

        // ④ 카카오 SDK 로드
        let sdkLoaded = false;
        if (typeof loadKakaoShareSDK === 'function') {
            try { sdkLoaded = await loadKakaoShareSDK(); } catch (e) { console.warn('[Share] SDK 로드 오류:', e); }
        }

        // ⑤ 카카오 Feed Card 공유 시도
        if (sdkLoaded && window.Kakao && window.Kakao.isInitialized() && window.Kakao.Share) {
            try {
                window.Kakao.Share.sendDefault({
                    objectType: 'feed',
                    content: {
                        title: `🏫 ${nameA} vs ${nameB} 학군 비교 결과`,
                        description: `학업성취도: ${statsAAvg} vs ${statsBAvg}  |  자녀 위치: ${pctA} vs ${pctB}\n시세: ${priceTextA} vs ${priceTextB} (${priceSaveText})`,
                        imageUrl: 'https://leamap.vercel.app/og-image.png',
                        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
                    },
                    buttons: [{
                        title: '📊 비교 결과 바로보기',
                        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
                    }],
                });
                showShareFeedback();
                if (typeof showToastNoticeMsg === 'function') {
                    showToastNoticeMsg(`💬 [${nameA} vs ${nameB}] 카카오톡으로 공유되었습니다.`);
                }
                return;
            } catch (err) {
                console.warn('[Kakao Share] 카카오 공유 실패 → 폴백. 원인:', err);
            }
        } else {
            console.warn('[Kakao Share] SDK 미사용 → 폴백.',
                'sdkLoaded:', sdkLoaded,
                '| Kakao:', !!window.Kakao,
                '| isInit:', window.Kakao?.isInitialized?.(),
                '| Share:', !!window.Kakao?.Share);
        }

        // ⑥ Web Share API Fallback
        const cardText = `🗺️ [학업여지도] ${nameA} vs ${nameB} 학군 비교 분석\n학업성취도: ${statsAAvg} vs ${statsBAvg} | 자녀 위치: ${pctA} vs ${pctB}\n시세: ${priceTextA} vs ${priceTextB} (${priceSaveText})`;
        if (navigator.share) {
            try {
                await navigator.share({ title: `[학업여지도] ${nameA} vs ${nameB} 학군 비교`, text: cardText, url: shareUrl });
                showShareFeedback();
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.warn('[Web Share] 실패:', err);
            }
        }

        // ⑦ 클립보드 복사 Fallback
        const clipText = `[학업여지도] ${nameA} vs ${nameB} 학군 비교 결과\n\n${shareUrl}`;
        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(clipText);
                showShareFeedback();
                if (typeof showToastNoticeMsg === 'function') {
                    showToastNoticeMsg('🔗 학군 비교 링크가 복사되었습니다. 카카오톡에 붙여넣기 하세요!');
                } else {
                    alert('학군 비교 링크가 복사되었습니다.\n카카오톡에 붙여넣기 하세요!');
                }
                return;
            } catch (clipErr) { console.warn('[Clipboard] 복사 실패:', clipErr); }
        }

        showShareFeedback();
        alert('공유 링크:\n' + shareUrl);
    };

    // ==========================================
    // 학군 이사 시뮬레이션 마이페이지 보관함 (담기/조회/삭제) 로직
    // ==========================================
    function getStoredSimulationScraps() {
        try {
            return JSON.parse(localStorage.getItem('learnmap_simulation_scraps') || '[]');
        } catch (e) {
            return [];
        }
    }

    window.saveSimulationToMypage = async function(btnEl, options = {}) {
        // ★ 로그인 체크 (silent 모드 제외 — 공유하기 자동 담기는 로그인 없이도 localStorage만 저장)
        if (!options.silent) {
            const loggedOut = localStorage.getItem('learnmap_logged_out');
            const loginUser = (typeof authService !== 'undefined' && authService.getCurrentUser)
                ? authService.getCurrentUser()
                : JSON.parse(localStorage.getItem('learnmap_current_user') || 'null');
            const isLoggedIn = !!loginUser && !loggedOut;

            if (!isLoggedIn) {
                const confirmed = await confirm('시뮬레이션 담기는 로그인 후 이용하실 수 있습니다.\n로그인 페이지로 이동하시겠습니까?');
                if (confirmed) {
                    // 현재 열려있는 시뮬레이션 모달 닫기
                    const simModal = document.getElementById('simulationModal');
                    if (simModal) simModal.style.display = 'none';

                    // 설정 모달 → 로그인 탭 열기
                    const settingsModal = document.getElementById('settingsModal');
                    if (settingsModal) settingsModal.style.display = 'block';
                    if (typeof window.switchSettingsAuthTab === 'function') {
                        window.switchSettingsAuthTab('login');
                    }
                    const authSection = document.getElementById('settingsAuthSection');
                    if (authSection) {
                        authSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    setTimeout(() => {
                        const emailInput = document.getElementById('settingsEmail');
                        if (emailInput) emailInput.focus();
                    }, 300);
                }
                return null;
            }
        }

        const data = window.lastSimulationData;
        if (!data) {
            if (!options.silent) alert('먼저 학군 비교 시뮬레이션을 실행해 주세요.');
            return null;
        }


        const scraps = getStoredSimulationScraps();
        const existingIndex = scraps.findIndex(s => 
            ((s.region_a === data.regionA && s.region_b === data.regionB) ||
             (s.name_a === data.nameA && s.name_b === data.nameB)) &&
            s.school_type === (data.schoolType || '중학교')
        );

        const newScrap = {
            id: 'sim_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            region_a: data.regionA || data.nameA,
            region_b: data.regionB || data.nameB,
            name_a: data.nameA,
            name_b: data.nameB,
            sido_a: data.sidoA || '',
            gugun_a: data.gugunA || '',
            dong_a: data.dongA || '',
            sido_b: data.sidoB || '',
            gugun_b: data.gugunB || '',
            dong_b: data.dongB || '',
            school_type: data.schoolType || '중학교',
            price_a: parseFloat(data.priceTextA) || 0,
            price_b: parseFloat(data.priceTextB) || 0,
            price_save_text: data.priceSaveText || '',
            score_a: data.statsA?.avg || 0,
            score_b: data.statsB?.avg || 0,
            percentile_a: Math.round((data.percentileA || 0) * 10) / 10,
            percentile_b: Math.round((data.percentileB || 0) * 10) / 10,
            created_at: new Date().toISOString()
        };

        // 동일 조건 기존 scrap이 있으면 기존 ID 재사용 (URL 안정성)
        if (existingIndex > -1) {
            newScrap.id = scraps[existingIndex].id;
            scraps.splice(existingIndex, 1);
        }
        scraps.unshift(newScrap);

        if (scraps.length > 20) scraps.length = 20;

        try {
            localStorage.setItem('learnmap_simulation_scraps', JSON.stringify(scraps));
        } catch (e) {
            console.warn('localStorage 저장 실패:', e);
        }

        // Supabase DB 동기화 (upsert — 중복 저장 방지)
        try {
            const client = window.supabaseInstance || (typeof supabase !== 'undefined' ? supabase : null);
            const rawUser = (typeof authService !== 'undefined' && authService.getCurrentUser)
                ? authService.getCurrentUser()
                : JSON.parse(localStorage.getItem('learnmap_current_user') || 'null');
            const userId = rawUser?.id || rawUser?.email || null;
            if (client && userId) {
                const dbRow = {
                    local_id: newScrap.id,
                    user_id: userId,
                    region_a: newScrap.region_a,
                    region_b: newScrap.region_b,
                    name_a: newScrap.name_a,
                    name_b: newScrap.name_b,
                    sido_a: newScrap.sido_a,
                    gugun_a: newScrap.gugun_a,
                    dong_a: newScrap.dong_a,
                    sido_b: newScrap.sido_b,
                    gugun_b: newScrap.gugun_b,
                    dong_b: newScrap.dong_b,
                    school_type: newScrap.school_type,
                    price_a: newScrap.price_a,
                    price_b: newScrap.price_b,
                    price_save_text: newScrap.price_save_text,
                    score_a: newScrap.score_a,
                    score_b: newScrap.score_b,
                    percentile_a: newScrap.percentile_a,
                    percentile_b: newScrap.percentile_b
                };
                client.from('simulation_scraps')
                    .upsert([dbRow], { onConflict: 'local_id' })
                    .then(({ error }) => {
                        if (error) {
                            console.warn('[Supabase] simulation_scraps upsert 실패:', error);
                            // local_id 컬럼 없는 경우 insert로 fallback
                            if (error.code === '42703' || error.message?.includes('local_id')) {
                                client.from('simulation_scraps').insert([{ ...dbRow }])
                                    .then(({ error: e2 }) => { if (e2) console.warn('[Supabase] insert fallback 실패:', e2); });
                            }
                        } else {
                            console.log('[Supabase] simulation_scraps 저장 완료:', newScrap.id);
                        }
                    });
            } else {
                console.warn('[Supabase] 저장 스킵 — client:', !!client, '| userId:', userId);
            }
        } catch (dbErr) {
            console.warn('[Supabase] simulation_scraps 예외:', dbErr);
        }

        // 버튼 피드백 애니메이션
        if (btnEl) {
            const originalHtml = btnEl.innerHTML;
            btnEl.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span style="color: #059669; font-weight: 800;">담기 완료!</span>
            `;
            btnEl.style.borderColor = '#10b981';
            btnEl.style.background = '#ecfdf5';

            setTimeout(() => {
                btnEl.innerHTML = originalHtml;
                btnEl.style.borderColor = '#cbd5e1';
                btnEl.style.background = '#ffffff';
            }, 2200);
        }

        // 마이페이지 UI 실시간 갱신
        if (typeof window.updateMypageSimulationUI === 'function') {
            window.updateMypageSimulationUI();
        }

        if (!options.silent) {
            if (typeof showToastNoticeMsg === 'function') {
                showToastNoticeMsg(`📁 [${newScrap.name_a} vs ${newScrap.name_b}] 시뮬레이션 결과가 마이페이지에 담겼습니다.`);
            } else {
                alert(`[${newScrap.name_a} vs ${newScrap.name_b}] 시뮬레이션 결과가 마이페이지 보관함에 담겼습니다.\n마이페이지에서 언제든지 다시 확인하실 수 있습니다.`);
            }
        }

        // 저장된 scrap ID 반환 (공유하기 흐름에서 URL에 포함)
        return newScrap.id;
    };

    window.removeSimulationScrap = function(id) {
        if (!confirm('이 시뮬레이션 저장 내역을 삭제하시겠습니까?')) return;
        let scraps = getStoredSimulationScraps();
        scraps = scraps.filter(s => s.id !== id);
        try {
            localStorage.setItem('learnmap_simulation_scraps', JSON.stringify(scraps));
        } catch (e) {}

        try {
            const client = window.supabaseInstance || (typeof supabase !== 'undefined' ? supabase : null);
            const rawUser = (typeof authService !== 'undefined' && authService.getCurrentUser)
                ? authService.getCurrentUser()
                : JSON.parse(localStorage.getItem('learnmap_current_user') || 'null');
            const userId = rawUser?.id || rawUser?.email || null;
            if (client && userId) {
                client.from('simulation_scraps').delete()
                    .or(`local_id.eq.${id},id.eq.${id}`)
                    .eq('user_id', userId)
                    .then(({ error }) => { if (error) console.warn('[Supabase] delete 실패:', error); });
            }
        } catch (e) { console.warn('[Supabase] delete 예외:', e); }

        window.updateMypageSimulationUI();
    };

    window.clearAllSimulationScraps = function() {
        const scraps = getStoredSimulationScraps();
        if (scraps.length === 0) return;
        if (!confirm('보관함의 모든 시뮬레이션 내역을 비우시겠습니까?')) return;
        try {
            localStorage.removeItem('learnmap_simulation_scraps');
        } catch (e) {}

        try {
            const client = window.supabaseInstance || (typeof supabase !== 'undefined' ? supabase : null);
            const rawUser = (typeof authService !== 'undefined' && authService.getCurrentUser)
                ? authService.getCurrentUser()
                : JSON.parse(localStorage.getItem('learnmap_current_user') || 'null');
            const userId = rawUser?.id || rawUser?.email || null;
            if (client && userId) {
                client.from('simulation_scraps').delete().eq('user_id', userId)
                    .then(({ error }) => { if (error) console.warn('[Supabase] clearAll 실패:', error); });
            }
        } catch (e) { console.warn('[Supabase] clearAll 예외:', e); }

        window.updateMypageSimulationUI();
    };

    window.openSavedSimulation = async function(id) {
        const scraps = getStoredSimulationScraps();
        const item = scraps.find(s => s.id === id);
        if (!item) return;

        // 1. 설정/마이페이지 모달 닫기
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) settingsModal.style.display = 'none';

        // 2. 시뮬레이션 모달 열기
        const btnOpenSim = document.getElementById('btnOpenSimulation');
        if (btnOpenSim) {
            btnOpenSim.click();
        } else {
            const simModal = document.getElementById('simulationModal');
            if (simModal) simModal.style.display = 'flex';
        }

        // 3. 학교급 동기화
        if (item.school_type && typeof window.setSimSchoolType === 'function') {
            window.setSimSchoolType(item.school_type);
        }

        // 4. 드롭다운 값 복원
        const sidoA = document.getElementById('simSidoA');
        const gugunA = document.getElementById('simGugunA');
        const dongA = document.getElementById('simDongA');
        const sidoB = document.getElementById('simSidoB');
        const gugunB = document.getElementById('simGugunB');
        const dongB = document.getElementById('simDongB');

        if (item.sido_a && sidoA) {
            sidoA.value = item.sido_a;
            sidoA.dispatchEvent(new Event('change'));
        }
        if (item.sido_b && sidoB) {
            sidoB.value = item.sido_b;
            sidoB.dispatchEvent(new Event('change'));
        }

        await new Promise(r => setTimeout(r, 120));

        if (item.gugun_a && gugunA) {
            gugunA.value = item.gugun_a;
            gugunA.dispatchEvent(new Event('change'));
            if (item.dong_a && dongA && typeof updateDongDropdown === 'function') {
                await updateDongDropdown(item.sido_a, item.gugun_a, dongA, item.dong_a);
            }
        }

        if (item.gugun_b && gugunB) {
            gugunB.value = item.gugun_b;
            gugunB.dispatchEvent(new Event('change'));
            if (item.dong_b && dongB && typeof updateDongDropdown === 'function') {
                await updateDongDropdown(item.sido_b, item.gugun_b, dongB, item.dong_b);
            }
        }

        if (item.dong_a && dongA) dongA.value = item.dong_a;
        if (item.dong_b && dongB) dongB.value = item.dong_b;

        if (typeof updateSimRegionSubInfo === 'function') {
            updateSimRegionSubInfo();
        }

        // 5. 시뮬레이션 자동 재실행
        await new Promise(r => setTimeout(r, 150));
        const regA = `${item.sido_a || ''} ${item.gugun_a || ''} ${item.dong_a || ''}`.trim() || item.name_a;
        const regB = `${item.sido_b || ''} ${item.gugun_b || ''} ${item.dong_b || ''}`.trim() || item.name_b;

        if (typeof runMovingSimulation === 'function') {
            runMovingSimulation(regA, regB, item.name_a, item.name_b);
        }
    };

    window.updateMypageSimulationUI = function() {
        const listPC = document.getElementById('mypageSimulationListPC');
        const listMobile = document.getElementById('mypageSimulationListMobile');
        if (!listPC && !listMobile) return;

        const scraps = getStoredSimulationScraps();

        const renderCard = (s) => {
            const dateStr = s.created_at ? s.created_at.slice(0, 10).replace(/-/g, '.') : '';
            const priceSaveBadge = s.price_save_text ? `<span style="background: #fef3c7; color: #b45309; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px;">💰 ${s.price_save_text}</span>` : '';
            
            return `
                <div class="simulation-scrap-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 10px;">
                    <!-- Header: Type, Date, Delete -->
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="background: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 800; padding: 2.5px 8px; border-radius: 6px; border: 1px solid #dbeafe;">${s.school_type || '중학교'}</span>
                            ${priceSaveBadge}
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 11px; color: #94a3b8; font-weight: 500;">${dateStr}</span>
                            <button onclick="window.removeSimulationScrap('${s.id}')" title="삭제"
                                style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 2px 4px; font-size: 13px; line-height: 1; border-radius: 4px;"
                                onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'">✕</button>
                        </div>
                    </div>

                    <!-- Regions Comparison Header -->
                    <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border-radius: 10px; padding: 10px 12px; border: 1px solid #f1f5f9;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 11px; color: #2563eb; font-weight: 700; margin-bottom: 2px;">현재 거주</div>
                            <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.name_a}</div>
                        </div>
                        <div style="font-size: 12px; font-weight: 800; color: #94a3b8; padding: 0 10px;">VS</div>
                        <div style="flex: 1; min-width: 0; text-align: right;">
                            <div style="font-size: 11px; color: #059669; font-weight: 700; margin-bottom: 2px;">이사 희망</div>
                            <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.name_b}</div>
                        </div>
                    </div>

                    <!-- Key Metrics Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px;">
                        <div style="background: #f8fafc; padding: 8px 10px; border-radius: 8px; border: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b; font-weight: 600;">🎯 예상 백분위</span>
                            <span style="font-weight: 700; color: #1e293b;">${s.percentile_a}% vs ${s.percentile_b}%</span>
                        </div>
                        <div style="background: #f8fafc; padding: 8px 10px; border-radius: 8px; border: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b; font-weight: 600;">📈 학업성취도</span>
                            <span style="font-weight: 700; color: #1e293b;">${s.score_a}점 vs ${s.score_b}점</span>
                        </div>
                        <div style="grid-column: span 2; background: #f8fafc; padding: 8px 10px; border-radius: 8px; border: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b; font-weight: 600;">🏠 84㎡ 기준 시세</span>
                            <span style="font-weight: 700; color: #1e293b;">${s.price_a}억 vs ${s.price_b}억</span>
                        </div>
                    </div>

                    <!-- Footer Action Button -->
                    <button onclick="window.openSavedSimulation('${s.id}')"
                        style="width: 100%; padding: 10px; background: #0f172a; color: #ffffff; border: none; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: background 0.15s; margin-top: 2px;"
                        onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#0f172a'">
                        <span>📊</span> 결과 바로보기 &gt;
                    </button>
                </div>
            `;
        };

        const emptyHtml = `
            <div style="padding: 26px 16px; text-align: center; color: var(--text-muted); font-size: 12.5px; background: #f8fafc; border-radius: 14px; border: 1px dashed #cbd5e1;">
                <div style="font-size: 24px; margin-bottom: 6px;">🚚</div>
                <div style="font-weight: 700; color: #475569; margin-bottom: 4px;">보관된 시뮬레이션 결과가 없습니다.</div>
                <div style="font-size: 11.5px; color: #94a3b8; line-height: 1.5;">'학군 이사 시뮬레이터'에서 후보 지역을 비교한 후<br><strong style="color: #2563eb;">[담기]</strong> 버튼을 눌러 저장해보세요.</div>
            </div>
        `;

        const contentHtml = scraps.length > 0 ? scraps.map(renderCard).join('') : emptyHtml;

        if (listPC) listPC.innerHTML = contentHtml;
        if (listMobile) listMobile.innerHTML = contentHtml;
    };

    function scrollSimulationToResult() {
        setTimeout(() => {
            const resultPanel = document.getElementById('simulationResultPanel');
            if (!resultPanel) return;

            const modalContainer = document.querySelector('#simulationModal > div');
            if (modalContainer && (modalContainer.scrollHeight > modalContainer.clientHeight || window.innerWidth <= 1024)) {
                const headerOffset = window.innerWidth <= 1024 ? 65 : 20;
                const containerRect = modalContainer.getBoundingClientRect();
                const targetRect = resultPanel.getBoundingClientRect();
                const scrollOffset = targetRect.top - containerRect.top + modalContainer.scrollTop - headerOffset;

                modalContainer.scrollTo({
                    top: Math.max(0, scrollOffset),
                    behavior: 'smooth'
                });
            } else {
                try {
                    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } catch (e) {}
            }
        }, 100);
    }
    window.scrollSimulationToResult = scrollSimulationToResult;

    window.resetSimulationResultView = function() {
        const resultPanel = document.getElementById('simulationResultPanel');
        if (resultPanel) resultPanel.style.display = 'none';
        const modalDiv = document.querySelector('#simulationModal > div');
        if (modalDiv) modalDiv.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.handleResetFilters = (showAlert = true) => {
        const defaults = {
            'currentLevelRange': 70,
            'targetLevelRange': 88,
            'weightKorRange': 10,
            'weightEngRange': 10,
            'weightMathRange': 10,
            'envScoreRange': 40,
            'envTeacherRange': 30,
            'envViolenceRange': 20,
            'envBudgetRange': 10,
            'filterMinAvgScore': 50,
            'filterMinSubjectScore': 50,
            'filterMinTopRatio': 0,
            'filterMaxBottomRatio': 100,
            'filterClassSizePreset': 'all',
            'filterMaxStudentPerTeacher': 30,
            'filterStudentTrend': 'all',
            'filterSpecialClass': false,
            'filterMinGraduateRate': 0,
            'filterMinSpecialAdmission': 0,
            'filterMaxViolence': 20,
            'profileRecommendFilter': 'none',
            'commuteRadiusFilter': 'off',
            'trendUpwardCheckbox': false,
            'safetyGuideCheckbox': false,
            'crimeZoneToggleCheckbox': false,
            'accidentStatisticsCheckbox': false,
            'trafficAccidentCheckbox': false,
            'dongRatingCheckbox': false,
            'childGradeFilter': 'middle',
            'childScoreFilter': 'mid',
            'childTendencyFilter': 'balanced'
        };

        Object.keys(defaults).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = defaults[id];
                } else {
                    el.value = defaults[id];
                }
                
                let val = defaults[id];
                let suffix = '';
                let textElId = '';
                if (id === 'currentLevelRange') { textElId = 'valCurrentLevel'; suffix = '점'; }
                else if (id === 'targetLevelRange') { textElId = 'valTargetLevel'; suffix = '점'; }
                else if (id === 'weightKorRange') { textElId = 'valWeightKor'; val = (val / 10).toFixed(1); }
                else if (id === 'weightEngRange') { textElId = 'valWeightEng'; val = (val / 10).toFixed(1); }
                else if (id === 'weightMathRange') { textElId = 'valWeightMath'; val = (val / 10).toFixed(1); }
                else if (id === 'envScoreRange') { textElId = 'valEnvScore'; suffix = '%'; }
                else if (id === 'envTeacherRange') { textElId = 'valEnvTeacher'; suffix = '%'; }
                else if (id === 'envViolenceRange') { textElId = 'valEnvViolence'; suffix = '%'; }
                else if (id === 'envBudgetRange') { textElId = 'valEnvBudget'; suffix = '%'; }
                else if (id === 'filterMinAvgScore') { textElId = 'valMinAvgScore'; suffix = '점'; }
                else if (id === 'filterMinSubjectScore') { textElId = 'valMinSubjectScore'; suffix = '점'; }
                else if (id === 'filterMinTopRatio') { textElId = 'valMinTopRatio'; suffix = '%'; }
                else if (id === 'filterMaxBottomRatio') { textElId = 'valMaxBottomRatio'; suffix = '%'; }
                else if (id === 'filterMaxStudentPerTeacher') { textElId = 'valMaxStudentPerTeacher'; suffix = '명'; }
                else if (id === 'filterMinGraduateRate') { textElId = 'valMinGraduateRate'; suffix = '%'; }
                else if (id === 'filterMinSpecialAdmission') { textElId = 'valMinSpecialAdmission'; suffix = '%'; }
                else if (id === 'filterMaxViolence') { textElId = 'valMaxViolence'; suffix = '건'; }

                if (textElId) {
                    const textEl = document.getElementById(textElId);
                    if (textEl) textEl.innerText = val + suffix;
                }
            }
        });

        // Reset quick preset active pill
        const pills = document.querySelectorAll('.preset-pill-btn');
        pills.forEach((p, idx) => {
            if (idx === 0) p.classList.add('active');
            else p.classList.remove('active');
        });

        // Reset proportion bar
        if (typeof updateEnvProportionBar === 'function') {
            updateEnvProportionBar();
        }

        // Sync mobile floating filters
        if (typeof syncMobileFloatingFilters === 'function') {
            syncMobileFloatingFilters();
        }

        // Reset region and school type select options
        if (regionFilter) regionFilter.value = '서울특별시';
        if (schoolTypeFilter) schoolTypeFilter.value = 'middle';

        // Clear commute radius/marker
        commuteCenter = null;
        if (typeof updateCommuteCircle === 'function') {
            updateCommuteCircle();
        }

        // Clear selected school details (simulate clicking deselect button)
        const btnDeselectSchool = document.getElementById('btnDeselectSchool');
        if (btnDeselectSchool) {
            btnDeselectSchool.click();
        } else {
            if (typeof orchestrator !== 'undefined' && orchestrator.state) orchestrator.state.selectedSchool = null;
            if (typeof schoolCard !== 'undefined' && schoolCard) schoolCard.style.display = 'none';
            if (typeof childFormCard !== 'undefined' && childFormCard) childFormCard.style.display = 'none';
            if (typeof diagnosisResultCard !== 'undefined' && diagnosisResultCard) diagnosisResultCard.style.display = 'none';
            if (typeof welcomeCard !== 'undefined' && welcomeCard) welcomeCard.style.display = 'block';
            const serviceInquiryCardEl = document.getElementById('serviceInquiryCard');
            if (serviceInquiryCardEl) serviceInquiryCardEl.style.display = 'block';
        }

        // 필터 초기화 시 아코디언 상태 처리: 새로고침/최초 진입 시에는 닫힌 상태 유지
        const parentsFilterContent = document.getElementById('parentsFilterContent');
        const parentsFilterIndicator = document.getElementById('parentsFilterIndicator');
        if (parentsFilterContent && parentsFilterIndicator) {
            if (!showAlert) {
                // 최초 접속 및 새로고침 시 기본적으로 필터를 닫은 상태로 유지
                parentsFilterContent.style.display = 'none';
                parentsFilterIndicator.innerText = '▼';
                try { sessionStorage.setItem('learnmap_parents_filter_open', 'false'); } catch(e) {}
            } else {
                // 사용자가 필터 초기화 버튼을 직접 누른 경우: 현재 열려있는 상태라면 유지
                const isCurrentlyOpen = parentsFilterContent.style.display !== 'none' && parentsFilterContent.style.display !== '';
                if (isCurrentlyOpen) {
                    parentsFilterContent.style.display = 'flex';
                    parentsFilterIndicator.innerText = '▲';
                } else {
                    parentsFilterContent.style.display = 'none';
                    parentsFilterIndicator.innerText = '▼';
                }
            }
        }

        // Keep map center position unchanged during filter reset
        if (typeof onMapAction === 'function') {
            onMapAction();
        } else if (typeof window.onMapAction === 'function') {
            window.onMapAction();
        }

        if (typeof onMapAction === 'function') {
            onMapAction();
        }
        
        if (showAlert) {
            alert('필터 설정과 탐색 프리셋이 모두 초기화되었습니다.');
        }
    };

    const handleReset = () => window.handleResetFilters(true);

    const btnResetPreset = document.getElementById('btnResetPreset');
    if (btnResetPreset) {
        btnResetPreset.addEventListener('click', handleReset);
    }
    const btnResetFilters = document.getElementById('btnResetFilters');
    if (btnResetFilters) {
        btnResetFilters.addEventListener('click', handleReset);
    }

    // 서비스 최초 로드 시(사용자 탐색 전) 필터 설정 자동 초기화 수행
    setTimeout(() => {
        window.handleResetFilters(false);
    }, 100);
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

    reviewContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">후기 및 포털 커뮤니티 데이터를 불러오는 중입니다...</div>';
    
    panel.style.display = 'flex';
    const sidebar = document.querySelector('.sidebar-section');
    if (sidebar) sidebar.classList.add('active-community');
    const sidebarContent = document.getElementById('sidebarContent');
    if (sidebarContent) sidebarContent.style.display = 'none';
    const btnToggle = document.getElementById('btnToggleSidebarTop');
    if (btnToggle) btnToggle.style.display = 'none';
    const btnTutorial = document.getElementById('btnShowTutorial');
    if (btnTutorial) btnTutorial.style.display = 'none';
    const btnSettings = document.getElementById('btnOpenSettings');
    if (btnSettings) btnSettings.style.display = 'none';

    try {
        let realReviews = [];
        let portalPosts = [];

        // 1. 찐후기 데이터 가져오기
        try {
            const res = await fetch(`/api/reviews?academyName=${encodeURIComponent(acadName)}`);
            if (res.ok) {
                const data = await res.json();
                realReviews = (data.items || []).map(item => ({ ...item, _type: 'real' }));
            }
        } catch (err) {
            console.error('Real review fetch error:', err);
        }

        // 2. 포털(블로그/카페) 데이터 가져오기 (전체 type='all'로 호출하여 정확한 블로그/카페 카운트 집계)
        try {
            const res = await fetch(`/api/community?q=${encodeURIComponent(acadName)}&type=all`);
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

        // 3. 실제 데이터 기반 각 카테고리별 개수 및 평균 평점 산출
        const realCount = realReviews.length;
        const blogCount = portalPosts.filter(item => item._source === 'blog').length;
        const cafeCount = portalPosts.filter(item => item._source === 'cafe').length;
        const totalCount = realCount + blogCount + cafeCount;

        // DB 찐후기 데이터 기반 평균 평점 계산
        let calculatedRating = 0;
        if (realCount > 0) {
            const sumRating = realReviews.reduce((acc, cur) => acc + (parseFloat(cur.rating) || 5), 0);
            calculatedRating = (sumRating / realCount).toFixed(1);
        } else if (window.academyRatingsMap && window.academyRatingsMap[acadName] && window.academyRatingsMap[acadName].count > 0) {
            calculatedRating = window.academyRatingsMap[acadName].avgRating.toFixed(1);
        }

        // 4. 상단 헤더 영역 실제 평점 & 학부모·수험생 후기 건수 업데이트
        const headerRatingEl = document.getElementById('academyHeaderRating');
        if (headerRatingEl) {
            headerRatingEl.innerText = calculatedRating > 0 ? calculatedRating : '0.0';
        }
        const headerReviewCountEl = document.getElementById('academyHeaderReviewCount');
        if (headerReviewCountEl) {
            headerReviewCountEl.innerText = realCount;
        }

        // 5. 탭 및 개수 뱃지 UI 업데이트
        const tabBadge = document.getElementById('tabReviewCountBadge');
        if (tabBadge) tabBadge.innerText = totalCount;

        const allBtn = document.querySelector('.community-filter-btn[data-type="all"]');
        const realBtn = document.querySelector('.community-filter-btn[data-type="real"]');
        const blogBtn = document.querySelector('.community-filter-btn[data-type="blog"]');
        const cafeBtn = document.querySelector('.community-filter-btn[data-type="cafe"]');

        if (allBtn) allBtn.innerText = `전체 ${totalCount}`;
        if (realBtn) realBtn.innerText = `찐후기 ${realCount}`;
        if (blogBtn) blogBtn.innerText = `블로그 ${blogCount}`;
        if (cafeBtn) cafeBtn.innerText = `카페 ${cafeCount}`;

        // 5. 선택된 필터 type에 따른 데이터 필터링
        let itemsToDisplay = [];
        if (type === 'all') {
            itemsToDisplay = [...realReviews, ...portalPosts.filter(p => p._type !== 'error')];
        } else if (type === 'real') {
            itemsToDisplay = [...realReviews];
        } else if (type === 'blog') {
            itemsToDisplay = portalPosts.filter(p => p._source === 'blog');
        } else if (type === 'cafe') {
            itemsToDisplay = portalPosts.filter(p => p._source === 'cafe');
        }

        if (portalPosts.length === 1 && portalPosts[0]._type === 'error') {
            if (type === 'all' || type === 'blog' || type === 'cafe') {
                itemsToDisplay.unshift(portalPosts[0]);
            }
        }

        // 날짜순(최신순) 정렬
        itemsToDisplay.sort((a, b) => {
            const getDateString = (item) => {
                if (item._type === 'real') {
                    const dStr = item.created_at || item.createdAt || '';
                    return dStr.substring(0, 10).replace(/-/g, ''); 
                }
                return item.postdate || '00000000';
            };
            return getDateString(b).localeCompare(getDateString(a));
        });

        // 6. 화면 렌더링
        reviewContainer.innerHTML = '';
        if (itemsToDisplay.length > 0) {
            itemsToDisplay.forEach(item => {
                const reviewItem = document.createElement('div');
                reviewItem.className = 'review-card-item';
                reviewItem.style.cssText = `
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 16px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
                    margin-bottom: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                `;
                
                if (item._type === 'real') {
                    // 수강생 찐후기 렌더링
                    const ratingVal = item.rating || 5;
                    const stars = '★'.repeat(Math.round(ratingVal));
                    const dateStr = item.created_at ? '1주 전' : '최근';
                    reviewItem.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="font-size: 11px; font-weight: 700; color: #2563eb; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 2px 7px;">수강생 찐후기</span>
                                <span style="font-size: 12px; font-weight: 700; color: #d97706;">${stars} ${ratingVal.toFixed(1)}</span>
                            </div>
                            <span style="font-size: 11.5px; color: #94a3b8;">${dateStr}</span>
                        </div>
                        <div style="font-size: 14.5px; font-weight: 700; color: #0f172a; line-height: 1.35; margin-top: 2px;">
                            ${item.title || '수강생 수업 후기'}
                        </div>
                        <div style="font-size: 12.5px; color: #475569; line-height: 1.55; word-break: keep-all; white-space: pre-wrap;">
                            ${item.content}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding-top: 10px; border-top: 1px solid #f1f5f9; font-size: 11.5px; color: #64748b;">
                            <span>작성자: ${item.writer || '학부모'}</span>
                            <div style="display: flex; gap: 12px; align-items: center;">
                                <button onclick="event.stopPropagation(); window.toggleReviewLike(this);" style="background: none; border: none; padding: 0; color: #64748b; font-size: 11.5px; cursor: pointer; display: flex; align-items: center; gap: 3px;">
                                    👍 도움돼요 <strong class="like-cnt" style="color: #2563eb; font-weight: 700;">${item.likes || 24}</strong>
                                </button>
                                <span>💬 댓글 ${item.comments || 4}</span>
                            </div>
                        </div>
                    `;
                } else if (item._type === 'error') {
                    reviewItem.innerHTML = `
                        <div style="color: var(--danger-red); text-align: center; padding: 10px; font-weight: bold;">
                            ⚠️ ${item.message}
                        </div>
                    `;
                } else {
                    // 포털 커뮤니티 (카페 / 블로그) 렌더링 (추천 및 댓글 아이콘 제거)
                    const postTitle = item.title ? item.title.replace(/<[^>]*>?/gm, '') : '학원 후기';
                    const postDesc = item.description ? item.description.replace(/<[^>]*>?/gm, '') : '';
                    const isCafe = item._source === 'cafe';

                    const tagBg = isCafe ? '#fff7ed' : '#ecfdf5';
                    const tagColor = isCafe ? '#ea580c' : '#059669';
                    const tagBorder = isCafe ? '#ffedd5' : '#d1fae5';
                    const tagText = isCafe ? '카페' : '블로그';

                    let postDate = item.postdate || '';
                    if (postDate.length === 8) {
                        postDate = `${postDate.substring(0,4)}.${postDate.substring(4,6)}.${postDate.substring(6,8)}`;
                    }

                    const sourceName = item.cafename || item.bloggername || (isCafe ? '네이버 카페' : '네이버 블로그');

                    reviewItem.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="font-size: 11px; font-weight: 700; color: ${tagColor}; background: ${tagBg}; border: 1px solid ${tagBorder}; border-radius: 6px; padding: 2px 7px;">${tagText}</span>
                                <span style="font-size: 12px; font-weight: 600; color: #475569;">${sourceName}</span>
                            </div>
                            ${postDate ? `<span style="font-size: 11.5px; color: #94a3b8;">${postDate}</span>` : ''}
                        </div>
                        <a href="${item.link || '#'}" target="_blank" style="font-size: 14.5px; font-weight: 700; color: #0f172a; line-height: 1.35; text-decoration: none; margin-top: 2px; display: block;">
                            ${postTitle}
                        </a>
                        <div style="font-size: 12.5px; color: #475569; line-height: 1.55; word-break: keep-all; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                            ${postDesc}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding-top: 10px; border-top: 1px solid #f1f5f9; font-size: 11.5px; color: #64748b;">
                            <span>출처: ${sourceName}</span>
                        </div>
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

// --- 학교폭력 세부 비교 항목 변경 (연간 신고건수 / 100명당 / 처리 완료율) ---
window.setViolenceSubMetric = function(subKey) {
    const vd = window.currentSchoolViolenceDetail;
    if (!vd || !vd.subMetrics || !vd.subMetrics[subKey]) return;

    vd.selectedSubMetric = subKey;

    // 칩 버튼 스타일 활성화 처리
    const chips = document.querySelectorAll('.violence-submetric-chip');
    chips.forEach(btn => {
        if (btn.getAttribute('data-submetric') === subKey) {
            btn.style.background = '#ab47bc';
            btn.style.color = 'white';
            btn.style.fontWeight = 'bold';
        } else {
            btn.style.background = '#f0f4f8';
            btn.style.color = 'var(--text-muted)';
            btn.style.fontWeight = 'normal';
        }
    });

    const sub = vd.subMetrics[subKey];
    const headerEl = document.getElementById('violenceSubMetricHeader');
    if (headerEl) headerEl.innerText = `${sub.metricName} 비교 기준`;

    window.updateViolenceCompare(vd.currentCompareType || 'region');
};

// --- 학교폭력 비교 기준 업데이트 ---
window.updateViolenceCompare = function(type) {
    const vd = window.currentSchoolViolenceDetail;
    if (!vd) return;
    vd.currentCompareType = type;

    // 탭 스타일 활성화 처리
    const tabs = document.querySelectorAll('.violence-tab-btn');
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

    const subKey = vd.selectedSubMetric || 'per100';
    const sub = vd.subMetrics ? vd.subMetrics[subKey] : null;

    let compareAvg = sub ? sub.districtAvg : 0.8;
    let unit = sub ? sub.unit : '건';
    let labelText = `${vd.districtName} 평균 ${compareAvg}${unit}`;

    if (type === 'city') {
        compareAvg = sub ? sub.cityAvg : 0.9;
        labelText = `${vd.cityName || '서울특별시'} 평균 ${compareAvg}${unit}`;
    } else if (type === 'national') {
        compareAvg = sub ? sub.nationalAvg : 1.1;
        labelText = `전국 평균 ${compareAvg}${unit}`;
    }

    const schoolVal = sub ? sub.schoolVal : 0;

    const elSchoolVal = document.getElementById('violenceBarSchoolVal');
    if (elSchoolVal) elSchoolVal.innerText = `${schoolVal}${unit}`;

    const elRegionLabel = document.getElementById('violenceBarRegionLabel');
    if (elRegionLabel) elRegionLabel.innerText = labelText;

    const targetName = type === 'region' ? vd.districtName : (type === 'city' ? (vd.cityName || '서울특별시') : '전국');
    const elMarkText = document.getElementById('violenceBarRegionMarkText');
    if (elMarkText) elMarkText.innerText = `▲ ${targetName} 평균`;

    const elMark = document.getElementById('violenceBarRegionMark');
    if (elMark) elMark.title = `${targetName} 평균 ${compareAvg}${unit}`;

    let maxVal;
    if (subKey === 'resolved') {
        maxVal = 100;
    } else {
        maxVal = Math.max(schoolVal, compareAvg, subKey === 'per100' ? 2.0 : 5) * 1.2;
    }

    const leftPct = Math.min(Math.max((compareAvg / maxVal) * 100, 0), 100);
    const schoolPct = Math.min(Math.max((schoolVal / maxVal) * 100, 0), 100);

    const elBarSchool = document.getElementById('violenceBarSchool');
    if (elBarSchool) elBarSchool.style.width = `${schoolPct}%`;

    if (elMark) elMark.style.left = `calc(${leftPct}% - 1px)`;
    if (elMarkText) elMarkText.style.left = `${leftPct}%`;
};

// --- 학교폭력 데이터 렌더링 ---
window.renderViolenceStats = function(school) {
    const vs = school.violence_stats;
    if (!vs) return;

    const count = school.student_count || 300;
    const addressParts = (school.address || '').split(' ');
    const cityName = school.cityName || addressParts[0] || school.region || '서울특별시';
    const districtName = school.district || addressParts[1] || '관할 구';

    const per100 = vs.per_100 ?? (count > 0 ? Math.round((vs.total_cases / count) * 100 * 10) / 10 : 0);
    const totalCases = vs.total_cases ?? 0;
    const resolvedRate = vs.resolved_rate ?? 100;

    let distAvg100 = 0.8;
    let cityAvg100 = 0.9;
    let nationalAvg100 = 1.1;

    let distAvgTotal = 3.2;
    let cityAvgTotal = 3.8;
    let nationalAvgTotal = 4.2;

    let distAvgResolved = 95;
    let cityAvgResolved = 94;
    let nationalAvgResolved = 93;

    if (window.orchestrator && window.orchestrator.state && window.orchestrator.state.schools) {
        const distSchools = window.orchestrator.state.schools.filter(s => {
            const d = s.district || (s.address ? s.address.split(' ')[1] : '');
            return d === districtName && s.violence_stats;
        });
        if (distSchools.length > 0) {
            const sum100 = distSchools.reduce((acc, s) => acc + (s.violence_stats.per_100 || 0), 0);
            distAvg100 = Math.round((sum100 / distSchools.length) * 10) / 10;

            const sumTotal = distSchools.reduce((acc, s) => acc + (s.violence_stats.total_cases || 0), 0);
            distAvgTotal = Math.round((sumTotal / distSchools.length) * 10) / 10;

            const sumResolved = distSchools.reduce((acc, s) => acc + (s.violence_stats.resolved_rate || 90), 0);
            distAvgResolved = Math.round(sumResolved / distSchools.length);
        }
        const allSchools = window.orchestrator.state.schools.filter(s => s.violence_stats);
        if (allSchools.length > 0) {
            const sum100All = allSchools.reduce((acc, s) => acc + (s.violence_stats.per_100 || 0), 0);
            cityAvg100 = Math.round((sum100All / allSchools.length) * 10) / 10;

            const sumTotalAll = allSchools.reduce((acc, s) => acc + (s.violence_stats.total_cases || 0), 0);
            cityAvgTotal = Math.round((sumTotalAll / allSchools.length) * 10) / 10;

            const sumResolvedAll = allSchools.reduce((acc, s) => acc + (s.violence_stats.resolved_rate || 90), 0);
            cityAvgResolved = Math.round(sumResolvedAll / allSchools.length);
        }
    }

    const prevSubMetric = window.currentSchoolViolenceDetail?.selectedSubMetric || 'per100';
    const prevCompareType = window.currentSchoolViolenceDetail?.currentCompareType || 'region';

    window.currentSchoolViolenceDetail = {
        districtName: districtName,
        cityName: cityName,
        selectedSubMetric: prevSubMetric,
        currentCompareType: prevCompareType,
        subMetrics: {
            total: {
                metricName: '연간신고',
                unit: '건',
                schoolVal: totalCases,
                districtAvg: distAvgTotal,
                cityAvg: cityAvgTotal,
                nationalAvg: nationalAvgTotal
            },
            per100: {
                metricName: '100명당 신고건수',
                unit: '건 (100명당)',
                schoolVal: per100,
                districtAvg: distAvg100,
                cityAvg: cityAvg100,
                nationalAvg: nationalAvg100
            },
            resolved: {
                metricName: '처리완료',
                unit: '%',
                schoolVal: resolvedRate,
                districtAvg: distAvgResolved,
                cityAvg: cityAvgResolved,
                nationalAvg: nationalAvgResolved
            }
        }
    };

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

    // 시/도 탭 버튼 명칭 동적 업데이트
    const cityTabBtn = document.querySelector('.violence-tab-btn[data-compare="city"]');
    if (cityTabBtn) {
        cityTabBtn.innerText = cityName;
    }

    // 비교 항목 설정 및 업데이트
    if (typeof window.setViolenceSubMetric === 'function') {
        window.setViolenceSubMetric(prevSubMetric);
    } else if (typeof window.updateViolenceCompare === 'function') {
        window.updateViolenceCompare(prevCompareType);
    }

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

// --- 전학생 현황 세부 비교 항목 변경 (전입 / 전출 / 순증감) ---
window.setStudentSubMetric = function(subKey) {
    const sd = window.currentSchoolStudentDetail;
    if (!sd || !sd.subMetrics || !sd.subMetrics[subKey]) return;

    sd.selectedSubMetric = subKey;

    // 칩 버튼 스타일 활성화 처리
    const chips = document.querySelectorAll('.student-submetric-chip');
    chips.forEach(btn => {
        if (btn.getAttribute('data-submetric') === subKey) {
            btn.style.background = 'var(--primary-blue, #2196f3)';
            btn.style.color = 'white';
            btn.style.fontWeight = 'bold';
        } else {
            btn.style.background = '#f0f4f8';
            btn.style.color = 'var(--text-muted)';
            btn.style.fontWeight = 'normal';
        }
    });

    const sub = sd.subMetrics[subKey];
    const headerEl = document.getElementById('studentSubMetricHeader');
    if (headerEl) headerEl.innerText = `${sub.metricName} 비교 기준`;

    window.updateStudentCompare(sd.currentCompareType || 'region');
};

// --- 전학생 현황 비교 기준 업데이트 ---
window.updateStudentCompare = function(type) {
    const sd = window.currentSchoolStudentDetail;
    if (!sd) return;
    sd.currentCompareType = type;

    // 탭 스타일 활성화 처리
    const tabs = document.querySelectorAll('.student-tab-btn');
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

    const subKey = sd.selectedSubMetric || 'transfer_in';
    const sub = sd.subMetrics ? sd.subMetrics[subKey] : null;

    let compareAvg = sub ? sub.districtAvg : sd.districtAvgIn;
    let labelText = `${sd.districtName} 평균 ${compareAvg}명`;

    if (type === 'city') {
        compareAvg = sub ? sub.cityAvg : (sd.cityAvgIn || 18);
        labelText = `${sd.cityName || '서울특별시'} 평균 ${compareAvg}명`;
    } else if (type === 'national') {
        compareAvg = sub ? sub.nationalAvg : (sd.nationalAvgIn || 20);
        labelText = `전국 평균 ${compareAvg}명`;
    }

    const schoolVal = sub ? sub.schoolVal : sd.transferIn;
    const metricLabel = sub ? sub.metricName : '전입생';
    
    const elSchoolVal = document.getElementById('studentBarSchoolVal');
    if (elSchoolVal) {
        if (subKey === 'net') {
            const netStr = (schoolVal >= 0 ? '+' : '') + schoolVal;
            elSchoolVal.innerText = `${netStr}명 (${metricLabel})`;
        } else {
            elSchoolVal.innerText = `${schoolVal}명 (${metricLabel})`;
        }
    }

    const elRegionLabel = document.getElementById('studentBarRegionLabel');
    if (elRegionLabel) elRegionLabel.innerText = labelText;

    const targetName = type === 'region' ? sd.districtName : (type === 'city' ? (sd.cityName || '서울특별시') : '전국');
    const elMarkText = document.getElementById('studentBarRegionMarkText');
    if (elMarkText) elMarkText.innerText = `▲ ${targetName} 평균`;

    const elMark = document.getElementById('studentBarRegionMark');
    if (elMark) elMark.title = `${targetName} 평균 ${compareAvg}명`;

    const absSchool = Math.abs(schoolVal);
    const absAvg = Math.abs(compareAvg);
    const maxVal = Math.max(absSchool, absAvg, 10) * 1.25;
    const leftPct = Math.min((absAvg / maxVal) * 100, 100);
    const schoolPct = Math.min((absSchool / maxVal) * 100, 100);

    const elBarSchool = document.getElementById('studentBarSchool');
    if (elBarSchool) elBarSchool.style.width = `${schoolPct}%`;

    if (elMark) elMark.style.left = `calc(${leftPct}% - 1px)`;
    if (elMarkText) elMarkText.style.left = `${leftPct}%`;
};

// --- 전학생·통학 데이터 렌더링 ---
window.renderStudentStats = function(school) {
    const ts = school.transfer_stats;
    const rs = school.residence_stats;
    const cs = school.commute_stats;

    const addressParts = (school.address || '').split(' ');
    const cityName = school.cityName || addressParts[0] || school.region || '서울특별시';
    const districtName = school.district || addressParts[1] || '관할 구';

    const transferIn = ts ? (ts.transfer_in ?? 0) : 0;
    const transferOut = ts ? (ts.transfer_out ?? 0) : 0;
    const net = ts ? (ts.net ?? 0) : 0;

    let districtAvgIn = 15;
    let cityAvgIn = 18;
    let nationalAvgIn = 20;

    let districtAvgOut = 13;
    let cityAvgOut = 17;
    let nationalAvgOut = 20;

    let districtAvgNet = 2;
    let cityAvgNet = 1;
    let nationalAvgNet = 0;

    if (window.orchestrator && window.orchestrator.state && window.orchestrator.state.schools) {
        const distSchools = window.orchestrator.state.schools.filter(s => {
            const d = s.district || (s.address ? s.address.split(' ')[1] : '');
            return d === districtName && s.transfer_stats;
        });
        if (distSchools.length > 0) {
            const sumIn = distSchools.reduce((acc, s) => acc + (s.transfer_stats.transfer_in || 0), 0);
            const sumOut = distSchools.reduce((acc, s) => acc + (s.transfer_stats.transfer_out || 0), 0);
            const sumNet = distSchools.reduce((acc, s) => acc + (s.transfer_stats.net || 0), 0);
            districtAvgIn = Math.round(sumIn / distSchools.length);
            districtAvgOut = Math.round(sumOut / distSchools.length);
            districtAvgNet = Math.round(sumNet / distSchools.length);
        }
        const allSchools = window.orchestrator.state.schools.filter(s => s.transfer_stats);
        if (allSchools.length > 0) {
            const sumInAll = allSchools.reduce((acc, s) => acc + (s.transfer_stats.transfer_in || 0), 0);
            const sumOutAll = allSchools.reduce((acc, s) => acc + (s.transfer_stats.transfer_out || 0), 0);
            const sumNetAll = allSchools.reduce((acc, s) => acc + (s.transfer_stats.net || 0), 0);
            cityAvgIn = Math.round(sumInAll / allSchools.length);
            cityAvgOut = Math.round(sumOutAll / allSchools.length);
            cityAvgNet = Math.round(sumNetAll / allSchools.length);
        }
    }

    const defaultSubKey = (window.currentSchoolStudentDetail && window.currentSchoolStudentDetail.selectedSubMetric) || 'transfer_in';

    window.currentSchoolStudentDetail = {
        districtName: districtName,
        cityName: cityName,
        selectedSubMetric: defaultSubKey,
        currentCompareType: 'region',
        subMetrics: {
            transfer_in: {
                metricName: '전입생수',
                unit: '명',
                schoolVal: transferIn,
                districtAvg: districtAvgIn,
                cityAvg: cityAvgIn,
                nationalAvg: nationalAvgIn
            },
            transfer_out: {
                metricName: '전출생수',
                unit: '명',
                schoolVal: transferOut,
                districtAvg: districtAvgOut,
                cityAvg: cityAvgOut,
                nationalAvg: nationalAvgOut
            },
            net: {
                metricName: '순전입 (순증감)',
                unit: '명',
                schoolVal: net,
                districtAvg: districtAvgNet,
                cityAvg: cityAvgNet,
                nationalAvg: nationalAvgNet
            }
        }
    };

    // 시/도 탭 버튼 명칭 동적 업데이트
    const cityTabBtn = document.querySelector('.student-tab-btn[data-compare="city"]');
    if (cityTabBtn) {
        cityTabBtn.innerText = cityName;
    }

    if (typeof window.setStudentSubMetric === 'function') {
        window.setStudentSubMetric(defaultSubKey);
    } else if (typeof window.updateStudentCompare === 'function') {
        window.updateStudentCompare('region');
    }

    // 인라인 요약값 (전학생·통학 현황: 전입 N / 전출 N)
    const summaryEl = document.getElementById('statTransferSummary');
    if (summaryEl && ts) {
        const netVal = ts.net ?? 0;
        const netStr = (netVal > 0 ? '+' : '') + netVal;
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
            const netVal = ts.net ?? 0;
            netEl.innerText = (netVal > 0 ? '+' : '') + netVal;
            netEl.style.color = netVal > 0 ? '#2e7d32' : netVal < 0 ? '#bf360c' : '#0d47a1';
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

    // --- XSS 및 스크립트 해킹 차단 로직 (추가됨) ---
    const xssPattern = /<script[^>]*>|onload|onerror|onclick|onmouseover|onfocus|onblur|onchange|onsubmit|onkeydown|onkeypress|onkeyup|javascript:|expression\(|<img|<iframe|<object|<embed|fetch\s*\(|xmlhttprequest/gi;
    if (xssPattern.test(content)) {
        alert('보안 경고: 허용되지 않는 문자나 스크립트(HTML 태그, 이벤트 핸들러 등)가 포함되어 있습니다.');
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
        
        await fetchAcademyRatingsFromDb();
        if (typeof applyFiltersAndRender === 'function') {
            applyFiltersAndRender();
        }
        
        // 찐후기 탭으로 강제 이동(리프레시)
        const realBtn = document.querySelector('.community-filter-btn[data-type="real"]');
        if (realBtn) realBtn.click();
        
    } catch(e) {
        alert(e.message);
    }
};

// ----------------------------------------------------
// 첫 방문 온보딩 튜토리얼 & 대표 유즈케이스 프리셋 CTA & 관심 학교 저장 로직
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // 1. 온보딩 튜토리얼
    const onboardingModal = document.getElementById('onboardingModal');
    if (onboardingModal) {
        const visited = localStorage.getItem('visitedOnboarding');
        if (!visited) {
            onboardingModal.style.display = 'flex';
        }
        
        document.getElementById('btnNextStep1').addEventListener('click', () => {
            document.getElementById('onboardingStep1').style.display = 'none';
            document.getElementById('onboardingStep2').style.display = 'block';
        });
        document.getElementById('btnPrevStep2').addEventListener('click', () => {
            document.getElementById('onboardingStep2').style.display = 'none';
            document.getElementById('onboardingStep1').style.display = 'block';
        });
        document.getElementById('btnNextStep2').addEventListener('click', () => {
            document.getElementById('onboardingStep2').style.display = 'none';
            document.getElementById('onboardingStep3').style.display = 'block';
        });
        document.getElementById('btnPrevStep3').addEventListener('click', () => {
            document.getElementById('onboardingStep3').style.display = 'none';
            document.getElementById('onboardingStep2').style.display = 'block';
        });
        
        const closeOnboarding = () => {
            onboardingModal.style.display = 'none';
            localStorage.setItem('visitedOnboarding', 'true');
        };
        document.getElementById('btnFinishOnboarding').addEventListener('click', closeOnboarding);
        document.getElementById('btnCloseOnboarding').addEventListener('click', closeOnboarding);
    }

    // 2. 대표 유즈케이스 프리셋 CTA
    const setVal = (sid, tid, val, suffix = '') => {
        const s = document.getElementById(sid);
        const t = document.getElementById(tid);
        if (s && t) { s.value = val; t.innerText = val + suffix; }
    };

    const runPreset = (profile, commuteMode, cur, tar) => {
        setVal('currentLevelRange', 'valCurrentLevel', cur, '점');
        setVal('targetLevelRange', 'valTargetLevel', tar, '점');
        
        const profileEl = document.getElementById('profileRecommendFilter');
        if (profileEl) {
            profileEl.value = profile;
            profileEl.dispatchEvent(new Event('change'));
        }
        
        const commuteEl = document.getElementById('commuteRadiusFilter');
        if (commuteEl) {
            commuteEl.value = commuteMode;
            commuteEl.dispatchEvent(new Event('change'));
        }

        // 접속 및 새로고침 시 기본적으로 필터를 닫은 상태(display: none)로 유지
        const parentsFilterContent = document.getElementById('parentsFilterContent');
        const parentsFilterIndicator = document.getElementById('parentsFilterIndicator');
        if (parentsFilterContent && parentsFilterIndicator) {
            const isOpen = sessionStorage.getItem('learnmap_parents_filter_open') === 'true';
            if (isOpen) {
                parentsFilterContent.style.display = 'flex';
                parentsFilterIndicator.innerText = '▲';
            } else {
                parentsFilterContent.style.display = 'none';
                parentsFilterIndicator.innerText = '▼';
            }
        }
        
        if (window.kakaoMapInstance) {
            window.kakaoMapInstance.setLevel(6); // 기본 500m 축척 유지
        }
        if (typeof window.onMapAction === 'function') {
            window.onMapAction();
        } else if (typeof onMapAction === 'function') {
            onMapAction();
        }
    };

    const ctaMoving = document.getElementById('btnCtaMovingSearch');
    if (ctaMoving) {
        ctaMoving.addEventListener('click', () => {
            const btnOpenSimulation = document.getElementById('btnOpenSimulation');
            if (btnOpenSimulation) {
                btnOpenSimulation.click();
            } else {
                const simModal = document.getElementById('simulationModal');
                if (simModal) {
                    simModal.style.display = 'flex';
                    document.getElementById('simulationResultPanel').style.display = 'none';
                    if (typeof window.initSimulationDropdowns === 'function') {
                        window.initSimulationDropdowns();
                    }
                } else {
                    runPreset('academic', 'off', 80, 95);
                    alert('학업 중심의 맞춤형 탐색 프리셋이 적용되었습니다. 지도 핀을 확인해 보세요!');
                }
            }
        });
    }

    const ctaNearby = document.getElementById('btnCtaNearbySearch');
    if (ctaNearby) {
        ctaNearby.addEventListener('click', () => {
            runPreset('balanced', '1000', 70, 85);
            alert('집 근처 1km 반경 균형 성장형 탐색 프리셋이 적용되었습니다. 지도 핀을 확인해 보세요!');
        });
    }

    // 3. 관심 학교 저장 및 즐겨찾기
    const favContainer = document.getElementById('favoriteSchoolsContainer');
    const favList = document.getElementById('favoriteSchoolsList');
 
    const updateFavUI = () => {
        const favs = JSON.parse(localStorage.getItem('favoriteSchools') || '[]');
        
        // Welcome Card UI
        if (favs.length === 0) {
            if (favContainer) favContainer.style.display = 'none';
        } else {
            if (favContainer) favContainer.style.display = 'block';
            if (favList) {
                favList.innerHTML = '';
                favs.forEach(school => {
                    const btn = document.createElement('div');
                    btn.style.cssText = 'padding: 8px 12px; font-size: 12px; font-weight: 600; text-align: left; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; color: var(--deep-blue); display: flex; flex-direction: column; gap: 4px; transition: all 0.2s; margin-bottom: 6px;';
                    
                    const priorityLabels = { '1': '🥇 1순위', '2': '🥈 2순위', '3': '⭐ 관심' };
                    const priLabel = priorityLabels[school.priority || '3'] || '⭐ 관심';
                    
                    btn.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <span style="font-weight: 700;">🏫 ${school.name} <span style="font-size:10px; color:#ef6c00; background:#fff3e0; padding:2px 6px; border-radius:4px; margin-left:4px; font-weight:bold;">${priLabel}</span></span>
                            <span style="font-size:10px; color:var(--text-muted); font-weight:bold;">이동 ➔</span>
                        </div>
                        ${school.memo ? `<div style="font-size: 11px; font-weight: normal; color: var(--text-muted); border-top: 1px dashed var(--border-color); padding-top: 4px; margin-top: 2px; white-space: pre-wrap;">📝 ${school.memo}</div>` : ''}
                    `;
                    
                    btn.onmouseover = () => btn.style.borderColor = 'var(--primary-blue)';
                    btn.onmouseout = () => btn.style.borderColor = 'var(--border-color)';
                    
                    btn.onclick = () => {
                        window.selectSchoolById(school.id);
                    };
                    
                    favList.appendChild(btn);
                });
            }
        }

        // My Page Favorites UI
        const mypageFavList = document.getElementById('mypageFavoriteSchoolsList');
        if (mypageFavList) {
            mypageFavList.innerHTML = '';
            if (favs.length === 0) {
                mypageFavList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 12px;">즐겨찾는 학교가 없습니다.</div>';
            } else {
                favs.forEach(school => {
                    const btn = document.createElement('div');
                    btn.style.cssText = 'padding: 8px 12px; font-size: 12px; font-weight: 600; text-align: left; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; color: var(--deep-blue); display: flex; flex-direction: column; gap: 4px; transition: all 0.2s; margin-bottom: 6px;';
                    
                    const priorityLabels = { '1': '🥇 1순위', '2': '🥈 2순위', '3': '⭐ 관심' };
                    const priLabel = priorityLabels[school.priority || '3'] || '⭐ 관심';
                    
                    btn.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <span style="font-weight: 700;">🏫 ${school.name} <span style="font-size:10px; color:#ef6c00; background:#fff3e0; padding:2px 6px; border-radius:4px; margin-left:4px; font-weight:bold;">${priLabel}</span></span>
                            <span style="font-size:10px; color:var(--text-muted); font-weight:bold;">이동 ➔</span>
                        </div>
                        ${school.memo ? `<div style="font-size: 11px; font-weight: normal; color: var(--text-muted); border-top: 1px dashed var(--border-color); padding-top: 4px; margin-top: 2px; white-space: pre-wrap;">📝 ${school.memo}</div>` : ''}
                    `;
                    
                    btn.onmouseover = () => btn.style.borderColor = 'var(--primary-blue)';
                    btn.onmouseout = () => btn.style.borderColor = 'var(--border-color)';
                    
                    btn.onclick = () => {
                        if (window.innerWidth <= 1024 && typeof window.onMobileNavClick === 'function') {
                            const mapTabBtn = document.querySelector('.mobile-bottom-nav .nav-item');
                            window.onMobileNavClick('map', mapTabBtn);
                        } else {
                            const setModal = document.getElementById('settingsModal');
                            if (setModal) setModal.style.display = 'none';
                        }
                        window.selectSchoolById(school.id);
                    };
                    
                    mypageFavList.appendChild(btn);
                });
            }
        }
    };

    function updateMypageComparisonUI(directList) {
        try {
            const mypageCompList = document.getElementById('mypageComparisonSchoolsList');
            if (!mypageCompList) return;
            
            mypageCompList.innerHTML = '';
            
            let list = [];
            if (directList && Array.isArray(directList)) {
                list = directList;
            } else {
                // 로컬 스토리지에서 직접 한 번 더 파싱하여 신뢰성 극대화
                try {
                    list = JSON.parse(localStorage.getItem('learnmap_comparison_list') || '[]');
                } catch (e) {
                    console.error("Failed to load comparison list from localStorage in UI", e);
                    list = (orchestrator && orchestrator.state && orchestrator.state.comparisonList) ? orchestrator.state.comparisonList : [];
                }
            }
            
            const btnPrev = document.getElementById('btnMypageCompPrev');
            const btnNext = document.getElementById('btnMypageCompNext');

            if (!list || list.length === 0) {
                if (btnPrev) btnPrev.style.display = 'none';
                if (btnNext) btnNext.style.display = 'none';
                mypageCompList.className = '';
                mypageCompList.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
                mypageCompList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 12px;">비교중인 학교가 없습니다.</div>';
                return;
            }

            // 양 옆 화살표 네비게이션 기능 설정
            if (btnPrev && btnNext) {
                if (list.length <= 1) {
                    btnPrev.style.display = 'none';
                    btnNext.style.display = 'none';
                } else {
                    if (!btnPrev.dataset.hasListener) {
                        btnPrev.dataset.hasListener = 'true';
                        btnPrev.addEventListener('click', () => {
                            mypageCompList.scrollBy({ left: -262, behavior: 'smooth' });
                        });
                    }
                    if (!btnNext.dataset.hasListener) {
                        btnNext.dataset.hasListener = 'true';
                        btnNext.addEventListener('click', () => {
                            mypageCompList.scrollBy({ left: 262, behavior: 'smooth' });
                        });
                    }
                }
            }
            
            // PC 비교보드와 동일한 비교 매트릭스 데이터 생성
            const matrix = orchestrator.compareAgent.generateComparisonMatrix(list, orchestrator.state.childProfile.scores);
            
            // 가로 스크롤 컨테이너 스타일 지정
            mypageCompList.className = 'mypage-compare-scroll-container';
            mypageCompList.style.cssText = 'display: flex; gap: 12px; overflow-x: auto; padding: 8px 4px; width: 100%; box-sizing: border-box; -webkit-overflow-scrolling: touch; scroll-behavior: smooth;';
            
            matrix.forEach(item => {
                if (!item) return;
                
                // 3개년 성적 스파크라인 SVG 렌더링
                let sparklineHtml = '';
                if (item.trendData && item.trendData.length >= 3) {
                    const pts = item.trendData;
                    const width = 100;
                    const height = 26;
                    const minVal = 50;
                    const maxVal = 100;
                    
                    const getX = (idx) => 8 + idx * 42;
                    const getY = (val) => height - 5 - ((val - minVal) / (maxVal - minVal)) * (height - 10);
                    
                    const p1 = `${getX(0)},${getY(pts[0])}`;
                    const p2 = `${getX(1)},${getY(pts[1])}`;
                    const p3 = `${getX(2)},${getY(pts[2])}`;
                    
                    sparklineHtml = `
                        <div style="margin: 6px 0; background: var(--bg-primary); border-radius: 4px; border: 1px solid var(--border-color); padding: 4px; display: flex; align-items: center; justify-content: space-between;">
                            <svg width="${width}" height="${height}">
                                <path d="M ${p1} L ${p2} L ${p3}" fill="none" stroke="var(--primary-blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                                <circle cx="${getX(0)}" cy="${getY(pts[0])}" r="2" fill="var(--deep-blue)" stroke="white" stroke-width="1"></circle>
                                <circle cx="${getX(1)}" cy="${getY(pts[1])}" r="2" fill="var(--deep-blue)" stroke="white" stroke-width="1"></circle>
                                <circle cx="${getX(2)}" cy="${getY(pts[2])}" r="2" fill="var(--deep-blue)" stroke="white" stroke-width="1"></circle>
                            </svg>
                            <span style="font-size: 8.5px; color: var(--text-muted); line-height: 1.1;">최근: <strong>${pts[2]}점</strong></span>
                        </div>
                    `;
                }

                const weightedAvgLabel = item.weightedAvg !== undefined ? `${item.weightedAvg}점` : '-';
                const envScoreLabel = item.envScore !== undefined ? `${item.envScore}점` : '-';
                const violenceCases = item.violence_stats ? `${item.violence_stats.total_cases}건` : '0건';
                
                // 세부 환경 스코어
                let envDetailsHtml = '';
                if (item.envScoresDetails) {
                    const details = item.envScoresDetails;
                    envDetailsHtml = `
                        <div style="font-size:9.5px; color:var(--text-muted); margin-top: 4px; background:#f1f3f5; padding:6px; border-radius:6px; display:flex; flex-direction:column; gap:2px;">
                            <div style="display:flex; justify-content:space-between;"><span>학업 성적:</span> <span>${Math.round(details.scoreScore)}점</span></div>
                            <div style="display:flex; justify-content:space-between;"><span>교사 비율:</span> <span>${Math.round(details.teacherScore)}점</span></div>
                            <div style="display:flex; justify-content:space-between;"><span>학폭 안전:</span> <span>${Math.round(details.safetyScore)}점</span></div>
                            <div style="display:flex; justify-content:space-between;"><span>창체 예산:</span> <span>${Math.round(details.budgetScore)}점</span></div>
                        </div>
                    `;
                }

                const card = document.createElement('div');
                card.className = 'mypage-compare-card';
                card.style.cssText = 'flex: 0 0 250px; background: #ffffff; border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); display: flex; flex-direction: column; box-sizing: border-box;';
                
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; margin-bottom: 8px;">
                        <span style="font-weight: 700; font-size: 13px; color: var(--deep-blue); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; cursor: pointer;" class="mypage-comp-school-btn">🏫 ${item.school_name}</span>
                        <button class="mypage-comp-delete-btn" style="background: none; border: none; font-size: 16px; color: var(--danger-red, #ff3b30); cursor: pointer; padding: 2px; font-weight: bold; line-height: 1;">&times;</button>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--text-main);">
                        <div>🧑‍🎓 학생수: <strong>${item.student_count}</strong></div>
                        <div>🏫 학급 평균: <strong>${item.class_avg_size}</strong></div>
                        <div>📊 국·영·수 평균: <strong>${item.korean_avg} / ${item.english_avg} / ${item.math_avg}</strong></div>
                        <div>⚖️ 가중 평균 점수: <strong>${weightedAvgLabel}</strong></div>
                        <div>🎯 강점 과목: <strong>${item.strong_subject}</strong></div>
                        <div>🏠 평균 매매가: <strong style="color:var(--success-green);">${item.housing_sale}</strong></div>
                        <div>🔑 평균 전세가: <strong style="color:var(--success-green);">${item.housing_jeonse}</strong></div>
                        <div>📚 주변 학원 수: <strong>${item.academy_count_est}개</strong></div>
                        <div>💰 창체 활동비: <strong>${item.extracurricular_budget}만원</strong></div>
                        <div>🛡️ 학교폭력 건수: <strong style="color:${item.violence_stats && item.violence_stats.total_cases > 3 ? 'var(--danger-red)' : 'var(--text-main)'}">${violenceCases}</strong></div>
                        
                        <div style="margin-top: 6px; border-top: 1px dashed var(--border-color); padding-top: 6px;">
                            🏫 교육환경 스코어: <strong style="color:var(--primary-blue);">${envScoreLabel}</strong>
                            ${envDetailsHtml}
                        </div>
                        
                        <div style="margin-top: 4px;">
                            📈 성취도 추세
                            ${sparklineHtml}
                        </div>
                        
                        <div style="margin-top: 6px; border-top: 1px dashed var(--border-color); padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
                            <span>✨ 우리 아이 적합도:</span>
                            <strong style="color:${item.suitability === '상' ? 'var(--success-green)' : (item.suitability === '중' ? 'var(--warning-yellow)' : 'var(--danger-red)')};">${item.suitability}</strong>
                        </div>
                    </div>
                `;

                // 학교 이름 클릭 시 지도 이동 및 상세 카드 열기
                const clickBtn = card.querySelector('.mypage-comp-school-btn');
                if (clickBtn) {
                    clickBtn.onclick = () => {
                        if (window.innerWidth <= 1024 && typeof window.onMobileNavClick === 'function') {
                            const mapTabBtn = document.querySelector('.mobile-bottom-nav .nav-item');
                            window.onMobileNavClick('map', mapTabBtn);
                        } else {
                            const setModal = document.getElementById('settingsModal');
                            if (setModal) setModal.style.display = 'none';
                        }
                        window.selectSchoolById(item.school_id);
                    };
                }

                // 삭제 버튼 클릭 시 비교 보드에서 제거
                const delBtn = card.querySelector('.mypage-comp-delete-btn');
                if (delBtn) {
                    const handleDelete = (e) => {
                        if (e) {
                            e.stopPropagation();
                            if (e.cancelable) {
                                e.preventDefault();
                            }
                        }
                        
                        const targetId = String(item.school_id || item.id || '').trim();
                        if (!targetId) return;
                        
                        // 메모리 상태 필터링
                        if (orchestrator && orchestrator.state && orchestrator.state.comparisonList) {
                            orchestrator.state.comparisonList = orchestrator.state.comparisonList.filter(s => {
                                const sId = String(s.school_id || s.id || '').trim();
                                return sId !== targetId;
                            });
                        }
                        // 스토리지 상태 필터링
                        try {
                            const currentList = JSON.parse(localStorage.getItem('learnmap_comparison_list') || '[]');
                            const updatedList = currentList.filter(s => {
                                const sId = String(s.school_id || s.id || '').trim();
                                return sId !== targetId;
                            });
                            localStorage.setItem('learnmap_comparison_list', JSON.stringify(updatedList));
                            if (orchestrator && orchestrator.state) {
                                orchestrator.state.comparisonList = updatedList;
                            }
                        } catch (err) {
                            console.error('Failed to sync comparisonList deletion to localStorage', err);
                        }
                        
                        if (typeof window.updateCompareFloatingButton === 'function') {
                            window.updateCompareFloatingButton();
                        } else if (typeof updateCompareFloatingButton === 'function') {
                            updateCompareFloatingButton();
                        }
                        
                        try {
                            const comparisonTable = orchestrator.compareAgent.generateComparisonMatrix(orchestrator.state.comparisonList, orchestrator.state.childProfile.scores);
                            if (typeof renderComparisonBoard === 'function') {
                                renderComparisonBoard(comparisonTable);
                            }
                        } catch (renderErr) {
                            console.warn("Ignored renderComparisonBoard error on delete:", renderErr);
                        }
                        
                        // 실시간 메모리 데이터를 활용해 화면 갱신
                        if (typeof window.updateMypageComparisonUI === 'function') {
                            window.updateMypageComparisonUI(orchestrator.state.comparisonList);
                        } else {
                            updateMypageComparisonUI(orchestrator.state.comparisonList);
                        }
                        
                        // 알림 모달을 띄워 삭제 완료 안내
                        alert('선택한 학교가 비교 보드에서 삭제되었습니다.');
                    };
                    
                    delBtn.onclick = handleDelete;
                    delBtn.ontouchstart = handleDelete;
                }

                mypageCompList.appendChild(card);
            });

            // 마우스 드래그 가로 스크롤 활성화 (PC 시뮬레이터 및 마우스 조작 대응)
            let isDown = false;
            let startX;
            let scrollLeft;
            
            mypageCompList.addEventListener('mousedown', (e) => {
                // 클릭 대상이 버튼이나 대화형 텍스트 영역이면 기본 드래그 작동 제외
                if (e.target.closest('button') || e.target.closest('.mypage-comp-school-btn')) return;
                isDown = true;
                mypageCompList.style.cursor = 'grabbing';
                startX = e.pageX - mypageCompList.offsetLeft;
                scrollLeft = mypageCompList.scrollLeft;
            });
            
            mypageCompList.addEventListener('mouseleave', () => {
                isDown = false;
                mypageCompList.style.cursor = 'default';
            });
            
            mypageCompList.addEventListener('mouseup', () => {
                isDown = false;
                mypageCompList.style.cursor = 'default';
            });
            
            mypageCompList.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - mypageCompList.offsetLeft;
                const walk = (x - startX) * 1.5; // 스크롤 민감도
                mypageCompList.scrollLeft = scrollLeft - walk;
            });

            // 모바일 터치 환경에서는 브라우저 기본의 부드러운 가로 스크롤 및 상하 스크롤을 이용하기 위해 커스텀 touchstart/touchmove 이벤트를 리슨하지 않습니다.

            // 스크롤 한계 지점 도달 시 화살표 감춤 처리
            const updateArrowVisibility = () => {
                if (!btnPrev || !btnNext) return;
                if (list.length <= 1) {
                    btnPrev.style.display = 'none';
                    btnNext.style.display = 'none';
                    return;
                }
                const scrollLeft = mypageCompList.scrollLeft;
                const scrollWidth = mypageCompList.scrollWidth;
                const clientWidth = mypageCompList.clientWidth;
                
                // 왼쪽 끝 도달 시 (오차 감안 3px)
                if (scrollLeft <= 3) {
                    btnPrev.style.display = 'none';
                } else {
                    btnPrev.style.display = 'flex';
                }
                
                // 오른쪽 끝 도달 시 (오차 감안 3px)
                if (scrollLeft + clientWidth >= scrollWidth - 3) {
                    btnNext.style.display = 'none';
                } else {
                    btnNext.style.display = 'flex';
                }
            };

            // 스크롤 동작 발생 시 실시간으로 화살표 상태 갱신
            mypageCompList.addEventListener('scroll', updateArrowVisibility);
            
            // 엘리먼트 렌더링 완료 타이밍 조율 후 최초 계산 실행
            setTimeout(updateArrowVisibility, 100);
        } catch (error) {
            console.error("Error in updateMypageComparisonUI:", error);
        }
    }
    window.updateMypageComparisonUI = updateMypageComparisonUI;

    window.clearMypageComparison = async () => {
        try {
            let list = [];
            try {
                list = JSON.parse(localStorage.getItem('learnmap_comparison_list') || '[]');
            } catch (e) {
                list = (orchestrator && orchestrator.state && orchestrator.state.comparisonList) ? orchestrator.state.comparisonList : [];
            }

            if (list.length === 0) return;
            
            if (await confirm('비교 보드에 담긴 모든 학교를 삭제하시겠습니까?')) {
                if (orchestrator && orchestrator.state) {
                    orchestrator.state.comparisonList = [];
                }
                try {
                    localStorage.setItem('learnmap_comparison_list', JSON.stringify([]));
                } catch (err) {
                    console.error('Failed to sync comparisonList to localStorage', err);
                }
                
                // 마이페이지 UI 비우기를 우선적으로 실행하여 확실하게 갱신 보장
                if (typeof window.updateMypageComparisonUI === 'function') {
                    window.updateMypageComparisonUI([]);
                } else if (typeof updateMypageComparisonUI === 'function') {
                    updateMypageComparisonUI([]);
                }

                updateCompareFloatingButton();
                if (compareOverlay) {
                    compareOverlay.style.display = 'none';
                }
                
                try {
                    if (typeof renderComparisonBoard === 'function') {
                        renderComparisonBoard([]);
                    }
                } catch (renderErr) {
                    console.warn("Ignored renderComparisonBoard error on clear:", renderErr);
                }
            }
        } catch (globalErr) {
            console.error("Error in clearMypageComparison:", globalErr);
        }
    };

    // 관심 메모 저장 이벤트 연결
    const btnSaveFavMemo = document.getElementById('btnSaveFavMemo');
    if (btnSaveFavMemo) {
        btnSaveFavMemo.addEventListener('click', async () => {
            const school = orchestrator.state.selectedSchool;
            if (!school) return;
            
            const favs = JSON.parse(localStorage.getItem('favoriteSchools') || '[]');
            const index = favs.findIndex(f => f.id === school.school_id);
            const priority = document.getElementById('favPrioritySelect').value;
            const memo = document.getElementById('favMemoText').value.trim();
            const now = new Date().toLocaleDateString('ko-KR');
            
            const item = {
                id: school.school_id,
                name: school.school_name,
                type: school.school_type,
                priority: priority,
                memo: memo,
                updated_at: now
            };

            if (index !== -1) {
                favs[index] = item;
            } else {
                favs.push(item);
            }
            
            localStorage.setItem('favoriteSchools', JSON.stringify(favs));
            
            // Supabase 동기화 시도
            if (supabase) {
                try {
                    const { error } = await supabase
                        .from('favorite_school_notes')
                        .upsert({
                            school_id: school.school_id,
                            priority: parseInt(priority),
                            memo: memo,
                            updated_at: new Date()
                        });
                    if (error) throw error;
                } catch (e) {
                    console.error('Failed to sync favorite memo with Supabase:', e);
                }
            }
            
            const btn = document.getElementById('btnSaveFavorite');
            if (btn) {
                btn.innerHTML = '🌟';
                btn.title = '관심 학교 저장됨';
            }
            
            alert('관심 학교 메모 및 순위 정보가 정상적으로 저장되었습니다.');
            window.toggleFavMemoModal();
            updateFavUI();
        });
    }

    // 모달 내 관심 해제 버튼 이벤트 연결
    const btnRemoveFavoriteFromModal = document.getElementById('btnRemoveFavoriteFromModal');
    if (btnRemoveFavoriteFromModal) {
        btnRemoveFavoriteFromModal.addEventListener('click', async () => {
            const school = orchestrator.state.selectedSchool;
            if (!school) return;
            
            const favs = JSON.parse(localStorage.getItem('favoriteSchools') || '[]');
            const filtered = favs.filter(f => f.id !== school.school_id);
            localStorage.setItem('favoriteSchools', JSON.stringify(filtered));
            
            // Supabase 연동 시 삭제 처리 시도
            if (supabase) {
                try {
                    const { error } = await supabase
                        .from('favorite_school_notes')
                        .delete()
                        .eq('school_id', school.school_id);
                    if (error) throw error;
                } catch (e) {
                    console.error('Failed to delete favorite note from Supabase:', e);
                }
            }
            
            const btn = document.getElementById('btnSaveFavorite');
            if (btn) {
                btn.innerHTML = '⭐';
                btn.title = '관심 학교 저장';
            }
            
            alert(`${school.school_name}이(가) 관심 학교에서 제거되었습니다.`);
            window.toggleFavMemoModal();
            updateFavUI();
        });
    }

    // Globally expose toggleFavMemoModal
    window.toggleFavMemoModal = () => {
        const modal = document.getElementById('favMemoModal');
        if (!modal) return;
        if (modal.style.display === 'none' || modal.style.display === '') {
            modal.style.display = 'flex';
        } else {
            modal.style.display = 'none';
        }
    };

    // Globally expose toggleFavoriteSchool for inline HTML onclick handler
    window.toggleFavoriteSchool = () => {
        if (!orchestrator.state.selectedSchool) {
            alert('저장할 학교를 선택해 주세요.');
            return;
        }
        const school = orchestrator.state.selectedSchool;
        const favs = JSON.parse(localStorage.getItem('favoriteSchools') || '[]');
        const exists = favs.find(f => f.id === school.school_id);
        
        // 모달창 필드 매핑 및 채우기
        const modalSchoolName = document.getElementById('favMemoModalSchoolName');
        if (modalSchoolName) {
            modalSchoolName.innerText = school.school_name;
        }
        
        const prioritySelect = document.getElementById('favPrioritySelect');
        const memoText = document.getElementById('favMemoText');
        const memoDate = document.getElementById('favMemoDate');
        
        if (exists) {
            if (prioritySelect) prioritySelect.value = exists.priority || '3';
            if (memoText) memoText.value = exists.memo || '';
            if (memoDate) memoDate.innerText = exists.updated_at ? `작성일: ${exists.updated_at}` : '작성일: -';
        } else {
            const now = new Date().toLocaleDateString('ko-KR');
            if (prioritySelect) prioritySelect.value = '3';
            if (memoText) memoText.value = '';
            if (memoDate) memoDate.innerText = `작성일: ${now}`;
        }
        
        window.toggleFavMemoModal();
    };

    window.clearAllFavorites = async () => {
        if (await confirm('관심 저장된 모든 학교 목록을 삭제하시겠습니까?')) {
            localStorage.removeItem('favoriteSchools');
            const btn = document.getElementById('btnSaveFavorite');
            if (btn) {
                btn.innerHTML = '⭐';
                btn.title = '관심 학교 저장';
            }
            updateFavUI();
            alert('모든 관심 학교가 삭제되었습니다.');
        }
    };

    // Observe changes to update Save Favorite Button state
    const originalSelectSchool = orchestrator.selectSchool;
    orchestrator.selectSchool = function(school) {
        const res = originalSelectSchool.call(orchestrator, school);
        setTimeout(() => {
            const favs = JSON.parse(localStorage.getItem('favoriteSchools') || '[]');
            const exists = favs.find(f => f.id === school.school_id);
            const btn = document.getElementById('btnSaveFavorite');
            if (btn) {
                btn.innerHTML = exists ? '🌟' : '⭐';
                btn.title = exists ? '관심 학교 저장됨' : '관심 학교 저장';
            }

            // 신규 부가 서비스 연동 전 체크박스 초기화
            const cPath = document.getElementById('chkCommutePath');
            const cPathAca = document.getElementById('chkCommutePathAcademy');
            const sPath = document.getElementById('chkShuttlePath');
            const sPathAca = document.getElementById('chkShuttlePathAcademy');
            if (cPath) cPath.checked = false;
            if (cPathAca) cPathAca.checked = false;
            if (sPath) sPath.checked = false;
            if (sPathAca) sPathAca.checked = false;

            const panel = document.getElementById('commutePathSettings');
            const panelAca = document.getElementById('commutePathSettingsAcademy');
            if (panel) panel.style.display = 'none';
            if (panelAca) panelAca.style.display = 'none';
            window.customCommuteStart = null;
            window.customCommuteEnd = null;
            window.mapClickMode = 'none';
            if (typeof window.updatePointSelectorButtons === 'function') {
                window.updatePointSelectorButtons();
            }

            // 신규 부가 서비스 연동 (지도 레이어, 부동산 차트, 학교 타운 톡)
            if (typeof updateMapLayers === 'function') updateMapLayers(school);
            // if (typeof drawEstateTrendGraph === 'function') drawEstateTrendGraph(school); // 비동기 로딩 중 임시 차트 렌더링 방지를 위해 주석 처리
            if (typeof window.fetchTownTalkList === 'function') {
                const schoolId = school.school_id;
                window.fetchTownTalkList(schoolId, 'schoolTownTalkList');
                
                const btnSendSchoolTalk = document.getElementById('btnSendSchoolTalk');
                if (btnSendSchoolTalk) {
                    const newBtn = btnSendSchoolTalk.cloneNode(true);
                    btnSendSchoolTalk.parentNode.replaceChild(newBtn, btnSendSchoolTalk);
                    newBtn.addEventListener('click', () => {
                        window.sendTownTalk(schoolId, 'txtSchoolTalkNick', 'txtSchoolTalkContent', 'schoolTownTalkList');
                    });
                }
            }
        }, 50);
        return res;
    };

    // Reset Selected School event handler
    const btnDeselectSchool = document.getElementById('btnDeselectSchool');
    if (btnDeselectSchool) {
        btnDeselectSchool.addEventListener('click', () => {
            orchestrator.state.selectedSchool = null;
            if (typeof highlightSelectedPin === 'function') highlightSelectedPin(null);
            if (typeof clearMapLayers === 'function') clearMapLayers();
            if (schoolCard) schoolCard.style.display = 'none';
            if (childFormCard) childFormCard.style.display = 'none';
            if (diagnosisResultCard) diagnosisResultCard.style.display = 'none';
            if (welcomeCard) welcomeCard.style.display = 'block';
            const serviceInquiryCardEl = document.getElementById('serviceInquiryCard');
            if (serviceInquiryCardEl) serviceInquiryCardEl.style.display = 'block';
            
            // 모바일 환경일 경우, 학교 카드가 닫힐 때 상세페이지(사이드바)도 자동으로 함께 숨김 처리하여 지도로 복귀
            if (window.innerWidth <= 1024) {
                const sidebar = document.querySelector('.sidebar-section');
                if (sidebar) sidebar.style.display = 'none';
                const container = document.querySelector('.app-container');
                if (container) {
                    container.classList.remove('sidebar-open');
                }
            }
            
            // Hide community panel
            const communityPanel = document.getElementById('communityPanel');
            if (communityPanel) communityPanel.style.display = 'none';
            const sidebarContent = document.getElementById('sidebarContent');
            if (sidebarContent) sidebarContent.style.display = 'block';
            
            // Hide academy sidebar if open
            const academySidebar = document.getElementById('academySidebar');
            if (academySidebar && academySidebar.style.display === 'flex') {
                if (typeof window.toggleAcademySidebar === 'function') {
                    window.toggleAcademySidebar();
                }
            }
        });
    }

    // --- 5대 신규 서비스 헬퍼 함수 구현 ---

    // 1. 안심 통학로 및 안전 시설 맵 레이어
    let commutePolylines = [];
    let safetyMarkers = [];
    let schoolZoneCircles = [];
    let safetyGuideMarkers = [];

    window.clearSafetyGuideLayers = function() {
        if (safetyGuideMarkers) {
            safetyGuideMarkers.forEach(m => m.setMap(null));
        }
        safetyGuideMarkers = [];
    }

    function updateDynamicSafetyGuideItems() {
        const cctvCountEl = document.getElementById('commuteCctvCount');
        const cctvItem = document.getElementById('commuteCctvItem');
        if (cctvCountEl && cctvItem) {
            const count = parseInt(cctvCountEl.textContent || '0', 10);
            if (count > 0) {
                cctvItem.style.display = 'block';
            } else {
                cctvItem.style.display = 'none';
            }
        }

        const safeHouseCountEl = document.getElementById('commuteSafeHouseCount');
        const policeCountEl = document.getElementById('commutePoliceCount');
        const guardiansItem = document.getElementById('commuteSafetyGuardiansItem');
        const guardiansText = document.getElementById('commuteSafetyGuardiansText');

        if (guardiansItem && guardiansText) {
            const shCount = safeHouseCountEl ? parseInt(safeHouseCountEl.textContent || '0', 10) : 0;
            const poCount = policeCountEl ? parseInt(policeCountEl.textContent || '0', 10) : 0;

            if (shCount > 0 && poCount > 0) {
                guardiansItem.style.display = 'block';
                guardiansText.innerHTML = `통학로 주변 800m 내에 <strong id="commuteSafeHouseCount" style="color: #1b5e20;">${shCount}</strong>곳의 아동안전지킴이집과 <strong id="commutePoliceCount" style="color: #1b5e20;">${poCount}</strong>곳의 파출소/경찰 시설이 운영 중입니다.`;
            } else if (shCount > 0 && poCount === 0) {
                guardiansItem.style.display = 'block';
                guardiansText.innerHTML = `통학로 주변 800m 내에 <strong id="commuteSafeHouseCount" style="color: #1b5e20;">${shCount}</strong>곳의 아동안전지킴이집이 운영 중입니다.`;
            } else if (shCount === 0 && poCount > 0) {
                guardiansItem.style.display = 'block';
                guardiansText.innerHTML = `통학로 주변 800m 내에 <strong id="commutePoliceCount" style="color: #1b5e20;">${poCount}</strong>곳의 파출소/경찰 시설이 운영 중입니다.`;
            } else {
                guardiansItem.style.display = 'none';
            }
        }

        // visible 항목들에 대한 순서 번호 자동 재배정
        const guideEl = document.getElementById('commutePathSafetyGuide');
        if (guideEl) {
            const items = guideEl.querySelectorAll('.commute-safety-item');
            let currentNum = 1;
            items.forEach(item => {
                if (item.style.display !== 'none') {
                    const numSpan = item.querySelector('.commute-item-num');
                    if (numSpan) {
                        numSpan.textContent = `${currentNum}.`;
                    }
                    currentNum++;
                }
            });
        }
    }

    function clearMapLayers() {
        commutePolylines.forEach(p => p.setMap(null));
        commutePolylines = [];
        safetyMarkers.forEach(m => m.setMap(null));
        safetyMarkers = [];
        schoolZoneCircles.forEach(c => c.setMap(null));
        schoolZoneCircles = [];
        
        // 범례 플로팅 가이드 바 숨김
        const legendBar = document.getElementById('commuteLegendFloatingBar');
        if (legendBar) legendBar.style.display = 'none';

        // 안전 시설 수치 초기화
        const cctvCountEl = document.getElementById('commuteCctvCount');
        if (cctvCountEl) cctvCountEl.textContent = '0';
        const safeHouseCountEl = document.getElementById('commuteSafeHouseCount');
        if (safeHouseCountEl) safeHouseCountEl.textContent = '0';
        const policeCountEl = document.getElementById('commutePoliceCount');
        if (policeCountEl) policeCountEl.textContent = '0';

        updateDynamicSafetyGuideItems();
    }

    function updateMapLayers(school) {
        clearMapLayers();
        if (!school || !window.kakaoMapInstance) return;

        const lat = parseFloat(school.lat);
        const lng = parseFloat(school.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const chkCommute = document.getElementById('chkCommutePath');
        const isCommuteChecked = chkCommute ? chkCommute.checked : false;

        // 안심 도보 경로 및 안전 지킴이 시설 표시
        if (isCommuteChecked) {
            // 범례 플로팅 가이드 바 표시
            const legendBar = document.getElementById('commuteLegendFloatingBar');
            if (legendBar) legendBar.style.display = 'flex';

            // 통학 출발지 결정 (수동으로 지정한 경우 혹은 지도 클릭 중심점 데이터가 있는 경우에만 활성화)
            let startLat, startLng;
            let usingCommuteCenter = false;

            if (window.customCommuteStart) {
                startLat = window.customCommuteStart.getLat();
                startLng = window.customCommuteStart.getLng();
                usingCommuteCenter = true;
            } else {
                // 출발지가 지정되지 않은 경우, 화면을 깔끔하게 유지하기 위해 경로 및 마커를 렌더링하지 않습니다.
                return;
            }

            const startPoint = new kakao.maps.LatLng(startLat, startLng);
            const endPoint = new kakao.maps.LatLng(lat, lng);

            // 출발점 마커 표시 (빨간색 깃발 - 출발)
            const startMarker = new kakao.maps.Marker({
                position: startPoint,
                map: window.kakaoMapInstance,
                title: '통학 출발지 (수동 지정)',
                image: new kakao.maps.MarkerImage(
                    'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/red_b.png',
                    new kakao.maps.Size(30, 30),
                    { offset: new kakao.maps.Point(15, 30) }
                )
            });
            safetyMarkers.push(startMarker);

            // 도착점 마커 표시 (파란색 깃발 - 학교/도착)
            const endMarker = new kakao.maps.Marker({
                position: endPoint,
                map: window.kakaoMapInstance,
                title: school.school_name,
                image: new kakao.maps.MarkerImage(
                    'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/blue_b.png',
                    new kakao.maps.Size(30, 30),
                    { offset: new kakao.maps.Point(15, 30) }
                )
            });
            safetyMarkers.push(endMarker);

            // 어린이보호구역(스쿨존) 300m 법정 반경 가이드 원 그리기 (황색 투명 원)
            const schoolZone = new kakao.maps.Circle({
                center: endPoint,
                radius: 300, // 스쿨존 반경 300m
                strokeWeight: 2,
                strokeColor: '#ffb300',
                strokeOpacity: 0.8,
                strokeStyle: 'solid',
                fillColor: '#ffe082',
                fillOpacity: 0.15
            });
            schoolZone.setMap(window.kakaoMapInstance);
            schoolZoneCircles.push(schoolZone);

            // OSRM Pedestrian Routing API 호출
            const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${startLng},${startLat};${lng},${lat}?overview=full&geometries=geojson`;
            
            fetch(osrmUrl)
                .then(res => res.json())
                .then(data => {
                    let pathCoordinates = [];
                    if (data.code === 'Ok' && data.routes && data.routes[0]) {
                        pathCoordinates = data.routes[0].geometry.coordinates.map(coord => new kakao.maps.LatLng(coord[1], coord[0]));
                    } else {
                        pathCoordinates = [
                            startPoint,
                            new kakao.maps.LatLng(startLat, lng),
                            endPoint
                        ];
                    }
                    drawCommutePath(pathCoordinates);
                    
                    // OSRM 경로 상의 일정 간격 교차점에 방범 CCTV 가상 카메라 배지 설치
                    let cctvCount = 0;
                    if (pathCoordinates.length > 4) {
                        for (let i = 2; i < pathCoordinates.length - 2; i += 4) {
                            const coord = pathCoordinates[i];
                            const content = `
                                <div style="background: white; border: 2px solid #78909c; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.25); font-size: 13px;" title="방범용 CCTV">
                                    🎥
                                </div>
                            `;
                            const cctvOverlay = new kakao.maps.CustomOverlay({
                                position: coord,
                                content: content,
                                yAnchor: 1.2
                            });
                            cctvOverlay.setMap(window.kakaoMapInstance);
                            safetyMarkers.push(cctvOverlay);
                            cctvCount++;
                        }
                    }
                    const cctvCountEl = document.getElementById('commuteCctvCount');
                    if (cctvCountEl) {
                        cctvCountEl.textContent = cctvCount;
                    }

                    updateDynamicSafetyGuideItems();

                    const guideEl = document.getElementById('commutePathSafetyGuide');
                    if (guideEl) guideEl.style.display = 'flex';
                })
                .catch(err => {
                    console.error('[Safe Commute API] OSRM 라우팅 호출 실패, 백업 격자 경로를 그립니다:', err);
                    const pathCoordinates = [
                        startPoint,
                        new kakao.maps.LatLng(startLat, lng),
                        endPoint
                    ];
                    drawCommutePath(pathCoordinates);
                    const cctvCountEl = document.getElementById('commuteCctvCount');
                    if (cctvCountEl) {
                        cctvCountEl.textContent = '0';
                    }
                    updateDynamicSafetyGuideItems();
                });

            // 주변 안전 지킴이 시설(치안센터, 파출소, 아동보호시설 등) 검색 및 지도에 표시
            if (window.kakao && kakao.maps.services) {
                const ps = new kakao.maps.services.Places();
                
                // 1. 지킴이집 검색 및 마커 표시 (아동안전지킴이집, 여성안심지킴이집 등 포함)
                ps.keywordSearch('지킴이집', (result, status) => {
                    if (status === kakao.maps.services.Status.OK) {
                        result.forEach(place => {
                            const placeLatLng = new kakao.maps.LatLng(place.y, place.x);
                            const content = `
                                <div style="background: white; border: 2px solid #2979ff; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.25); font-size: 13px;" title="아동안전지킴이집: ${place.place_name}">
                                    🛡️
                                </div>
                            `;
                            const safeHouseOverlay = new kakao.maps.CustomOverlay({
                                position: placeLatLng,
                                content: content,
                                yAnchor: 1.2
                            });
                            safeHouseOverlay.setMap(window.kakaoMapInstance);
                            safetyMarkers.push(safeHouseOverlay);
                        });
                        const safeHouseCountEl = document.getElementById('commuteSafeHouseCount');
                        if (safeHouseCountEl) {
                            safeHouseCountEl.textContent = result.length;
                        }
                        updateDynamicSafetyGuideItems();
                    } else {
                        const safeHouseCountEl = document.getElementById('commuteSafeHouseCount');
                        if (safeHouseCountEl) {
                            safeHouseCountEl.textContent = '0';
                        }
                        updateDynamicSafetyGuideItems();
                    }
                }, {
                    location: endPoint,
                    radius: 800
                });

                // 2. 경찰/치안 시설(파출소) 검색 및 마커 표시
                ps.keywordSearch('파출소', (result, status) => {
                    if (status === kakao.maps.services.Status.OK) {
                        result.forEach(place => {
                            const placeLatLng = new kakao.maps.LatLng(place.y, place.x);
                            const content = `
                                <div style="background: white; border: 2px solid #d50000; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.25); font-size: 13px;" title="경찰/치안시설: ${place.place_name}">
                                    🚨
                                </div>
                            `;
                            const policeOverlay = new kakao.maps.CustomOverlay({
                                position: placeLatLng,
                                content: content,
                                yAnchor: 1.2
                            });
                            policeOverlay.setMap(window.kakaoMapInstance);
                            safetyMarkers.push(policeOverlay);
                        });
                        const policeCountEl = document.getElementById('commutePoliceCount');
                        if (policeCountEl) {
                            policeCountEl.textContent = result.length;
                        }
                        updateDynamicSafetyGuideItems();
                    } else {
                        const policeCountEl = document.getElementById('commutePoliceCount');
                        if (policeCountEl) {
                            policeCountEl.textContent = '0';
                        }
                        updateDynamicSafetyGuideItems();
                    }
                }, {
                    location: endPoint,
                    radius: 800
                });
            }
        } else {
            const guideEl = document.getElementById('commutePathSafetyGuide');
            if (guideEl) guideEl.style.display = 'none';
            const legendBar = document.getElementById('commuteLegendFloatingBar');
            if (legendBar) legendBar.style.display = 'none';
        }
        updateSafetyGuideLayers(school);
    }

    window.updateSafetyGuideLayers = function(school) {
        if (!window.kakaoMapInstance) return;
        
        const chk = document.getElementById('safetyGuideCheckbox');
        if (!chk || !chk.checked) {
            clearSafetyGuideLayers();
            return;
        }

        // 지도 줌 레벨이 너무 축소된 상태(레벨 7 이상)이면 마커 과도 현상 방지를 위해 그리지 않음
        if (window.kakaoMapInstance.getLevel() >= 7) {
            clearSafetyGuideLayers();
            return;
        }
        
        const tempMarkers = [];
        
        // 1. 현재 지도 영역 내에 로드된 전체 학교(currentLoadedSchools)를 돌며 CCTV 가상 핀을 전체 지도에 흩뿌림
        const schoolsToMark = currentLoadedSchools && currentLoadedSchools.length > 0 
            ? currentLoadedSchools 
            : (school ? [school] : []);
            
        schoolsToMark.forEach(s => {
            const sLat = parseFloat(s.lat);
            const sLng = parseFloat(s.lng);
            if (isNaN(sLat) || isNaN(sLng)) return;
            
            // 학교당 2개씩 가상 CCTV 오프셋 배치
            const offsets = [
                { lat: 0.001, lng: 0.001 },
                { lat: -0.001, lng: -0.001 }
            ];
            
            offsets.forEach(offset => {
                const cLatLng = new kakao.maps.LatLng(sLat + offset.lat, sLng + offset.lng);
                const content = `
                    <div style="background: white; border: 2px solid #78909c; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.25); font-size: 13px;" title="방범용 CCTV">
                        🎥
                    </div>
                `;
                const cctvOverlay = new kakao.maps.CustomOverlay({
                    position: cLatLng,
                    content: content,
                    yAnchor: 1.2
                });
                cctvOverlay.setMap(window.kakaoMapInstance);
                tempMarkers.push(cctvOverlay);
            });
        });
        
        // 2. 현재 지도 중심을 기준으로 반경 2000m 이내의 지킴이집 및 파출소를 카카오맵 로컬 검색하여 노출
        const center = window.kakaoMapInstance.getCenter();
        const centerLatLng = new kakao.maps.LatLng(center.getLat(), center.getLng());
        
        if (window.kakao && kakao.maps.services) {
            const ps = new kakao.maps.services.Places();
            let completedCount = 0;
            
            const checkAndReplace = () => {
                completedCount++;
                if (completedCount === 2) {
                    // 비동기 작업이 모두 완료되면 기존 마커를 떼어내고 교체
                    safetyGuideMarkers.forEach(m => m.setMap(null));
                    safetyGuideMarkers = tempMarkers;
                }
            };
            
            // 지킴이집 2000m 검색 (아동안전지킴이집, 여성안심지킴이집 등 포함)
            ps.keywordSearch('지킴이집', (result, status) => {
                if (status === kakao.maps.services.Status.OK) {
                    result.forEach(place => {
                        const placeLatLng = new kakao.maps.LatLng(place.y, place.x);
                        // 위치 중복 생성 체크
                        const isDup = tempMarkers.some(m => {
                            if (typeof m.getPosition !== 'function') return false;
                            const pos = m.getPosition();
                            return Math.abs(pos.getLat() - placeLatLng.getLat()) < 0.0001 && Math.abs(pos.getLng() - placeLatLng.getLng()) < 0.0001;
                        });
                        if (isDup) return;
                        
                        const content = `
                            <div style="background: white; border: 2px solid #2979ff; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.25); font-size: 13px;" title="아동안전지킴이집: ${place.place_name}">
                                🛡️
                            </div>
                        `;
                        const safeHouseOverlay = new kakao.maps.CustomOverlay({
                            position: placeLatLng,
                            content: content,
                            yAnchor: 1.2
                        });
                        safeHouseOverlay.setMap(window.kakaoMapInstance);
                        tempMarkers.push(safeHouseOverlay);
                    });
                }
                checkAndReplace();
            }, {
                location: centerLatLng,
                radius: 2000
            });
            
            // 파출소 2000m 검색
            ps.keywordSearch('파출소', (result, status) => {
                if (status === kakao.maps.services.Status.OK) {
                    result.forEach(place => {
                        const placeLatLng = new kakao.maps.LatLng(place.y, place.x);
                        // 위치 중복 생성 체크
                        const isDup = tempMarkers.some(m => {
                            if (typeof m.getPosition !== 'function') return false;
                            const pos = m.getPosition();
                            return Math.abs(pos.getLat() - placeLatLng.getLat()) < 0.0001 && Math.abs(pos.getLng() - placeLatLng.getLng()) < 0.0001;
                        });
                        if (isDup) return;

                        const content = `
                            <div style="background: white; border: 2px solid #d50000; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.25); font-size: 13px;" title="경찰/치안시설: ${place.place_name}">
                                🚨
                            </div>
                        `;
                        const policeOverlay = new kakao.maps.CustomOverlay({
                            position: placeLatLng,
                            content: content,
                            yAnchor: 1.2
                        });
                        policeOverlay.setMap(window.kakaoMapInstance);
                        tempMarkers.push(policeOverlay);
                    });
                }
                checkAndReplace();
            }, {
                location: centerLatLng,
                radius: 2000
            });
        } else {
            safetyGuideMarkers.forEach(m => m.setMap(null));
            safetyGuideMarkers = tempMarkers;
        }
    }

    // 카카오맵 SDK에 존재하지 않는 GroundOverlay 클래스를 AbstractOverlay를 상속받아 정의 (Lazy Polyfill)
    function initGroundOverlayPolyfill() {
        if (window.kakao && window.kakao.maps && !kakao.maps.GroundOverlay) {
            kakao.maps.GroundOverlay = function(imageUrl, bounds) {
                this.imageUrl = imageUrl;
                this.bounds = bounds;
                this.node = null;
            };

            // AbstractOverlay 상속 설정
            kakao.maps.GroundOverlay.prototype = new kakao.maps.AbstractOverlay();

            // 오버레이가 지도에 추가될 때 호출
            kakao.maps.GroundOverlay.prototype.onAdd = function() {
                var node = document.createElement('div');
                node.style.position = 'absolute';
                node.style.background = 'url("' + this.imageUrl + '") no-repeat';
                node.style.backgroundSize = '100% 100%';
                node.style.pointerEvents = 'none'; // 클릭 통과 설정
                this.node = node;

                var panels = this.getPanels();
                panels.overlayLayer.appendChild(node);
            };

            // 지도의 줌, 드래그 등에 반응하여 위치 및 크기 재조정
            kakao.maps.GroundOverlay.prototype.draw = function() {
                if (!this.node) return;

                var projection = this.getProjection();
                
                // 위경도 영역의 좌하단과 우상단을 픽셀 좌표로 변환
                var swPoint = projection.pointFromCoords(this.bounds.getSouthWest());
                var nePoint = projection.pointFromCoords(this.bounds.getNorthEast());

                var width = nePoint.x - swPoint.x;
                var height = swPoint.y - nePoint.y;

                this.node.style.left = swPoint.x + 'px';
                this.node.style.top = nePoint.y + 'px';
                this.node.style.width = width + 'px';
                this.node.style.height = height + 'px';
            };

            // 오버레이가 지도에서 제거될 때 호출
            kakao.maps.GroundOverlay.prototype.onRemove = function() {
                if (this.node && this.node.parentNode) {
                    this.node.parentNode.removeChild(this.node);
                }
                this.node = null;
            };
            console.log('[GroundOverlay Polyfill] Initialized successfully.');
        }
    }

    let crimeZoneOverlay = null;

    window.clearCrimeZoneLayers = function() {
        if (crimeZoneOverlay) {
            crimeZoneOverlay.setMap(null);
            crimeZoneOverlay = null;
        }
        const legendBar = document.getElementById('crimeZoneLegendFloatingBar');
        if (legendBar) legendBar.style.display = 'none';
        
        // 범죄주의구간 가이드가 숨겨졌으므로, 기본 학업성취도 범례(mapLegend)를 다시 노출
        const mapLegend = document.getElementById('mapLegend');
        if (mapLegend) mapLegend.style.display = 'flex';
    };

    let crimeZoneTimeout = null;

    window.updateCrimeZoneLayers = function(school) {
        initGroundOverlayPolyfill(); // 지도가 다 로드된 시점에 안전하게 폴리필 적용
        
        const chk = document.getElementById('crimeZoneToggleCheckbox');
        if (!chk || !chk.checked) {
            clearCrimeZoneLayers();
            if (crimeZoneTimeout) {
                clearTimeout(crimeZoneTimeout);
                crimeZoneTimeout = null;
            }
            return;
        }

        if (crimeZoneTimeout) clearTimeout(crimeZoneTimeout);
        crimeZoneTimeout = setTimeout(() => {
            clearCrimeZoneLayers();
            if (!window.kakaoMapInstance) return;

            // 범례 플로팅 가이드 바 노출
            const legendBar = document.getElementById('crimeZoneLegendFloatingBar');
            if (legendBar) legendBar.style.display = 'flex';
            
            // 범죄주의구간 가이드가 보이므로, 기본 학업성취도 범례(mapLegend)는 숨김
            const mapLegend = document.getElementById('mapLegend');
            if (mapLegend) mapLegend.style.display = 'none';

            if (window.kakaoMapInstance.getLevel() >= 7) {
                return;
            }

            // 현재 카카오맵의 영역(bounds) 획득
            const bounds = window.kakaoMapInstance.getBounds();
            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();

            // BBox 정밀도제한 (Snap to Grid) - 소수점 4자리로 제한하여 미세 이동 시 캐시 재사용
            const swLng = sw.getLng().toFixed(4);
            const swLat = sw.getLat().toFixed(4);
            const neLng = ne.getLng().toFixed(4);
            const neLat = ne.getLat().toFixed(4);
            const bbox = `${swLng},${swLat},${neLng},${neLat}`;

            // 카카오맵 컨테이너의 가로/세로 픽셀 사이즈 획득 (WMS 아이콘 크기 왜곡 방지를 위해 100% 비율 복구)
            const mapNode = window.kakaoMapInstance.getNode();
            const width = mapNode.offsetWidth || 500;
            const height = mapNode.offsetHeight || 500;

            // 백엔드 프록시 API 호출 URL (Vercel IP 차단 우회를 위해 프론트에서 직접 호출)
            const serviceKey = window.GLOBAL_SAFEMAP_KEY || '8N7ELUCO-8N7E-8N7E-8N7E-8N7ELUCOQY';
            const imageUrl = `https://safemap.go.kr/openapi2/IF_0087_WMS?serviceKey=${encodeURIComponent(serviceKey)}&srs=EPSG:4326&bbox=${bbox}&format=image/png&width=${width}&height=${height}&transparent=TRUE`;

            // 카카오맵 GroundOverlay 생성 및 지도 표시
            crimeZoneOverlay = new kakao.maps.GroundOverlay(imageUrl, bounds);
            crimeZoneOverlay.setMap(window.kakaoMapInstance);
        }, 300);
    };

    let accidentStatisticsOverlay = null;

    window.clearAccidentStatisticsLayers = function() {
        if (accidentStatisticsOverlay) {
            accidentStatisticsOverlay.setMap(null);
            accidentStatisticsOverlay = null;
        }
    };

    let accidentStatisticsTimeout = null;

    window.updateAccidentStatisticsLayers = function(school) {
        initGroundOverlayPolyfill();
        
        const chk = document.getElementById('accidentStatisticsCheckbox');
        if (!chk || !chk.checked) {
            clearAccidentStatisticsLayers();
            if (accidentStatisticsTimeout) {
                clearTimeout(accidentStatisticsTimeout);
                accidentStatisticsTimeout = null;
            }
            return;
        }

        if (accidentStatisticsTimeout) clearTimeout(accidentStatisticsTimeout);
        accidentStatisticsTimeout = setTimeout(() => {
            clearAccidentStatisticsLayers();
            if (!window.kakaoMapInstance) return;

            if (window.kakaoMapInstance.getLevel() >= 7) {
                return;
            }

            const bounds = window.kakaoMapInstance.getBounds();
            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();
            
            // BBox 정밀도제한 (Snap to Grid) - 소수점 4자리로 제한하여 미세 이동 시 캐시 재사용
            const swLng = sw.getLng().toFixed(4);
            const swLat = sw.getLat().toFixed(4);
            const neLng = ne.getLng().toFixed(4);
            const neLat = ne.getLat().toFixed(4);
            const bbox = `${swLng},${swLat},${neLng},${neLat}`;

            const mapNode = window.kakaoMapInstance.getNode();
            const width = mapNode.offsetWidth || 500;
            const height = mapNode.offsetHeight || 500;

            const serviceKey = window.GLOBAL_SAFEMAP_KEY || '8N7ELUCO-8N7E-8N7E-8N7E-8N7ELUCOQY';
            const imageUrl = `https://safemap.go.kr/openapi2/IF_0075_WMS?serviceKey=${encodeURIComponent(serviceKey)}&srs=EPSG:4326&bbox=${bbox}&format=image/png&width=${width}&height=${height}&transparent=TRUE`;

            accidentStatisticsOverlay = new kakao.maps.GroundOverlay(imageUrl, bounds);
            accidentStatisticsOverlay.setMap(window.kakaoMapInstance);
        }, 300);
    };

    let trafficAccidentOverlay = null;

    window.clearTrafficAccidentLayers = function() {
        if (trafficAccidentOverlay) {
            trafficAccidentOverlay.setMap(null);
            trafficAccidentOverlay = null;
        }
    };

    let trafficAccidentTimeout = null;

    window.updateTrafficAccidentLayers = function(school) {
        initGroundOverlayPolyfill();
        
        const chk = document.getElementById('trafficAccidentCheckbox');
        if (!chk || !chk.checked) {
            clearTrafficAccidentLayers();
            if (trafficAccidentTimeout) {
                clearTimeout(trafficAccidentTimeout);
                trafficAccidentTimeout = null;
            }
            return;
        }

        if (trafficAccidentTimeout) clearTimeout(trafficAccidentTimeout);
        trafficAccidentTimeout = setTimeout(() => {
            clearTrafficAccidentLayers();
            if (!window.kakaoMapInstance) return;

            if (window.kakaoMapInstance.getLevel() >= 7) {
                return;
            }

            const bounds = window.kakaoMapInstance.getBounds();
            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();
            
            // BBox 정밀도제한 (Snap to Grid) - 소수점 4자리로 제한하여 미세 이동 시 캐시 재사용
            const swLng = sw.getLng().toFixed(4);
            const swLat = sw.getLat().toFixed(4);
            const neLng = ne.getLng().toFixed(4);
            const neLat = ne.getLat().toFixed(4);
            const bbox = `${swLng},${swLat},${neLng},${neLat}`;

            const mapNode = window.kakaoMapInstance.getNode();
            const width = mapNode.offsetWidth || 500;
            const height = mapNode.offsetHeight || 500;

            const serviceKey = window.GLOBAL_SAFEMAP_KEY || '8N7ELUCO-8N7E-8N7E-8N7E-8N7ELUCOQY';
            const imageUrl = `https://safemap.go.kr/openapi2/IF_0093_WMS?serviceKey=${encodeURIComponent(serviceKey)}&srs=EPSG:4326&bbox=${bbox}&format=image/png&width=${width}&height=${height}&transparent=TRUE`;

            trafficAccidentOverlay = new kakao.maps.GroundOverlay(imageUrl, bounds);
            trafficAccidentOverlay.setMap(window.kakaoMapInstance);
        }, 300);
    };





    function drawCommutePath(path) {
        // 기존 통학로 라인 제거
        commutePolylines.forEach(p => p.setMap(null));
        commutePolylines = [];

        const polyline = new kakao.maps.Polyline({
            path: path,
            strokeWeight: 6,
            strokeColor: '#2979ff', // 안심도보 블루
            strokeOpacity: 0.85,
            strokeStyle: 'solid'
        });
        polyline.setMap(window.kakaoMapInstance);
        commutePolylines.push(polyline);
    }

    window.updateMapLayers = updateMapLayers;

    function resetSafeCommute() {
        const cPath = document.getElementById('chkCommutePath');
        const cPathAca = document.getElementById('chkCommutePathAcademy');
        if (cPath) cPath.checked = false;
        if (cPathAca) cPathAca.checked = false;

        const panel = document.getElementById('commutePathSettings');
        const panelAca = document.getElementById('commutePathSettingsAcademy');
        if (panel) panel.style.display = 'none';
        if (panelAca) panelAca.style.display = 'none';

        window.customCommuteStart = null;
        window.customCommuteEnd = null;
        window.mapClickMode = 'none';
        
        const guideEl = document.getElementById('commutePathSafetyGuide');
        if (guideEl) guideEl.style.display = 'none';
        
        clearMapLayers();
        if (typeof window.updatePointSelectorButtons === 'function') {
            window.updatePointSelectorButtons();
        }
    }
    window.resetSafeCommute = resetSafeCommute;

    window.showMobileMapSelectGuide = function(msg) {
        let guide = document.getElementById('mobileMapSelectGuide');
        if (!guide) {
            guide = document.createElement('div');
            guide.id = 'mobileMapSelectGuide';
            guide.style.cssText = 'position: fixed; top: 75px; left: 50%; transform: translateX(-50%); z-index: 12000; background: rgba(30, 58, 138, 0.95); color: white; padding: 10px 18px; border-radius: 20px; font-size: 13px; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 8px; cursor: pointer; white-space: nowrap; backdrop-filter: blur(4px); transition: all 0.3s;';
            document.body.appendChild(guide);
            guide.addEventListener('click', () => {
                window.mapClickMode = 'none';
                if (typeof window.updatePointSelectorButtons === 'function') window.updatePointSelectorButtons();
                const container = document.querySelector('.app-container');
                if (container) container.classList.add('sidebar-open');
                window.hideMobileMapSelectGuide();
            });
        }
        guide.innerHTML = `<span>${msg}</span><span style="font-size: 11px; opacity: 0.8; margin-left: 6px;">(취소 ✕)</span>`;
        guide.style.display = 'flex';

        const mapCanvas = document.getElementById('mapCanvas');
        if (mapCanvas) mapCanvas.style.cursor = 'crosshair';
    };

    window.hideMobileMapSelectGuide = function() {
        const guide = document.getElementById('mobileMapSelectGuide');
        if (guide) guide.style.display = 'none';
        const mapCanvas = document.getElementById('mapCanvas');
        if (mapCanvas) mapCanvas.style.cursor = '';
    };

    window.showMobileCommuteResultGuide = function() {
        let guide = document.getElementById('mobileMapSelectGuide');
        if (!guide) {
            guide = document.createElement('div');
            guide.id = 'mobileMapSelectGuide';
            guide.style.cssText = 'position: fixed; top: 75px; left: 50%; transform: translateX(-50%); z-index: 12000; background: rgba(30, 58, 138, 0.95); color: white; padding: 10px 18px; border-radius: 20px; font-size: 13px; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 8px; cursor: pointer; white-space: nowrap; backdrop-filter: blur(4px); transition: all 0.3s;';
            document.body.appendChild(guide);
        }
        guide.innerHTML = `<span>🛡️ 통학로 경로 생성 완료!</span><span style="background: rgba(255,255,255,0.2); padding: 3px 8px; border-radius: 12px; font-size: 11px; margin-left: 4px;">상세 분석보기 📋</span>`;
        guide.style.display = 'flex';

        const clickHandler = function() {
            const container = document.querySelector('.app-container');
            if (container) container.classList.add('sidebar-open');
            window.hideMobileMapSelectGuide();
        };
        guide.onclick = clickHandler;
    };

    window.updatePointSelectorButtons = function() {
        const startBtns = document.querySelectorAll('.btn-set-start');

        startBtns.forEach(btn => {
            if (window.mapClickMode === 'setStart') {
                btn.style.background = 'var(--light-blue)';
                btn.style.borderColor = 'var(--primary-blue)';
                btn.style.color = 'var(--primary-blue)';
                btn.innerText = '🏠 지도 클릭대기..';
            } else {
                btn.style.background = 'white';
                btn.style.borderColor = 'var(--border-color)';
                btn.style.color = 'var(--text-main)';
                btn.innerText = '🏠 출발지 지정';
            }
        });
    };

    function syncCheckboxesAndTrigger(type, checked) {
        const cPath = document.getElementById('chkCommutePath');
        const cPathAca = document.getElementById('chkCommutePathAcademy');
        const panel = document.getElementById('commutePathSettings');
        const panelAca = document.getElementById('commutePathSettingsAcademy');
        const guideEl = document.getElementById('commutePathSafetyGuide');

        if (type === 'commute') {
            if (cPath) cPath.checked = checked;
            if (cPathAca) cPathAca.checked = checked;
            if (panel) panel.style.display = checked ? 'flex' : 'none';
            if (panelAca) panelAca.style.display = checked ? 'flex' : 'none';
            if (guideEl && !checked) {
                guideEl.style.display = 'none';
            }
        }

        if (orchestrator.state.selectedSchool) {
            window.updateMapLayers(orchestrator.state.selectedSchool);
        }
    }

    // 글로벌 이벤트 위임을 통한 체크박스 리스너 등록 (동적 DOM 안전성 확보)
    document.addEventListener('change', (e) => {
        const id = e.target.id;
        if (id === 'chkCommutePath' || id === 'chkCommutePathAcademy') {
            syncCheckboxesAndTrigger('commute', e.target.checked);
        } else if (id === 'safetyGuideCheckbox') {
            if (orchestrator.state.selectedSchool) {
                updateSafetyGuideLayers(orchestrator.state.selectedSchool);
            } else {
                updateSafetyGuideLayers(null);
            }
        } else if (id === 'crimeZoneToggleCheckbox') {
            if (orchestrator.state.selectedSchool) {
                updateCrimeZoneLayers(orchestrator.state.selectedSchool);
            } else {
                updateCrimeZoneLayers(null);
            }
        } else if (id === 'accidentStatisticsCheckbox') {
            if (orchestrator.state.selectedSchool) {
                updateAccidentStatisticsLayers(orchestrator.state.selectedSchool);
            } else {
                updateAccidentStatisticsLayers(null);
            }
        } else if (id === 'trafficAccidentCheckbox') {
            if (orchestrator.state.selectedSchool) {
                updateTrafficAccidentLayers(orchestrator.state.selectedSchool);
            } else {
                updateTrafficAccidentLayers(null);
            }
        }
    });

    let lastCommuteToggleTime = 0;
    window.toggleSetStartPoint = function() {
        const now = Date.now();
        if (now - lastCommuteToggleTime < 250) return; // Prevent double invocation from inline onclick + event listener
        lastCommuteToggleTime = now;

        window.mapClickMode = window.mapClickMode === 'setStart' ? 'none' : 'setStart';

        const chkCommute = document.getElementById('chkCommutePath');
        const chkCommuteAca = document.getElementById('chkCommutePathAcademy');
        const panelSettings = document.getElementById('commutePathSettings');

        if (window.mapClickMode === 'setStart') {
            if (chkCommute) chkCommute.checked = true;
            if (chkCommuteAca) chkCommuteAca.checked = true;
            if (panelSettings) panelSettings.style.display = 'flex';
            mapObj.setCenter(coords);
            mapObj.setLevel(3); // 적절한 줌 레벨로 이동
            
            // PC 화면(데스크톱) 환경에서 우측 주변학원 사이드바 가림 현상 방지를 위해 지도 중심을 좌측 가시 영역 중앙으로 오프셋(panBy) 이동
            if (window.innerWidth > 1024) {
                let rightBlocked = 0;
                const mainSidebar = document.querySelector('.sidebar-section');
                const academySidebar = document.getElementById('academySidebar');
                if (mainSidebar && mainSidebar.offsetWidth > 0 && window.getComputedStyle(mainSidebar).display !== 'none') {
                    rightBlocked += mainSidebar.offsetWidth;
                }
                if (academySidebar && academySidebar.offsetWidth > 0 && window.getComputedStyle(academySidebar).display !== 'none') {
                    rightBlocked += academySidebar.offsetWidth;
                }
                if (rightBlocked <= 0) rightBlocked = 500;
                const panDx = Math.round(rightBlocked / 2);
                if (panDx > 0 && typeof mapObj.panBy === 'function') {
                    mapObj.panBy(panDx, 0);
                }
            }
        }

        if (typeof window.updatePointSelectorButtons === 'function') {
            window.updatePointSelectorButtons();
        }

        const container = document.querySelector('.app-container');
        if (window.mapClickMode === 'setStart') {
            if (window.innerWidth <= 1024 && container) {
                container.classList.remove('sidebar-open');
            }
            if (typeof window.showMobileMapSelectGuide === 'function') {
                window.showMobileMapSelectGuide('📍 지도에서 출발지로 지정할 위치를 클릭(터치)해주세요');
            }
        } else {
            if (container) container.classList.add('sidebar-open');
            if (typeof window.hideMobileMapSelectGuide === 'function') {
                window.hideMobileMapSelectGuide();
            }
        }
    };

    window.resetCommutePoints = function() {
        window.customCommuteStart = null;
        window.customCommuteEnd = null;
        window.mapClickMode = 'none';
        if (orchestrator.state.selectedSchool) {
            window.updateMapLayers(orchestrator.state.selectedSchool);
        }
        if (typeof window.updatePointSelectorButtons === 'function') {
            window.updatePointSelectorButtons();
        }
        if (window.innerWidth <= 1024 && typeof window.hideMobileMapSelectGuide === 'function') {
            window.hideMobileMapSelectGuide();
        }
    };

    window.selectCommuteStartFromComplex = function(lat, lng, name) {
        let targetLat = parseFloat(lat);
        let targetLng = parseFloat(lng);

        if (!targetLat || !targetLng || isNaN(targetLat) || isNaN(targetLng) || targetLat === 0) {
            if (orchestrator.state.selectedSchool && orchestrator.state.selectedSchool.lat) {
                targetLat = parseFloat(orchestrator.state.selectedSchool.lat) + 0.0025;
                targetLng = parseFloat(orchestrator.state.selectedSchool.lng) + 0.0025;
            } else {
                targetLat = 37.495;
                targetLng = 127.028;
            }
        }

        if (!window.kakao || !window.kakao.maps) return;

        // 1. 통학 출발지 세팅
        const startPoint = new kakao.maps.LatLng(targetLat, targetLng);
        window.customCommuteStart = startPoint;
        window.mapClickMode = 'setStart';

        // 2. 안심 통학로 활성화 및 설정 패널 열기
        const chkCommute = document.getElementById('chkCommutePath');
        const chkCommuteAca = document.getElementById('chkCommutePathAcademy');
        const panelSettings = document.getElementById('commutePathSettings');
        const panelSettingsAca = document.getElementById('commutePathSettingsAcademy');

        if (chkCommute) chkCommute.checked = true;
        if (chkCommuteAca) chkCommuteAca.checked = true;
        if (panelSettings) panelSettings.style.display = 'flex';
        if (panelSettingsAca) panelSettingsAca.style.display = 'flex';

        // 3. 버튼 상태 갱신
        if (typeof window.updatePointSelectorButtons === 'function') {
            window.updatePointSelectorButtons();
        }

        // 4. 지도 맵 레이어 (경로/마커/치안안전 분석) 갱신
        if (orchestrator.state.selectedSchool) {
            window.updateMapLayers(orchestrator.state.selectedSchool);
        }

        // 5. 출발지-학교 경로가 한눈에 보이도록 영역 확정
        if (window.kakaoMapInstance && orchestrator.state.selectedSchool && orchestrator.state.selectedSchool.lat) {
            const endPoint = new kakao.maps.LatLng(
                parseFloat(orchestrator.state.selectedSchool.lat),
                parseFloat(orchestrator.state.selectedSchool.lng)
            );
            const bounds = new kakao.maps.LatLngBounds();
            bounds.extend(startPoint);
            bounds.extend(endPoint);
            window.kakaoMapInstance.setBounds(bounds);
        }

        // 6. 모바일 화면일 경우 지도를 바로 확인할 수 있도록 사이드바 닫음
        const container = document.querySelector('.app-container');
        if (window.innerWidth <= 1024 && container) {
            container.classList.remove('sidebar-open');
        }

        // 7. 상단 플로팅 가이드 알림 노출
        if (typeof window.showMobileMapSelectGuide === 'function') {
            window.showMobileMapSelectGuide(`📍 [${name || '단지'}] 출발지 지정 완료 (안심 통학로 도보 경로 계산됨)`);
            setTimeout(() => {
                if (typeof window.hideMobileMapSelectGuide === 'function') {
                    window.hideMobileMapSelectGuide();
                }
            }, 3500);
        }
    };

    // 글로벌 클릭 이벤트 (특수 영역 클릭 처리)
    document.addEventListener('click', (e) => {
        if (e.target.id === 'tabAcademyReviews') {
            const tabRev = document.getElementById('tabAcademyReviews');
            const tabCalc = document.getElementById('tabAcademyCalculator');
            const secRev = document.getElementById('sectionAcademyReviews');
            const secCalc = document.getElementById('sectionAcademyCalculator');
            if (tabRev && tabCalc && secRev && secCalc) {
                tabRev.style.background = '#ffffff';
                tabRev.style.color = 'var(--primary-blue)';
                tabRev.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
                tabCalc.style.background = 'transparent';
                tabCalc.style.color = 'var(--text-muted)';
                tabCalc.style.boxShadow = 'none';
                secRev.style.display = 'block';
                secCalc.style.display = 'none';
            }
        } else if (e.target.id === 'tabAcademyCalculator') {
            const tabRev = document.getElementById('tabAcademyReviews');
            const tabCalc = document.getElementById('tabAcademyCalculator');
            const secRev = document.getElementById('sectionAcademyReviews');
            const secCalc = document.getElementById('sectionAcademyCalculator');
            if (tabRev && tabCalc && secRev && secCalc) {
                tabRev.style.background = 'transparent';
                tabRev.style.color = 'var(--text-muted)';
                tabRev.style.boxShadow = 'none';
                tabCalc.style.background = '#ffffff';
                tabCalc.style.color = 'var(--primary-blue)';
                tabCalc.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
                secRev.style.display = 'none';
                secCalc.style.display = 'block';
            }
        }
    });

    // 2. 부동산 가격 추이 그래프 및 관심단지 알림
    window.showCustomAlert = function(title, message) {
        const modalId = 'customNotificationModal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.4); z-index: 100000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px);';
            modal.innerHTML = `
                <div style="background: white; border-radius: 12px; width: 340px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); text-align: center; font-family: var(--font-primary);">
                    <div style="font-size: 32px; margin-bottom: 12px;">🔔</div>
                    <h3 id="customAlertTitle" style="font-size: 16px; font-weight: bold; color: var(--deep-blue); margin: 0 0 8px 0;"></h3>
                    <p id="customAlertMsg" style="font-size: 13px; color: var(--text-muted); margin: 0 0 18px 0; line-height: 1.4;"></p>
                    <button id="btnCustomAlertConfirm" style="width: 100%; padding: 10px; background: var(--primary-blue); color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">확인</button>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('#btnCustomAlertConfirm').addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        modal.querySelector('#customAlertTitle').innerText = title;
        modal.querySelector('#customAlertMsg').innerText = message;
        modal.style.display = 'flex';
    }

    window.drawEstateTrendGraph = function(school, realBasePrice = null) {
        const svg = document.getElementById('estateTrendGraph');
        if (!svg) return;
        
        // 방어 로직: 비동기 API가 먼저 완료되어 이미 실제 데이터로 그려진 경우, 이후 실행된 setTimeout 등에 의한 임시 차트 렌더링 무시
        if (realBasePrice === null && svg.dataset.realSchoolId === String(school.school_id)) {
            return;
        }
        if (realBasePrice !== null) {
            svg.dataset.realSchoolId = String(school.school_id);
        } else if (svg.dataset.currentSchoolId !== String(school.school_id)) {
            svg.dataset.realSchoolId = "";
        }
        svg.dataset.currentSchoolId = String(school.school_id);
        
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }

        const sid = String(school.school_id || 'dummy');
        const seed = sid ? sid.charCodeAt(sid.length - 1) : 5;
        const basePrice = realBasePrice !== null ? realBasePrice : 26.8;
        const data = [
            basePrice - 1.2 - (seed % 2) * 0.2,
            basePrice - 0.1 - (seed % 3) * 0.1,
            basePrice
        ];

        // 3개년 변동 추이 요약 텍스트 업데이트 (e.g. ▲ 1.2억 (+4.7%))
        const diffEok = (data[2] - data[0]).toFixed(1);
        const diffPercent = (((data[2] - data[0]) / data[0]) * 100).toFixed(1);
        const trendDiffElem = document.getElementById('realEstateTrendDiff');
        if (trendDiffElem) {
            const isPositive = data[2] >= data[0];
            const arrow = isPositive ? '▲' : '▼';
            const color = isPositive ? '#059669' : '#dc2626';
            trendDiffElem.style.color = color;
            trendDiffElem.innerText = `${arrow} ${Math.abs(diffEok)}억 (${isPositive ? '+' : ''}${diffPercent}%)`;
        }

        const width = svg.clientWidth || 300;
        const height = 115;
        const paddingLeft = 35;
        const paddingRight = 35;
        const paddingTop = 36;
        const paddingBottom = 22;

        const minVal = Math.min(...data) - 0.6;
        const maxVal = Math.max(...data) + 0.6;

        const points = data.map((val, idx) => {
            const x = paddingLeft + (idx / 2) * (width - paddingLeft - paddingRight);
            const y = paddingTop + ((maxVal - val) / (maxVal - minVal)) * (height - paddingTop - paddingBottom);
            return { x, y, val };
        });

        // 1. Defs Gradient Definition (Glow area under line)
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const linearGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        linearGrad.setAttribute('id', 'estateTrendGradient');
        linearGrad.setAttribute('x1', '0');
        linearGrad.setAttribute('y1', '0');
        linearGrad.setAttribute('x2', '0');
        linearGrad.setAttribute('y2', '1');

        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#10b981');
        stop1.setAttribute('stop-opacity', '0.25');

        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', '#10b981');
        stop2.setAttribute('stop-opacity', '0.01');

        linearGrad.appendChild(stop1);
        linearGrad.appendChild(stop2);
        defs.appendChild(linearGrad);
        svg.appendChild(defs);

        // 2. Dashed Horizontal Grid Lines
        const gridY1 = paddingTop + 10;
        const gridY2 = height - paddingBottom - 12;
        [gridY1, gridY2].forEach(gy => {
            const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            gridLine.setAttribute('x1', paddingLeft - 15);
            gridLine.setAttribute('y1', gy);
            gridLine.setAttribute('x2', width - paddingRight + 15);
            gridLine.setAttribute('y2', gy);
            gridLine.setAttribute('stroke', '#e2e8f0');
            gridLine.setAttribute('stroke-dasharray', '3 3');
            gridLine.setAttribute('stroke-width', '1');
            svg.appendChild(gridLine);
        });

        // 3. Area Fill Path
        const bottomY = height - paddingBottom;
        let areaD = `M ${points[0].x} ${bottomY} L ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            areaD += ` L ${points[i].x} ${points[i].y}`;
        }
        areaD += ` L ${points[points.length - 1].x} ${bottomY} Z`;

        const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        areaPath.setAttribute('d', areaD);
        areaPath.setAttribute('fill', 'url(#estateTrendGradient)');
        svg.appendChild(areaPath);

        // 4. Main Line Path
        let pathD = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            pathD += ` L ${points[i].x} ${points[i].y}`;
        }
        const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        linePath.setAttribute('d', pathD);
        linePath.setAttribute('fill', 'none');
        linePath.setAttribute('stroke', '#10b981');
        linePath.setAttribute('stroke-width', '3.5');
        linePath.setAttribute('stroke-linecap', 'round');
        linePath.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(linePath);

        // 5. Points, Badges, & Year Labels
        const years = ['3년 전', '1년 전', '현재'];
        points.forEach((pt, idx) => {
            // White circle with green border
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pt.x);
            circle.setAttribute('cy', pt.y);
            circle.setAttribute('r', '5');
            circle.setAttribute('fill', '#ffffff');
            circle.setAttribute('stroke', '#10b981');
            circle.setAttribute('stroke-width', '2.5');
            svg.appendChild(circle);

            // Badge Box Above Circle
            const valStr = `${pt.val.toFixed(1)}억`;
            const badgeBgColor = idx === 2 ? '#16a34a' : '#1e293b';
            const badgeW = 46;
            const badgeH = 20;
            const badgeX = pt.x - badgeW / 2;
            const badgeY = pt.y - 26;

            const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            badgeRect.setAttribute('x', badgeX);
            badgeRect.setAttribute('y', badgeY);
            badgeRect.setAttribute('width', badgeW);
            badgeRect.setAttribute('height', badgeH);
            badgeRect.setAttribute('rx', '6');
            badgeRect.setAttribute('fill', badgeBgColor);
            svg.appendChild(badgeRect);

            const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            badgeText.setAttribute('x', pt.x);
            badgeText.setAttribute('y', badgeY + 14);
            badgeText.setAttribute('text-anchor', 'middle');
            badgeText.setAttribute('font-size', '10.5px');
            badgeText.setAttribute('fill', '#ffffff');
            badgeText.setAttribute('font-weight', '800');
            badgeText.textContent = valStr;
            svg.appendChild(badgeText);

            // Year Label Below
            const yearText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            yearText.setAttribute('x', pt.x);
            yearText.setAttribute('y', height - 3);
            yearText.setAttribute('text-anchor', 'middle');
            yearText.setAttribute('font-size', '11px');
            yearText.setAttribute('fill', idx === 2 ? '#0f172a' : '#94a3b8');
            yearText.setAttribute('font-weight', idx === 2 ? '800' : '600');
            yearText.textContent = years[idx];
            svg.appendChild(yearText);
        });
    }

    const btnRegisterEstateAlarm = document.getElementById('btnRegisterEstateAlarm');
    if (btnRegisterEstateAlarm) {
        btnRegisterEstateAlarm.addEventListener('click', () => {
            const school = orchestrator.state.selectedSchool;
            if (!school) return;
            showCustomAlert("알림 설정 완료", `해당 학군지(${school.school_name} 주변)의 실거래가 변동 또는 매물 등록 시 알림이 설정되었습니다.`);
        });
    }

    // 3. 학원비 비교 및 할인 계산기 위젯
    window.renderAcademyFeeCalculator = async function(acadName, subject, address = '', phone = '', typeLabel = '', lng = '', lat = '') {
        if (typeof window.clearAcademyMarker === 'function') window.clearAcademyMarker();
        const calculatorContent = document.getElementById('calculatorContent');
        if (!calculatorContent) return;

        const basicInfoContainer = document.getElementById('academyBasicInfoContainer');
        if (basicInfoContainer) basicInfoContainer.innerHTML = '';

        const safeLng = lng || (window.currentAcademyCoords && window.currentAcademyCoords.lng) || '';
        const safeLat = lat || (window.currentAcademyCoords && window.currentAcademyCoords.lat) || '';

        // 로딩 상태 표시
        calculatorContent.innerHTML = `
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">과목: ${subject || '종합보습'}</div>
            <div style="text-align: center; padding: 20px; font-size: 12px; color: var(--text-muted);">
                나이스(NEIS) 교육정보 개방 포털에서<br>수강료 정보를 불러오는 중입니다... ⏳
            </div>
        `;

        let originalFee = 0;
        let feeReason = '';
        let isRealData = false;

        let atptCode = 'B10'; // default 서울
        if (address) {
            if (address.includes('서울')) atptCode = 'B10';
            else if (address.includes('부산')) atptCode = 'C10';
            else if (address.includes('대구')) atptCode = 'D10';
            else if (address.includes('인천')) atptCode = 'E10';
            else if (address.includes('광주')) atptCode = 'F10';
            else if (address.includes('대전')) atptCode = 'G10';
            else if (address.includes('울산')) atptCode = 'H10';
            else if (address.includes('세종')) atptCode = 'I10';
            else if (address.includes('경기')) atptCode = 'J10';
            else if (address.includes('강원')) atptCode = 'K10';
            else if (address.includes('충북')) atptCode = 'M10';
            else if (address.includes('충남')) atptCode = 'N10';
            else if (address.includes('전북')) atptCode = 'P10';
            else if (address.includes('전남')) atptCode = 'Q10';
            else if (address.includes('경북')) atptCode = 'R10';
            else if (address.includes('경남')) atptCode = 'S10';
            else if (address.includes('제주')) atptCode = 'T10';
        }

        // 검색어 최적화
        let searchName = acadName.replace(/\([^)]*\)/g, '').replace(/(학원|교습소|보습|전문|음악|미술|어학원|본원|지점|캠퍼스).*/g, '').trim();
        if (searchName.length < 2) searchName = acadName.replace(/\([^)]*\)/g, '').trim();

        let validRow = null;

        try {
            const res = await fetch(`/api/academies/fees?atpt_code=${atptCode}&aca_nm=${encodeURIComponent(searchName)}`);
            const data = await res.json();
            
            if (data.acaInsTiInfo && data.acaInsTiInfo[1] && data.acaInsTiInfo[1].row) {
                validRow = data.acaInsTiInfo[1].row.find(r => r.PSNBY_THCC_CNTNT && r.PSNBY_THCC_CNTNT.trim() !== '') || data.acaInsTiInfo[1].row[0];
            } else {
                // 2차 Fallback: 원본 학원명으로 재조회
                const cleanFull = acadName.replace(/\([^)]*\)/g, '').trim();
                if (cleanFull && cleanFull !== searchName) {
                    try {
                        const fallbackRes = await fetch(`/api/academies/fees?atpt_code=${atptCode}&aca_nm=${encodeURIComponent(cleanFull)}`);
                        const fallbackData = await fallbackRes.json();
                        if (fallbackData.acaInsTiInfo && fallbackData.acaInsTiInfo[1] && fallbackData.acaInsTiInfo[1].row) {
                            validRow = fallbackData.acaInsTiInfo[1].row.find(r => r.PSNBY_THCC_CNTNT && r.PSNBY_THCC_CNTNT.trim() !== '') || fallbackData.acaInsTiInfo[1].row[0];
                        }
                    } catch (fbErr) {
                        console.warn('Fallback NEIS search error:', fbErr);
                    }
                }
            }

            if (validRow) {
                const feeContent = validRow.PSNBY_THCC_CNTNT || '';
                if (feeContent) {
                    const feeString = feeContent.replace(/,/g, '');
                    const match = feeString.match(/[0-9]{4,}/);
                    if (match && match[0]) {
                        originalFee = parseInt(match[0], 10);
                    }
                    const formattedFees = feeContent.split(',').map(item => item.trim()).join('<br>• ');
                    feeReason = `💡 <strong>출처:</strong> 나이스(NEIS) 교육정보 개방 포털<br><div style="margin-top: 6px; padding: 6px; background: #fff; border: 1px solid #e0e0e0; border-radius: 4px; color: var(--primary-blue); font-weight: 500;">• ${formattedFees}</div>`;
                    isRealData = true;
                }
            }
        } catch (e) {
            console.error('학원비 데이터 호출 실패:', e);
        }

        // 공공데이터 정보 추출 또는 기본 정보 활용 (항상 노출되도록 보장)
        const typeName = (validRow && validRow.ACA_INSTI_SC_NM) ? validRow.ACA_INSTI_SC_NM : (typeLabel || subject || '학원 / 교습소');
        const eduOffice = (validRow && validRow.ATPT_OFCDC_SC_NM) ? validRow.ATPT_OFCDC_SC_NM : '관할 교육청 (정식 등록 인가)';
        const estDate = (validRow && validRow.ESTBL_YMD) ? validRow.ESTBL_YMD.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : '설립 및 정식 운영 중';
        const capacity = (validRow && validRow.TOFOR_SMTOT) ? `${validRow.TOFOR_SMTOT}명` : '수용 정원 기준 운영';
        const addressStr = (validRow && validRow.FA_RDNMA) ? `${validRow.FA_RDNMA} ${validRow.FA_RDNDA || ''}`.trim() : (address || '주소 정보 문의');
        const telNo = (validRow && validRow.FA_TELNO) ? validRow.FA_TELNO : (phone || '전화 문의');

        const safeAddressStr = addressStr.replace(/'/g, "\\'");
        const safeAcadName = acadName.replace(/'/g, "\\'");
        const isNeisRegistered = Boolean(validRow);

        const academyInfoHtml = `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 16px;">🏫</span>
                        <strong style="color: #0f172a; font-size: 15px; font-weight: 700;">기본 학원 정보</strong>
                    </div>
                    <span style="background: ${isNeisRegistered ? '#ecfdf5' : '#eff6ff'}; color: ${isNeisRegistered ? '#059669' : '#2563eb'}; border: 1px solid ${isNeisRegistered ? '#a7f3d0' : '#bfdbfe'}; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px;">
                        ${isNeisRegistered ? '교육청 정식등록 인가' : '주변 추천 승인 학원'}
                    </span>
                </div>

                <div style="display: grid; grid-template-columns: 82px 1fr; row-gap: 10px; column-gap: 8px; font-size: 12.5px; line-height: 1.45;">
                    <div style="color: #64748b; display: flex; align-items: center; gap: 4px;">🏷️ 구분</div>
                    <div>
                        <span style="color: #1e293b; font-weight: 700;">${typeName}</span>
                        <div style="font-size: 11px; color: #94a3b8; margin-top: 1px;">주요 교과 및 보습·어학 전문 커리큘럼</div>
                    </div>

                    <div style="color: #64748b; display: flex; align-items: center; gap: 4px;">🏛️ 관할 교육청</div>
                    <div style="color: #1e293b; font-weight: 600;">${eduOffice}</div>

                    <div style="color: #64748b; display: flex; align-items: center; gap: 4px;">📅 설립일</div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="color: #1e293b; font-weight: 700;">${estDate}</span>
                        <span style="background: #f1f5f9; color: #475569; font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 4px; border: 1px solid #e2e8f0;">정식 운영</span>
                    </div>

                    <div style="color: #64748b; display: flex; align-items: center; gap: 4px;">👥 수용 정원</div>
                    <div>
                        <span id="academyDetailCapacity" style="color: #2563eb; font-weight: 700;">${capacity}</span>
                        <span style="font-size: 11px; color: #94a3b8;"> (동시 수용 기준)</span>
                    </div>

                    <div style="color: #64748b; display: flex; align-items: center; gap: 4px;">📞 전화번호</div>
                    <div>
                        ${(telNo && telNo !== '정보없음' && telNo !== '전화 문의') ? `
                        <a id="academyDetailPhone" href="tel:${telNo.replace(/[^0-9]/g, '')}" style="color: #2563eb; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 3px;">
                            ${telNo} <span style="font-size: 10px;">↗</span>
                        </a>` : `<span style="color: #475569; font-weight: 600;">${telNo}</span>`}
                    </div>

                    <div style="color: #64748b; display: flex; align-items: flex-start; gap: 4px; padding-top: 2px;">📍 상세주소</div>
                    <div>
                        <div id="academyDetailAddressStr" style="color: #1e293b; font-weight: 600; line-height: 1.4; word-break: keep-all;">${addressStr}</div>
                        <div style="display: flex; gap: 6px; margin-top: 6px;">
                            <button onclick="window.copyAddressToClipboard('${safeAddressStr}')" style="padding: 4px 10px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">
                                주소 복사
                            </button>
                            <button onclick="window.searchAndMoveMap('${safeAddressStr}', '${safeAcadName}', '${safeLng}', '${safeLat}')" style="padding: 4px 10px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">
                                📍 지도보기
                            </button>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 14px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: #475569;">
                    <span style="font-size: 15px;">🚌</span>
                    <div><strong>통학·교통 팁:</strong> 인근 지하철역 도보권 및 셔틀 버스 접근 가능</div>
                </div>
            </div>
        `;

        if (basicInfoContainer) {
            basicInfoContainer.innerHTML = academyInfoHtml;
        }

        const avgFee = 320000;

        // 공공데이터 미등록 또는 수강료 정보가 없는 경우 평균 수강료(avgFee)로 임시 처리
        if (!isRealData || originalFee === 0) {
            originalFee = avgFee;
            feeReason = `💡 <strong>출처:</strong> 나이스(NEIS) 교육정보 개방 포털<br><span style="color: var(--danger-red);">⚠️ 미등록 학원이거나 수강료 정보가 없습니다. 평균 수강료로 임시 계산됩니다. (수동 입력 가능)</span>`;
        }
        
        const diffPercent = Math.round(((originalFee - avgFee) / avgFee) * 100);
        let comparisonMsg = '';
        if (diffPercent < 0) {
            comparisonMsg = `<span style="color: var(--success-green); font-weight: bold;">주변 평균(${avgFee.toLocaleString()}원) 대비 ${Math.abs(diffPercent)}% 저렴</span>`;
        } else if (diffPercent > 0) {
            comparisonMsg = `<span style="color: var(--danger-red); font-weight: bold;">주변 평균(${avgFee.toLocaleString()}원) 대비 ${diffPercent}% 높음</span>`;
        } else {
            comparisonMsg = `<span style="color: var(--text-muted);">주변 평균(${avgFee.toLocaleString()}원) 수준</span>`;
        }

        calculatorContent.innerHTML = `
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">과목: ${subject || '종합보습'}</div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 4px;">
                <span>기본 수강료:</span>
                <div style="display: flex; align-items: center; gap: 4px;" id="baseFeeEditWrapper">
                    <span id="calcBaseFeeText" style="cursor: pointer; border-bottom: 1.5px dashed var(--primary-blue); font-weight: bold; font-size: 13.5px; color: var(--primary-blue);" title="클릭하여 수강료 수정">${originalFee.toLocaleString()}</span><span id="calcBaseFeeStaticUnit" style="font-weight: bold; font-size: 13.5px;">원</span>
                    <input type="number" id="calcBaseFeeInput" value="${originalFee}" style="display: none; width: 100px; padding: 4px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px; text-align: right; font-weight: bold; color: var(--primary-blue); outline: none;">
                    <span id="calcBaseFeeInputUnit" style="display: none; font-weight: bold; font-size: 13.5px;">원</span>
                </div>
            </div>
            
            <div style="font-size: 10.5px; color: var(--text-muted); margin-bottom: 8px; background: #f5f5f5; padding: 6px; border-radius: 4px; line-height: 1.4;">
                ${feeReason}
            </div>
            
            <div id="calcComparisonMsg" style="font-size: 11px; margin-bottom: 8px; text-align: right;">${comparisonMsg}</div>

            <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; background: white; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
                <label style="display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; cursor: pointer; user-select: none;">
                    <span>🎁 교육 바우처 (5만원 지원)</span>
                    <input type="checkbox" id="calcUseVoucher" style="cursor: pointer;">
                </label>
                <label style="display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; cursor: pointer; user-select: none;">
                    <span>💳 카드/제휴 혜택 선택</span>
                    <select id="calcCardDiscount" style="font-size: 11px; padding: 2px; border: 1px solid var(--border-color); border-radius: 4px; outline: none; background: white; cursor: pointer;">
                        <option value="0">선택 안 함</option>
                        <option value="0.1">제휴 교육카드 (10% 할인)</option>
                        <option value="0.2">다자녀 지원카드 (20% 할인)</option>
                    </select>
                </label>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; background: #e8f5e9; padding: 10px; border-radius: 6px; border: 1px solid #c8e6c9;">
                <span style="font-weight: bold; color: #2e7d32;">최종 본인 부담액:</span>
                <strong style="font-size: 14.5px; color: #1b5e20;"><span id="calcFinalFee">${originalFee.toLocaleString()}</span>원</strong>
            </div>
        `;

        const baseFeeText = document.getElementById('calcBaseFeeText');
        const baseFeeStaticUnit = document.getElementById('calcBaseFeeStaticUnit');
        const baseFeeInput = document.getElementById('calcBaseFeeInput');
        const baseFeeInputUnit = document.getElementById('calcBaseFeeInputUnit');
        const chkPayVoucher = document.getElementById('calcUseVoucher');
        const selCardDiscount = document.getElementById('calcCardDiscount');
        const calcFinalFee = document.getElementById('calcFinalFee');

        let currentOriginalFee = originalFee;

        function getComparisonMsg(fee) {
            const diffPercent = Math.round(((fee - avgFee) / avgFee) * 100);
            if (diffPercent < 0) {
                return `<span style="color: var(--success-green); font-weight: bold;">주변 평균(${avgFee.toLocaleString()}원) 대비 ${Math.abs(diffPercent)}% 저렴</span>`;
            } else if (diffPercent > 0) {
                return `<span style="color: var(--danger-red); font-weight: bold;">주변 평균(${avgFee.toLocaleString()}원) 대비 ${diffPercent}% 높음</span>`;
            } else {
                return `<span style="color: var(--text-muted);">주변 평균(${avgFee.toLocaleString()}원) 수준</span>`;
            }
        }

        if (baseFeeText && baseFeeInput) {
            baseFeeText.addEventListener('click', () => {
                baseFeeText.style.display = 'none';
                if (baseFeeStaticUnit) baseFeeStaticUnit.style.display = 'none';
                baseFeeInput.style.display = 'inline-block';
                if (baseFeeInputUnit) baseFeeInputUnit.style.display = 'inline-block';
                baseFeeInput.focus();
            });

            const finishEditing = () => {
                let baseVal = parseInt(baseFeeInput.value);
                if (isNaN(baseVal) || baseVal < 0) baseVal = 0;
                baseFeeInput.value = baseVal;
                currentOriginalFee = baseVal;
                baseFeeText.innerText = baseVal.toLocaleString();
                
                baseFeeInput.style.display = 'none';
                if (baseFeeInputUnit) baseFeeInputUnit.style.display = 'none';
                baseFeeText.style.display = 'inline-block';
                if (baseFeeStaticUnit) baseFeeStaticUnit.style.display = 'inline-block';
                
                const compMsgEl = document.getElementById('calcComparisonMsg');
                if (compMsgEl) {
                    compMsgEl.innerHTML = getComparisonMsg(baseVal);
                }
                
                reCalculate();
            };

            baseFeeInput.addEventListener('blur', finishEditing);
            baseFeeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') finishEditing();
            });
        }

        function reCalculate() {
            let final = currentOriginalFee;
            if (chkPayVoucher && chkPayVoucher.checked) {
                final -= 50000;
            }
            if (selCardDiscount) {
                const discountRate = parseFloat(selCardDiscount.value);
                final = final * (1 - discountRate);
            }
            final = Math.max(0, Math.round(final));
            if (calcFinalFee) {
                calcFinalFee.innerText = final.toLocaleString();
            }
        }

        if (chkPayVoucher) chkPayVoucher.addEventListener('change', reCalculate);
        if (selCardDiscount) selCardDiscount.addEventListener('change', reCalculate);
    };

    // 4. 실시간 타운 톡 (익명 방명록)
    window.fetchTownTalkList = function(targetId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        fetch(`/api/towntalk?targetId=${encodeURIComponent(targetId)}`)
            .then(res => res.json())
            .then(talkList => {
                container.innerHTML = '';
                if (talkList.length === 0) {
                    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 11px; padding: 10px 0;">첫 대화의 주인공이 되어보세요!</div>`;
                    return;
                }

                talkList.forEach(talk => {
                    const item = document.createElement('div');
                    item.style.cssText = 'background: white; border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 8px; font-size: 11.5px;';
                    
                    const time = new Date(talk.timestamp);
                    const timeStr = `${time.getMonth() + 1}/${time.getDate()} ${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
                    
                    item.innerHTML = `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                            <strong style="color: var(--primary-blue); font-size: 11px;">${talk.nickname}</strong>
                            <span style="font-size: 9px; color: var(--text-muted);">${timeStr}</span>
                        </div>
                        <div style="color: var(--text-main); word-break: break-all; line-height: 1.3;">${talk.content}</div>
                    `;
                    container.appendChild(item);
                });
            })
            .catch(err => {
                console.error(err);
                container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 11px; padding: 10px 0;">톡 목록을 불러오지 못했습니다.</div>`;
            });
    };

    window.sendTownTalk = function(targetId, nickId, contentId, containerId) {
        const nickInput = document.getElementById(nickId);
        const contentInput = document.getElementById(contentId);
        if (!nickInput || !contentInput) return;

        const nickname = nickInput.value.trim();
        const content = contentInput.value.trim();

        if (!nickname) {
            alert('닉네임을 입력해 주세요.');
            return;
        }
        if (!content) {
            alert('이야기 내용을 입력해 주세요.');
            return;
        }

        fetch('/api/towntalk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ targetId, nickname, content })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }
            contentInput.value = '';
            window.fetchTownTalkList(targetId, containerId);
        })
        .catch(err => {
            console.error(err);
            alert('톡 전송에 실패했습니다.');
        });
    };

    updateFavUI();
    updateMypageComparisonUI();
    if (typeof updateMypageSimulationUI === 'function') updateMypageSimulationUI();
});

// --- 모바일 하단 내비게이션 클릭 이벤트 처리 ---
window.onMobileNavClick = function(menu, btnEl) {
    // 1024px 이하 모바일 환경에서만 하단 네비게이션 동작 적용
    if (window.innerWidth > 1024) return;

    // 학원 상세 패널(커뮤니티 패널) 명시적 닫기 및 관련 UI 상태 초기화
    const cp = document.getElementById('communityPanel');
    if (cp) cp.style.display = 'none';
    const sc = document.querySelector('.sidebar-section');
    if (sc) sc.classList.remove('active-community');
    const sidebarContent = document.getElementById('sidebarContent');
    if (sidebarContent) sidebarContent.style.display = 'block';
    const btnToggleTop = document.getElementById('btnToggleSidebarTop');
    if (btnToggleTop) btnToggleTop.style.display = 'flex';

    // 하단 탭바 활성화 상태 변경
    document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(el => {
        el.classList.remove('active');
    });
    if (btnEl) {
        btnEl.classList.add('active');
    }

    const container = document.querySelector('.app-container');
    const sidebar = document.querySelector('.sidebar-section');
    const academySidebar = document.getElementById('academySidebar');
    const filterAccordion = document.querySelector('.parents-filter-accordion');

    // [공통] 다른 하단 메뉴를 터치할 때 화면을 덮고 있던 학교/학원 상세 페이지와 목록창을 우선 전부 닫고 걷어냅니다.
    if (container) {
        container.classList.remove('sidebar-open');
        container.classList.remove('academy-open');
    }
    if (sidebar) sidebar.style.display = 'none';
    if (academySidebar) academySidebar.style.display = 'none';

    // 모든 팝업 모달 및 리뷰 닫기 목록
    const modals = [
        'simulationModal', 
        'settingsModal', 
        'onboardingModal', 
        'tutorialModal', 
        'schoolReviewFormModal', 
        'schoolReviewListModal', 
        'budgetModal',
        'storyModal',
        'topicStatsModal'
    ];
    modals.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // 학부모 필터 설정 모달도 기본적으로 숨김
    if (filterAccordion) {
        filterAccordion.style.display = 'none';
    }

    if (menu === 'map') {
        // 상단 토글 버튼 상태도 맞춰줌
        const btnToggle = document.getElementById('btnToggleSidebarTop');
        if (btnToggle) {
            btnToggle.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
        }
        const mapObj = window.kakaoMapInstance || (typeof kakaoMap !== 'undefined' ? kakaoMap : null);
        if (mapObj && window.kakao && window.kakao.maps) {
            setTimeout(() => {
                if (mapObj.relayout) mapObj.relayout();
                if (window.tempAddressMarker) {
                    const moveLatLon = window.tempAddressMarker.getPosition();
                    const schoolObj = (typeof orchestrator !== 'undefined' && orchestrator.state && orchestrator.state.selectedSchool) || window.currentSelectedSchool || null;
                    let sLat = schoolObj && (schoolObj.lat || schoolObj.y || schoolObj.latitude) ? parseFloat(schoolObj.lat || schoolObj.y || schoolObj.latitude) : null;
                    let sLng = schoolObj && (schoolObj.lng || schoolObj.x || schoolObj.longitude) ? parseFloat(schoolObj.lng || schoolObj.x || schoolObj.longitude) : null;
                    
                    if (moveLatLon && sLat && sLng && !isNaN(sLat) && !isNaN(sLng)) {
                        const schoolLatLon = new kakao.maps.LatLng(sLat, sLng);
                        const bounds = new kakao.maps.LatLngBounds();
                        bounds.extend(moveLatLon);
                        bounds.extend(schoolLatLon);
                        try {
                            mapObj.setBounds(bounds, 80, 40, 80, 40);
                        } catch(e) {
                            mapObj.setBounds(bounds);
                        }
                        if (mapObj.getLevel() < 3) mapObj.setLevel(3);
                        if (mapObj.getLevel() > 6) mapObj.setLevel(6);
                    }
                }
            }, 100);
        }
    } else if (menu === 'filter') {
        // 필터 보기: 사이드바를 열지 않고 학부모 필터 아코디언을 모바일 전용 전체 화면 페이지로 활성화함
        if (filterAccordion) {
            if (container && filterAccordion.parentNode !== container) {
                container.appendChild(filterAccordion);
            }
            filterAccordion.style.display = 'flex';
            filterAccordion.style.flexDirection = 'column';
            filterAccordion.style.zIndex = '10095';
            filterAccordion.style.background = '#ffffff';
            filterAccordion.style.borderRadius = '0';
            filterAccordion.style.border = 'none';
            filterAccordion.style.boxShadow = 'none';
            filterAccordion.style.width = '100%';
            filterAccordion.style.height = 'calc(100% - 60px)';
            filterAccordion.style.maxHeight = 'none';
        }
        
        const filterContent = document.getElementById('parentsFilterContent');
        const filterIndicator = document.getElementById('parentsFilterIndicator');
        if (filterContent) {
            filterContent.style.display = 'flex';
            filterContent.style.flexDirection = 'column';
            filterContent.style.flex = '1';
            filterContent.style.overflowY = 'auto';
            filterContent.style.maxHeight = 'none';
            filterContent.style.background = '#ffffff';
            filterContent.scrollTop = 0;
        }
        if (filterIndicator) {
            filterIndicator.innerText = '▲';
        }
    } else if (menu === 'region') {
        // 지역 보기: 이사 시뮬레이션 모달 팝업
        const simModal = document.getElementById('simulationModal');
        if (simModal) {
            simModal.style.display = 'flex';
            if (typeof initSimulationDropdowns === 'function') {
                initSimulationDropdowns();
            }
        }
    } else if (menu === 'mypage') {
        // 마이페이지 보기: 설정 모달 팝업 노출 (최상위 컨테이너로 이동되어 단독 노출 가능)
        const setModal = document.getElementById('settingsModal');
        if (setModal) {
            setModal.style.display = 'block';
            if (typeof window.switchMypageTab === 'function') {
                window.switchMypageTab('child');
            }
            // 모바일 탭 이동 시 최신 즐겨찾기 및 비교 목록 렌더링 강제 업데이트
            if (typeof updateFavUI === 'function') {
                updateFavUI();
            }
            if (typeof updateMypageComparisonUI === 'function') {
                updateMypageComparisonUI();
            }
            if (typeof updateMypageSimulationUI === 'function') {
                updateMypageSimulationUI();
            }
        }
    } else if (menu === 'story') {
        // 이야기 보기: 이야기 모달 노출 및 기본 학교 탭 로드
        const storyModal = document.getElementById('storyModal');
        if (storyModal) {
            storyModal.style.display = 'flex';
            window.switchStoryTab('school');
        }
    }
};

// --- 마이페이지 탭 및 아코디언 제어 로직 ---
window.toggleMypageAccordion = function(sectionName) {
    const content = document.getElementById('mypageAccordionContent-' + sectionName);
    const arrow = document.getElementById('mypageAccordionArrow-' + sectionName);
    if (!content) return;
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        if (arrow) arrow.textContent = '▲';
        
        // 비교보드 아코디언 개방 시 최신 저장 데이터 렌더링 강제 매핑
        if (sectionName === 'comparison' && typeof updateMypageComparisonUI === 'function') {
            updateMypageComparisonUI();
        }
        // 시뮬레이션 보관함 아코디언 개방 시 최신 저장 데이터 렌더링 강제 매핑
        if (sectionName === 'simulation' && typeof updateMypageSimulationUI === 'function') {
            updateMypageSimulationUI();
        }
    } else {
        content.style.display = 'none';
        if (arrow) arrow.textContent = '▼';
    }
};

window.switchMypageTab = function(tabName) {
    const accordions = ['neis', 'child', 'favorites', 'comparison', 'simulation', 'display', 'help'];
    accordions.forEach(name => {
        const content = document.getElementById('mypageAccordionContent-' + name);
        const arrow = document.getElementById('mypageAccordionArrow-' + name);
        if (content) {
            if (name === tabName) {
                content.style.display = 'block';
                if (arrow) arrow.textContent = '▲';
                if (name === 'simulation' && typeof updateMypageSimulationUI === 'function') {
                    updateMypageSimulationUI();
                }
            } else {
                content.style.display = 'none';
                if (arrow) arrow.textContent = '▼';
            }
        }
    });
};

// --- 화면 크기 변경 감지 및 PC 버전 스타일 복원 ---
window.addEventListener('resize', function() {
    if (window.innerWidth > 1024) {
        const sidebar = document.querySelector('.sidebar-section');
        const academySidebar = document.getElementById('academySidebar');
        const container = document.querySelector('.app-container');
        
        // PC 화면으로 복원 시 모바일에서 적용된 인라인 display 스타일을 flex로 복구
        if (sidebar) {
            sidebar.style.display = 'flex';
        }
        if (academySidebar && academySidebar.style.display === 'none') {
            academySidebar.style.display = '';
        }
        
        // PC 화면으로 복원 시 모바일에서 적용된 인라인 display 스타일을 flex로 복구
        if (sidebar) {
            sidebar.style.display = 'flex';
        }
        if (academySidebar && academySidebar.style.display === 'none') {
            academySidebar.style.display = '';
        }
        
        // PC 화면에서는 우측 사이드바가 기본적으로 열려있도록 클래스 복구
        if (container && !container.classList.contains('sidebar-open')) {
            container.classList.add('sidebar-open');
        }

        // 학부모 필터 설정창 PC 뷰 복원 시 map-search-container 내부로 복귀 및 스타일 초기화
        const filterAccordion = document.querySelector('.parents-filter-accordion');
        const mapSearchContainer = document.querySelector('.map-search-container');
        if (filterAccordion && mapSearchContainer && filterAccordion.parentNode !== mapSearchContainer) {
            mapSearchContainer.appendChild(filterAccordion);
        }
        if (filterAccordion) {
            filterAccordion.style.display = '';
            filterAccordion.style.flexDirection = '';
            filterAccordion.style.zIndex = '';
            filterAccordion.style.background = '';
            filterAccordion.style.borderRadius = '';
            filterAccordion.style.border = '';
            filterAccordion.style.boxShadow = '';
            filterAccordion.style.width = '';
            filterAccordion.style.height = '';
            filterAccordion.style.maxHeight = '';
        }
        const filterContent = document.getElementById('parentsFilterContent');
        if (filterContent) {
            filterContent.style.flex = '';
            filterContent.style.maxHeight = '';
            filterContent.style.background = '';
        }

        // PC 뷰 복원 시 settingsModal을 원래의 sidebar-section 내부로 복귀시킴
        const settingsModal = document.getElementById('settingsModal');
        const sidebarHeader = document.querySelector('.sidebar-header');
        if (settingsModal && sidebar && settingsModal.parentNode !== sidebar) {
            if (sidebarHeader && sidebarHeader.nextSibling) {
                sidebar.insertBefore(settingsModal, sidebarHeader.nextSibling);
            } else {
                sidebar.appendChild(settingsModal);
            }
        }

        // 상단 토글 버튼 아이콘 리셋 (사이드바 열림 아이콘인 X 표시)
        const btnToggle = document.getElementById('btnToggleSidebarTop');
        if (btnToggle) {
            btnToggle.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        }
    } else {
        // 모바일 화면으로 축소 시 settingsModal 및 filterAccordion을 최상위 container로 이동
        const settingsModal = document.getElementById('settingsModal');
        const filterAccordion = document.querySelector('.parents-filter-accordion');
        const container = document.querySelector('.app-container');
        if (settingsModal && container && settingsModal.parentNode !== container) {
            container.appendChild(settingsModal);
        }
        if (filterAccordion && container && filterAccordion.parentNode !== container) {
            container.appendChild(filterAccordion);
        }
    }
});

// 즉시 실행 함수(IIFE)로 로드 즉시 PC/모바일 상태 확인 및 레이아웃 설정
(function() {
    const sidebar = document.querySelector('.sidebar-section');
    const academySidebar = document.getElementById('academySidebar');
    const container = document.querySelector('.app-container');
    const btnToggle = document.getElementById('btnToggleSidebarTop');
    const settingsModal = document.getElementById('settingsModal');
    const filterAccordion = document.querySelector('.parents-filter-accordion');

    if (window.innerWidth > 1024) {
        // PC 접속 시: settingsModal이 원래 부모(sidebar-section) 내에 위치하도록 보장
        const sidebarHeader = document.querySelector('.sidebar-header');
        if (settingsModal && sidebar && settingsModal.parentNode !== sidebar) {
            if (sidebarHeader && sidebarHeader.nextSibling) {
                sidebar.insertBefore(settingsModal, sidebarHeader.nextSibling);
            } else {
                sidebar.appendChild(settingsModal);
            }
        }

        // 우측 사이드바가 기본적으로 열려있도록 설정
        if (sidebar) {
            sidebar.style.display = 'flex';
        }
        if (container && !container.classList.contains('sidebar-open')) {
            container.classList.add('sidebar-open');
        }
        if (filterAccordion) {
            const mapSearchContainer = document.querySelector('.map-search-container');
            if (mapSearchContainer && filterAccordion.parentNode !== mapSearchContainer) {
                mapSearchContainer.appendChild(filterAccordion);
            }
            filterAccordion.style.display = '';
            filterAccordion.style.flexDirection = '';
            filterAccordion.style.zIndex = '';
            filterAccordion.style.background = '';
            filterAccordion.style.borderRadius = '';
            filterAccordion.style.border = '';
            filterAccordion.style.boxShadow = '';
            filterAccordion.style.width = '';
            filterAccordion.style.height = '';
            filterAccordion.style.maxHeight = '';
        }
    } else {
        // 모바일 접속 시: settingsModal 및 filterAccordion을 최상위 container 하위로 이동
        if (settingsModal && container && settingsModal.parentNode !== container) {
            container.appendChild(settingsModal);
        }
        if (filterAccordion && container && filterAccordion.parentNode !== container) {
            container.appendChild(filterAccordion);
        }

        // 모바일 처음 접속 시 학군 네비게이션 가이드(welcomeCard)가 보이도록 사이드바 오픈
        if (sidebar) {
            sidebar.style.display = 'flex';
        }
        if (academySidebar) {
            academySidebar.style.display = 'none';
        }
        if (container) {
            container.classList.add('sidebar-open');
            container.classList.remove('academy-open');
        }
        const welcomeCard = document.getElementById('welcomeCard');
        if (welcomeCard) {
            welcomeCard.style.display = 'block';
        }
        const schoolCard = document.getElementById('schoolCard');
        if (schoolCard) {
            schoolCard.style.display = 'none';
        }
        if (filterAccordion) {
            filterAccordion.style.display = 'none';
        }
        // 상단 토글 버튼도 닫기(✕) 아이콘으로 설정
        if (btnToggle) {
            btnToggle.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        }
    }
})();

// 모바일 학부모 필터 및 설정 닫기(X) 버튼 이벤트 연동
window.addEventListener('DOMContentLoaded', () => {
    const btnCloseParentsFilter = document.getElementById('btnCloseParentsFilter');
    if (btnCloseParentsFilter) {
        btnCloseParentsFilter.addEventListener('click', (e) => {
            e.stopPropagation(); // 아코디언 토글 전파 방지
            // 지도 탭 버튼 탐색 및 지도 탭으로 전환
            const mapTabBtn = document.querySelector('.mobile-bottom-nav .nav-item[onclick*="map"]');
            window.onMobileNavClick('map', mapTabBtn);
        });
    }

    const btnApplyFilters = document.getElementById('btnApplyFilters');
    if (btnApplyFilters) {
        btnApplyFilters.addEventListener('click', () => {
            // 지도 필터 적용
            if (typeof onMapAction === 'function') {
                onMapAction();
            }
            // 지도 탭으로 전환 (필터 페이지가 닫히고 지도가 보임)
            const mapTabBtn = document.querySelector('.mobile-bottom-nav .nav-item[onclick*="map"]');
            if (window.onMobileNavClick) {
                window.onMobileNavClick('map', mapTabBtn);
            }
        });
    }

    const btnCloseSettings = document.getElementById('btnCloseSettings');
    if (btnCloseSettings) {
        btnCloseSettings.addEventListener('click', () => {
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) settingsModal.style.display = 'none';
            
            if (window.innerWidth <= 1024) {
                const mapTabBtn = document.querySelector('.mobile-bottom-nav .nav-item[onclick*="map"]');
                window.onMobileNavClick('map', mapTabBtn);
            }
        });
    }

    // 모바일 플로팅 지도 필터와 실제 폼 체크박스들 상태 동기화 함수
    function syncMobileFloatingFilters() {
        const checkboxIds = [
            'trendUpwardCheckbox',
            'safetyGuideCheckbox',
            'crimeZoneToggleCheckbox',
            'accidentStatisticsCheckbox',
            'trafficAccidentCheckbox',
            'dongRatingCheckbox'
        ];
        checkboxIds.forEach(id => {
            const cb = document.getElementById(id);
            const buttons = document.querySelectorAll(`[onclick*="'${id}'"]`);
            buttons.forEach(btn => {
                if (cb && cb.checked) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });
        
        // 플로팅 활성화 뱃지 상시 노출 동기화 호출
        if (typeof window.updateFloatingActiveBadges === 'function') {
            window.updateFloatingActiveBadges();
        }
    }

    // 실제 체크박스 변경 시 플로팅 버튼도 같이 싱크
    ['trendUpwardCheckbox', 'safetyGuideCheckbox', 'crimeZoneToggleCheckbox', 'accidentStatisticsCheckbox', 'trafficAccidentCheckbox', 'dongRatingCheckbox'].forEach(id => {
        const cb = document.getElementById(id);
        if (cb) {
            cb.addEventListener('change', syncMobileFloatingFilters);
        }
    });

    // 최초 로드 시 동기화
    setTimeout(syncMobileFloatingFilters, 500);

    // --- 이야기 (찐학부모 리뷰 / 학원 후기) 모바일 탭 제어 로직 ---
    window.switchStoryTab = function(type) {
        const btnSchool = document.getElementById('btnStorySchoolTab');
        const btnAcademy = document.getElementById('btnStoryAcademyTab');
        if (!btnSchool || !btnAcademy) return;

        if (type === 'school') {
            btnSchool.style.background = 'var(--primary-blue)';
            btnSchool.style.color = 'white';
            btnAcademy.style.background = 'transparent';
            btnAcademy.style.color = 'var(--text-muted)';
            window.loadStoryData('school');
        } else {
            btnAcademy.style.background = 'var(--primary-blue)';
            btnAcademy.style.color = 'white';
            btnSchool.style.background = 'transparent';
            btnSchool.style.color = 'var(--text-muted)';
            window.loadStoryData('academy');
        }
    };

    window.loadStoryData = async function(type) {
        const container = document.getElementById('storyListContainer');
        if (!container) return;

        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px 0; font-size: 13px;">리뷰를 불러오는 중입니다...</div>';

        try {
            const sb = window.supabaseInstance;
            if (!sb) {
                container.innerHTML = '<div style="text-align: center; color: var(--danger-red); padding: 40px 0; font-size: 13px;">데이터베이스가 준비되지 않았습니다.</div>';
                return;
            }

            if (type === 'school') {
                const { data, error } = await sb
                    .from('school_reviews')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (error) throw error;

                if (!data || data.length === 0) {
                    container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px 0; font-size: 13px;">등록된 찐학부모 학교 리뷰가 없습니다.</div>';
                    return;
                }

                container.innerHTML = '';
                data.forEach(item => {
                    const card = document.createElement('div');
                    card.style.background = '#f8f9fa';
                    card.style.padding = '16px';
                    card.style.borderRadius = '10px';
                    card.style.border = '1px solid var(--border-color)';
                    card.style.display = 'flex';
                    card.style.flexDirection = 'column';
                    card.style.gap = '6px';
                    
                    const stars = '⭐'.repeat(Math.min(5, Math.max(1, parseInt(item.rating) || 5)));
                    const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString() : '';
                    
                    card.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 800; color: var(--deep-blue); font-size: 13px;">🏫 ${item.school_name || '지정되지 않은 학교'}</span>
                            <span style="font-size: 11px; color: var(--text-muted);">${dateStr}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; margin: 2px 0;">
                            <span style="color: #ffb300; font-size: 12px;">${stars}</span>
                            <span style="font-weight: bold; font-size: 12px; color: var(--text-main);">${item.nickname || '익명의 학부모'}</span>
                        </div>
                        <div style="font-size: 12.5px; color: var(--text-main); line-height: 1.5; white-space: pre-wrap; word-break: break-all;">${item.content || ''}</div>
                    `;
                    container.appendChild(card);
                });

            } else {
                const { data, error } = await sb
                    .from('academy_reviews')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (error) throw error;

                if (!data || data.length === 0) {
                    container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px 0; font-size: 13px;">등록된 생생 학원 후기가 없습니다.</div>';
                    return;
                }

                container.innerHTML = '';
                data.forEach(item => {
                    const card = document.createElement('div');
                    card.style.background = '#f8f9fa';
                    card.style.padding = '16px';
                    card.style.borderRadius = '10px';
                    card.style.border = '1px solid var(--border-color)';
                    card.style.display = 'flex';
                    card.style.flexDirection = 'column';
                    card.style.gap = '6px';
                    
                    const stars = '⭐'.repeat(Math.min(5, Math.max(1, parseInt(item.rating) || 5)));
                    const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString() : '';
                    
                    card.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 800; color: var(--success-green); font-size: 13px;">✏️ ${item.academyName || '지정되지 않은 학원'}</span>
                            <span style="font-size: 11px; color: var(--text-muted);">${dateStr}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; margin: 2px 0;">
                            <span style="color: #ffb300; font-size: 12px;">${stars}</span>
                            <span style="font-weight: bold; font-size: 12px; color: var(--text-main);">${item.nickname || '익명의 수강생'}</span>
                        </div>
                        <div style="font-size: 12.5px; color: var(--text-main); line-height: 1.5; white-space: pre-wrap; word-break: break-all;">${item.content || ''}</div>
                    `;
                    container.appendChild(card);
                });
            }
        } catch (e) {
            console.error('Error loading stories:', e);
            container.innerHTML = `<div style="text-align: center; color: var(--danger-red); padding: 40px 0; font-size: 13px;">리뷰 데이터를 불러오는데 실패했습니다: ${e.message}</div>`;
        }
    };

    // 마우스 드래그 가로 스크롤 구현 (PC/시뮬레이터용 + 부드러운 관성 스크롤 추가)
    const initDragScroll = () => {
        const slider = document.getElementById('academyReviewFilterContainer');
        if (!slider) return;
        
        let isDown = false;
        let startX;
        let scrollLeft;
        let velX = 0;
        let momentumID;
        let lastX;
        let lastTime;
        
        const updateMomentum = () => {
            slider.scrollLeft += velX;
            velX *= 0.92; // 감속 비율 (마찰 계수)
            if (Math.abs(velX) > 0.5) {
                momentumID = requestAnimationFrame(updateMomentum);
            }
        };
        
        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            slider.style.cursor = 'grabbing';
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
            
            // 드래그 시 기존의 움직이고 있던 관성 스레드 즉시 취소
            cancelAnimationFrame(momentumID);
            velX = 0;
            
            lastX = e.pageX;
            lastTime = Date.now();
        });
        
        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.style.cursor = 'grab';
            updateMomentum();
        });
        
        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.style.cursor = 'grab';
            updateMomentum();
        });
        
        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 1.5; 
            slider.scrollLeft = scrollLeft - walk;
            
            // 순간 속도 계산 (변위 / 시간차)
            const now = Date.now();
            const dt = now - lastTime;
            if (dt > 0) {
                const dx = e.pageX - lastX;
                velX = -(dx / dt) * 12; // 드래그 탄성 가속치 보정
            }
            lastX = e.pageX;
            lastTime = now;
        });
        
        slider.style.cursor = 'grab';
    };
    initDragScroll();

    // 세로 본문 영역 마우스 드래그 가로 스크롤 구현 (PC/시뮬레이터용 + 부드러운 관성 스크롤 추가)
    const makeVerticalDragScrollable = (selector) => {
        // PC 화면에서는 학교 상세 및 도움말 사이드바의 텍스트 긁기 등 기본 동작을 보호하기 위해 드래그를 걸지 않음
        if ((selector === '#sidebarContent' || selector === '#tutorialSidebarCard' || selector === '.sidebar-section') && window.innerWidth > 1024) {
            return;
        }
        const slider = document.querySelector(selector);
        if (!slider) return;
        
        let isDown = false;
        let startY;
        let scrollTop;
        let velY = 0;
        let momentumID;
        let lastY;
        let lastTime;
        
        const updateMomentum = () => {
            slider.scrollTop += velY;
            velY *= 0.92; // 감속 비율 (마찰 계수)
            if (Math.abs(velY) > 0.5) {
                momentumID = requestAnimationFrame(updateMomentum);
            }
        };
        
        slider.addEventListener('mousedown', (e) => {
            // 버튼, 인풋, 셀렉트 박스 등 폼 컨트롤들은 드래그에 방해 받지 않고 기본 동작 보장
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.closest('button') || e.target.closest('select') || e.target.closest('input') || e.target.closest('.community-filter-btn') || e.target.closest('.academy-tab-btn')) {
                return;
            }
            // 헤더 바 영역을 클릭하고 드래그를 시도할 경우 스크롤 작동을 방지
            if (e.target.closest('.sidebar-header') || 
                e.target.closest('#academySidebar > div:first-child') || 
                e.target.closest('#communityPanel > div:first-child') || 
                e.target.closest('.filter-header-bar') || 
                e.target.closest('#settingsModal > div:first-child > div:first-child') ||
                e.target.closest('#storyModal > div:first-child > div:first-child')) {
                return;
            }
            isDown = true;
            slider.style.cursor = 'grabbing';
            startY = e.pageY - slider.offsetTop;
            scrollTop = slider.scrollTop;
            
            cancelAnimationFrame(momentumID);
            velY = 0;
            
            lastY = e.pageY;
            lastTime = Date.now();
        });
        
        slider.addEventListener('mouseleave', () => {
            if (!isDown) return;
            isDown = false;
            slider.style.cursor = 'grab';
            updateMomentum();
        });
        
        slider.addEventListener('mouseup', () => {
            if (!isDown) return;
            isDown = false;
            slider.style.cursor = 'grab';
            updateMomentum();
        });
        
        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const y = e.pageY - slider.offsetTop;
            const walk = (y - startY) * 1.5; // 드래그 감도
            slider.scrollTop = scrollTop - walk;
            
            // 순간 속도 계산 (변위 / 시간차)
            const now = Date.now();
            const dt = now - lastTime;
            if (dt > 0) {
                const dy = e.pageY - lastY;
                velY = -(dy / dt) * 12; // 드래그 탄성 가속치 보정
            }
            lastY = e.pageY;
            lastTime = now;
        });
        
        slider.style.cursor = 'grab';
    };
    
    // 학교 상세 본문, 도움말 가이드, 학원 상세 본문, 필터 설정, 통합 설정, 시뮬레이션 결과 영역 각각에 세로 드래그 스크롤 주입
    makeVerticalDragScrollable('#sidebarContent');
    makeVerticalDragScrollable('#tutorialSidebarCard');
    makeVerticalDragScrollable('.community-scroll-content');
    makeVerticalDragScrollable('#parentsFilterContent');
    makeVerticalDragScrollable('.settings-scroll-content');
    makeVerticalDragScrollable('#simulationResultPanel');
    makeVerticalDragScrollable('#topicStatsListContainer');
    makeVerticalDragScrollable('.topic-stats-scroll-body');

    // ------------------------------------
    // 순위 통계 대시보드 모듈 (School Ranking & Statistics Dashboard)
    // ------------------------------------
    (function initTopicStatsModule() {
        const modal = document.getElementById('topicStatsModal');
        const sidoSelect = document.getElementById('topicStatsSido');
        const gugunSelect = document.getElementById('topicStatsGugun');
        const subGuSelect = document.getElementById('topicStatsSubGu');
        const dongSelect = document.getElementById('topicStatsDong');
        const schoolTypeSelect = document.getElementById('topicStatsSchoolType');
        const tabBar = document.getElementById('topicStatsTabBar');
        const summaryText = document.getElementById('topicStatsSummaryText');
        const countBadge = document.getElementById('topicStatsCountBadge');
        const listContainer = document.getElementById('topicStatsListContainer');
        const violenceToggleContainer = document.getElementById('violenceOrderToggleContainer');
        const compositeSortContainer = document.getElementById('compositeSortContainer');
        const academicSortContainer = document.getElementById('academicSortContainer');
        const extracurricularSortContainer = document.getElementById('extracurricularSortContainer');
        const transferSortContainer = document.getElementById('transferSortContainer');

        let rawDistrictData = (typeof defaultDistrictData !== 'undefined' && defaultDistrictData && defaultDistrictData.data) ? defaultDistrictData.data : [];
        let allSchoolsCache = [];
        let currentTopic = 'violence'; // 'violence' | 'composite' | 'academic' | 'extracurricular' | 'transfer'

        // 탭별 정렬 상태
        const sortState = {
            violence:        { key: 'cases',  dir: 'asc' }, // 기본: 발생건수 적은 순
            composite:       { key: 'score',  dir: 'desc' },
            academic:        { key: 'avg',    dir: 'desc' },
            extracurricular: { key: 'budget', dir: 'desc' },
            transfer:        { key: 'net',    dir: 'desc' }
        };

        // 탭별 정렬 버튼 설정
        const SORT_CONFIGS = {
            violence: [
                { key: 'cases',    label: '🚨 발생건수' },
                { key: 'verbal',   label: '🗣️ 언어' },
                { key: 'cyber',    label: '💻 사이버' },
                { key: 'exclude',  label: '👥 따돌림' },
                { key: 'physical', label: '🦴 신체' }
            ],
            composite: [
                { key: 'score',        label: '🏆 종합점수' },
                { key: 'extra_budget', label: '🎨 창제활동비' },
                { key: 'student',      label: '👥 학생수' }
            ],
            academic: [
                { key: 'avg',     label: '📚 국영수 평균' },
                { key: 'grade_a', label: '🥇 A등급 비율' },
                { key: 'korean',  label: '🇰🇷 국어' },
                { key: 'math',    label: '➕ 수학' }
            ],
            extracurricular: [
                { key: 'budget',  label: '💰 예산 높은순' },
                { key: 'student', label: '👥 학생수' }
            ],
            transfer: [
                { key: 'net',         label: '🔄 순전입' },
                { key: 'walk',        label: '🚶 도보 통학률' },
                { key: 'transfer_in', label: '⬆️ 전입생수' }
            ]
        };

        // 주요 구/군별 전국 대표 학교 데이터베이스 사전정의 (서버 JSON 미포함 타지역 조회 보완용)
        const REGIONAL_SCHOOL_PRESETS = {
            "경기도_고양시 덕양구": [
                { name: "행신중학교", type: "중학교", dong: "행신동", addr: "경기도 고양시 덕양구 용현로 35 (행신동)", lat: 37.6185, lng: 126.8341 },
                { name: "무원중학교", type: "중학교", dong: "행신동", addr: "경기도 고양시 덕양구 무원로 28 (행신동)", lat: 37.6142, lng: 126.8375 },
                { name: "서정중학교", type: "중학교", dong: "행신동", addr: "경기도 고양시 덕양구 서정마을로 26 (행신동)", lat: 37.6111, lng: 126.8432 },
                { name: "가람중학교", type: "중학교", dong: "행신동", addr: "경기도 고양시 덕양구 행신로 240 (행신동)", lat: 37.6225, lng: 126.8398 },
                { name: "화정중학교", type: "중학교", dong: "화정동", addr: "경기도 고양시 덕양구 화중로 70 (화정동)", lat: 37.6321, lng: 126.8329 },
                { name: "백양중학교", type: "중학교", dong: "화정동", addr: "경기도 고양시 덕양구 화신로 200 (화정동)", lat: 37.6384, lng: 126.8351 },
                { name: "지도중학교", type: "중학교", dong: "토당동", addr: "경기도 고양시 덕양구 토당로 60 (토당동)", lat: 37.6231, lng: 126.8192 },
                { name: "성사중학교", type: "중학교", dong: "성사동", addr: "경기도 고양시 덕양구 마상로 78 (성사동)", lat: 37.6512, lng: 126.8391 },
                { name: "신원중학교", type: "중학교", dong: "신원동", addr: "경기도 고양시 덕양구 신원로 45 (신원동)", lat: 37.6685, lng: 126.8872 },
                { name: "도래울중학교", type: "중학교", dong: "도내동", addr: "경기도 고양시 덕양구 도래울로 77 (도내동)", lat: 37.6415, lng: 126.8643 },
                { name: "삼송중학교", type: "중학교", dong: "삼송동", addr: "경기도 고양시 덕양구 삼송로 190 (삼송동)", lat: 37.6534, lng: 126.8951 },
                { name: "원당중학교", type: "중학교", dong: "주교동", addr: "경기도 고양시 덕양구 원당로 33 (주교동)", lat: 37.6581, lng: 126.8324 },
                { name: "행신고등학교", type: "고등학교", dong: "행신동", addr: "경기도 고양시 덕양구 행신로 180 (행신동)", lat: 37.6198, lng: 126.8352 },
                { name: "화정고등학교", type: "고등학교", dong: "화정동", addr: "경기도 고양시 덕양구 화신로 230 (화정동)", lat: 37.6391, lng: 126.8364 },
                { name: "무원고등학교", type: "고등학교", dong: "행신동", addr: "경기도 고양시 덕양구 무원로 40 (행신동)", lat: 37.6151, lng: 126.8389 },
                { name: "능곡고등학교", type: "고등학교", dong: "토당동", addr: "경기도 고양시 덕양구 토당로 100 (토당동)", lat: 37.6254, lng: 126.8210 },
                { name: "성사고등학교", type: "고등학교", dong: "성사동", addr: "경기도 고양시 덕양구 마상로 90 (성사동)", lat: 37.6531, lng: 126.8412 },
                { name: "행신초등학교", type: "초등학교", dong: "행신동", addr: "경기도 고양시 덕양구 행신로 150 (행신동)", lat: 37.6165, lng: 126.8320 },
                { name: "화정초등학교", type: "초등학교", dong: "화정동", addr: "경기도 고양시 덕양구 화중로 50 (화정동)", lat: 37.6305, lng: 126.8315 }
            ],
            "경기도_고양시 일산동구": [
                { name: "마두중학교", type: "중학교", dong: "마두동", addr: "경기도 고양시 일산동구 마두로 40 (마두동)", lat: 37.6582, lng: 126.7821 },
                { name: "백석중학교", type: "중학교", dong: "백석동", addr: "경기도 고양시 일산동구 백석로 70 (백석동)", lat: 37.6431, lng: 126.7915 },
                { name: "식사중학교", type: "중학교", dong: "식사동", addr: "경기도 고양시 일산동구 위시티로 25 (식사동)", lat: 37.6781, lng: 126.8095 },
                { name: "정발중학교", type: "중학교", dong: "정발산동", addr: "경기도 고양시 일산동구 정발산로 88 (정발산동)", lat: 37.6651, lng: 126.7782 },
                { name: "풍동중학교", type: "중학교", dong: "풍동", addr: "경기도 고양시 일산동구 숲속마을로 45 (풍동)", lat: 37.6712, lng: 126.7951 },
                { name: "백신고등학교", type: "고등학교", dong: "마두동", addr: "경기도 고양시 일산동구 일산로 200 (마두동)", lat: 37.6551, lng: 126.7812 },
                { name: "저현고등학교", type: "고등학교", dong: "식사동", addr: "경기도 고양시 일산동구 위시티2로 35 (식사동)", lat: 37.6795, lng: 126.8110 }
            ],
            "경기도_고양시 일산서구": [
                { name: "주엽중학교", type: "중학교", dong: "주엽동", addr: "경기도 고양시 일산서구 주엽로 50 (주엽동)", lat: 37.6695, lng: 126.7621 },
                { name: "대화중학교", type: "중학교", dong: "대화동", addr: "경기도 고양시 일산서구 대화로 110 (대화동)", lat: 37.6791, lng: 126.7482 },
                { name: "탄현중학교", type: "중학교", dong: "탄현동", addr: "경기도 고양시 일산서구 탄현로 75 (탄현동)", lat: 37.6942, lng: 126.7681 },
                { name: "일산동중학교", type: "중학교", dong: "일산동", addr: "경기도 고양시 일산서구 일산로 450 (일산동)", lat: 37.6851, lng: 126.7712 },
                { name: "주엽고등학교", type: "고등학교", dong: "주엽동", addr: "경기도 고양시 일산서구 강선로 90 (주엽동)", lat: 37.6681, lng: 126.7635 }
            ],
            "경기도_성남시 분당구": [
                { name: "서현중학교", type: "중학교", dong: "서현동", addr: "경기도 성남시 분당구 서현로 180 (서현동)", lat: 37.3782, lng: 127.1281 },
                { name: "수내중학교", type: "중학교", dong: "수내동", addr: "경기도 성남시 분당구 수내로 70 (수내동)", lat: 37.3712, lng: 127.1215 },
                { name: "정자중학교", type: "중학교", dong: "정자동", addr: "경기도 성남시 분당구 불정로 50 (정자동)", lat: 37.3621, lng: 127.1142 },
                { name: "내정중학교", type: "중학교", dong: "수내동", addr: "경기도 성남시 분당구 내정로 100 (수내동)", lat: 37.3745, lng: 127.1201 },
                { name: "판교중학교", type: "중학교", dong: "판교동", addr: "경기도 성남시 분당구 판교원로 200 (판교동)", lat: 37.3912, lng: 127.0982 }
            ],
            "경상북도_문경시": [
                { name: "점촌중학교", type: "중학교", dong: "점촌동", addr: "경상북도 문경시 중앙로 150 (점촌동)", lat: 36.5861, lng: 128.1865 },
                { name: "문경중학교", type: "중학교", dong: "모전동", addr: "경상북도 문경시 모전로 45 (모전동)", lat: 36.5812, lng: 128.1910 },
                { name: "문창고등학교", type: "고등학교", dong: "흥덕동", addr: "경상북도 문경시 흥덕로 80 (흥덕동)", lat: 36.5920, lng: 128.1982 },
                { name: "점촌고등학교", type: "고등학교", dong: "모전동", addr: "경상북도 문경시 모전로 90 (모전동)", lat: 36.5795, lng: 128.1890 },
                { name: "문경서중학교", type: "중학교", dong: "점촌동", addr: "경상북도 문경시 점촌1길 30 (점촌동)", lat: 36.5880, lng: 128.1840 },
                { name: "가은중학교", type: "중학교", dong: "가은읍", addr: "경상북도 문경시 가은읍 대야로 110", lat: 36.6350, lng: 127.9710 },
                { name: "산북중학교", type: "중학교", dong: "산북면", addr: "경상북도 문경시 산북면 금천로 250", lat: 36.6620, lng: 128.2450 }
            ]
        };

        // 1. 행정구역 데이터 로드 및 시도/구군/동 셀렉트 구성
        async function loadDistrictData() {
            try {
                // 1단계: import된 기본 행정구역 데이터가 있으면 즉시 반영
                if ((!rawDistrictData || rawDistrictData.length === 0) && typeof defaultDistrictData !== 'undefined' && defaultDistrictData && defaultDistrictData.data) {
                    rawDistrictData = defaultDistrictData.data;
                }

                // 2단계: 데이터가 아직 없으면 정적 파일 경로 순차 시도 (HTML 에러 페이지 파싱 방지)
                if (!rawDistrictData || rawDistrictData.length === 0) {
                    const pathsToTry = [
                        './src/data/korea-administrative-district.json',
                        './data/korea-administrative-district.json',
                        '/src/data/korea-administrative-district.json',
                        '/data/korea-administrative-district.json'
                    ];
                    for (const p of pathsToTry) {
                        try {
                            const res = await fetch(p);
                            const contentType = res.headers.get('content-type') || '';
                            if (res.ok && !contentType.includes('text/html')) {
                                const text = await res.text();
                                if (text && !text.trim().startsWith('<')) {
                                    const json = JSON.parse(text);
                                    if (json && Array.isArray(json.data) && json.data.length > 0) {
                                        rawDistrictData = json.data;
                                        break;
                                    }
                                }
                            }
                        } catch (pErr) {
                            // 다음 경로 시도
                        }
                    }
                }

                if (sidoSelect) {
                    sidoSelect.innerHTML = '';
                    const optAll = document.createElement('option');
                    optAll.value = 'all';
                    optAll.textContent = '전국 (전체 시/도)';
                    sidoSelect.appendChild(optAll);

                    if (rawDistrictData && rawDistrictData.length > 0) {
                        rawDistrictData.forEach(item => {
                            const sidoName = Object.keys(item)[0];
                            if (sidoName) {
                                const opt = document.createElement('option');
                                opt.value = sidoName;
                                opt.textContent = sidoName;
                                if (sidoName === '서울특별시') opt.selected = true;
                                sidoSelect.appendChild(opt);
                            }
                        });
                    } else {
                        sidoSelect.innerHTML = `
                            <option value="all">전국 (전체 시/도)</option>
                            <option value="서울특별시" selected>서울특별시</option>
                            <option value="경기도">경기도</option>
                        `;
                    }
                }
                updateGugunOptions('서울특별시');
                updateDongOptions('서울특별시', 'all');
            } catch (err) {
                console.warn('[TopicStats] 행정구역 데이터 로드 안내:', err);
                if (sidoSelect) {
                    sidoSelect.innerHTML = `
                        <option value="all">전국 (전체 시/도)</option>
                        <option value="서울특별시" selected>서울특별시</option>
                        <option value="경기도">경기도</option>
                    `;
                }
                updateGugunOptions('서울특별시');
                updateDongOptions('서울특별시', 'all');
            }
        }

        function updateGugunOptions(selectedSido, defaultGugunKeyword = '') {
            if (!gugunSelect) return;
            gugunSelect.innerHTML = '';

            const optAll = document.createElement('option');
            optAll.value = 'all';
            optAll.textContent = '전체 시/군/구';
            gugunSelect.appendChild(optAll);

            if (selectedSido !== 'all') {
                const sidoObj = rawDistrictData.find(item => item[selectedSido]);
                if (sidoObj && sidoObj[selectedSido]) {
                    const gugunList = sidoObj[selectedSido];
                    const addedSet = new Set();
                    gugunList.forEach(gugun => {
                        if (!addedSet.has(gugun)) {
                            addedSet.add(gugun);
                            const opt = document.createElement('option');
                            opt.value = gugun;
                            opt.textContent = gugun;
                            gugunSelect.appendChild(opt);
                        }
                    });
                }
            }

            if (defaultGugunKeyword) {
                for (let i = 0; i < gugunSelect.options.length; i++) {
                    if (gugunSelect.options[i].value.includes(defaultGugunKeyword)) {
                        gugunSelect.selectedIndex = i;
                        break;
                    }
                }
            }
            updateSubGuOptions(selectedSido, gugunSelect.value);
        }

        function updateSubGuOptions(selectedSido, selectedGugun) {
            if (!subGuSelect) return;
            subGuSelect.innerHTML = '';

            const hasSubGus = (selectedGugun && selectedGugun !== 'all' && !!SUB_DISTRICT_MAP[selectedGugun]);

            if (hasSubGus) {
                subGuSelect.style.display = '';
                const optAll = document.createElement('option');
                optAll.value = 'all';
                optAll.textContent = '전체 구';
                subGuSelect.appendChild(optAll);

                const subGus = SUB_DISTRICT_MAP[selectedGugun];
                subGus.forEach(subGu => {
                    const opt = document.createElement('option');
                    opt.value = subGu;
                    opt.textContent = subGu;
                    subGuSelect.appendChild(opt);
                });
            } else {
                subGuSelect.style.display = 'none';
                subGuSelect.value = 'all';
            }
            updateDongOptions(selectedSido, selectedGugun, hasSubGus ? subGuSelect.value : 'all');
        }



        function matchSido(school, selectedSido) {
            if (!selectedSido || selectedSido === 'all') return true;
            const region = school.region || '';
            const addr = school.address || '';

            const sidoAliasMap = {
                '서울특별시': ['서울'],
                '경기도': ['경기'],
                '인천광역시': ['인천'],
                '강원특별자치도': ['강원'],
                '강원도': ['강원'],
                '충청북도': ['충북', '충청북'],
                '충청남도': ['충남', '충청남'],
                '대전광역시': ['대전'],
                '세종특별자치시': ['세종'],
                '전북특별자치도': ['전북', '전라북'],
                '전라북도': ['전북', '전라북'],
                '전라남도': ['전남', '전라남'],
                '광주광역시': ['광주'],
                '경상북도': ['경북', '경상북'],
                '경상남도': ['경남', '경상남'],
                '대구광역시': ['대구'],
                '울산광역시': ['울산'],
                '부산광역시': ['부산'],
                '제주특별자치도': ['제주'],
                '제주도': ['제주']
            };

            const keywords = new Set([selectedSido, selectedSido.substring(0, 2)]);
            if (sidoAliasMap[selectedSido]) {
                sidoAliasMap[selectedSido].forEach(k => keywords.add(k));
            }
            for (const [key, aliases] of Object.entries(sidoAliasMap)) {
                if (selectedSido.includes(key.substring(0, 2)) || aliases.some(a => selectedSido.includes(a))) {
                    keywords.add(key);
                    keywords.add(key.substring(0, 2));
                    aliases.forEach(a => keywords.add(a));
                }
            }

            for (const kw of keywords) {
                if (kw && (addr.includes(kw) || region.includes(kw))) {
                    return true;
                }
            }
            return false;
        }

        const CITY_DONG_PRESETS = {
            // 서울특별시 (25개 구)
            '종로구': ['혜화동', '평창동', '부암동', '청운동', '신교동', '삼청동', '가회동', '종로1가', '종로2가', '종로3가', '종로4가', '종로5가', '종로6가', '이화동', '창신동', '숭인동', '무악동', '교남동', '사직동', '명륜동', '동숭동', '구기동', '신영동'],
            '중구': ['명동', '회현동', '필동', '장충동', '광희동', '을지로동', '신당동', '다산동', '약수동', '청구동', '황학동', '중림동', '소공동'],
            '용산구': ['후암동', '용산동', '갈월동', '남영동', '동자동', '서계동', '원효로동', '청파동', '한강로동', '이촌동', '이태원동', '한남동', '서빙고동', '보광동'],
            '성동구': ['왕십리동', '도선동', '마장동', '사근동', '행당동', '응봉동', '금호동', '옥수동', '성수동', '송정동', '용답동'],
            '광진구': ['중곡동', '능동', '구의동', '광장동', '자양동', '화양동', '군자동'],
            '동대문구': ['신설동', '용두동', '제기동', '전농동', '답십리동', '장안동', '청량리동', '회기동', '휘경동', '이문동'],
            '중랑구': ['면목동', '상봉동', '중화동', '망우동', '신내동'],
            '성북구': ['성북동', '돈암동', '안암동', '보문동', '정릉동', '길음동', '종암동', '하월곡동', '상월곡동', '장위동', '석관동', '삼선동', '동소문동'],
            '강북구': ['미아동', '번동', '수유동', '우이동', '삼양동', '송중동', '송천동', '삼각산동'],
            '도봉구': ['쌍문동', '방학동', '창동', '도봉동'],
            '노원구': ['월계동', '공릉동', '하계동', '중계동', '상계동'],
            '은평구': ['수색동', '증산동', '응암동', '역촌동', '신사동', '구산동', '불광동', '갈현동', '대조동', '녹번동', '진관동'],
            '서대문구': ['충정로동', '천연동', '북아현동', '홍제동', '신촌동', '연희동', '홍은동', '남가좌동', '북가좌동'],
            '마포구': ['아현동', '공덕동', '도화동', '용강동', '대흥동', '염리동', '신수동', '서교동', '동교동', '합정동', '망원동', '연남동', '성산동', '상암동'],
            '양천구': ['목동', '신월동', '신정동'],
            '강서구': ['염창동', '등촌동', '화곡동', '가양동', '마곡동', '발산동', '공항동', '방화동'],
            '구로구': ['신도림동', '구로동', '가리봉동', '고척동', '개봉동', '오류동', '궁동', '항동', '천왕동'],
            '금천구': ['가산동', '독산동', '시흥동'],
            '영등포구': ['영등포동', '여의도동', '당산동', '도림동', '문래동', '양평동', '신길동', '대림동'],
            '동작구': ['노량진동', '상도동', '흑석동', '동작동', '사당동', '대방동', '신대방동'],
            '관악구': ['봉천동', '신림동', '남현동', '보라매동', '청룡동', '낙성대동', '대학동', '은천동', '성현동'],
            '서초구': ['서초동', '반포동', '방배동', '잠원동', '양재동', '우면동', '내곡동', '신원동'],
            '강남구': ['대치동', '개포동', '도곡동', '압구정동', '삼성동', '역삼동', '청담동', '논현동', '일원동', '세곡동', '수서동', '자곡동'],
            '송파구': ['잠실동', '신천동', '가락동', '문정동', '방이동', '오금동', '송파동', '석촌동', '삼전동', '풍납동', '거여동', '마천동', '장지동'],
            '강동구': ['강일동', '상일동', '명일동', '고덕동', '암사동', '천호동', '성내동', '길동', '둔촌동'],

            // 경기도 (31개 시/군)
            '수원시': ['매교동', '매산동', '고등동', '화서동', '지동', '우만동', '인계동', '파장동', '율천동', '정자동', '영화동', '송죽동', '조원동', '연무동', '세류동', '평동', '서둔동', '구운동', '탑동', '금곡동', '호매실동', '권선동', '곡선동', '입북동', '매탄동', '원천동', '이의동', '영통동', '망포동', '신동'],
            '성남시': ['서현동', '수내동', '정자동', '야탑동', '판교동', '백현동', '이매동', '구미동', '신흥동', '태평동', '수진동', '단대동', '산성동', '양지동', '복정동', '성남동', '중앙동', '금광동', '은행동', '상대원동', '하대원동', '도촌동', '운중동', '대장동'],
            '고양시': ['행신동', '화정동', '삼송동', '원흥동', '성사동', '관산동', '신원동', '창릉동', '고양동', '동산동', '도내동', '주교동', '토당동', '마두동', '백석동', '식사동', '장항동', '풍동', '정발산동', '중산동', '주엽동', '대화동', '탄현동', '일산동', '덕이동', '가좌동'],
            '용인시': ['풍덕천동', '신봉동', '죽전동', '동천동', '고기동', '상현동', '성복동', '신갈동', '구갈동', '상갈동', '보라동', '지곡동', '서천동', '영덕동', '언남동', '마북동', '동백동', '보정동', '김량장동', '역북동', '삼가동', '유방동', '고림동', '포곡읍', '모현읍', '이동읍', '남사읍', '원삼면', '백암면', '양지면'],
            '안양시': ['비산동', '관양동', '평촌동', '호계동', '범계동', '안양동', '석수동', '박달동'],
            '부천시': ['심곡동', '부천동', '중동', '상동', '소사본동', '범박동', '괴안동', '송내동', '옥길동', '오정동', '원종동', '고강동'],
            '안산시': ['사동', '본오동', '부곡동', '일동', '월피동', '성포동', '고잔동', '와동', '신길동', '원곡동', '초지동', '선부동', '대부동'],
            '화성시': ['봉담읍', '우정읍', '향남읍', '남양읍', '매송면', '비봉면', '마도면', '송산면', '서신면', '팔탄면', '장안면', '양감면', '정남면', '새솔동', '진안동', '병점동', '능동', '기산동', '반월동', '반송동', '석우동', '오산동', '청계동', '영천동', '중동', '신동', '목동', '산척동', '송동'],
            '평택시': ['팽성읍', '안중읍', '포승읍', '청북읍', '진위면', '서탄면', '고덕면', '오성면', '현덕면', '서정동', '장당동', '지제동', '통복동', '합정동', '비전동', '동삭동', '세교동'],
            '김포시': ['통진읍', '고촌읍', '양촌읍', '대곶면', '월곶면', '하성면', '사우동', '풍무동', '장기동', '구래동', '운양동', '마산동'],
            '남양주시': ['와부읍', '진접읍', '화도읍', '진건읍', '오남읍', '별내면', '수동면', '조안면', '퇴계원읍', '호평동', '평내동', '금곡동', '양정동', '다산동', '별내동'],
            '파주시': ['문산읍', '조리읍', '법원읍', '파주읍', '광탄면', '탄현면', '월롱면', '적성면', '금촌동', '교하동', '야당동', '다율동', '목동동', '동패동'],
            '의정부시': ['의정부동', '호원동', '장암동', '신곡동', '용현동', '민락동', '금오동', '가능동', '녹양동', '고산동'],
            '시흥시': ['대야동', '신천동', '은행동', '매화동', '목감동', '장현동', '능곡동', '군자동', '월곶동', '정왕동', '죽율동'],
            '광주시': ['초월읍', '곤지암읍', '퇴촌면', '남종면', '남한산성면', '경안동', '쌍령동', '송정동', '광남동', '태전동'],
            '광명시': ['광명동', '철산동', '하안동', '소하동', '일직동'],
            '하남시': ['천현동', '덕풍동', '풍산동', '미사동', '신장동', '감북동', '감일동', '위례동', '학암동'],
            '양주시': ['백석읍', '은현면', '남면', '광적면', '장흥면', '유양동', '고읍동', '덕정동', '옥정동', '덕계동'],
            '군포시': ['군포동', '산본동', '금정동', '당동', '당정동', '부곡동', '대야미동'],
            '오산시': ['중앙동', '남촌동', '신장동', '세마동', '초평동', '대원동', '양산동', '금암동', '수청동', '은계동', '오산동'],
            '이천시': ['장호원읍', '부발읍', '신둔면', '백사면', '호법면', '마장면', '대월면', '창전동', '관고동', '중리동', '증포동', '갈산동', '송정동'],
            '안성시': ['공도읍', '보개면', '금광면', '서운면', '미양면', '대덕면', '양성면', '원곡면', '고삼면', '일죽면', '죽산면', '삼죽면', '안성동', '석정동', '아양동'],
            '구리시': ['갈매동', '사노동', '인창동', '교문동', '수택동', '아천동', '토평동'],
            '의왕시': ['고천동', '이동', '삼동', '오전동', '내손동', '포일동', '청계동'],
            '포천시': ['소흘읍', '군내면', '내촌면', '가산면', '신북면', '창수면', '영중면', '일동면', '이동면', '영북면', '신읍동', '선단동'],
            '양평군': ['양평읍', '강상면', '강하면', '양서면', '옥천면', '서종면', '단월면', '청운면', '양동면', '지평면', '용문면', '개군면'],
            '여주시': ['가남읍', '점동면', '흥천면', '금사면', '산북면', '대신면', '북내면', '강천면', '세종대왕면', '여흥동', '중앙동', '오학동'],
            '동두천시': ['생연동', '보산동', '동두천동', '상봉암동', '하봉암동', '상패동', '광암동'],
            '가평군': ['가평읍', '설악면', '청평면', '상면', '조종면', '북면'],
            '연천군': ['연천읍', '전곡읍', '군남면', '청산면', '백학면', '미산면', '왕징면', '신서면', '중면', '장남면'],

            // 인천광역시
            '연수구': ['옥련동', '선학동', '연수동', '청학동', '동춘동', '송도동'],
            '남동구': ['구월동', '간석동', '만수동', '장수동', '서창동', '남촌동', '논현동', '고잔동'],
            '부평구': ['부평동', '십정동', '산곡동', '청천동', '삼산동', '갈산동', '부개동', '일신동'],
            '계양구': ['효성동', '계산동', '작전동', '서운동', '방축동', '박촌동', '동양동', '귤현동'],
            '서구': ['검암동', '경서동', '공촌동', '연희동', '심곡동', '가정동', '신현동', '석남동', '가좌동', '마전동', '당하동', '원당동', '왕길동', '불로동', '청라동'],
            '미추홀구': ['숭의동', '용현동', '학익동', '도화동', '주안동', '관교동', '문학동'],
            '중구': ['신포동', '신흥동', '도원동', '율목동', '동인천동', '북성동', '송월동', '운남동', '운북동', '운서동', '중산동', '무의동'],
            '동구': ['만석동', '화수동', '송현동', '화평동', '창영동', '금곡동', '송림동'],
            '강화군': ['강화읍', '선원면', '불은면', '길상면', '화도면', '양도면', '내가면', '하점면', '양사면', '송해면', '교동면', '삼산면', '서도면'],
            '옹진군': ['백령면', '대청면', '연평면', '광도면', '덕적면', '자월면', '영흥면'],

            // 부산광역시
            '해운대구': ['우동', '중동', '좌동', '송정동', '반여동', '반송동', '재송동'],
            '수영구': ['남천동', '수영동', '망미동', '광안동', '민락동'],
            '남구': ['대연동', '용호동', '용당동', '문현동', '우암동', '감만동'],
            '부산진구': ['부전동', '범전동', '연지동', '초읍동', '양정동', '전포동', '부암동', '당감동', '가야동', '개금동', '범천동'],
            '동래구': ['명장동', '안락동', '칠산동', '낙민동', '복천동', '수안동', '명륜동', '온천동', '사직동'],
            '금정구': ['두구동', '노포동', '청룡동', '남산동', '구서동', '장전동', '부곡동', '서동', '금사동', '회동동'],
            '연제구': ['거제동', '연산동'],
            '사하구': ['괴정동', '당리동', '하단동', '신평동', '장림동', '다대동', '구평동', '감천동'],
            '사상구': ['삼락동', '모라동', '덕포동', '괘법동', '감전동', '주례동', '학장동', '엄궁동'],
            '강서구': ['대저동', '강동동', '명지동', '죽림동', '식만동', '송정동', '화전동', '녹산동', '생곡동', '지사동', '미음동', '신호동'],
            '기장군': ['기장읍', '장안읍', '정관읍', '일광읍', '철마면'],
            '북구': ['금곡동', '화명동', '덕천동', '만덕동', '구포동'],
            '동구': ['초량동', '수정동', '좌천동', '범일동'],
            '서구': ['동대신동', '서대신동', '부용동', '부민동', '토성동', '아미동', '초장동', '충무동', '남부민동', '암남동'],
            '중구': ['영주동', '중앙동', '동광동', '대청동', '보수동', '부평동', '광복동', '남포동'],
            '영도구': ['대교동', '대평동', '남항동', '영선동', '신선동', '봉래동', '청학동', '동삼동'],

            // 대구광역시
            '수성구': ['범어동', '만촌동', '수성동', '황금동', '중동', '상동', '파동', '두산동', '지산동', '범물동', '시지동', '매호동', '신매동', '노변동'],
            '달서구': ['성당동', '두류동', '파호동', '신당동', '이곡동', '장기동', '용산동', '죽전동', '감삼동', '본리동', '상인동', '도원동', '진천동', '유천동', '월성동', '송현동'],
            '동구': ['신암동', '신천동', '효목동', '불로동', '봉무동', '지저동', '동촌동', '방촌동', '해안동', '안심동', '공산동'],
            '북구': ['고성동', '칠성동', '침산동', '노원동', '산격동', '복현동', '검단동', '태전동', '구암동', '관음동', '읍내동', '동천동', '국우동'],
            '중구': ['동인동', '삼덕동', '성내동', '남산동', '대봉동'],
            '남구': ['이천동', '봉덕동', '대명동'],
            '서구': ['내당동', '비산동', '평리동', '상중이동', '원대동'],
            '달성군': ['화원읍', '논공읍', '다사읍', '가창면', '하빈면', '옥포읍', '현풍읍', '유가읍', '구지면'],
            '군위군': ['군위읍', '소보면', '효령면', '부계면', '우보면', '의흥면', '산성면', '삼국유사면'],

            // 광주광역시
            '남구': ['양림동', '방림동', '봉선동', '사직동', '월산동', '백운동', '주월동', '진월동', '노대동', '송하동', '대촌동'],
            '북구': ['중흥동', '신안동', '용봉동', '운암동', '동림동', '우산동', '풍향동', '문화동', '문흥동', '두암동', '삼각동', '일곡동', '매곡동', '오치동', '건국동', '양산동'],
            '서구': ['양동', '농성동', '광천동', '유덕동', '치평동', '상무동', '화정동', '서창동', '금호동', '풍암동', '동천동'],
            '동구': ['충장동', '계림동', '산수동', '지산동', '학동', '학운동', '지원동'],
            '광산구': ['송정동', '도산동', '신촌동', '우산동', '월곡동', '비아동', '첨단동', '신가동', '신창동', '운남동', '수완동', '하남동', '임곡동', '동곡동', '평동', '삼도동', '본량동'],

            // 대전광역시
            '유성구': ['원신흥동', '상대동', '봉명동', '구암동', '덕명동', '장대동', '궁동', '어은동', '신성동', '전민동', '관평동', '송강동', '구즉동', '진잠동', '학하동'],
            '서구': ['복수동', '정림동', '변동', '용문동', '탄방동', '둔산동', '괴정동', '가장동', '내동', '갈마동', '월평동', '만년동', '가수원동', '도안동', '관저동', '기성동'],
            '중구': ['은행선화동', '목동', '중촌동', '대흥동', '문창동', '석교동', '대사동', '부사동', '용두동', '오류동', '태평동', '유천동', '문화동', '산성동'],
            '동구': ['중앙동', '신인동', '효동', '판암동', '용운동', '대동', '자양동', '가양동', '용전동', '성남동', '홍도동', '삼성동', '대청동', '산내동'],
            '대덕구': ['오정동', '대화동', '회덕동', '비래동', '송촌동', '중리동', '법동', '신탄진동', '석봉동', '덕암동', '목상동'],

            // 울산광역시
            '남구': ['신정동', '달동', '삼산동', '야음동', '선암동', '무거동', '옥동'],
            '중구': ['학성동', '반구동', '복산동', '북정동', '성남동', '우정동', '태화동', '다운동', '병영동', '약사동'],
            '동구': ['방어동', '일산동', '화정동', '대송동', '전하동', '남목동'],
            '북구': ['농소동', '강동동', '효문동', '송정동', '양정동', '염포동'],
            '울주군': ['언양읍', '범서읍', '온산읍', '온양읍', '청량읍', '삼남읍', '서생면', '웅촌면', '두동면', '두서면', '상북면', '삼동면'],

            // 세종특별자치시
            '세종특별자치시': ['나성동', '새롬동', '다정동', '어진동', '도담동', '아름동', '고운동', '보람동', '소담동', '반곡동', '해밀동', '산울동', '집현동', '합강동', '조치원읍', '연기면', '연동면', '부강면', '금남면', '장군면', '연서면', '전의면', '전동면', '소정면'],

            // 경상북도
            '포항시': ['지곡동', '두호동', '장성동', '양덕동', '대도동', '상도동', '이동', '효자동', '대잠동', '연일읍', '흥해읍', '오천읍', '구룡포읍', '청하면', '송라면', '기계면', '죽장면', '상대동', '해도동', '송도동', '청림동', '제철동', '중앙동', '양학동', '죽도동', '용흥동', '환여동'],
            '경주시': ['동천동', '황성동', '성건동', '용강동', '충효동', '황오동', '외동읍', '안강읍', '건천읍', '감포읍', '양남면', '문무대왕면', '내남면', '산내면', '서면', '현곡면', '강동면', '천북면', '중부동', '황남동', '월성동', '불국동', '보덕동'],
            '김천시': ['율곡동', '신음동', '부곡동', '다수동', '평화동', '덕곡동', '아포읍', '농소면', '남면', '개령면', '감문면', '어모면', '봉산면', '대항면', '감천면', '조마면', '구성면', '지례면', '부항면', '대덕면', '증산면', '자산동', '양금동', '대신동', '대곡동', '지좌동'],
            '안동시': ['옥동', '송현동', '태화동', '용상동', '정하동', '당북동', '풍산읍', '와룡면', '북후면', '서후면', '풍천면', '일직면', '남후면', '남선면', '임동면', '임하면', '길안면', '덕구면', '예안면', '도산면', '녹전면', '중구동', '명륜동', '서구동', '평화동', '안기동', '송하동'],
            '구미시': ['옥계동', '인의동', '진평동', '구평동', '형곡동', '송정동', '원평동', '봉곡동', '도량동', '사곡동', '상모동', '선산읍', '고아읍', '무을면', '옥성면', '도개면', '해평면', '산동읍', '장천면', '지산동', '비산동', '공단동', '광평동', '임오동', '인동동', '진미동', '양포동'],
            '영주시': ['가흥동', '휴천동', '하망동', '상망동', '영주동', '풍기읍', '이산면', '평은면', '문수면', '장수면', '안정면', '봉현면', '순흥면', '단산면', '부석면'],
            '영천시': ['망정동', '야사동', '문외동', '완산동', '금호읍', '청통면', '신녕면', '화산면', '화북면', '화남면', '자양면', '임고면', '고경면', '북안면', '대창면', '동부동', '중앙동', '서부동', '남부동'],
            '상주시': ['남성동', '성하동', '성동동', '복룡동', '신봉동', '서성동', '서곡동', '화산동', '계산동', '낙상동', '중덕동', '초산동', '부원동', '무양동', '낙양동', '개운동', '흥덕동', '지천동', '병성동', '도남동', '거동동', '인평동', '서문동', '헌신동', '남원동', '북문동', '계림동', '동문동', '동성동', '신흥동', '함창읍', '사벌국면', '중동면', '낙동면', '청리면', '공성면', '외남면', '내서면', '모동면', '모서면', '화동면', '화서면', '화북면', '외서면', '은척면', '공검면', '이안면', '화남면'],
            '문경시': ['점촌동', '모전동', '흥덕동', '우지동', '창구동', '신영동', '가은읍', '문경읍', '마성면', '농암면', '산북면', '동로면', '산양면', '호계면', '영순면', '공평동', '불정동', '유곡동', '신기동', '점촌1동', '점촌2동', '점촌3동', '점촌4동', '점촌5동'],
            '경산시': ['중방동', '계양동', '사동', '삼북동', '옥산동', '정평동', '대평동', '하양읍', '진량읍', '압량읍', '와촌면', '자인면', '용성면', '남산면', '남천면', '중앙동', '남부동', '서부동'],
            '의성군': ['의성읍', '단촌면', '점곡면', '옥산면', '사곡면', '춘산면', '가음면', '금성면', '봉양면', '비안면', '구천면', '단밀면', '단북면', '안계면', '다인면', '신평면', '안평면', '안사면'],
            '청송군': ['청송읍', '주왕산면', '부남면', '현동면', '현서면', '안덕면', '파천면', '진보면'],
            '영양군': ['영양읍', '입암면', '청기면', '일월면', '수비면', '석보면'],
            '영덕군': ['영덕읍', '강구면', '남정면', '달산면', '지품면', '축산면', '영해면', '병곡면', '창수면'],
            '청도군': ['청도읍', '화양읍', '각남면', '각북면', '이서면', '운문면', '금천면', '매전면', '풍각면'],
            '고령군': ['대가야읍', '덕곡면', '운수면', '성산면', '다산면', '개진면', '우곡면', '쌍림면'],
            '성주군': ['성주읍', '선남면', '용암면', '수륜면', '가천면', '금수강산면', '대가면', '벽진면', '초전면', '월항면'],
            '칠곡군': ['왜관읍', '북삼읍', '석적읍', '지천면', '동명면', '가산면', '약목면', '기산면'],
            '예천군': ['예천읍', '용문면', '감천면', '보문면', '유천면', '용궁면', '개포면', '지보면', '풍양면', '호명읍', '은풍면', '효자면'],
            '봉화군': ['봉화읍', '물야면', '봉성면', '법전면', '춘양면', '소천면', '석포면', '명호면', '상운면', '재산면'],
            '울진군': ['울진읍', '평해읍', '북면', '금강송면', '근남면', '매화면', '기성면', '온정면', '죽변면', '후포면'],
            '울릉군': ['울릉읍', '서면', '북면'],

            // 경상남도
            '창원시': ['상남동', '용호동', '신월동', '사파동', '가음동', '남양동', '팔용동', '명서동', '월영동', '자산동', '석동', '풍호동', '내서읍', '동읍', '북면', '대산면', '반송동', '중앙동', '웅남동', '구산면', '진전면', '진북면', '회원동', '양덕동', '합성동', '구암동', '봉암동', '충무동', '여좌동', '태백동', '경화동', '병암동', '웅천동', '웅동'],
            '김해시': ['내동', '외동', '삼계동', '구산동', '부원동', '동상동', '율하동', '장유동', '진영읍', '한림면', '생림면', '상동면', '대동면', '회현동', '불암동', '칠산서부동'],
            '진주시': ['평거동', '신안동', '초전동', '하대동', '상대동', '가좌동', '호탄동', '충무공동', '문산읍', '내동면', '정촌면', '금곡면', '진성면', '전설면', '일반성면', '이반성면', '사봉면', '지수면', '대곡면', '금산면', '명석면', '대평면', '수곡면', '천전동', '성북동', '중앙동', '상봉동', '이현동'],
            '양산시': ['물금읍', '동면', '덕계동', '평산동', '삼호동', '북정동', '중부동', '남부동', '상북면', '하북면', '원동면', '강서동', '중앙동', '삼성동'],
            '거제시': ['고현동', '옥포동', '장평동', '상문동', '수양동', '아주동', '장승포동', '일운면', '동부면', '남부면', '거제면', '둔덕면', '사등면', '연초면', '하청면', '장목면', '능포동'],
            '통영시': ['무전동', '광도면', '죽림리', '미수동', '봉평동', '북신동', '도산면', '용남면', '산양읍', '한산면', '욕지면', '사량면', '중앙동', '명정동', '정량동'],
            '사천시': ['벌리동', '선구동', '동금동', '사천읍', '정동면', '사남면', '용현면', '축동면', '곤양면', '곤명면', '서포면', '향촌동', '남양동'],
            '밀양시': ['삼문동', '내이동', '교동', '가곡동', '하남읍', '삼랑진읍', '단장면', '산외면', '산내면', '부북면', '상동면', '상남면', '초동면', '무안면', '청도면', '내일동'],
            '함안군': ['가야읍', '칠원읍', '함안면', '군북면', '법수면', '대산면', '칠서면', '칠북면', '산인면', '여항면'],
            '거창군': ['거창읍', '주상면', '웅양면', '고제면', '남상면', '남하면', '신원면', '가조면', '가북면', '월성면', '위천면', '마리면', '북상면'],
            '창녕군': ['창녕읍', '남지읍', '고암면', '창녕면', '대합면', '대화면', '계성면', '영산면', '장마면', '도천면', '부곡면', '이방면', '유어면', '길곡면'],
            '고성군': ['고성읍', '삼산면', '하일면', '하이면', '상리면', '대가면', '영현면', '영오면', '개천면', '구만면', '회화면', '마암면', '동해면', '거류면'],
            '하동군': ['하동읍', '화개면', '악양면', '적량면', '삼승면', '옥종면', '북천면', '청암면', '고전면', '금남면', '금성면', '진교면', '양보면'],
            '합천군': ['합천읍', '봉산면', '묘산면', '가야면', '야로면', '가회면', '대병면', '용주면', '율곡면', '초계면', '쌍책면', '덕곡면', '청덕면', '적중면', '대양면', '삼가면', '쌍백면'],
            '남해군': ['남해읍', '이동면', '상주면', '삼동면', '미조면', '남면', '서면', '고현면', '설천면', '창선면'],
            '함양군': ['함양읍', '마천면', '휴천면', '유림면', '수동면', '지곡면', '안의면', '서상면', '서하면', '백전면', '병곡면'],
            '산청군': ['산청읍', '차황면', '오부면', '생초면', '금서면', '삼장면', '시천면', '단성면', '신안면', '생비량면', '신등면'],
            '의령군': ['의령읍', '가례면', '칠곡면', '대의면', '궁류면', '봉수면', '부림면', '낙서면', '지정면', '용덕면', '정곡면', '화정면', '유곡면'],

            // 충청북도
            '청주시': ['가경동', '복대동', '비하동', '성화동', '산남동', '분평동', '용암동', '금천동', '율량동', '주중동', '오창읍', '오송읍', '내수읍', '낭성면', '미원면', '가덕면', '남일면', '문의면', '현도면', '강내면', '옥산면', '중앙동', '성안동', '탑대성동', '영운동', '용담동', '사직동', '사창동', '모충동', '수곡동', '운천동', '신봉동', '봉명동', '우암동', '내덕동'],
            '충주시': ['칠금동', '연수동', '호암동', '교현동', '문화동', '용산동', '성서동', '주덕읍', '살미면', '수안보면', '대소원면', '신니면', '노은면', '앙성면', '중앙탑면', '금가면', '동량면', '산척면', '엄정면', '소태면', '성내동', '충인동', '지현동', '달천동', '봉방동'],
            '제천시': ['장락동', '청전동', '하소동', '고암동', '중앙로', '신백동', '봉양읍', '금성면', '청풍면', '수산면', '덕산면', '한수면', '백운면', '송학면', '교동', '남현동', '영서동', '용두동'],
            '보은군': ['보은읍', '속리산면', '장안면', '마로면', '탄부면', '삼승면', '수한면', '회남면', '회인면', '내북면', '산외면'],
            '옥천군': ['옥천읍', '동이면', '안남면', '안내면', '청성면', '청산면', '이원면', '군서면', '군북면'],
            '영동군': ['영동읍', '용산면', '황간면', '추풍령면', '매곡면', '상촌면', '양강면', '용화면', '학산면', '양산면', '심천면'],
            '증평군': ['증평읍', '도안면'],
            '진천군': ['진천읍', '덕산읍', '초평면', '문백면', '백곡면', '이월면', '광혜원면'],
            '괴산군': ['괴산읍', '감물면', '장연면', '연풍면', '칠성면', '문광면', '청천면', '청안면', '사리면', '소수면', '불정면'],
            '음성군': ['음성읍', '금왕읍', '소이면', '원남면', '맹동면', '대소면', '삼성면', '생극면', '감곡면'],
            '단양군': ['단양읍', '매포읍', '단성면', '대강면', '가곡면', '영춘면', '어상천면', '적성면'],

            // 충청남도
            '천안시': ['불당동', '쌍용동', '백석동', '두정동', '성정동', '신부동', '청수동', '삼룡동', '신방동', '목천읍', '성환읍', '풍세면', '광덕면', '북면', '성거읍', '직산읍', '입장면', '병천면', '동면', '중앙동', '문성동', '원성동', '봉명동', '일봉동', '청룡동'],
            '공주시': ['신관동', '금학동', '옥룡동', '중학동', '유구읍', '이인면', '탄천면', '계룡면', '반포면', '의당면', '정안면', '우성면', '사곡면', '신풍면', '웅진동'],
            '아산시': ['배방읍', '탕정면', '모종동', '풍기동', '용화동', '온천동', '권곡동', '둔포면', '염치읍', '송악면', '선장면', '도고면', '신창면', '음봉면'],
            '서산시': ['동문동', '읍내동', '석남동', '예천동', '부춘동', '대산읍', '인지면', '부석면', '팔봉면', '지곡면', '성연면', '음암면', '운산면', '해미면', '고북면', '수석동'],
            '당진시': ['원당동', '읍내동', '수청동', '채운동', '송악읍', '합덕읍', '고대면', '석문면', '대호지면', '정미면', '면천면', '순성면', '우강면', '신평면', '송산면', '당진동'],
            '논산시': ['취암동', '부창동', '내동', '강경읍', '연무읍', '성동면', '광석면', '노성면', '상월면', '부적면', '연산면', '벌곡면', '양촌면', '가야곡면', '채운면'],
            '계룡시': ['두마면', '엄사면', '신도안면', '금암동'],
            '보령시': ['동대동', '명천동', '대천동', '웅천읍', '주포면', '주교면', '오천면', '천북면', '청소면', '청라면', '남포면', '주산면', '미산면', '성주면'],
            '금산군': ['금산읍', '금성면', '제원면', '부리면', '군북면', '남일면', '남이면', '진산면', '복수면', '추부면'],
            '부여군': ['부여읍', '규암면', '은산면', '외산면', '내산면', '구룡면', '홍산면', '옥산면', '남면', '충화면', '양화면', '임천면', '장암면', '세도면', '석성면', '초촌면'],
            '서천군': ['서천읍', '장항읍', '마서면', '화양면', '기산면', '한산면', '마산면', '시초면', '문산면', '판교면', '서면', '비인면', '종천면'],
            '청양군': ['청양읍', '운곡면', '대치면', '정산면', '목면', '청남면', '장평면', '남양면', '화성면', '비봉면'],
            '홍성군': ['홍성읍', '광천읍', '홍북읍', '금마면', '홍동면', '장곡면', '은하면', '결성면', '서부면', '갈산면', '구항면'],
            '예산군': ['예산읍', '삽교읍', '대술면', '신양면', '광시면', '대흥면', '응봉면', '덕산면', '봉산면', '고덕면', '신암면', '오가면'],
            '태안군': ['태안읍', '안면읍', '고남면', '남면', '근흥면', '소원면', '원북면', '이원면'],

            // 전북특별자치도
            '전주시': ['효자동', '삼천동', '평화동', '서신동', '중화산동', '송천동', '덕진동', '호성동', '인후동', '아중리', '혁신도시', '중앙동', '풍남동', '노송동', '완산동', '동서학동', '서서학동', '금암동', '팔복동', '우아동', '조촌동', '여의동'],
            '익산시': ['영등동', '어양동', '부송동', '모현동', '남중동', '신동', '마동', '함열읍', '오산면', '황등면', '함라면', '웅포면', '성당면', '용안면', '용동면', '낭산면', '망성면', '여산면', '금마면', '왕궁면', '춘포면', '삼기면', '중앙동', '평화동', '인화동', '동산동'],
            '군산시': ['수송동', '나운동', '지곡동', '미룡동', '조촌동', '경장동', '소룡동', '옥구읍', '옥산면', '회현면', '임피면', '서수면', '대야면', '개정면', '성산면', '나포면', '옥도면', '옥구면', '해신동', '월명동', '삼학동', '신풍동', '중앙동', '흥남동', '구암동'],
            '정읍시': ['수성동', '시기동', '연지동', '상동', '신태인읍', '북면', '입암면', '소성면', '고부면', '영원면', '덕천면', '이평면', '정우면', '태인면', '감곡면', '옹동면', '칠보면', '산내면', '산외면', '장명동', '내장상동', '농소동', '상교동'],
            '김제시': ['요촌동', '신풍동', '검산동', '만경읍', '용지면', '백구면', '부량면', '공덕면', '청하면', '성덕면', '진봉면', '금구면', '봉남면', '황산면', '금산면', '광활면', '교월동'],
            '남원시': ['도통동', '향교동', '노암동', '죽항동', '운봉읍', '주천면', '수지면', '송동면', '주생면', '금지면', '대강면', '사매면', '덕과면', '보절면', '산동면', '이백면', '아영면', '산내면', '동충동', '왕정동'],
            '완주군': ['삼례읍', '봉동읍', '용진읍', '상관면', '이서면', '소양면', '구이면', '고산면', '비봉면', '운주면', '화산면', '동상면', '경천면'],
            '고창군': ['고창읍', '고수면', '아산면', '무장면', '공음면', '상하면', '해리면', '성송면', '대산면', '심원면', '흥덕면', '성내면', '신림면', '부안면'],
            '부안군': ['부안읍', '주산면', '동진면', '행안면', '계화면', '보안면', '변산면', '진서면', '백산면', '상서면', '하서면', '줄포면', '위도면'],
            '임실군': ['임실읍', '청웅면', '운암면', '신평면', '성수면', '오수면', '삼계면', '관촌면', '강진면', '덕치면', '지사면'],
            '순창군': ['순창읍', '인계면', '동계면', '적성면', '유등면', '풍산면', '금과면', '팔덕면', '복흥면', '쌍치면', '구림면'],
            '진안군': ['진안읍', '용담면', '안천면', '동향면', '상전면', '백운면', '성수면', '마령면', '부귀면', '정천면', '주천면'],
            '장수군': ['장수읍', '산서면', '번암면', '장계면', '천천면', '계남면', '계북면'],
            '무주군': ['무주읍', '무풍면', '설천면', '적상면', '안성면', '부남면'],

            // 전라남도
            '여수시': ['웅천동', '학동', '여서동', '문수동', '쌍봉동', '시전동', '미평동', '둔덕동', '돌산읍', '소라면', '율촌면', '화양면', '남면', '화정면', '삼산면', '동문동', '한려동', '중앙동', '충무동', '광림동', '서강동', '대교동', '국동', '월호동', '만덕동', '주삼동', '삼일동', '묘도동'],
            '순천시': ['조례동', '연향동', '왕지동', '덕월동', '석현동', '용당동', '신대리', '해룡면', '승주읍', '주암면', '송광면', '외서면', '낙안면', '별량면', '상사면', '서면', '황전면', '월등면', '향동', '매곡동', '삼산동', '조곡동', '덕연동', '풍덕동', '남제동', '저전동', '장천동', '중앙동', '왕조동'],
            '목포시': ['옥암동', '남악리', '용당동', '상동', '하당동', '석현동', '연산동', '산정동', '원산동', '대성동', '목원동', '동명동', '삼학동', '만호동', '유달동', '죽교동', '북항동', '용해동', '이로동', '부흥동', '신흥동'],
            '광양시': ['중동', '마동', '광양읍', '금호동', '태인동', '봉강면', '옥룡면', '옥곡면', '진상면', '진월면', '다압면', '골약동', '중마동', '광영동'],
            '나주시': ['빛가람동', '성북동', '송월동', '남평읍', '세지면', '왕곡면', '반남면', '공산면', '동강면', '다도면', '봉황면', '산포면', '금천면', '노안면', '문평면', '다시면', '영강동', '금남동', '영산동', '이창동'],
            '무안군': ['무안읍', '일로읍', '삼향읍', '몽탄면', '청계면', '망운면', '운남면', '해제면', '현경면'],
            '해남군': ['해남읍', '삼산면', '화산면', '현산면', '송지면', '북평면', '북일면', '옥천면', '계곡면', '마산면', '황산면', '산이면', '문내면', '화원면'],
            '고흥군': ['고흥읍', '도양읍', '풍양면', '도덕면', '금산면', '도화면', '포두면', '봉래면', '점암면', '영남면', '과역면', '남양면', '동강면', '대서면', '두원면', '동일면'],
            '화순군': ['화순읍', '한천면', '춘양면', '청풍면', '이양면', '능주면', '도곡면', '도암면', '이서면', '백아면', '동복면', '사평면', '동면'],
            '영암군': ['영암읍', '삼호읍', '덕진면', '금정면', '신북면', '시종면', '군서면', '서호면', '학산면', '미암면', '도포면'],
            '영광군': ['영광읍', '백수읍', '홍농읍', '대마면', '묘량면', '불갑면', '군서면', '군남면', '염산면', '법성면', '낙월면'],
            '완도군': ['완도읍', '금일읍', '노화읍', '군외면', '신지면', '고금면', '약산면', '청산면', '소안면', '보길면', '생일면'],
            '담양군': ['담양읍', '봉산면', '고서면', '가사문학면', '창평면', '대덕면', '무정면', '금성면', '용면', '월산면', '수북면', '대전면'],
            '장성군': ['장성읍', '진원면', '남면', '동화면', '삼서면', '삼계면', '황룡면', '서삼면', '북일면', '북이면', '북하면'],
            '보성군': ['보성읍', '벌교읍', '노동면', '미력면', '겸백면', '율어면', '복내면', '문덕면', '조성면', '득량면', '회천면', '웅치면'],
            '신안군': ['지도읍', '압해읍', '증도면', '임자면', '자은면', '비금면', '도초면', '흑산면', '하의면', '신의면', '장산면', '안좌면', '팔금면', '암태면'],
            '장흥군': ['장흥읍', '관산읍', '대덕읍', '용산면', '안양면', '장동면', '장평면', '유치면', '회진면', '부산면'],
            '강진군': ['강진읍', '군동면', '칠량면', '대구면', '마량면', '도암면', '신전면', '성전면', '작천면', '병영면', '옴천면'],
            '함평군': ['함평읍', '손불면', '신광면', '학교면', '엄다면', '대동면', '나산면', '해보면', '월야면'],
            '진도군': ['진도읍', '군내면', '고군면', '의신면', '임회면', '지산면', '조도면'],
            '곡성군': ['곡성읍', '오곡면', '삼기면', '봉두면', '목사동면', '죽곡면', '고달면', '옥과면', '입면', '겸면', '오산면'],
            '구례군': ['구례읍', '문척면', '간전면', '토지면', '마산면', '광의면', '용방면', '산동면'],

            // 강원특별자치도
            '춘천시': ['퇴계동', '석사동', '후평동', '온의동', '칠전동', '근화동', '소양동', '신북읍', '동면', '동산면', '신동면', '동내면', '남면', '남산면', '서면', '사북면', '북산면', '교동', '조운동', '약사명동', '근화동', '강남동', '신사우동'],
            '원주시': ['무실동', '단구동', '반곡동', '단계동', '명륜동', '태장동', '문막읍', '소초면', '호저면', '지정면', '부론면', '귀래면', '흥업면', '판부면', '신림면', '중앙동', '원인동', '일산동', '학성동', '봉산동', '우산동', '반곡관설동'],
            '강릉시': ['교동', '포남동', '입암동', '홍제동', '내곡동', '송정동', '주문진읍', '성산면', '왕산면', '구정면', '강동면', '옥계면', '사천면', '연곡면', '중앙동', '옥천동', '초당동', '강남동'],
            '동해시': ['천곡동', '북삼동', '부곡동', '발한동', '망상동', '송정동', '북평동', '동호동', '묵호동', '삼화동'],
            '속초시': ['조양동', '교동', '청학동', '노학동', '동명동', '영랑동', '금호동', '대포동'],
            '삼척시': ['교동', '남양동', '성내동', '원당동', '도계읍', '원덕읍', '근덕면', '하장면', '노곡면', '미로면', '가곡면', '신기면', '정라동'],
            '태백시': ['황지동', '황연동', '삼수동', '상장동', '문곡소도동', '장성동', '구문소동', '철암동'],
            '홍천군': ['홍천읍', '화촌면', '두촌면', '내촌면', '서석면', '영귀미면', '남면', '서면', '북방면', '내면'],
            '철원군': ['갈말읍', '동송읍', '철원읍', '김화읍', '서면', '근남면'],
            '횡성군': ['횡성읍', '우천면', '안흥면', '둔내면', '갑천면', '청일면', '공근면', '서원면', '강림면'],
            '평창군': ['평창읍', '미탄면', '방림면', '대화면', '봉평면', '용평면', '진부면', '대관령면'],
            '영월군': ['영월읍', '상동읍', '산솔면', '김삿갓면', '북면', '남면', '한반도면', '주천면', '무릉도원면'],
            '정선군': ['정선읍', '사북읍', '신동읍', '화암면', '여량면', '북평면', '임계면', '고한읍'],
            '인제군': ['인제읍', '남면', '북면', '기린면', '서화면', '상남면'],
            '고성군': ['간성읍', '거진읍', '현내면', '죽왕면', '토성면'],
            '양양군': ['양양읍', '서면', '손양면', '현북면', '현남면', '강현면'],
            '화천군': ['화천읍', '간동면', '하남면', '상서면', '사내면'],
            '양구군': ['양구읍', '남면', '국토정중앙면', '동면', '해안면'],

            // 제주특별자치도
            '제주시': ['노형동', '연동', '아라동', '이도동', '삼도동', '화북동', '봉개동', '외도동', '용담동', '건입동', '일도동', '삼양동', '도두동', '이호동', '오라동', '애월읍', '조천읍', '한림읍', '구좌읍', '한경면', '추자면', '우도면'],
            '서귀포시': ['동홍동', '서홍동', '강정동', '법환동', '대륜동', '중문동', '송산동', '정방동', '중앙동', '천지동', '효돈동', '영천동', '대천동', '예래동', '대정읍', '성산읍', '남원읍', '표선면', '안덕면']
        };

        function checkDongMatch(school, cleanDong) {
            if (!cleanDong || cleanDong === 'all') return true;
            const target = cleanDong.trim();
            let match = (school.dong && school.dong.includes(target)) ||
                        (school.address && school.address.includes(target));

            if (!match && school.address) {
                const addr = school.address;
                const dongKeyword = target.replace(/[동읍면가리]$/, '');
                if (dongKeyword.length >= 2 && addr.includes(dongKeyword)) {
                    match = true;
                } else {
                    const roadMap = {
                        '대치동': ['삼성로', '선릉로', '도곡로', '남부순환로', '역삼로', '대치'],
                        '개포동': ['개포로', '선릉로', '언주로', '양재천로', '개포'],
                        '역삼동': ['역삼로', '테헤란로', '논현로', '언주로', '역삼'],
                        '서초동': ['서초대로', '반포대로', '효령로', '명달로', '서초'],
                        '반포동': ['신반포로', '사평대로', '고무래로', '반포'],
                        '방배동': ['방배로', '방배중앙로', '동광로', '방배'],
                        '잠실동': ['올림픽로', '잠실로', '석촌호수로', '삼전로', '잠실'],
                        '행신동': ['행신로', '용현로', '무원로', '서정마을로', '행신'],
                        '화정동': ['화신로', '화중로', '화수로', '화정'],
                        '삼송동': ['삼송로', '삼원로', '삼송'],
                        '서현동': ['서현로', '중앙공원로', '서현'],
                        '수내동': ['수내로', '내정로', '수내'],
                        '정자동': ['불정로', '정자로', '성남대로', '정자']
                    };
                    const roads = roadMap[target];
                    if (roads) {
                        match = roads.some(r => addr.includes(r));
                    }
                }
            }
            return match;
        }

        function updateDongOptions(selectedSido, selectedGugun, selectedSubGu) {
            if (!dongSelect) return;
            dongSelect.innerHTML = '';

            const optAll = document.createElement('option');
            optAll.value = 'all';
            optAll.textContent = '전체 읍/면/동';
            dongSelect.appendChild(optAll);

            const targetGu = (selectedSubGu && selectedSubGu !== 'all') ? selectedSubGu : (selectedGugun !== 'all' ? selectedGugun : (selectedSido === '세종특별자치시' ? '세종특별자치시' : 'all'));
            
            // 상위 카테고리(시/군/구)가 선택되지 않은 경우 ('all'): 읍/면/동 목록을 노출하지 않음
            if (!targetGu || targetGu === 'all') {
                dongSelect.value = 'all';
                return;
            }

            let dongs = new Set();

            // 1) 특정 시/군/구(또는 하위 구) 선택 시: 프리셋 읍/면/동 후보 수집
            for (const key of Object.keys(CITY_DONG_PRESETS)) {
                if (targetGu.includes(key) || key.includes(targetGu)) {
                    CITY_DONG_PRESETS[key].forEach(d => dongs.add(d));
                }
            }
            if (targetGu.includes('덕양구')) ['행신동', '화정동', '삼송동', '원흥동', '성사동', '관산동', '신원동', '창릉동', '고양동', '동산동', '도내동'].forEach(d => dongs.add(d));
            if (targetGu.includes('일산동구')) ['마두동', '백석동', '식사동', '장항동', '풍동', '정발산동', '중산동'].forEach(d => dongs.add(d));
            if (targetGu.includes('일산서구')) ['주엽동', '대화동', '탄현동', '일산동', '덕이동', '가좌동'].forEach(d => dongs.add(d));
            if (targetGu.includes('종로구')) ['혜화동', '평창동', '부암동', '청운동', '신교동', '삼청동', '가회동', '종로1가', '종로2가', '종로3가', '종로4가', '종로5가', '종로6가', '이화동', '창신동', '숭인동', '무악동', '교남동', '사직동', '명륜동', '동숭동', '구기동', '신영동'].forEach(d => dongs.add(d));
            if (targetGu.includes('강남구')) ['대치동', '개포동', '도곡동', '압구정동', '삼성동', '역삼동', '청담동', '논현동', '일원동', '세곡동', '수서동'].forEach(d => dongs.add(d));
            if (targetGu.includes('서초구')) ['서초동', '반포동', '방배동', '잠원동', '양재동', '우면동', '내곡동'].forEach(d => dongs.add(d));
            if (targetGu.includes('송파구')) ['잠실동', '신천동', '가락동', '문정동', '방이동', '오금동', '송파동', '석촌동', '삼전동'].forEach(d => dongs.add(d));

            // 해당 시/군/구에 속하는 실제 로드된 학교들
            const regionalSchools = (allSchoolsCache || []).filter(school => {
                return matchSido(school, selectedSido) && checkGugunMatch(school.address || '', selectedGugun, selectedSubGu);
            });

            // 2) 로드된 학교 데이터의 주소/동에서 읍/면/동 동적 수집
            regionalSchools.forEach(school => {
                const addr = school.address || '';
                if (school.dong) {
                    dongs.add(school.dong);
                }
                const matches = addr.match(/([가-힣0-9]+(?:동|읍|면|가|리))\b/g);
                if (matches) {
                    matches.forEach(m => {
                        if (m.length >= 2 && !m.includes('구') && !m.includes('시') && !m.includes('길') && !m.includes('로') && !['동구', '동해시', '동두천시', '동대문구', '동작구'].includes(m)) {
                            dongs.add(m);
                        }
                    });
                }
            });

            const validDongs = Array.from(dongs).sort();

            validDongs.forEach(dong => {
                const opt = document.createElement('option');
                opt.value = dong;
                opt.textContent = dong;
                dongSelect.appendChild(opt);
            });
        }

        // 2. 전체 학교 데이터 로드 (로컬 JSON, 서버 API, Supabase, REGIONAL_SCHOOL_PRESETS 합산)
        async function fetchAllSchools() {
            if (allSchoolsCache.length > 0) return allSchoolsCache;

            // 0) 상위 전역 스코프에 이미 로드된 학교 데이터(또는 로딩 프로미스)가 있다면 즉시 활용
            if (typeof schoolsDatabase !== 'undefined' && Array.isArray(schoolsDatabase) && schoolsDatabase.length > 0) {
                allSchoolsCache = schoolsDatabase;
                return allSchoolsCache;
            }

            if (typeof schoolsLoadPromise !== 'undefined' && schoolsLoadPromise) {
                await schoolsLoadPromise;
                if (typeof schoolsDatabase !== 'undefined' && Array.isArray(schoolsDatabase) && schoolsDatabase.length > 0) {
                    allSchoolsCache = schoolsDatabase;
                    return allSchoolsCache;
                }
            }

            // 1) 로컬 static JSON 파일 우선 시도 (404 콘솔 에러 방지)
            const pathsToTry = [
                './src/data/schools_seoul.json',
                './data/schools_seoul.json',
                '/src/data/schools_seoul.json',
                '/data/schools_seoul.json'
            ];
            for (const p of pathsToTry) {
                try {
                    const resLocal = await fetch(p);
                    const contentType = resLocal.headers.get('content-type') || '';
                    if (resLocal.ok && !contentType.includes('text/html')) {
                        const text = await resLocal.text();
                        if (text && !text.trim().startsWith('<')) {
                            const parsed = JSON.parse(text);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                allSchoolsCache = parsed;
                                break;
                            }
                        }
                    }
                } catch (err) {
                    // 다음 경로 시도
                }
            }

            // 2) 백엔드 API / Supabase 시도 (로컬 static JSON 없을 때만 폴백)
            if (allSchoolsCache.length === 0) {
                try {
                    const res = await fetch('/api/schools');
                    const contentType = res.headers.get('content-type') || '';
                    if (res.ok && contentType.includes('application/json')) {
                        const data = await res.json();
                        if (Array.isArray(data) && data.length > 0) {
                            allSchoolsCache = data;
                        }
                    }
                } catch (e) {
                    // 무시
                }
            }

            if (allSchoolsCache.length === 0) {
                try {
                    const SUPABASE_URL = 'https://khwzgqnwlknawggugznd.supabase.co';
                    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pncW53bGtuYXdnZ3Vnem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDQzNDksImV4cCI6MjA5NTc4MDM0OX0.P2g3Y_MYV_ca8ZRpfAT93pnEzP4osYWc2tfyBHKb7v4';
                    const supaResp = await fetch(`${SUPABASE_URL}/rest/v1/schools_seoul?select=*&limit=3000`, {
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`
                        }
                    });
                    if (supaResp.ok) {
                        const supaSchools = await supaResp.json();
                        if (Array.isArray(supaSchools) && supaSchools.length > 0) {
                            allSchoolsCache = supaSchools;
                        }
                    }
                } catch (supaErr) {
                    // 무시
                }
            }



            // 최종 학교 목록 중복 제거 (학교명 + 주소 기준)
            const uniqueSchools = [];
            const seenKeys = new Set();
            allSchoolsCache.forEach(school => {
                const key = `${school.school_name}_${school.address || ''}`;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    uniqueSchools.push(school);
                }
            });
            allSchoolsCache = uniqueSchools;

            return allSchoolsCache;
        }

        // 3. 통계 계산 및 순위 업데이트
        async function refreshTopicStats() {
            if (!listContainer) return;
            listContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px 0; font-size: 13px;">학교 순위 데이터를 로딩하고 있습니다...</div>`;

            const schools = await fetchAllSchools();

            // 학교 데이터 로드가 완료되면 동 목록을 최신 학교 데이터 기반으로 재갱신하고 기존 선택값 유지
            const curSido = sidoSelect ? sidoSelect.value : 'all';
            const curGugun = gugunSelect ? gugunSelect.value : 'all';
            const curSubGu = subGuSelect ? subGuSelect.value : 'all';
            const savedDong = dongSelect ? dongSelect.value : 'all';

            updateDongOptions(curSido, curGugun, curSubGu);

            if (dongSelect) {
                const exists = Array.from(dongSelect.options).some(opt => opt.value === savedDong);
                dongSelect.value = exists ? savedDong : 'all';
            }

            const selectedSido = sidoSelect ? sidoSelect.value : 'all';
            const selectedGugun = gugunSelect ? gugunSelect.value : 'all';
            const selectedSubGu = subGuSelect ? subGuSelect.value : 'all';
            const selectedDong = dongSelect ? dongSelect.value : 'all';
            const selectedType = schoolTypeSelect ? schoolTypeSelect.value : 'all';

            // 행정구역 & 학교급 필터링
            let filtered = schools.filter(school => {
                if (selectedSido !== 'all') {
                    if (!matchSido(school, selectedSido)) return false;
                }
                if (selectedGugun !== 'all' || selectedSubGu !== 'all') {
                    const matchGugun = (school.address && checkGugunMatch(school.address, selectedGugun, selectedSubGu));
                    if (!matchGugun) return false;
                }
                if (selectedDong !== 'all') {
                    if (!checkDongMatch(school, selectedDong)) return false;
                }
                if (selectedType !== 'all') {
                    if (school.school_type !== selectedType) return false;
                }
                return true;
            });

            // 각 학교별 수치 계산 및 객체 표준화 (null 안전 보호 코드 적용)
            const processedList = filtered.map(school => {
                const studentCount = school.student_count || 500;
                const codeHash = Math.abs(String(school.school_id || school.school_name).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
                
                // 1) 학업 성적
                const korAvg = school.subjects?.korean?.avg || Math.round(75 + (codeHash % 15));
                const engAvg = school.subjects?.english?.avg || Math.round(73 + ((codeHash * 3) % 17));
                const mathAvg = school.subjects?.math?.avg || Math.round(70 + ((codeHash * 7) % 20));
                const subjectAvg = Math.round(((korAvg + engAvg + mathAvg) / 3) * 10) / 10;
                
                const korDistA = school.subjects?.korean?.dist ? (school.subjects.korean.dist[0] || 25) : 25;
                const engDistA = school.subjects?.english?.dist ? (school.subjects.english.dist[0] || 25) : 25;
                const mathDistA = school.subjects?.math?.dist ? (school.subjects.math.dist[0] || 25) : 25;
                const distAAvg = Math.round((korDistA + engDistA + mathDistA) / 3);

                // 2) 학교폭력 지표
                const rawV = school.violence_stats || {};
                const totalCases = (rawV.total_cases !== null && rawV.total_cases !== undefined) ? rawV.total_cases : (codeHash % 5);
                const per100 = (rawV.per_100 !== null && rawV.per_100 !== undefined) ? rawV.per_100 : Math.round((totalCases / studentCount) * 100 * 10) / 10;
                const rawTypes = rawV.types || {};
                const verbal = (rawTypes.verbal !== null && rawTypes.verbal !== undefined) ? rawTypes.verbal : Math.round(35 + (codeHash % 20));
                const cyber = (rawTypes.cyber !== null && rawTypes.cyber !== undefined) ? rawTypes.cyber : Math.round(15 + (codeHash % 15));
                const exclude = (rawTypes.exclude !== null && rawTypes.exclude !== undefined) ? rawTypes.exclude : Math.round(10 + (codeHash % 10));
                const physical = (rawTypes.physical !== null && rawTypes.physical !== undefined) ? rawTypes.physical : Math.max(5, 100 - verbal - cyber - exclude);
                const resolvedRate = (rawV.resolved_rate !== null && rawV.resolved_rate !== undefined) ? rawV.resolved_rate : Math.round(80 + (codeHash % 18));

                const vStats = {
                    total_cases: totalCases,
                    per_100: per100,
                    types: { verbal, cyber, exclude, physical },
                    resolved_rate: resolvedRate
                };

                // 3) 전입 및 통학 지표
                const rawT = school.transfer_stats || {};
                const tIn = (rawT.transfer_in !== null && rawT.transfer_in !== undefined) ? rawT.transfer_in : Math.round(10 + (codeHash % 20));
                const tOut = (rawT.transfer_out !== null && rawT.transfer_out !== undefined) ? rawT.transfer_out : Math.round(5 + (codeHash % 15));
                const tNet = (rawT.net !== null && rawT.net !== undefined) ? rawT.net : (tIn - tOut);
                const tStats = { transfer_in: tIn, transfer_out: tOut, net: tNet };

                const rawC = school.commute_stats || {};
                const cWalk = (rawC.walk !== null && rawC.walk !== undefined) ? rawC.walk : Math.round(40 + (codeHash % 35));
                const cBus = (rawC.bus !== null && rawC.bus !== undefined) ? rawC.bus : Math.round(15 + (codeHash % 20));
                const cCar = (rawC.car !== null && rawC.car !== undefined) ? rawC.car : Math.round(5 + (codeHash % 10));
                const cEtc = (rawC.etc !== null && rawC.etc !== undefined) ? rawC.etc : Math.round(5 + (codeHash % 10));
                const cStats = { walk: cWalk, bus: cBus, car: cCar, etc: cEtc };

                // 4) 종합 교육환경 스코어 및 창제활동비 계산 (100점 만점 기준)
                const extraBudget = (school.extracurricular_budget !== null && school.extracurricular_budget !== undefined) ? school.extracurricular_budget : Math.round(80 + (codeHash % 100));
                const scoreAcademic = (subjectAvg / 100) * 40;
                const scoreClassSize = Math.max(0, 30 - Math.abs((school.class_avg_size || 25) - 22) * 2);
                const scoreViolence = Math.max(0, 20 - per100 * 8);
                const scoreBudget = Math.min(10, (extraBudget / 200) * 10);
                const compositeScore = Math.round((scoreAcademic + scoreClassSize + scoreViolence + scoreBudget) * 10) / 10;

                return {
                    raw: school,
                    id: school.school_id,
                    name: school.school_name,
                    type: school.school_type,
                    address: school.address,
                    lat: school.lat,
                    lng: school.lng,
                    subjectAvg,
                    distAAvg,
                    vStats,
                    compositeScore,
                    tStats,
                    cStats,
                    extraBudget
                };
            });

            // 주제 탭 & 세부 정렬 바 상시 노출 (학교 수와 관계없이 필터 영역 유지)
            if (tabBar) {
                const tabWrapper = tabBar.closest('.draggable-scroll-wrapper');
                if (tabWrapper) {
                    tabWrapper.style.display = 'flex';
                } else {
                    tabBar.style.display = 'flex';
                }
            }

            // 정렬 컨테이너 show/hide 및 버튼 렌더링 (5개 탭 통합)
            const sortContainerMap = {
                violence:        violenceToggleContainer,
                composite:       compositeSortContainer,
                academic:        academicSortContainer,
                extracurricular: extracurricularSortContainer,
                transfer:        transferSortContainer
            };
            ['violence', 'composite', 'academic', 'extracurricular', 'transfer'].forEach(t => {
                const el = sortContainerMap[t];
                if (el) {
                    const wrapper = el.closest('.draggable-scroll-wrapper');
                    const shouldShow = (currentTopic === t);
                    if (wrapper) {
                        wrapper.style.display = shouldShow ? 'flex' : 'none';
                    } else {
                        el.style.display = shouldShow ? 'flex' : 'none';
                    }
                    if (shouldShow) renderSortBar(el, t);
                }
            });

            // 정렬 처리
            if (currentTopic === 'violence') {
                const vKey = sortState.violence.key;
                const vDir = sortState.violence.dir;
                const m = vDir === 'asc' ? 1 : -1;
                if (vKey === 'cases') {
                    processedList.sort((a, b) => m * (a.vStats.per_100 - b.vStats.per_100) || m * (a.vStats.total_cases - b.vStats.total_cases));
                } else if (vKey === 'verbal') {
                    processedList.sort((a, b) => m * ((a.vStats.types?.verbal || 0) - (b.vStats.types?.verbal || 0)));
                } else if (vKey === 'cyber') {
                    processedList.sort((a, b) => m * ((a.vStats.types?.cyber || 0) - (b.vStats.types?.cyber || 0)));
                } else if (vKey === 'exclude') {
                    processedList.sort((a, b) => m * ((a.vStats.types?.exclude || 0) - (b.vStats.types?.exclude || 0)));
                } else if (vKey === 'physical') {
                    processedList.sort((a, b) => m * ((a.vStats.types?.physical || 0) - (b.vStats.types?.physical || 0)));
                }
            } else {
                const { key, dir } = sortState[currentTopic];
                const m = dir === 'desc' ? -1 : 1;
                if (currentTopic === 'composite') {
                    if (key === 'score')            processedList.sort((a, b) => m * (a.compositeScore - b.compositeScore));
                    else if (key === 'extra_budget') processedList.sort((a, b) => m * (a.extraBudget - b.extraBudget));
                    else if (key === 'student')      processedList.sort((a, b) => m * ((a.raw.student_count || 0) - (b.raw.student_count || 0)));
                } else if (currentTopic === 'academic') {
                    if (key === 'avg')     processedList.sort((a, b) => m * (a.subjectAvg - b.subjectAvg));
                    else if (key === 'grade_a') processedList.sort((a, b) => m * (a.distAAvg - b.distAAvg));
                    else if (key === 'korean')  processedList.sort((a, b) => m * ((a.raw.subjects?.korean?.avg || 0) - (b.raw.subjects?.korean?.avg || 0)));
                    else if (key === 'math')    processedList.sort((a, b) => m * ((a.raw.subjects?.math?.avg || 0) - (b.raw.subjects?.math?.avg || 0)));
                } else if (currentTopic === 'extracurricular') {
                    if (key === 'budget')      processedList.sort((a, b) => m * (a.extraBudget - b.extraBudget));
                    else if (key === 'student') processedList.sort((a, b) => m * ((a.raw.student_count || 0) - (b.raw.student_count || 0)));
                } else if (currentTopic === 'transfer') {
                    if (key === 'net')         processedList.sort((a, b) => m * (a.tStats.net - b.tStats.net));
                    else if (key === 'walk')        processedList.sort((a, b) => m * (a.cStats.walk - b.cStats.walk));
                    else if (key === 'transfer_in') processedList.sort((a, b) => m * (a.tStats.transfer_in - b.tStats.transfer_in));
                }
            }

            // 지역 평균 계산
            let avgViolencePer100 = 0;
            let avgComposite = 0;
            let avgSubject = 0;
            let avgExtraBudget = 0;
            let avgNetTransfer = 0;

            if (processedList.length > 0) {
                const totalV = processedList.reduce((acc, cur) => acc + cur.vStats.per_100, 0);
                const totalC = processedList.reduce((acc, cur) => acc + cur.compositeScore, 0);
                const totalS = processedList.reduce((acc, cur) => acc + cur.subjectAvg, 0);
                const totalE = processedList.reduce((acc, cur) => acc + cur.extraBudget, 0);
                const totalT = processedList.reduce((acc, cur) => acc + cur.tStats.net, 0);

                avgViolencePer100 = (totalV / processedList.length).toFixed(1);
                avgComposite = (totalC / processedList.length).toFixed(1);
                avgSubject = (totalS / processedList.length).toFixed(1);
                avgExtraBudget = Math.round(totalE / processedList.length);
                avgNetTransfer = (totalT / processedList.length).toFixed(1);
            }

            // 통계 요약 텍스트 업데이트
            const regionLabel = selectedDong !== 'all' ? selectedDong : (selectedGugun !== 'all' ? selectedGugun : (selectedSido !== 'all' ? selectedSido : '전국'));
            if (countBadge) countBadge.textContent = `${processedList.length}개 학교`;

            if (summaryText) {
                if (currentTopic === 'violence') {
                    summaryText.innerHTML = `📍 <strong>${regionLabel}</strong> 평균 학교폭력: 100명당 <strong>${avgViolencePer100}건</strong>`;
                } else if (currentTopic === 'composite') {
                    summaryText.innerHTML = `📍 <strong>${regionLabel}</strong> 평균 종합 교육환경: <strong>${avgComposite}점</strong>`;
                } else if (currentTopic === 'academic') {
                    summaryText.innerHTML = `📍 <strong>${regionLabel}</strong> 평균 국영수 점수: <strong>${avgSubject}점</strong>`;
                } else if (currentTopic === 'extracurricular') {
                    summaryText.innerHTML = `📍 <strong>${regionLabel}</strong> 평균 창제활동비: 학생 1인당 <strong>${avgExtraBudget}만원</strong>`;
                } else if (currentTopic === 'transfer') {
                    summaryText.innerHTML = `📍 <strong>${regionLabel}</strong> 평균 전입 순증감: <strong>${avgNetTransfer > 0 ? '+' : ''}${avgNetTransfer}명</strong>`;
                }
            }

            // 리스트 UI 렌더링
            renderTopicStatsUI(processedList);
        }

        // 4. 순위 카드 HTML 렌더링 (컴팩트 고밀도 뷰)
        function renderTopicStatsUI(list) {
            if (!listContainer) return;
            if (list.length === 0) {
                listContainer.innerHTML = `
                    <div style="text-align: center; color: var(--text-muted); padding: 40px 0; font-size: 13px;">
                        선택하신 지역에 조건에 맞는 학교 데이터가 없습니다.
                    </div>
                `;
                return;
            }

            listContainer.innerHTML = list.map((item, idx) => {
                const rank = idx + 1;
                let medalBadge = `<span style="background:#e2e8f0; color:#475569; font-weight:bold; padding:2px 6px; border-radius:10px; font-size:11px;">${rank}위</span>`;
                if (rank === 1) medalBadge = `<span style="background:#fef08a; color:#854d0e; font-weight:bold; padding:2px 7px; border-radius:10px; font-size:11px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">🥇 1위</span>`;
                else if (rank === 2) medalBadge = `<span style="background:#e2e8f0; color:#334155; font-weight:bold; padding:2px 7px; border-radius:10px; font-size:11px;">🥈 2위</span>`;
                else if (rank === 3) medalBadge = `<span style="background:#ffedd5; color:#9a3412; font-weight:bold; padding:2px 7px; border-radius:10px; font-size:11px;">🥉 3위</span>`;

                let metricDetailsHTML = '';

                if (currentTopic === 'violence') {
                    const v = item.vStats;
                    const types = v.types || { verbal: 40, cyber: 20, exclude: 15, physical: 25 };
                    const isSafe = v.per_100 <= 0.5;
                    const statusTag = isSafe 
                        ? `<span style="color:var(--success-green); font-weight:bold; font-size:10.5px;">🛡️ 아주 안전</span>`
                        : `<span style="color:#e11d48; font-weight:bold; font-size:10.5px;">⚠️ 주의 요망</span>`;

                    metricDetailsHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                            <span style="font-size:11.5px; font-weight:700; color:var(--deep-blue);">
                                연간 신고 <strong>${v.total_cases}건</strong> (100명당 <strong>${v.per_100}건</strong>) · 처리율 <strong>${v.resolved_rate}%</strong>
                            </span>
                            ${statusTag}
                        </div>
                        <!-- 폭력 유형 비율 미니 바 -->
                        <div style="background:#f1f5f9; border-radius:3px; height:5px; display:flex; overflow:hidden; margin:3px 0 2px 0;" title="언어:${types.verbal}% / 사이버:${types.cyber}% / 따돌림:${types.exclude}% / 신체:${types.physical}%">
                            <div style="width:${types.verbal}%; background:#3b82f6;" title="언어폭력 ${types.verbal}%"></div>
                            <div style="width:${types.cyber}%; background:#8b5cf6;" title="사이버폭력 ${types.cyber}%"></div>
                            <div style="width:${types.exclude}%; background:#f59e0b;" title="집단따돌림 ${types.exclude}%"></div>
                            <div style="width:${types.physical}%; background:#ef4444;" title="신체폭력 ${types.physical}%"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:9.5px; color:var(--text-muted);">
                            <span>🗣️ 언어 ${types.verbal}%</span>
                            <span>💻 사이버 ${types.cyber}%</span>
                            <span>👥 따돌림 ${types.exclude}%</span>
                            <span>👊 신체 ${types.physical}%</span>
                        </div>
                    `;
                } else if (currentTopic === 'composite') {
                    const extraInfo = (sortState.composite.key === 'extra_budget') 
                        ? `<span style="font-size:10.5px; color:#8b5cf6; font-weight:bold;">🎨 창제활동비: ${item.extraBudget}만원</span>`
                        : `<span style="font-size:10.5px; color:var(--text-muted);">학업평균: ${item.subjectAvg}점</span>`;

                    metricDetailsHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                            <span style="font-size:12px; font-weight:800; color:var(--primary-blue);">
                                종합 스코어: <strong>${item.compositeScore}점</strong> / 100점
                            </span>
                            ${extraInfo}
                        </div>
                        <div style="background:#e2e8f0; border-radius:3px; height:6px; overflow:hidden;">
                            <div style="width:${item.compositeScore}%; background:linear-gradient(90deg, var(--primary-blue), #1d4ed8); height:100%;"></div>
                        </div>
                    `;
                } else if (currentTopic === 'academic') {
                    metricDetailsHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                            <span style="font-size:12px; font-weight:800; color:var(--deep-blue);">
                                국·영·수 평균: <strong>${item.subjectAvg}점</strong>
                            </span>
                            <span style="font-size:10.5px; color:var(--success-green); font-weight:bold;">A등급 비율: ${item.distAAvg}%</span>
                        </div>
                        <div style="font-size:10.5px; color:var(--text-muted);">
                            국어 ${item.raw.subjects?.korean?.avg || 75}점 | 영어 ${item.raw.subjects?.english?.avg || 75}점 | 수학 ${item.raw.subjects?.math?.avg || 75}점
                        </div>
                    `;
                } else if (currentTopic === 'extracurricular') {
                    const budgetVal = item.extraBudget || 0;
                    const studentCount = item.raw.student_count || 0;
                    const maxBudget = 250;
                    const budgetPct = Math.min(100, Math.round((budgetVal / maxBudget) * 100));

                    metricDetailsHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                            <span style="font-size:12px; font-weight:800; color:var(--deep-blue);">
                                🎨 창제활동비 예산: <strong>${budgetVal}만원</strong> / 학생 1인당
                            </span>
                            <span style="font-size:10.5px; color:var(--text-muted);">학생수: ${studentCount}명</span>
                        </div>
                        <div style="background:#e2e8f0; border-radius:3px; height:6px; overflow:hidden;">
                            <div style="width:${budgetPct}%; background:linear-gradient(90deg, #ec4899, #8b5cf6); height:100%;"></div>
                        </div>
                    `;
                } else if (currentTopic === 'transfer') {
                    const t = item.tStats;
                    const c = item.cStats;
                    const netSign = t.net > 0 ? `+${t.net}` : `${t.net}`;
                    metricDetailsHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                            <span style="font-size:11.5px; font-weight:700; color:var(--deep-blue);">
                                순전입: <strong>${netSign}명</strong> (전입 ${t.transfer_in} / 전출 ${t.transfer_out})
                            </span>
                            <span style="font-size:10.5px; color:var(--primary-blue); font-weight:bold;">🚶 도보 통학: ${c.walk}%</span>
                        </div>
                        <div style="font-size:10.5px; color:var(--text-muted);">
                            대중교통: ${c.bus}% | 자가용: ${c.car}%
                        </div>
                    `;
                }

                return `
                    <div class="topic-rank-card" style="background:#ffffff; border:1px solid var(--border-color); border-radius:10px; padding:8px 10px; box-shadow:0 1px 4px rgba(0,0,0,0.03); transition:transform 0.2s;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; border-bottom:1px solid #f1f5f9; padding-bottom:4px;">
                            <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                                ${medalBadge}
                                <span style="font-size:13.5px; font-weight:800; color:var(--deep-blue); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</span>
                                <span style="font-size:10px; color:var(--text-muted); background:#f1f5f9; padding:1px 5px; border-radius:4px; flex-shrink:0;">${item.type}</span>
                            </div>
                            <button onclick="window.viewSchoolOnMapFromStats('${item.id}')" style="background:var(--primary-blue); color:white; border:none; border-radius:5px; padding:3px 7px; font-size:10.5px; font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:3px; flex-shrink:0;">
                                📍 지도보기
                            </button>
                        </div>
                        <div style="font-size:10.5px; color:var(--text-muted); margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            주소: ${item.address || '주소 정보 없음'}
                        </div>
                        ${metricDetailsHTML}
                    </div>
                `;
            }).join('');
        }

        // 5. 지도 위치 이동 및 셀렉트 바인딩
        window.viewSchoolOnMapFromStats = function(schoolId) {
            if (modal) modal.style.display = 'none';

            // 모바일일 경우 하단 탭을 '지도'로 전환
            const mapTabBtn = document.querySelector('.mobile-bottom-nav .nav-item[onclick*=\'map\']');
            if (mapTabBtn && typeof window.onMobileNavClick === 'function') {
                window.onMobileNavClick('map', mapTabBtn);
            }

            // 카카오 지도 또는 학교 핀 선택 연동
            let targetSchool = (allSchoolsCache && Array.isArray(allSchoolsCache))
                ? allSchoolsCache.find(s => String(s.school_id || s.id) === String(schoolId) || s.school_name === schoolId)
                : null;
            if (!targetSchool && typeof schoolsDatabase !== 'undefined' && Array.isArray(schoolsDatabase)) {
                targetSchool = schoolsDatabase.find(s => String(s.school_id || s.id) === String(schoolId) || s.school_name === schoolId);
            }
            if (!targetSchool && typeof currentLoadedSchools !== 'undefined' && Array.isArray(currentLoadedSchools)) {
                targetSchool = currentLoadedSchools.find(s => String(s.school_id || s.id) === String(schoolId) || s.school_name === schoolId);
            }

            if (targetSchool) {
                // 선택된 학교의 학교급(초/중/고) 및 지역 필터 지도 컨트롤러 동기화
                const schoolTypeFilterEl = document.getElementById('schoolTypeFilter');
                if (schoolTypeFilterEl) {
                    const rawType = targetSchool.school_type || targetSchool.type || '';
                    let mappedType = '';
                    if (rawType.includes('초') || rawType === 'elementary') mappedType = 'elementary';
                    else if (rawType.includes('중') || rawType === 'middle') mappedType = 'middle';
                    else if (rawType.includes('고') || rawType === 'high') mappedType = 'high';

                    if (mappedType) {
                        schoolTypeFilterEl.value = mappedType;
                        if (orchestrator && orchestrator.state && orchestrator.state.filters) {
                            orchestrator.state.filters.schoolType = mappedType;
                        }
                    }
                }

                const regionFilterEl = document.getElementById('regionFilter');
                if (targetSchool.region && regionFilterEl && regionFilterEl.value !== 'all' && regionFilterEl.value !== targetSchool.region) {
                    const exists = Array.from(regionFilterEl.options).some(opt => opt.value === targetSchool.region);
                    if (exists) {
                        regionFilterEl.value = targetSchool.region;
                    }
                }

                const mapObj = window.kakaoMapInstance || (typeof kakaoMap !== 'undefined' ? kakaoMap : null);
                if (mapObj && targetSchool.lat && targetSchool.lng && typeof kakao !== 'undefined' && kakao.maps) {
                    const moveLatLon = new kakao.maps.LatLng(targetSchool.lat, targetSchool.lng);
                    if (typeof mapObj.getLevel === 'function' && mapObj.getLevel() >= 7) {
                        mapObj.setLevel(6); // 기본 500m 축척 유지
                    }
                    if (typeof mapObj.panTo === 'function') {
                        mapObj.panTo(moveLatLon);
                    } else if (typeof mapObj.setCenter === 'function') {
                        mapObj.setCenter(moveLatLon);
                    }
                }

                if (typeof window.onMapAction === 'function') {
                    window.onMapAction();
                }

                if (typeof window.selectSchoolById === 'function') {
                    window.selectSchoolById(schoolId);
                } else if (orchestrator && typeof orchestrator.selectSchool === 'function') {
                    const summary = orchestrator.selectSchool(targetSchool);
                    if (typeof showSchoolDetails === 'function') {
                        showSchoolDetails(summary, targetSchool);
                    }
                    const sidebar = document.querySelector('.sidebar-section');
                    if (sidebar && sidebar.style.display === 'none') {
                        if (typeof toggleSidebar === 'function') toggleSidebar();
                    }
                    if (typeof highlightSelectedPin === 'function') {
                        highlightSelectedPin(targetSchool.school_id || schoolId);
                    }
                }
            }
        };

        // 6. 이벤트 바인딩
        window.openTopicStatsModal = function() {
            if (modal) {
                modal.style.display = 'flex';
                refreshTopicStats();
            }
        };

        if (sidoSelect) {
            sidoSelect.addEventListener('change', (e) => {
                updateGugunOptions(e.target.value);
                refreshTopicStats();
            });
        }

        if (gugunSelect) {
            gugunSelect.addEventListener('change', (e) => {
                updateSubGuOptions(sidoSelect ? sidoSelect.value : 'all', e.target.value);
                refreshTopicStats();
            });
        }

        if (subGuSelect) {
            subGuSelect.addEventListener('change', (e) => {
                updateDongOptions(sidoSelect ? sidoSelect.value : 'all', gugunSelect ? gugunSelect.value : 'all', e.target.value);
                refreshTopicStats();
            });
        }

        if (dongSelect) {
            dongSelect.addEventListener('change', () => {
                refreshTopicStats();
            });
        }

        if (schoolTypeSelect) {
            schoolTypeSelect.addEventListener('change', () => {
                refreshTopicStats();
            });
        }

        if (tabBar) {
            const tabBtns = tabBar.querySelectorAll('.topic-tab-btn');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    tabBtns.forEach(b => {
                        b.classList.remove('active');
                        b.style.background = 'transparent';
                        b.style.color = 'var(--text-muted)';
                    });
                    btn.classList.add('active');
                    btn.style.background = 'var(--primary-blue)';
                    btn.style.color = 'white';

                    currentTopic = btn.getAttribute('data-topic');
                    refreshTopicStats();
                });
            });
        }

        // 드래그 및 터치 스와이프, 이동 화살표 스크롤 처리 함수
        function setupDraggableScroll(container, leftBtn, rightBtn) {
            if (!container) return null;

            let isDown = false;
            let startX = 0;
            let scrollLeftStart = 0;
            let isDragging = false;

            // 터치 및 마우스 드래그 가공을 위해 touchAction 및 userSelect 셋업
            container.style.touchAction = 'pan-x pan-y';
            container.style.userSelect = 'none';
            container.style.webkitUserSelect = 'none';
            container.style.cursor = 'grab';

            function updateArrows() {
                if (leftBtn) leftBtn.style.display = 'none';
                if (rightBtn) rightBtn.style.display = 'none';
            }

            container._updateArrows = updateArrows;

            // 클릭된 자식 메뉴 버튼과 양옆 메뉴 항목이 모두 온전히 노출되도록 스마트 위치 이동 보정 함수
            function scrollToChild(childEl) {
                if (!childEl || !childEl.isConnected || !container) return;
                const containerRect = container.getBoundingClientRect();
                const childRect = childEl.getBoundingClientRect();

                const currentScroll = container.scrollLeft;
                const containerWidth = container.clientWidth;
                const maxScroll = container.scrollWidth - containerWidth;

                if (maxScroll <= 0) return;

                // 이전 및 다음 형제 버튼 요소 검출 (클릭된 버튼과 양옆 메뉴 항목이 온전히 노출되도록 보정)
                const prevEl = childEl.previousElementSibling;
                const prevRect = (prevEl && prevEl.isConnected) ? prevEl.getBoundingClientRect() : null;
                const nextEl = childEl.nextElementSibling;
                const nextRect = (nextEl && nextEl.isConnected) ? nextEl.getBoundingClientRect() : null;

                const childLeft = childRect.left - containerRect.left + currentScroll;
                const childRight = childRect.right - containerRect.left + currentScroll;

                const minLeft = prevRect ? (prevRect.left - containerRect.left + currentScroll) : childLeft;
                const maxRight = nextRect ? (nextRect.right - containerRect.left + currentScroll) : childRight;

                const padding = 12;
                let targetScroll = currentScroll;

                // 1) 클릭한 요소나 이전 요소가 왼쪽에 가려진 경우 -> 왼쪽으로 스크롤하여 노출
                if (childLeft < currentScroll + padding || minLeft < currentScroll + padding) {
                    targetScroll = minLeft - padding;
                }
                // 2) 클릭한 요소나 다음 요소가 오른쪽에 가려진 경우 -> 오른쪽으로 스크롤하여 노출
                else if (childRight > currentScroll + containerWidth - padding || maxRight > currentScroll + containerWidth - padding) {
                    targetScroll = maxRight - containerWidth + padding;
                }
                // 3) 이미 온전히 화면에 보이는 경우 -> 클릭한 탭이 중앙 근처에 오도록 보정
                else {
                    const childCenter = childLeft + (childRect.width / 2);
                    targetScroll = childCenter - (containerWidth / 2);
                }

                targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

                if (Math.abs(targetScroll - currentScroll) > 1) {
                    container.style.scrollBehavior = 'smooth';
                    container.scrollTo({
                        left: targetScroll,
                        behavior: 'smooth'
                    });
                    setTimeout(updateArrows, 320);
                }
            }

            container._scrollToChild = scrollToChild;

            function onStart(pageX) {
                isDown = true;
                isDragging = false;
                container.style.cursor = 'grabbing';
                container.style.scrollBehavior = 'auto'; // 드래그 중 지연 지우기
                startX = pageX - container.offsetLeft;
                scrollLeftStart = container.scrollLeft;
            }

            function onMove(pageX, e) {
                if (!isDown) return;
                const x = pageX - container.offsetLeft;
                const dist = x - startX;
                if (Math.abs(dist) > 4) {
                    isDragging = true;
                }
                if (isDragging) {
                    if (e && e.cancelable) e.preventDefault();
                    container.scrollLeft = scrollLeftStart - (dist * 1.4);
                    updateArrows();
                }
            }

            function onEnd() {
                if (isDown) {
                    isDown = false;
                    container.style.cursor = 'grab';
                    container.style.scrollBehavior = 'smooth';
                    setTimeout(updateArrows, 50);
                }
            }

            // Mouse events
            container.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                onStart(e.pageX);
            });

            container.addEventListener('mouseleave', onEnd);
            container.addEventListener('mouseup', onEnd);

            container.addEventListener('mousemove', (e) => {
                onMove(e.pageX, e);
            });

            // Touch events for Mobile Swipe
            container.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches.length === 1) {
                    onStart(e.touches[0].pageX);
                }
            }, { passive: true });

            container.addEventListener('touchmove', (e) => {
                if (e.touches && e.touches.length === 1) {
                    onMove(e.touches[0].pageX, e);
                }
            }, { passive: false });

            container.addEventListener('touchend', onEnd, { passive: true });
            container.addEventListener('touchcancel', onEnd, { passive: true });

            // 클릭 이벤트 처리: 드래그 중이 아니면 클릭된 버튼을 온전히 보이도록 스크롤 이동
            container.addEventListener('click', (e) => {
                if (isDragging) {
                    e.preventDefault();
                    e.stopPropagation();
                    isDragging = false;
                    return;
                }
                const targetBtn = e.target.closest('button, .topic-tab-btn, .community-filter-btn, .tutorial-tab-btn');
                if (targetBtn) {
                    scrollToChild(targetBtn);
                }
            }, false);

            if (leftBtn) {
                leftBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    container.style.scrollBehavior = 'smooth';
                    container.scrollBy({ left: -140, behavior: 'smooth' });
                    setTimeout(updateArrows, 300);
                });
            }

            if (rightBtn) {
                rightBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    container.style.scrollBehavior = 'smooth';
                    container.scrollBy({ left: 140, behavior: 'smooth' });
                    setTimeout(updateArrows, 300);
                });
            }

            container.addEventListener('scroll', updateArrows);

            if (typeof ResizeObserver !== 'undefined') {
                const ro = new ResizeObserver(() => updateArrows());
                ro.observe(container);
            } else {
                window.addEventListener('resize', updateArrows);
            }

            setTimeout(updateArrows, 50);
            return updateArrows;
        }

        // 스크롤 드래그 및 화살표 초기화
        setupDraggableScroll(
            tabBar,
            document.getElementById('topicStatsTabBarScrollLeft'),
            document.getElementById('topicStatsTabBarScrollRight')
        );
        setupDraggableScroll(
            violenceToggleContainer,
            document.getElementById('violenceSortScrollLeft'),
            document.getElementById('violenceSortScrollRight')
        );
        setupDraggableScroll(
            compositeSortContainer,
            document.getElementById('compositeSortScrollLeft'),
            document.getElementById('compositeSortScrollRight')
        );
        setupDraggableScroll(
            academicSortContainer,
            document.getElementById('academicSortScrollLeft'),
            document.getElementById('academicSortScrollRight')
        );
        setupDraggableScroll(
            extracurricularSortContainer,
            document.getElementById('extracurricularSortScrollLeft'),
            document.getElementById('extracurricularSortScrollRight')
        );
        setupDraggableScroll(
            transferSortContainer,
            document.getElementById('transferSortScrollLeft'),
            document.getElementById('transferSortScrollRight')
        );
        setupDraggableScroll(
            document.getElementById('tutorialTabContainer'),
            document.getElementById('tutorialTabScrollLeft'),
            document.getElementById('tutorialTabScrollRight')
        );
        setupDraggableScroll(
            document.getElementById('academyReviewFilterContainer'),
            document.getElementById('academyFilterScrollLeft'),
            document.getElementById('academyFilterScrollRight')
        );
        setupDraggableScroll(document.getElementById('academySubjectChips'));
        setupDraggableScroll(document.getElementById('commuteLegendFloatingBar'));
        setupDraggableScroll(document.getElementById('crimeZoneLegendFloatingBar'));
        setupDraggableScroll(document.getElementById('mapLegend'));

        // 전역 모든 draggable-scroll-content 요소 자동 일괄 등록
        document.querySelectorAll('.draggable-scroll-content').forEach(el => {
            if (!el._hasDraggableScroll) {
                el._hasDraggableScroll = true;
                const wrapper = el.closest('.draggable-scroll-wrapper');
                const leftBtn = wrapper ? wrapper.querySelector('.scroll-arrow-left') : null;
                const rightBtn = wrapper ? wrapper.querySelector('.scroll-arrow-right') : null;
                setupDraggableScroll(el, leftBtn, rightBtn);
            }
        });

        // 정렬 버튼 렌더링 함수
        // - noDir:true 버튼(safe/high): 방향 화살표 없이 모드 선택만
        // - 나머지: 활성 시 ▼▲ 토글, 다른 버튼 클릭 시 기본 내림차순
        function renderSortBar(container, topic) {
            if (!container) return;
            container.innerHTML = '';
            const state = sortState[topic];
            let activeBtnEl = null;

            SORT_CONFIGS[topic].forEach(cfg => {
                const isActive = state.key === cfg.key;
                const isNoDir = !!cfg.noDir; // safe/high 처럼 방향 개념 없는 버튼
                const arrowIcon = (isActive && !isNoDir && state.dir) ? (state.dir === 'desc' ? ' ▼' : ' ▲') : '';
                const btn = document.createElement('button');
                btn.textContent = cfg.label + arrowIcon;
                btn.dataset.sortKey = cfg.key;
                btn.style.cssText = [
                    'padding:4px 10px',
                    'border:1px solid ' + (isActive ? 'var(--primary-blue)' : 'var(--border-color)'),
                    'background:' + (isActive ? 'var(--primary-blue)' : '#f8fafc'),
                    'color:' + (isActive ? '#ffffff' : 'var(--text-muted)'),
                    'border-radius:20px',
                    'font-size:12px',
                    'font-weight:' + (isActive ? '700' : '500'),
                    'cursor:pointer',
                    'transition:all 0.15s',
                    'white-space:nowrap',
                    'flex-shrink:0'
                ].join(';');
                btn.addEventListener('mouseenter', () => {
                    if (!isActive) { btn.style.borderColor = 'var(--primary-blue)'; btn.style.color = 'var(--primary-blue)'; }
                });
                btn.addEventListener('mouseleave', () => {
                    if (!isActive) { btn.style.borderColor = 'var(--border-color)'; btn.style.color = 'var(--text-muted)'; }
                });
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (isNoDir) {
                        sortState[topic] = { key: cfg.key };
                    } else if (sortState[topic].key === cfg.key) {
                        sortState[topic].dir = sortState[topic].dir === 'desc' ? 'asc' : 'desc';
                    } else {
                        sortState[topic] = { key: cfg.key, dir: 'desc' };
                    }
                    refreshTopicStats();
                });

                if (isActive) {
                    activeBtnEl = btn;
                }
                container.appendChild(btn);
            });

            if (container._scrollToChild && activeBtnEl) {
                setTimeout(() => {
                    container._scrollToChild(activeBtnEl);
                }, 30);
            } else if (container._updateArrows) {
                setTimeout(container._updateArrows, 50);
            }
        }

        // 메인 사이드바 크기 조절 (Resizer) 기능 구현
        function initSidebarResizer() {
            const sidebar = document.querySelector('.sidebar-section');
            const academySidebar = document.getElementById('academySidebar');
            if (!sidebar) return;

            const appContainer = document.querySelector('.app-container') || document.body;
            let resizer = document.querySelector('.sidebar-resizer');
            if (!resizer) {
                resizer = document.createElement('div');
                resizer.className = 'sidebar-resizer';
                resizer.title = '드래그하여 사이드바 너비 조절';
                appContainer.appendChild(resizer);
            }

            function applyWidth(width) {
                if (window.innerWidth <= 1024) {
                    // 모바일(1024px 이하)에서는 PC용 인라인 너비 제약을 제거하여 CSS 화면 맞춤(100%)을 적용합니다.
                    sidebar.style.width = '';
                    sidebar.style.minWidth = '';
                    sidebar.style.maxWidth = '';
                    if (academySidebar) academySidebar.style.right = '';
                    return;
                }

                const minW = 500;
                const maxW = Math.min(800, window.innerWidth - 120);
                const targetWidth = Math.max(minW, Math.min(maxW, width));

                document.documentElement.style.setProperty('--sidebar-width', `${targetWidth}px`);
                sidebar.style.width = `${targetWidth}px`;
                sidebar.style.minWidth = `500px`;
                sidebar.style.maxWidth = `${maxW}px`;
                if (academySidebar) {
                    academySidebar.style.right = `${targetWidth}px`;
                }
                if (window.kakaoMapInstance) {
                    window.kakaoMapInstance.relayout();
                }
            }

            window.addEventListener('resize', () => {
                if (window.innerWidth <= 1024) {
                    sidebar.style.width = '';
                    sidebar.style.minWidth = '';
                    sidebar.style.maxWidth = '';
                    if (academySidebar) academySidebar.style.right = '';
                } else {
                    const savedW = parseInt(localStorage.getItem('learnmap_sidebar_width'), 10) || 500;
                    applyWidth(savedW);
                }
            });

            // 저장된 사이드바 너비 복원 (기본 및 최소 500px)
            const savedWidth = localStorage.getItem('learnmap_sidebar_width');
            if (savedWidth && window.innerWidth > 1024) {
                const widthVal = parseInt(savedWidth, 10);
                if (!isNaN(widthVal) && widthVal >= 500 && widthVal <= Math.min(800, window.innerWidth - 120)) {
                    applyWidth(widthVal);
                } else {
                    applyWidth(500);
                }
            } else if (window.innerWidth > 1024) {
                applyWidth(500);
            }

            let isDragging = false;
            let startX = 0;
            let startWidth = 500;

            function onStart(pageX) {
                if (window.innerWidth <= 1024) return;
                isDragging = true;
                startX = pageX;
                const currentW = parseInt(sidebar.style.width, 10) || Math.round(sidebar.getBoundingClientRect().width);
                startWidth = Math.max(500, currentW);
                resizer.classList.add('is-dragging');
                document.body.classList.add('is-resizing-sidebar');
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
            }

            function onMove(pageX) {
                if (!isDragging) return;
                const deltaX = startX - pageX; // 좌측으로 드래그 시 너비 증가, 우측 드래그 시 너비 감소
                const newWidth = startWidth + deltaX;
                applyWidth(newWidth);
            }

            function onEnd() {
                if (isDragging) {
                    isDragging = false;
                    resizer.classList.remove('is-dragging');
                    document.body.classList.remove('is-resizing-sidebar');
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                    
                    const finalWidth = parseInt(sidebar.style.width, 10) || 500;
                    localStorage.setItem('learnmap_sidebar_width', finalWidth);
                    
                    if (window.kakaoMapInstance) {
                        window.kakaoMapInstance.relayout();
                    }
                }
            }

            resizer.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                onStart(e.clientX);
            });

            window.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    e.preventDefault();
                    onMove(e.clientX);
                }
            });

            window.addEventListener('mouseup', onEnd);

            resizer.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches.length === 1) {
                    onStart(e.touches[0].clientX);
                }
            }, { passive: true });

            window.addEventListener('touchmove', (e) => {
                if (isDragging && e.touches && e.touches.length === 1) {
                    onMove(e.touches[0].clientX);
                }
            }, { passive: true });

            window.addEventListener('touchend', onEnd);
            window.addEventListener('touchcancel', onEnd);
        }

        initSidebarResizer();

        // 에듀테크 종합 진단 카드 스크롤 감지 자동 접기/펼치기
        (function initEdutechHeroScrollHandler() {
            const sidebar = document.querySelector('.sidebar-section');
            const sidebarContent = document.getElementById('sidebarContent');
            const schoolCard = document.getElementById('schoolCard');

    })();

// ==========================================
// 학원 상세 모달 액션 헬퍼 및 신규 기능 함수들
// ==========================================
window.closeAcademyDetailModal = function() {
    if (typeof window.clearAcademyMarker === 'function') window.clearAcademyMarker();
    const panel = document.getElementById('communityPanel');
    if (panel) panel.style.display = 'none';
    const sidebarContent = document.getElementById('sidebarContent');
    if (sidebarContent) sidebarContent.style.display = 'block';
    const btnToggle = document.getElementById('btnToggleSidebarTop');
    if (btnToggle) btnToggle.style.display = 'flex';
    const btnTutorial = document.getElementById('btnShowTutorial');
    if (btnTutorial) btnTutorial.style.display = 'flex';
    const btnSettings = document.getElementById('btnOpenSettings');
    if (btnSettings) btnSettings.style.display = 'flex';
    const sb = document.querySelector('.sidebar-section');
    if (sb) sb.classList.remove('active-community');
};

function loadKakaoShareSDK() {
    return new Promise((resolve) => {
        const shareAppKey = window.GLOBAL_KAKAO_SHARE_APP_KEY || '3a00cd76a8e0492b9271a21aa2c37994';
        if (window.Kakao && window.Kakao.Share) {
            if (!window.Kakao.isInitialized() && shareAppKey) {
                try {
                    window.Kakao.init(shareAppKey);
                } catch (e) {
                    console.warn('[Kakao SDK] Init warning:', e);
                }
            }
            resolve(true);
            return;
        }

        if (document.getElementById('kakao-js-sdk-script')) {
            let attempts = 0;
            const timer = setInterval(() => {
                attempts++;
                if (window.Kakao && window.Kakao.Share) {
                    clearInterval(timer);
                    if (!window.Kakao.isInitialized() && shareAppKey) {
                        try { window.Kakao.init(shareAppKey); } catch (e) {}
                    }
                    resolve(true);
                } else if (attempts > 30) {
                    clearInterval(timer);
                    resolve(false);
                }
            }, 100);
            return;
        }

        const script = document.createElement('script');
        script.id = 'kakao-js-sdk-script';
        script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
        script.onload = () => {
            if (window.Kakao) {
                if (!window.Kakao.isInitialized() && shareAppKey) {
                    try {
                        window.Kakao.init(shareAppKey);
                    } catch (e) {
                        console.warn('[Kakao SDK] Init error:', e);
                    }
                }
                resolve(true);
            } else {
                resolve(false);
            }
        };
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
}
window.loadKakaoShareSDK = loadKakaoShareSDK;

window.shareSchoolDetail = async function() {
    const selected = (window.orchestrator && window.orchestrator.state) ? window.orchestrator.state.selectedSchool : null;
    const schoolNameEl = document.getElementById('schoolCardName');
    const schoolName = selected ? (selected.school_name || selected.name || '학교') : (schoolNameEl ? schoolNameEl.innerText : '학교');
    const address = selected ? (selected.address || '') : (document.getElementById('schoolCardAddress')?.innerText || '');
    const estType = selected ? (selected.establishment_type || selected.establishment || '') : '';
    const schoolKind = selected ? (selected.school_kind || '') : '';
    const coeduType = selected ? (selected.coedu_type || '') : '';
    const infoSummary = [schoolKind || estType, coeduType].filter(Boolean).join(' · ') || '공립 · 남녀공학';

    // 1. 종합 교육환경 점수 추출
    let envScoreVal = selected?.envScore || document.getElementById('totalEnvScoreLabel')?.innerText;
    if (!envScoreVal && selected?.subjects) {
        const sKor = selected.subjects.korean?.avg || 80;
        const sEng = selected.subjects.english?.avg || 80;
        const sMath = selected.subjects.math?.avg || 80;
        envScoreVal = Math.round((sKor + sEng + sMath) / 3);
    }
    const envScoreText = `${envScoreVal || '85'}점`;

    // 2. 학업성취도 정보 추출
    let korAvg = selected?.subjects?.korean?.avg;
    let engAvg = selected?.subjects?.english?.avg;
    let mathAvg = selected?.subjects?.math?.avg;
    
    let achievementText = '';
    if (korAvg !== undefined && engAvg !== undefined && mathAvg !== undefined) {
        const overallAvg = Math.round((korAvg + engAvg + mathAvg) / 3 * 10) / 10;
        achievementText = `국 ${korAvg} · 영 ${engAvg} · 수 ${mathAvg} (평균 ${overallAvg}점)`;
    } else {
        achievementText = '학업성취도 우수 학군';
    }

    // 3. 학업여지도 사이트 딥링크 URL 구성 (https://leamap.vercel.app/ 기준)
    const baseUrl = 'https://leamap.vercel.app/';
    let shareUrl = baseUrl;
    const targetId = selected ? (selected.school_id || selected.id || selected.school_name) : (schoolName !== '학교' ? schoolName : '');
    if (targetId) {
        shareUrl += `?school=${encodeURIComponent(targetId)}`;
    }

    // 요청된 규격에 맞춘 텍스트 카드 메시지 구성
    const cardMessageText = `🗺️ [학업여지도]\n\n학교명: ${schoolName}\n위치: ${address || '위치 정보 없음'}\n구분: ${infoSummary}\n종합교육환경 점수: ${envScoreText}\n학업성취도: ${achievementText}`;

    const sdkLoaded = await loadKakaoShareSDK();
    
    if (sdkLoaded && window.Kakao && window.Kakao.isInitialized() && window.Kakao.Share) {
        try {
            // objectType: 'text'를 사용해 카카오톡 메시지 카드 구성
            window.Kakao.Share.sendDefault({
                objectType: 'text',
                text: cardMessageText,
                link: {
                    mobileWebUrl: shareUrl,
                    webUrl: shareUrl,
                },
                buttons: [
                    {
                        title: '사이트 이동',
                        link: {
                            mobileWebUrl: shareUrl,
                            webUrl: shareUrl,
                        },
                    },
                ],
            });
            showToastNoticeMsg(`💬 ${schoolName} 카카오톡 학교 카드가 발송되었습니다.`);
            return;
        } catch (err) {
            console.warn('[Kakao Share] API 호출 실패, 웹 공유/클립보드로 전환:', err);
        }
    }

    const cardText = `${cardMessageText}\n\n🔗 사이트 이동:\n${shareUrl}`;
    if (navigator.share) {
        navigator.share({
            title: `[학업여지도] ${schoolName}`,
            text: cardText,
            url: shareUrl
        }).catch(err => {
            if (err.name !== 'AbortError' && navigator.clipboard) {
                navigator.clipboard.writeText(cardText);
                showToastNoticeMsg(`🔗 ${schoolName} 학교 카드 정보가 복사되었습니다.`);
            }
        });
    } else {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(cardText);
        }
        showToastNoticeMsg(`🔗 ${schoolName} 학교 카드 정보가 복사되었습니다.`);
    }
};

window.shareAcademyDetail = async function() {
    const acadName = window.currentAcademyForCommunity || '학원';
    const baseUrl = 'https://leamap.vercel.app/';
    let shareUrl = baseUrl;
    if (acadName && acadName !== '학원') {
        shareUrl += `?academy=${encodeURIComponent(acadName)}`;
    }

    const cardMessageText = `🗺️ [학업여지도]\n\n학원명: ${acadName}\n구분: 학원 및 교습소\n특징: 수강료 및 실제 학부모·수험생 후기 확인`;

    const sdkLoaded = await loadKakaoShareSDK();

    if (sdkLoaded && window.Kakao && window.Kakao.isInitialized() && window.Kakao.Share) {
        try {
            window.Kakao.Share.sendDefault({
                objectType: 'text',
                text: cardMessageText,
                link: {
                    mobileWebUrl: shareUrl,
                    webUrl: shareUrl,
                },
                buttons: [
                    {
                        title: '사이트 이동',
                        link: {
                            mobileWebUrl: shareUrl,
                            webUrl: shareUrl,
                        },
                    },
                ],
            });
            showToastNoticeMsg(`💬 ${acadName} 카카오톡 학원 카드가 발송되었습니다.`);
            return;
        } catch (err) {
            console.warn('[Kakao Share] 학원 공유 실패, 클립보드 복사 전환:', err);
        }
    }

    const cardText = `${cardMessageText}\n\n🔗 학업여지도 사이트에서 보기:\n${shareUrl}`;
    if (navigator.share) {
        navigator.share({
            title: `${acadName} 학원 정보`,
            text: cardText,
            url: shareUrl
        }).catch(err => {
            if (err.name !== 'AbortError' && navigator.clipboard) {
                navigator.clipboard.writeText(cardText);
                showToastNoticeMsg(`🔗 ${acadName} 학원 정보 링크가 복사되었습니다.`);
            }
        });
    } else {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(cardText);
        }
        showToastNoticeMsg(`🔗 ${acadName} 학원 정보 링크가 복사되었습니다.`);
    }
};

// URL의 딥링크 파라미터(?school=... 또는 ?academy=...) 감지하여 사이트 오픈 시 해당 학교/학원 자동 렌더링
window.checkAndOpenDeepLinkFromURL = function checkAndOpenDeepLinkFromURL() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const schoolParam = urlParams.get('school') || urlParams.get('school_id');
        const academyParam = urlParams.get('academy') || urlParams.get('academy_id');

        const simParam = urlParams.get('sim');

        if (simParam === '1') {
            // =====================================================
            // 학군 이사 시뮬레이션 딥링크: ?sim=1&sidoA=...&dongA=...
            // 카카오 공유 링크 클릭 시 해당 시뮬레이션 결과 자동 복원
            // 복원 우선순위:
            //   1순위 — scrapId 파라미터 → localStorage에서 담긴 결과 즉시 표시
            //   2순위 — 지역 파라미터 → 시뮬레이션 새로 실행 (다른 기기/브라우저 폴백)
            // =====================================================
            const scrapIdParam = urlParams.get('scrapId');
            const sidoA  = urlParams.get('sidoA')  || '';
            const gugunA = urlParams.get('gugunA') || '';
            const dongA  = urlParams.get('dongA')  || '';
            const sidoB  = urlParams.get('sidoB')  || '';
            const gugunB = urlParams.get('gugunB') || '';
            const dongB  = urlParams.get('dongB')  || '';
            const simType = urlParams.get('type') || '중학교';

            let attempts = 0;
            const simInterval = setInterval(async () => {
                attempts++;

                // 시뮬레이션 모달 열기 함수와 드롭다운 초기화 함수가 준비될 때까지 대기
                const btnOpenSim = document.getElementById('btnOpenSimulation');
                const simModal = document.getElementById('simulationModal');
                const isDomReady = !!simModal;
                const isFnReady = typeof window.initSimulationDropdowns === 'function'
                    && typeof window.runMovingSimulation === 'function';

                if (isDomReady && isFnReady) {
                    clearInterval(simInterval);

                    // 1. 시뮬레이션 모달 열기
                    if (btnOpenSim) {
                        btnOpenSim.click();
                    } else if (simModal) {
                        simModal.style.display = 'flex';
                    }

                    await new Promise(r => setTimeout(r, 200));

                    // ★ scrapId 우선 복원: 같은 기기 localStorage에 담긴 결과가 있으면 즉시 표시
                    if (scrapIdParam) {
                        try {
                            const stored = JSON.parse(localStorage.getItem('learnmap_simulation_scraps') || '[]');
                            const found = stored.find(s => s.id === scrapIdParam);
                            if (found && typeof window.openSavedSimulation === 'function') {
                                window.openSavedSimulation(scrapIdParam);
                                return; // 복원 성공 → 지역 파라미터 폴백 불필요
                            }
                        } catch (e) {
                            console.warn('[DeepLink] scrapId 복원 실패, 지역 파라미터로 폴백:', e);
                        }
                    }

                    // 2. 학교급 탭 설정 (폴백: 지역 파라미터로 시뮬레이션 새로 실행)
                    if (simType && typeof window.setSimSchoolType === 'function') {
                        window.setSimSchoolType(simType);
                    }

                    // 3. 드롭다운 초기화 (모달 오픈 후 약간 지연)
                    await new Promise(r => setTimeout(r, 200));

                    const selSidoA  = document.getElementById('simSidoA');
                    const selGugunA = document.getElementById('simGugunA');
                    const selDongA  = document.getElementById('simDongA');
                    const selSidoB  = document.getElementById('simSidoB');
                    const selGugunB = document.getElementById('simGugunB');
                    const selDongB  = document.getElementById('simDongB');

                    if (sidoA && selSidoA) {
                        selSidoA.value = sidoA;
                        selSidoA.dispatchEvent(new Event('change'));
                    }
                    if (sidoB && selSidoB) {
                        selSidoB.value = sidoB;
                        selSidoB.dispatchEvent(new Event('change'));
                    }

                    await new Promise(r => setTimeout(r, 150));

                    if (gugunA && selGugunA) {
                        selGugunA.value = gugunA;
                        selGugunA.dispatchEvent(new Event('change'));
                        if (dongA && selDongA && typeof updateDongDropdown === 'function') {
                            await updateDongDropdown(sidoA, gugunA, selDongA, dongA);
                        }
                    }
                    if (gugunB && selGugunB) {
                        selGugunB.value = gugunB;
                        selGugunB.dispatchEvent(new Event('change'));
                        if (dongB && selDongB && typeof updateDongDropdown === 'function') {
                            await updateDongDropdown(sidoB, gugunB, selDongB, dongB);
                        }
                    }
                    if (dongA && selDongA) selDongA.value = dongA;
                    if (dongB && selDongB) selDongB.value = dongB;

                    if (typeof updateSimRegionSubInfo === 'function') updateSimRegionSubInfo();

                    // 4. 시뮬레이션 자동 실행
                    await new Promise(r => setTimeout(r, 200));
                    const regA = `${sidoA} ${gugunA} ${dongA}`.trim() || '후보지역 A';
                    const regB = `${sidoB} ${gugunB} ${dongB}`.trim() || '후보지역 B';
                    const labelA = dongA || gugunA || '지역A';
                    const labelB = dongB || gugunB || '지역B';

                    if (typeof runMovingSimulation === 'function') {
                        runMovingSimulation(regA, regB, labelA, labelB);
                    }

                    return;
                }

                if (attempts > 80) clearInterval(simInterval);
            }, 200);

        } else if (schoolParam) {
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;

                const cacheList = (window.allSchoolsCache && Array.isArray(window.allSchoolsCache) && window.allSchoolsCache.length > 0)
                    ? window.allSchoolsCache
                    : ((window.schoolsDatabase && Array.isArray(window.schoolsDatabase) && window.schoolsDatabase.length > 0)
                        ? window.schoolsDatabase
                        : ((typeof schoolsDatabase !== 'undefined' && Array.isArray(schoolsDatabase) && schoolsDatabase.length > 0)
                            ? schoolsDatabase
                            : ((typeof currentLoadedSchools !== 'undefined' && Array.isArray(currentLoadedSchools) && currentLoadedSchools.length > 0)
                                ? currentLoadedSchools
                                : [])));

                let targetSchool = cacheList.find(s => String(s.school_id || s.id) === String(schoolParam) || s.school_name === schoolParam);

                if (targetSchool && typeof window.viewSchoolOnMapFromStats === 'function') {
                    clearInterval(checkInterval);
                    window.viewSchoolOnMapFromStats(targetSchool.school_id || targetSchool.id || schoolParam);
                    return;
                }

                // 비동기 데이터 수신 전이라도 viewSchoolOnMapFromStats가 있고 3초 이상 지났으면 직접 호출
                if (attempts > 15 && typeof window.viewSchoolOnMapFromStats === 'function') {
                    clearInterval(checkInterval);
                    window.viewSchoolOnMapFromStats(schoolParam);
                    return;
                }

                if (attempts > 50) {
                    clearInterval(checkInterval);
                }
            }, 200);
        } else if (academyParam) {
            let attempts = 0;
            const acadInterval = setInterval(() => {
                attempts++;
                if (typeof window.focusAcademyOnMapFromDetail === 'function' || typeof window.searchAndMoveMap === 'function') {
                    clearInterval(acadInterval);
                    window.currentAcademyForCommunity = academyParam;
                    if (typeof window.openAcademyDetailModal === 'function') {
                        window.openAcademyDetailModal(academyParam);
                    }
                }
                if (attempts > 30) clearInterval(acadInterval);
            }, 200);
        }
    } catch (e) {
        console.warn('[DeepLink] URL 파라미터 파싱 실패:', e);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.checkAndOpenDeepLinkFromURL);
} else {
    window.checkAndOpenDeepLinkFromURL();
}

window.makeAcademyCall = function() {
    const phoneEl = document.getElementById('academyDetailPhone');
    const phone = phoneEl ? phoneEl.innerText.replace(/[^0-9]/g, '') : '';
    if (phone) {
        window.location.href = `tel:${phone}`;
    } else {
        alert('등록된 전화번호로 연결합니다: 02-454-9837');
        window.location.href = 'tel:024549837';
    }
};

window.searchAndMoveMap = function(address, acadName, lng = '', lat = '') {
    if (lng && lat && !isNaN(parseFloat(lng)) && !isNaN(parseFloat(lat))) {
        window.focusAcademyLocationOnMap(lng, lat, acadName);
        return;
    }
    if (window.kakao && window.kakao.maps && window.kakao.maps.services && window.kakao.maps.services.Geocoder) {
        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.addressSearch(address, function(result, status) {
            if (status === kakao.maps.services.Status.OK && result[0]) {
                window.focusAcademyLocationOnMap(result[0].x, result[0].y, acadName);
            } else {
                showCustomAlert('위치 찾기 안내', '해당 학원의 지도 위치 정보를 찾을 수 없습니다.');
            }
        });
    } else {
        showCustomAlert('지도 안내', '카카오 지도 서비스가 올바르게 로드되지 않았습니다.');
    }
};

window.focusAcademyOnMapFromDetail = function() {
    const addressEl = document.getElementById('academyDetailAddressStr');
    const address = addressEl ? addressEl.innerText : '';
    const acadName = window.currentAcademyForCommunity || '학원';
    const coords = window.currentAcademyCoords || {};
    window.searchAndMoveMap(address, acadName, coords.lng, coords.lat);
};

window.toggleAcademyBookmark = function() {
    const acadName = window.currentAcademyForCommunity || 'default';
    const countEl = document.getElementById('academyBookmarkCount');
    let count = parseInt(countEl ? countEl.innerText : '128') || 128;
    
    const storageKey = `saved_acad_${acadName}`;
    const isSaved = localStorage.getItem(storageKey) === 'true';
    
    if (isSaved) {
        localStorage.setItem(storageKey, 'false');
        count = Math.max(0, count - 1);
        if (countEl) countEl.innerText = count;
        showToastNoticeMsg(`🔖 ${acadName} 관심 학원에서 해제되었습니다.`);
    } else {
        localStorage.setItem(storageKey, 'true');
        count += 1;
        if (countEl) countEl.innerText = count;
        showToastNoticeMsg(`🔖 ${acadName} 관심 학원으로 저장되었습니다.`);
    }
};

window.switchTabToFeeCalculator = function() {
    const tabCalc = document.getElementById('tabAcademyCalculator');
    if (tabCalc) tabCalc.click();
};

window.copyAddressToClipboard = function(addressStr) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(addressStr);
    }
    showToastNoticeMsg(`📋 학원 주소가 클립보드에 복사되었습니다.`);
};

window.toggleReviewLike = function(btnEl) {
    if (!btnEl) return;
    const cntEl = btnEl.querySelector('.like-cnt');
    if (!cntEl) return;
    let count = parseInt(cntEl.innerText) || 0;
    const isLiked = btnEl.getAttribute('data-liked') === 'true';
    if (isLiked) {
        btnEl.setAttribute('data-liked', 'false');
        btnEl.style.color = '#64748b';
        cntEl.innerText = Math.max(0, count - 1);
    } else {
        btnEl.setAttribute('data-liked', 'true');
        btnEl.style.color = '#2563eb';
        cntEl.innerText = count + 1;
        showToastNoticeMsg(`👍 후기에 '도움돼요'를 표시했습니다.`);
    }
};

window.loadMoreAcademyReviews = function() {
    const btn = document.getElementById('btnLoadMoreAcademyReviews');
    if (btn) {
        btn.innerText = '모든 후기를 불러왔습니다 (최신순)';
        btn.style.opacity = '0.6';
        btn.style.cursor = 'default';
    }
};

function showToastNoticeMsg(msg) {
    const toastEl = document.getElementById('mobileFilterToast');
    if (toastEl) {
        toastEl.innerText = msg;
        toastEl.style.display = 'block';
        toastEl.style.opacity = '1';
        setTimeout(() => {
            toastEl.style.opacity = '0';
            setTimeout(() => { toastEl.style.display = 'none'; }, 300);
        }, 2500);
    }
}

// 회원 가입 & 로그인 서비스 모듈 초기화
function initAuthModule() {
    const authModal = document.getElementById('authModal');

    window.openAuthModal = function() {
        if (authModal) authModal.style.display = 'flex';
    };

    window.closeAuthModal = function() {
        if (authModal) authModal.style.display = 'none';
    };

    // 사이드바 로그인 창 열기 도우미 함수
    window.openSidebarLogin = function() {
        // 1. 전체 화면 중앙 모달이 켜져 있다면 닫기
        if (typeof window.closeAuthModal === 'function') {
            window.closeAuthModal();
        }

        // 2. 사이드바가 닫혀있거나 모바일인 경우 사이드바 노출
        const container = document.querySelector('.app-container');
        const sidebar = document.querySelector('.sidebar-section');
        const btnToggle = document.getElementById('btnToggleSidebarTop');

        if (sidebar) {
            sidebar.style.display = 'flex';
        }
        if (container) {
            container.classList.add('sidebar-open');
        }
        if (btnToggle) {
            btnToggle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        }

        // 모바일 하단 네비게이션 환경일 경우 마이페이지 탭 활성화
        if (window.innerWidth <= 1024 && typeof window.onMobileNavClick === 'function') {
            const mypageTabBtn = document.querySelector('.mobile-bottom-nav .nav-item[onclick*="mypage"]');
            window.onMobileNavClick('mypage', mypageTabBtn);
        }

        // 3. 사이드바 내 겹칠 수 있는 튜토리얼 등 안내 카드 닫기
        const tutorial = document.getElementById('tutorialSidebarCard');
        if (tutorial) {
            tutorial.style.display = 'none';
        }

        // 4. 사이드바 설정(로그인/회원가입) 모달 영역 표시
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.style.display = 'block';
        }

        // 5. 로그인 탭 활성화
        if (typeof window.switchSettingsAuthTab === 'function') {
            window.switchSettingsAuthTab('login');
        }

        // 6. 사이드바 로그인 입력 섹션으로 부드럽게 스크롤 및 이메일 입력창 포커스
        const authSection = document.getElementById('settingsAuthSection');
        if (authSection) {
            authSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (settingsModal) {
            settingsModal.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        setTimeout(() => {
            const emailInput = document.getElementById('settingsEmail');
            if (emailInput) {
                emailInput.focus();
            }
        }, 300);
    };

    window.switchAuthTab = function(mode = 'login') {
        const btnLogin = document.getElementById('btnAuthTabLogin');
        const btnRegister = document.getElementById('btnAuthTabRegister');
        const viewLogin = document.getElementById('authViewLogin');
        const viewRegister = document.getElementById('authViewRegister');

        if (mode === 'login') {
            if (btnLogin) {
                btnLogin.classList.add('active');
                btnLogin.style.background = '#ffffff';
                btnLogin.style.color = '#191f28';
                btnLogin.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
            }
            if (btnRegister) {
                btnRegister.classList.remove('active');
                btnRegister.style.background = 'transparent';
                btnRegister.style.color = '#8b95a1';
                btnRegister.style.boxShadow = 'none';
            }
            if (viewLogin) viewLogin.style.display = 'block';
            if (viewRegister) viewRegister.style.display = 'none';
        } else {
            if (btnRegister) {
                btnRegister.classList.add('active');
                btnRegister.style.background = '#ffffff';
                btnRegister.style.color = '#191f28';
                btnRegister.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
            }
            if (btnLogin) {
                btnLogin.classList.remove('active');
                btnLogin.style.background = 'transparent';
                btnLogin.style.color = '#8b95a1';
                btnLogin.style.boxShadow = 'none';
            }
            if (viewLogin) viewLogin.style.display = 'none';
            if (viewRegister) viewRegister.style.display = 'block';
        }
    };

    window.switchSettingsAuthTab = function(mode = 'login') {
        const btnLogin = document.getElementById('btnSettingsTabLogin');
        const btnRegister = document.getElementById('btnSettingsTabRegister');
        const viewLogin = document.getElementById('settingsLoginForm');
        const viewRegister = document.getElementById('settingsRegisterForm');

        const btnLoginMobile = document.getElementById('btnSettingsTabLoginMobile');
        const btnRegisterMobile = document.getElementById('btnSettingsTabRegisterMobile');
        const viewLoginMobile = document.getElementById('settingsLoginFormMobile');
        const viewRegisterMobile = document.getElementById('settingsRegisterFormMobile');

        if (mode === 'login') {
            [btnLogin, btnLoginMobile].forEach(btn => {
                if (btn) {
                    btn.classList.add('active');
                    btn.style.background = '#ffffff';
                    btn.style.color = '#191f28';
                    btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
                }
            });
            [btnRegister, btnRegisterMobile].forEach(btn => {
                if (btn) {
                    btn.classList.remove('active');
                    btn.style.background = 'transparent';
                    btn.style.color = '#8b95a1';
                    btn.style.boxShadow = 'none';
                }
            });
            if (viewLogin) viewLogin.style.display = 'block';
            if (viewRegister) viewRegister.style.display = 'none';
            if (viewLoginMobile) viewLoginMobile.style.display = 'block';
            if (viewRegisterMobile) viewRegisterMobile.style.display = 'none';
        } else {
            [btnRegister, btnRegisterMobile].forEach(btn => {
                if (btn) {
                    btn.classList.add('active');
                    btn.style.background = '#ffffff';
                    btn.style.color = '#191f28';
                    btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
                }
            });
            [btnLogin, btnLoginMobile].forEach(btn => {
                if (btn) {
                    btn.classList.remove('active');
                    btn.style.background = 'transparent';
                    btn.style.color = '#8b95a1';
                    btn.style.boxShadow = 'none';
                }
            });
            if (viewLogin) viewLogin.style.display = 'none';
            if (viewRegister) viewRegister.style.display = 'block';
            if (viewLoginMobile) viewLoginMobile.style.display = 'none';
            if (viewRegisterMobile) viewRegisterMobile.style.display = 'block';
        }
    };

    window.updateAuthUI = function() {
        const btnSettings = document.getElementById('btnOpenSettings');
        let currentUser = authService.getCurrentUser();

        // 사용자가 명시적으로 로그아웃하지 않은 상태라면, 시안 이미지와 동일한 조민기 학부모님 계정 기본 활성화
        if (!currentUser && !localStorage.getItem('learnmap_logged_out')) {
            currentUser = {
                name: '조민기',
                email: 'bird3325@naver.com',
                role: 'parent',
                tier: '정회원'
            };
            localStorage.setItem('learnmap_current_user', JSON.stringify(currentUser));
        }

        // 설정 영역 내부 회원 인증 상태 제어 (PC & 모바일)
        const userCard = document.getElementById('settingsAuthUserCard');
        const formArea = document.getElementById('settingsAuthFormArea');
        const userNameEl = document.getElementById('settingsAuthUserName');
        const userEmailEl = document.getElementById('settingsAuthUserEmail');
        const badgeEl = document.getElementById('settingsAuthBadge');
        const btnKakao = document.getElementById('btnKakaoEasyLoginSettings');

        const userCardMobile = document.getElementById('settingsAuthUserCardMobile');
        const formAreaMobile = document.getElementById('settingsAuthFormAreaMobile');
        const userNameElMobile = document.getElementById('settingsAuthUserNameMobile');
        const userEmailElMobile = document.getElementById('settingsAuthUserEmailMobile');
        const badgeElMobile = document.getElementById('settingsAuthBadgeMobile');
        const btnKakaoMobile = document.getElementById('btnKakaoEasyLoginSettingsMobile');
        const btnMobileLogout = document.getElementById('btnMobileLogout');

        const childPC = document.getElementById('settingsChildSection');
        const childMobile = document.getElementById('settingsChildSectionMobile');
        const myActivityMobile = document.getElementById('settingsMyActivitySectionMobile');
        const neisBannerMobile = document.getElementById('mobileNeisBannerCard');
        const neisMobile = document.getElementById('settingsNEISSectionMobile');
        const opacityPC = document.getElementById('settingsOpacitySection-pc');
        const opacityMobile = document.getElementById('settingsOpacitySectionMobile');
        const notiPC = document.getElementById('settingsNotificationSection-pc');

        if (currentUser) {
            if (userCard) userCard.style.display = 'block';
            if (formArea) formArea.style.display = 'none';
            if (btnKakao) btnKakao.style.display = 'none';

            if (userCardMobile) userCardMobile.style.display = 'block';
            if (formAreaMobile) formAreaMobile.style.display = 'none';
            if (btnKakaoMobile) btnKakaoMobile.style.display = 'none';
            if (btnMobileLogout) btnMobileLogout.style.display = 'inline-flex';

            if (userNameEl) userNameEl.innerText = currentUser.name;
            if (userEmailEl) userEmailEl.innerText = currentUser.email;
            if (userNameElMobile) userNameElMobile.innerText = currentUser.name;
            if (userEmailElMobile) userEmailElMobile.innerText = currentUser.email;

            if (badgeEl) {
                badgeEl.innerText = '🟢 인증 100% 완료';
                badgeEl.className = 'neis-badge neis-badge-success';
            }
            if (badgeElMobile) {
                badgeElMobile.innerText = '🟢 인증 100% 완료';
                badgeElMobile.className = 'neis-badge neis-badge-success';
            }
            if (btnSettings) {
                btnSettings.setAttribute('data-title', `${currentUser.name} (회원/설정)`);
            }

            const mypageProfileName = document.getElementById('mypageProfileName');
            if (mypageProfileName) {
                mypageProfileName.innerText = `${currentUser.name} 학부모님`;
            }

            if (childPC) childPC.style.display = 'block';
            if (childMobile) childMobile.style.display = 'flex';
            if (myActivityMobile) myActivityMobile.style.display = 'flex';
            if (neisBannerMobile) neisBannerMobile.style.display = 'flex';
            if (neisMobile) neisMobile.style.display = 'flex';
            if (opacityPC) opacityPC.style.display = 'block';
            if (opacityMobile) opacityMobile.style.display = 'flex';
            if (notiPC) notiPC.style.display = 'block';

            if (typeof renderChildPillTabs === 'function') {
                renderChildPillTabs();
            }
            const currentProfiles = (typeof childProfiles !== 'undefined' && Array.isArray(childProfiles)) ? childProfiles : (window.childProfiles || []);
            const currentTargetId = (typeof selectedChildId !== 'undefined') ? selectedChildId : window.selectedChildId;
            const activeChild = currentProfiles.find(c => c.id === currentTargetId);
            if (activeChild && typeof updateScoreAnalysisUI === 'function') {
                updateScoreAnalysisUI(activeChild.korean, activeChild.english, activeChild.math, activeChild.society, activeChild.history, activeChild.science);
            }
        } else {
            if (userCard) userCard.style.display = 'none';
            if (formArea) formArea.style.display = 'block';
            if (btnKakao) btnKakao.style.display = 'flex';

            if (userCardMobile) userCardMobile.style.display = 'none';
            if (formAreaMobile) formAreaMobile.style.display = 'block';
            if (btnKakaoMobile) btnKakaoMobile.style.display = 'flex';
            if (btnMobileLogout) btnMobileLogout.style.display = 'none';

            if (badgeEl) {
                badgeEl.innerText = '나이스 마이데이터 융합 지원';
                badgeEl.className = 'neis-badge neis-badge-info';
            }
            if (badgeElMobile) {
                badgeElMobile.innerText = '나이스 마이데이터 융합 지원';
                badgeElMobile.className = 'neis-badge neis-badge-info';
            }
            if (btnSettings) {
                btnSettings.setAttribute('data-title', '회원가입 / 로그인 설정');
            }

            const mypageProfileName = document.getElementById('mypageProfileName');
            if (mypageProfileName) {
                mypageProfileName.innerText = '자녀 정보를 등록해 주세요';
            }

            if (childPC) childPC.style.display = 'none';
            if (childMobile) childMobile.style.display = 'none';
            if (myActivityMobile) myActivityMobile.style.display = 'none';
            if (neisBannerMobile) neisBannerMobile.style.display = 'none';
            if (neisMobile) neisMobile.style.display = 'flex';
            if (opacityPC) opacityPC.style.display = 'none';
            if (opacityMobile) opacityMobile.style.display = 'none';
            if (notiPC) notiPC.style.display = 'none';
        }
    };

    window.handleKakaoLogin = async function() {
        localStorage.removeItem('learnmap_logged_out');
        const res = await authService.kakaoLogin();
        if (res && res.message) {
            await alert(res.message);
        }
        if (res && res.success) {
            if (typeof window.loadChildProfilesFromSupabase === 'function') {
                await window.loadChildProfilesFromSupabase();
            }
            window.updateAuthUI();
            if (typeof window.closeAuthModal === 'function') {
                window.closeAuthModal();
            }
            if (typeof window.renderNEISTabContent === 'function') {
                window.renderNEISTabContent('sync');
            }
        }
    };

    // 비밀번호 보기/숨기기 토글 함수
    window.togglePasswordVisibility = function(inputId, btnEl) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        if (btnEl) {
            const eyeOn = btnEl.querySelector('.icon-eye');
            const eyeOff = btnEl.querySelector('.icon-eye-off');
            if (eyeOn && eyeOff) {
                if (isPassword) {
                    eyeOn.style.display = 'block';
                    eyeOff.style.display = 'none';
                    btnEl.setAttribute('aria-label', '비밀번호 숨기기');
                    btnEl.setAttribute('title', '비밀번호 숨기기');
                } else {
                    eyeOn.style.display = 'none';
                    eyeOff.style.display = 'block';
                    btnEl.setAttribute('aria-label', '비밀번호 보기');
                    btnEl.setAttribute('title', '비밀번호 보기');
                }
            }
        }
    };

    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    window.handleSettingsLogin = async function() {
        const emailElMobile = document.getElementById('settingsEmailMobile');
        const passElMobile = document.getElementById('settingsPasswordMobile');
        const emailElPC = document.getElementById('settingsEmail');
        const passElPC = document.getElementById('settingsPassword');

        const emailInput = (emailElMobile && emailElMobile.value.trim()) ? emailElMobile : emailElPC;
        const passwordInput = (passElMobile && passElMobile.value) ? passElMobile : passElPC;

        const email = emailInput?.value?.trim() || '';
        const password = passwordInput?.value || '';

        if (!email) {
            await alert('이메일 주소를 입력해 주세요.');
            emailInput?.focus();
            return;
        }
        if (!password) {
            await alert('비밀번호를 입력해 주세요.');
            passwordInput?.focus();
            return;
        }

        localStorage.removeItem('learnmap_logged_out');
        const res = await authService.login(email, password);
        await alert(res.message);
        if (res.success) {
            await loadChildProfilesFromSupabase();
            window.updateAuthUI();
            if (typeof window.renderNEISTabContent === 'function') {
                window.renderNEISTabContent('sync');
            }
        }
    };

    window.handleSettingsRegister = async function() {
        const nameElMobile = document.getElementById('settingsRegNameMobile');
        const emailElMobile = document.getElementById('settingsRegEmailMobile');
        const passElMobile = document.getElementById('settingsRegPasswordMobile');
        const passConfElMobile = document.getElementById('settingsRegPasswordConfirmMobile');

        const nameElPC = document.getElementById('settingsRegName');
        const emailElPC = document.getElementById('settingsRegEmail');
        const passElPC = document.getElementById('settingsRegPassword');
        const passConfElPC = document.getElementById('settingsRegPasswordConfirm');

        const nameInput = (nameElMobile && nameElMobile.value.trim()) ? nameElMobile : nameElPC;
        const emailInput = (emailElMobile && emailElMobile.value.trim()) ? emailElMobile : emailElPC;
        const passwordInput = (passElMobile && passElMobile.value) ? passElMobile : passElPC;
        const passwordConfirmInput = (passConfElMobile && passConfElMobile.value) ? passConfElMobile : passConfElPC;

        const name = nameInput?.value?.trim() || '';
        const email = emailInput?.value?.trim() || '';
        const password = passwordInput?.value || '';
        const passwordConfirm = passwordConfirmInput?.value || '';

        // 1. 이름 유효성 검사
        if (!name) {
            await alert('이름을 입력해 주세요.');
            nameInput?.focus();
            return;
        }
        if (name.length < 2) {
            await alert('이름은 최소 2글자 이상 입력해 주세요.');
            nameInput?.focus();
            return;
        }

        // 2. 이메일 형식 유효성 검사
        if (!email) {
            await alert('이메일 주소를 입력해 주세요.');
            emailInput?.focus();
            return;
        }
        if (!EMAIL_REGEX.test(email)) {
            await alert('올바른 이메일 형식을 입력해 주세요.\n(예: user@example.com)');
            emailInput?.focus();
            return;
        }

        // 3. 비밀번호 유효성 검사 (최소 6자 이상)
        if (!password) {
            await alert('비밀번호를 입력해 주세요.');
            passwordInput?.focus();
            return;
        }
        if (password.length < 6) {
            await alert('비밀번호는 최소 6자 이상이어야 합니다.');
            passwordInput?.focus();
            return;
        }

        // 4. 비밀번호 확인 일치 검사
        if (!passwordConfirm) {
            await alert('비밀번호 확인을 입력해 주세요.');
            passwordConfirmInput?.focus();
            return;
        }
        if (password !== passwordConfirm) {
            await alert('비밀번호가 일치하지 않습니다. 다시 확인해 주세요.');
            passwordConfirmInput?.focus();
            return;
        }

        localStorage.removeItem('learnmap_logged_out');
        const res = await authService.register({ name, email, password, passwordConfirm, role: 'parent' });
        await alert(res.message);
        if (res.success) {
            await loadChildProfilesFromSupabase();
            window.updateAuthUI();
            if (typeof window.renderNEISTabContent === 'function') {
                window.renderNEISTabContent('sync');
            }
        }
    };

    window.handleLogout = async function() {
        localStorage.setItem('learnmap_logged_out', 'true');
        authService.logout();
        if (typeof window.loadChildProfilesFromSupabase === 'function') {
            await window.loadChildProfilesFromSupabase();
        }
        window.updateAuthUI();
        if (typeof window.closeAuthModal === 'function') {
            window.closeAuthModal();
        }
        if (typeof window.renderNEISTabContent === 'function') {
            window.renderNEISTabContent('sync');
        }
    };

    window.handleLoginSubmit = async function(e) {
        if (e) e.preventDefault();
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const email = emailInput?.value?.trim() || '';
        const password = passwordInput?.value || '';

        if (!email) {
            await alert('이메일 주소를 입력해 주세요.');
            emailInput?.focus();
            return;
        }
        if (!password) {
            await alert('비밀번호를 입력해 주세요.');
            passwordInput?.focus();
            return;
        }

        const res = await authService.login(email, password);
        await alert(res.message);
        if (res.success) {
            window.closeAuthModal();
            await loadChildProfilesFromSupabase();
            window.updateAuthUI();
            if (typeof window.openNEISModal === 'function') {
                window.openNEISModal();
            }
        }
    };

    window.handleRegisterSubmit = async function(e) {
        if (e) e.preventDefault();
        const nameInput = document.getElementById('regName');
        const emailInput = document.getElementById('regEmail');
        const passwordInput = document.getElementById('regPassword');
        const passwordConfirmInput = document.getElementById('regPasswordConfirm');
        const role = document.getElementById('regRole')?.value || 'parent';

        const name = nameInput?.value?.trim() || '';
        const email = emailInput?.value?.trim() || '';
        const password = passwordInput?.value || '';
        const passwordConfirm = passwordConfirmInput?.value || '';

        // 1. 이름 유효성 검사
        if (!name) {
            await alert('이름을 입력해 주세요.');
            nameInput?.focus();
            return;
        }
        if (name.length < 2) {
            await alert('이름은 최소 2글자 이상 입력해 주세요.');
            nameInput?.focus();
            return;
        }

        // 2. 이메일 형식 유효성 검사
        if (!email) {
            await alert('이메일 주소를 입력해 주세요.');
            emailInput?.focus();
            return;
        }
        if (!EMAIL_REGEX.test(email)) {
            await alert('올바른 이메일 형식을 입력해 주세요.\n(예: user@example.com)');
            emailInput?.focus();
            return;
        }

        // 3. 비밀번호 유효성 검사 (최소 6자 이상)
        if (!password) {
            await alert('비밀번호를 입력해 주세요.');
            passwordInput?.focus();
            return;
        }
        if (password.length < 6) {
            await alert('비밀번호는 최소 6자 이상이어야 합니다.');
            passwordInput?.focus();
            return;
        }

        // 4. 비밀번호 확인 일치 검사
        if (!passwordConfirm) {
            await alert('비밀번호 확인을 입력해 주세요.');
            passwordConfirmInput?.focus();
            return;
        }
        if (password !== passwordConfirm) {
            await alert('비밀번호가 일치하지 않습니다. 다시 확인해 주세요.');
            passwordConfirmInput?.focus();
            return;
        }

        const res = await authService.register({ name, email, password, passwordConfirm, role });
        await alert(res.message);
        if (res.success) {
            window.closeAuthModal();
            await loadChildProfilesFromSupabase();
            window.updateAuthUI();
            if (typeof window.openNEISModal === 'function') {
                window.openNEISModal();
            }
        }
    };

    window.handleQuickTestLogin = async function() {
        const res = await authService.login('test@learnmap.com', '1234');
        await alert(res.message);
        if (res.success) {
            window.closeAuthModal();
            await loadChildProfilesFromSupabase();
            window.updateAuthUI();
            if (typeof window.openNEISModal === 'function') {
                window.openNEISModal();
            }
        }
    };

    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) window.closeAuthModal();
        });
    }

    // =========================================================================
    // 아이디 / 비밀번호 찾기 모달 로직
    // =========================================================================
    const findAccountModal = document.getElementById('findAccountModal');

    window.openFindAccountModal = function(initialTab = 'id') {
        if (findAccountModal) {
            findAccountModal.style.display = 'flex';
        }
        window.switchFindAccountTab(initialTab);

        // 입력창 및 결과창 초기화
        const findIdName = document.getElementById('findIdInputName');
        const findPwName = document.getElementById('findPwInputName');
        const findPwEmail = document.getElementById('findPwInputEmail');
        const findPwNewPassword = document.getElementById('findPwInputNewPassword');
        const findIdResultBox = document.getElementById('findIdResultBox');
        const findIdResultText = document.getElementById('findIdResultText');

        if (findIdName) findIdName.value = '';
        if (findPwName) findPwName.value = '';
        if (findPwEmail) findPwEmail.value = '';
        if (findPwNewPassword) findPwNewPassword.value = '';
        if (findIdResultBox) findIdResultBox.style.display = 'none';
        if (findIdResultText) findIdResultText.innerText = '';

        setTimeout(() => {
            if (initialTab === 'id') {
                findIdName?.focus();
            } else {
                findPwName?.focus();
            }
        }, 150);
    };

    window.closeFindAccountModal = function() {
        if (findAccountModal) {
            findAccountModal.style.display = 'none';
        }
    };

    window.switchFindAccountTab = function(mode = 'id') {
        const btnId = document.getElementById('btnFindTabId');
        const btnPw = document.getElementById('btnFindTabPw');
        const viewId = document.getElementById('findAccountViewId');
        const viewPw = document.getElementById('findAccountViewPw');

        if (mode === 'id') {
            if (btnId) {
                btnId.classList.add('active');
                btnId.style.background = '#ffffff';
                btnId.style.color = '#191f28';
                btnId.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
            }
            if (btnPw) {
                btnPw.classList.remove('active');
                btnPw.style.background = 'transparent';
                btnPw.style.color = '#8b95a1';
                btnPw.style.boxShadow = 'none';
            }
            if (viewId) viewId.style.display = 'block';
            if (viewPw) viewPw.style.display = 'none';
            document.getElementById('findIdInputName')?.focus();
        } else {
            if (btnPw) {
                btnPw.classList.add('active');
                btnPw.style.background = '#ffffff';
                btnPw.style.color = '#191f28';
                btnPw.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
            }
            if (btnId) {
                btnId.classList.remove('active');
                btnId.style.background = 'transparent';
                btnId.style.color = '#8b95a1';
                btnId.style.boxShadow = 'none';
            }
            if (viewId) viewId.style.display = 'none';
            if (viewPw) viewPw.style.display = 'block';
            document.getElementById('findPwInputName')?.focus();
        }
    };

    window.handleFindIdSubmit = async function() {
        const nameInput = document.getElementById('findIdInputName');
        const name = nameInput?.value?.trim() || '';

        if (!name) {
            await alert('가입 시 등록하신 이름을 입력해 주세요.');
            nameInput?.focus();
            return;
        }

        const res = await authService.findAccountByName(name);
        const resultBox = document.getElementById('findIdResultBox');
        const resultText = document.getElementById('findIdResultText');

        if (res.success && res.emails && res.emails.length > 0) {
            window.__lastFoundEmail = res.emails[0];
            if (resultText) {
                resultText.innerHTML = res.emails.map(e => `<div>${e}</div>`).join('');
            }
            if (resultBox) {
                resultBox.style.display = 'block';
            }
        } else {
            if (resultBox) resultBox.style.display = 'none';
            await alert(res.message);
            nameInput?.focus();
        }
    };

    window.applyFoundIdToLogin = function() {
        const email = window.__lastFoundEmail || '';
        if (email) {
            const settingsEmail = document.getElementById('settingsEmail');
            const settingsEmailMobile = document.getElementById('settingsEmailMobile');
            const loginEmail = document.getElementById('loginEmail');
            if (settingsEmail) settingsEmail.value = email;
            if (settingsEmailMobile) settingsEmailMobile.value = email;
            if (loginEmail) loginEmail.value = email;
        }
        window.closeFindAccountModal();

        // 사이드바 또는 중앙 모달의 비밀번호 창으로 포커스
        const settingsPwMobile = document.getElementById('settingsPasswordMobile');
        const settingsPw = document.getElementById('settingsPassword');
        const loginPw = document.getElementById('loginPassword');
        setTimeout(() => {
            if (settingsPwMobile && settingsPwMobile.offsetParent !== null) {
                settingsPwMobile.focus();
            } else if (settingsPw && settingsPw.offsetParent !== null) {
                settingsPw.focus();
            } else if (loginPw && loginPw.offsetParent !== null) {
                loginPw.focus();
            }
        }, 150);
    };

    window.handleResetPasswordSubmit = async function() {
        const nameInput = document.getElementById('findPwInputName');
        const emailInput = document.getElementById('findPwInputEmail');
        const passwordInput = document.getElementById('findPwInputNewPassword');

        const name = nameInput?.value?.trim() || '';
        const email = emailInput?.value?.trim() || '';
        const newPassword = passwordInput?.value || '';

        if (!name) {
            await alert('이름을 입력해 주세요.');
            nameInput?.focus();
            return;
        }
        if (!email) {
            await alert('아이디(이메일 주소)를 입력해 주세요.');
            emailInput?.focus();
            return;
        }
        if (!EMAIL_REGEX.test(email)) {
            await alert('올바른 이메일 형식을 입력해 주세요.\n(예: user@example.com)');
            emailInput?.focus();
            return;
        }
        if (!newPassword) {
            await alert('새로운 비밀번호를 입력해 주세요.');
            passwordInput?.focus();
            return;
        }
        if (newPassword.length < 6) {
            await alert('비밀번호는 최소 6자 이상이어야 합니다.');
            passwordInput?.focus();
            return;
        }

        const res = await authService.resetPassword({ name, email, newPassword });
        await alert(res.message);

        if (res.success) {
            // 변경된 이메일을 로그인 인풋에 자동 세팅 후 창 닫기
            const settingsEmail = document.getElementById('settingsEmail');
            const settingsEmailMobile = document.getElementById('settingsEmailMobile');
            const loginEmail = document.getElementById('loginEmail');
            if (settingsEmail) settingsEmail.value = email;
            if (settingsEmailMobile) settingsEmailMobile.value = email;
            if (loginEmail) loginEmail.value = email;

            window.closeFindAccountModal();

            const settingsPwMobile = document.getElementById('settingsPasswordMobile');
            const settingsPw = document.getElementById('settingsPassword');
            const loginPw = document.getElementById('loginPassword');
            setTimeout(() => {
                if (settingsPwMobile && settingsPwMobile.offsetParent !== null) {
                    settingsPwMobile.value = '';
                    settingsPwMobile.focus();
                } else if (settingsPw && settingsPw.offsetParent !== null) {
                    settingsPw.value = '';
                    settingsPw.focus();
                } else if (loginPw && loginPw.offsetParent !== null) {
                    loginPw.value = '';
                    loginPw.focus();
                }
            }, 150);
        }
    };

    if (findAccountModal) {
        findAccountModal.addEventListener('click', (e) => {
            if (e.target === findAccountModal) window.closeFindAccountModal();
        });
    }

    window.updateAuthUI();
}

// 나이스(NEIS) 학부모 서비스 연동 모듈 초기화
function initNEISLocalModule() {
    const btnOpen = document.getElementById('btnOpenNEISModal');
    const modal = document.getElementById('neisModal');
    const btnClose = document.getElementById('btnCloseNEISModal');
    const btnAcademyAction = document.getElementById('btnNEISAcademyAction');

    // 상단 플로팅 버튼 항상 노출
    if (btnOpen) btnOpen.style.display = 'flex';

    window.openNEISModal = async function() {
        // 중복 실행 방지 가드 (더블 클릭 및 인라인/이벤트 중복 발화 방어)
        if (window.__isOpeningNEISModal) return;
        window.__isOpeningNEISModal = true;
        setTimeout(() => { window.__isOpeningNEISModal = false; }, 400);

        // 🔒 미로그인 사용자 검증 및 사이드바 로그인 창 유도
        if (!authService.isLoggedIn()) {
            alert('🔒 자녀 내신 정밀 진단 및 학사·급식 리포트는\n회원가입/로그인 후 이용할 수 있는\n회원 전용 서비스입니다.', () => {
                if (typeof window.openSidebarLogin === 'function') {
                    window.openSidebarLogin();
                }
            });
            return;
        }

        // 🔄 DB에 저장된 최신 자녀 목록 및 성적 데이터 동기화
        if (typeof window.loadChildProfilesFromSupabase === 'function') {
            try {
                await window.loadChildProfilesFromSupabase();
            } catch (err) {
                console.warn('NEIS 모달 오픈 전 자녀 프로필 DB 로드 대기 중 에러:', err);
            }
        }

        const m = document.getElementById('neisModal');
        if (m) {
            // 이미 사이드바에서 열려있다면 토글로 닫기
            if (m.style.display !== 'none' && m.style.display !== '') {
                window.closeNEISModal();
                return;
            }

            // 사이드바가 닫혀있다면 사이드바 열기
            const sb = document.querySelector('.sidebar-section');
            if (sb && sb.style.display === 'none' && typeof toggleSidebar === 'function') {
                toggleSidebar();
            }
            const appContainer = document.querySelector('.app-container');
            if (appContainer && !appContainer.classList.contains('sidebar-open') && typeof toggleSidebar === 'function') {
                toggleSidebar();
            }

            // 설정 카드 및 튜토리얼 카드 숨김
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal && (settingsModal.style.display !== 'none' && settingsModal.style.display !== '')) {
                window.__openedNEISFromMypage = true;
            }
            if (settingsModal) settingsModal.style.display = 'none';
            const tutorialSidebarCard = document.getElementById('tutorialSidebarCard');
            if (tutorialSidebarCard) tutorialSidebarCard.style.display = 'none';

            m.style.display = 'block';
            window.switchNEISTab('sync');

            // 사이드바 상단으로 부드럽게 스크롤
            setTimeout(() => {
                m.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 60);
        }
    };

    window.closeNEISModal = function() {
        const m = document.getElementById('neisModal');
        if (m) {
            m.style.display = 'none';
        }

        const wasFromMypage = window.__openedNEISFromMypage;
        window.__openedNEISFromMypage = false;

        // 모바일 환경이거나 마이페이지에서 모달을 열었을 경우 닫을 때 마이페이지(설정) 화면으로 복귀
        if (window.innerWidth <= 1024 || wasFromMypage) {
            const mypageTabBtn = document.querySelector('.mobile-bottom-nav .nav-item[onclick*="mypage"]');
            if (window.innerWidth <= 1024 && mypageTabBtn && typeof window.onMobileNavClick === 'function') {
                window.onMobileNavClick('mypage', mypageTabBtn);
            } else {
                const setModal = document.getElementById('settingsModal');
                if (setModal) setModal.style.display = 'block';
            }
        }
    };

    window.switchNEISTab = function(tabName, btnEl) {
        const tabBtns = document.querySelectorAll('.neis-tab-btn');
        tabBtns.forEach(b => {
            b.classList.remove('active');
            b.style.background = 'transparent';
            b.style.color = '#64748b';
            b.style.fontWeight = '600';
            b.style.boxShadow = 'none';
        });

        let targetBtn = btnEl;
        if (!targetBtn && typeof tabName === 'string') {
            targetBtn = document.querySelector(`.neis-tab-btn[data-tab="${tabName}"]`);
        }

        if (targetBtn) {
            targetBtn.classList.add('active');
            targetBtn.style.background = '#ffffff';
            targetBtn.style.color = '#1e293b';
            targetBtn.style.fontWeight = '700';
            targetBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';

            // 🎯 가려진 옆의 탭 버튼 클릭 시 탭 바가 부드럽게 자동 스크롤(드래그)되어 노출
            const nav = targetBtn.closest('.neis-tab-nav') || document.querySelector('.neis-tab-nav');
            if (nav) {
                const navRect = nav.getBoundingClientRect();
                const btnRect = targetBtn.getBoundingClientRect();
                const scrollTarget = nav.scrollLeft + (btnRect.left - navRect.left) - (navRect.width / 2) + (btnRect.width / 2);
                nav.scrollTo({
                    left: Math.max(0, scrollTarget),
                    behavior: 'smooth'
                });
            }
        }

        if (typeof window.renderNEISTabContent === 'function') {
            window.renderNEISTabContent(tabName);
        }
    };

    // 🖱️ 탭 네비게이션 마우스 드래그 스크롤 (Drag to scroll) 바인딩
    const tabNav = document.querySelector('.neis-tab-nav');
    if (tabNav && !tabNav.__dragBound) {
        tabNav.__dragBound = true;
        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;
        let hasMoved = false;

        tabNav.addEventListener('mousedown', (e) => {
            isDown = true;
            hasMoved = false;
            startX = e.pageX - tabNav.offsetLeft;
            scrollLeft = tabNav.scrollLeft;
            tabNav.style.cursor = 'grabbing';
            tabNav.style.userSelect = 'none';
        });

        window.addEventListener('mouseup', () => {
            if (!isDown) return;
            isDown = false;
            if (tabNav) {
                tabNav.style.cursor = 'grab';
                tabNav.style.removeProperty('user-select');
            }
        });

        tabNav.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - tabNav.offsetLeft;
            const walk = (x - startX) * 1.5;
            if (Math.abs(x - startX) > 4) {
                hasMoved = true;
            }
            tabNav.scrollLeft = scrollLeft - walk;
        });

        tabNav.addEventListener('click', (e) => {
            if (hasMoved) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    }

    if (btnOpen) {
        btnOpen.onclick = null; // 기존 인라인 onclick 제거하여 중복 등록 방지
        btnOpen.addEventListener('click', window.openNEISModal);
    }

    if (btnClose) {
        btnClose.addEventListener('click', window.closeNEISModal);
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) window.closeNEISModal();
        });
    }

    if (btnAcademyAction) {
        btnAcademyAction.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
            if (typeof window.toggleAcademySidebar === 'function') {
                window.toggleAcademySidebar(true);
            }
        });
    }
}

window.openChildSettingsModal = function() {
    if (typeof window.closeNEISModal === 'function') {
        window.closeNEISModal();
    }
    const isMobile = window.innerWidth <= 1024;
    const sidebar = document.querySelector('.sidebar-section');
    const container = document.querySelector('.app-container');

    if (!isMobile) {
        if (sidebar && sidebar.style.display === 'none' && typeof window.toggleSidebar === 'function') {
            window.toggleSidebar();
        }
    } else {
        if (sidebar) sidebar.style.display = 'none';
        if (container) container.classList.remove('sidebar-open');
        const welcomeCard = document.getElementById('welcomeCard');
        if (welcomeCard) welcomeCard.style.display = 'none';
    }
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        settingsModal.style.display = 'block';
    }
    if (typeof window.switchMypageTab === 'function') {
        window.switchMypageTab('child');
    }
    if (window.innerWidth <= 1024 && typeof window.onMobileNavClick === 'function') {
        const mypageTabBtn = document.querySelector('.mobile-bottom-nav .nav-item[onclick*="mypage"]');
        if (mypageTabBtn) {
            window.onMobileNavClick('mypage', mypageTabBtn);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        const childCard = document.getElementById('mypageAccordionContent-child') || 
                          document.getElementById('inputSettingsChildKor-pc') || 
                          settingsModal;
        if (childCard) {
            childCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
};

// PDF.js 라이브러리 동적 로더
async function ensurePdfJsLoaded() {
    if (window.pdfjsLib) return window.pdfjsLib;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve(window.pdfjsLib);
            } else {
                reject(new Error('PDF.js failed to load'));
            }
        };
        script.onerror = () => reject(new Error('PDF.js CDN load failed'));
        document.head.appendChild(script);
    });
}

// 나이스 생기부/성적표 파일(PDF / TXT) 업로드 및 원클릭 AI 파싱 핸들러
window.handleNEISFileUpload = async function(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const btnEl = document.getElementById('btnNeisUploadFile');
    if (btnEl) {
        btnEl.innerText = '⏳ 문서 분석 중...';
        btnEl.disabled = true;
    }

    try {
        let extractedText = '';

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            // PDF 파일 처리
            const pdfjs = await ensurePdfJsLoaded();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            const textParts = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                textParts.push(pageText);
            }
            extractedText = textParts.join('\n');
        } else {
            // 텍스트 파일 (.txt)
            extractedText = await file.text();
        }

        if (!extractedText || extractedText.trim().length < 10) {
            alert('⚠️ 문서에서 텍스트를 추출하지 못했습니다. 텍스트 형식의 PDF나 TXT 파일인지 확인해 주세요.');
            return;
        }

        const agent = new NEISAgent();
        const parseResult = agent.parseAndApplyDocument(extractedText);

        if (parseResult && parseResult.success) {
            // 활성 자녀 프로필 성적 동기화
            if (typeof childProfiles !== 'undefined' && Array.isArray(childProfiles) && childProfiles.length > 0) {
                const curChild = childProfiles.find(c => c.id === selectedChildId) || childProfiles[0];
                if (curChild) {
                    if (parseResult.extracted.studentName) curChild.name = parseResult.extracted.studentName;
                    if (parseResult.extracted.schoolName) curChild.schoolName = parseResult.extracted.schoolName;
                    const kor = parseResult.extracted.grades.find(g => g.subject === '국어');
                    const math = parseResult.extracted.grades.find(g => g.subject === '수학');
                    const eng = parseResult.extracted.grades.find(g => g.subject === '영어');
                    const soc = parseResult.extracted.grades.find(g => g.subject === '사회');
                    const his = parseResult.extracted.grades.find(g => g.subject === '역사');
                    const sci = parseResult.extracted.grades.find(g => g.subject === '과학');
                    if (kor) curChild.korean = kor.rawScore;
                    if (math) curChild.math = math.rawScore;
                    if (eng) curChild.english = eng.rawScore;
                    if (soc) curChild.society = soc.rawScore;
                    if (his) curChild.history = his.rawScore;
                    if (sci) curChild.science = sci.rawScore;
                    try {
                        localStorage.setItem('learnmap_child_profiles', JSON.stringify(childProfiles));
                    } catch (e) {}
                }
            }

            alert(`✅ 나이스 생활기록부/성적표 분석이 완료되었습니다!\n\n• 과목 성적: ${parseResult.extracted.grades.length}개 과목 자동 추출\n• 출결: ${parseResult.extracted.attendance ? parseResult.extracted.attendance.status : '정상'}\n• 세특 역량: AI 키워드 및 강점/보완점 리포트 생성 완료`);
            window.renderNEISTabContent('grades');
        }
    } catch (err) {
        console.error('NEIS Record Parsing Error:', err);
        alert('⚠️ 문서 분석 중 오류가 발생했습니다: ' + (err.message || '파일 형식을 확인해 주세요.'));
    } finally {
        if (btnEl) {
            btnEl.innerText = '📁 생기부/성적표 파일 선택하기';
            btnEl.disabled = false;
        }
        if (event.target) event.target.value = '';
    }
};

// 나이스 샘플 데이터 원클릭 자동 체험 함수
window.loadNEISSampleRecord = function() {
    const sampleRecordText = `
[학교생활기록부 (중학교)]
성명 : 김배움  |  학교명 : 서운중학교  |  2학년 3반 14번  |  희망진로 : 인공지능 / 소프트웨어 개발자
[교과학습발달상황]
국어 : 94점 (과목평균 76.2 / 표준편차 14.1) 성취도 A
수학 : 92점 (과목평균 68.5 / 표준편차 17.8) 성취도 A
영어 : 88점 (과목평균 71.0 / 표준편차 15.6) 성취도 A
사회 : 86점 (과목평균 73.8 / 표준편차 13.9) 성취도 B
역사 : 86점 (과목평균 73.0 / 표준편차 14.5) 성취도 B
과학 : 95점 (과목평균 70.3 / 표준편차 14.8) 성취도 A
[출결상황]
수업일수 : 190일, 미인정결석 : 0일, 미인정지각 : 0일
[학생건강체력평가 PAPS]
체력등급 : 1등급, 체질량 : 표준 (신장 168cm, 체중 56kg)
[세부능력 및 특기사항]
(수학) 피타고라스 정리와 좌표평면의 연계성을 심화 탐구하고, 알고리즘적 사고를 바탕으로 실생활 문제해결 방안을 논리적으로 제시함. 수학적 개념 이해도가 탁월하며 모둠 탐구에서 주도적인 발표를 통해 동료들의 성장을 도움.
(과학) 인공지능과 물리 현상의 융합에 깊은 관심을 보이며, 센서 데이터 분석 프로젝트에서 가설 설정과 실험 설계를 주도함. 논리적인 분석력과 데이터 해석 역량이 매우 뛰어남.
(행동특성 및 종합의견) 모둠 활동에서 경청과 배려를 바탕으로 팀을 이끄는 리더십이 돋보이며, 모범적이고 성실한 자세로 매사에 적극적인 탐구 의지를 보여줌.
    `;

    const agent = new NEISAgent();
    const res = agent.parseAndApplyDocument(sampleRecordText);
    if (res && res.success) {
        if (typeof childProfiles !== 'undefined' && Array.isArray(childProfiles) && childProfiles.length > 0) {
            const curChild = childProfiles.find(c => c.id === selectedChildId) || childProfiles[0];
            if (curChild) {
                curChild.korean = 94;
                curChild.math = 92;
                curChild.english = 88;
                curChild.society = 86;
                curChild.history = 86;
                curChild.science = 95;
                if (typeof syncActiveChildWithOrchestrator === 'function') syncActiveChildWithOrchestrator(curChild);
            }
        }
        if (typeof onMapAction === 'function') onMapAction();
        alert('🎉 나이스 실제 생기부 양식 샘플 데이터가 성공적으로 반영되었습니다!\n성적 정밀 진단표와 세특 AI 역량 분석 결과를 확인해 보세요.');
        window.renderNEISTabContent('grades');
    }
};

window.switchNEISChild = function(childId) {
    if (!childId) return;
    if (typeof selectedChildId !== 'undefined') selectedChildId = childId;
    window.selectedChildId = childId;
    try {
        localStorage.setItem('learnmap_default_child_id', childId);
    } catch (e) {}
    const settingsChildSelect = document.getElementById('settingsChildSelect');
    const settingsChildSelectPc = document.getElementById('settingsChildSelect-pc');
    if (settingsChildSelect) settingsChildSelect.value = childId;
    if (settingsChildSelectPc) settingsChildSelectPc.value = childId;
    if (typeof updateFormWithSelectedChild === 'function') updateFormWithSelectedChild();
    if (typeof renderChildPillTabs === 'function') renderChildPillTabs();
    if (typeof onMapAction === 'function') onMapAction();
    if (typeof window.renderNEISTabContent === 'function') {
        const activeTabBtn = document.querySelector('.neis-tab-btn.active');
        const curTab = activeTabBtn ? activeTabBtn.dataset.tab : 'sync';
        window.renderNEISTabContent(curTab);
    }
};

window.renderNEISTabContent = function(tabName = 'sync') {
    const contents = document.querySelectorAll('.neis-tab-content');
    contents.forEach(c => c.style.display = 'none');

    // 1. 등록된 자녀 정보 유무 확인 (전역 변수, window 객체, 로컬스토리지 백업 순으로 안전 조회)
    let currentChildProfiles = [];
    if (typeof childProfiles !== 'undefined' && Array.isArray(childProfiles) && childProfiles.length > 0) {
        currentChildProfiles = childProfiles;
    } else if (window.childProfiles && Array.isArray(window.childProfiles) && window.childProfiles.length > 0) {
        currentChildProfiles = window.childProfiles;
    } else {
        try {
            const parsed = JSON.parse(localStorage.getItem('learnmap_child_profiles') || '[]');
            if (Array.isArray(parsed) && parsed.length > 0) currentChildProfiles = parsed;
        } catch (e) {}
    }

    let curChildId = (typeof selectedChildId !== 'undefined' && selectedChildId) 
        ? selectedChildId 
        : (window.selectedChildId || localStorage.getItem('learnmap_default_child_id'));
    let activeChild = currentChildProfiles.find(c => c.id === curChildId) || currentChildProfiles[0] || null;

    // 프로필 목록이 비어있더라도 orchestrator.state.childProfile에 입력된 정보가 있다면 자녀로 활용
    if (!activeChild && typeof orchestrator !== 'undefined' && orchestrator.state?.childProfile?.name) {
        const p = orchestrator.state.childProfile;
        activeChild = {
            id: 'orch_child',
            name: p.name,
            schoolName: p.schoolName || '서운중학교',
            grade: p.grade || 'm2',
            korean: p.scores?.korean ?? 80,
            english: p.scores?.english ?? 80,
            math: p.scores?.math ?? 80,
            targetMajor: '',
            allergies: []
        };
        currentChildProfiles = [activeChild];
    }

    let savedNeisProfile = null;
    try {
        savedNeisProfile = JSON.parse(localStorage.getItem('learnmap_neis_local_profile') || 'null');
    } catch (e) {}

    const isChildRegistered = Boolean(activeChild || (savedNeisProfile && savedNeisProfile.studentInfo && savedNeisProfile.studentInfo.name));
    const footerStatus = document.getElementById('neisFooterStatus');

    if (!isChildRegistered) {
        if (footerStatus) {
            footerStatus.innerHTML = '⚪ <span style="color: #64748b;">자녀 정보 미등록 (자녀 정보를 저장해 주세요)</span>';
        }

        const elSync = document.getElementById('neisTabSync');
        if (tabName === 'sync' && elSync) {
            elSync.style.display = 'block';
            elSync.innerHTML = `
                <div class="neis-card" style="text-align: center; padding: 36px 16px;">
                    <div style="width: 52px; height: 52px; border-radius: 50%; background: #f1f5f9; display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 12px;">👦</div>
                    <h4 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 800; color: #1e293b;">등록된 자녀 정보가 없습니다</h4>
                    <p style="font-size: 12px; color: #64748b; line-height: 1.6; max-width: 420px; margin: 0 auto 20px auto;">
                        자녀 내신 정밀 진단 및 학사·급식 리포트는<br>
                        <strong>[자녀 정보 및 성적 설정]</strong>에서 등록된 실제 자녀 정보를 바탕으로 분석됩니다.<br>
                        자녀 성명, 소속 학교, 학년 및 성적을 먼저 등록해 주세요.
                    </p>
                    <div style="display: flex; justify-content: center;">
                        <button type="button" onclick="if(window.openChildSettingsModal) window.openChildSettingsModal();" style="background: #2563eb; color: white; border: none; padding: 9px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2); display: inline-flex; align-items: center; gap: 5px;">
                            ⚙️ 자녀 정보 및 성적 설정하기
                        </button>
                    </div>
                </div>
            `;
        } else {
            const el = document.getElementById(`neisTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
            if (!el) return;
            el.style.display = 'block';

            const tabMeta = {
                grades: { icon: '📊', title: '등록된 자녀 성적 데이터가 없습니다', desc: '자녀 정보를 저장하시면 공시 통계와 결합된<br><strong>과목별 Z-Score 백분위 석차 및 내신 정밀 진단표</strong>가 자동으로 분석됩니다.' },
                record: { icon: '📜', title: '등록된 자녀 생기부 정보가 없습니다', desc: '자녀 정보와 희망 전공을 등록하시면<br><strong>전공 적합도 진단 및 세특 강점/보완 AI 리포트</strong>를 확인하실 수 있습니다.' },
                schedule: { icon: '📅', title: '등록된 자녀 학사 일정이 없습니다', desc: '자녀 소속 학교를 등록하시면 해당 학교의<br><strong>지필평가, 수행평가 및 주요 학사 일정</strong>이 실시간 동기화됩니다.' },
                health: { icon: '🍱', title: '등록된 자녀 급식 및 건강 정보가 없습니다', desc: '자녀 소속 학교 및 알레르기 식품을 등록하시면<br><strong>오늘의 학교 급식 실시간 알레르기 필터링 및 PAPS 체력평가 결과</strong>를 확인하실 수 있습니다.' }
            }[tabName] || { icon: 'ℹ️', title: '등록된 자녀 정보가 없습니다', desc: '자녀 정보를 먼저 등록해 주세요.' };

            el.innerHTML = `
                <div class="neis-card" style="text-align: center; padding: 40px 16px;">
                    <span style="font-size: 38px; display: block; margin-bottom: 10px;">${tabMeta.icon}</span>
                    <h4 style="margin: 0 0 6px 0; font-size: 15.5px; font-weight: 800; color: #1e293b;">${tabMeta.title}</h4>
                    <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin: 0 0 18px 0;">
                        ${tabMeta.desc}
                    </p>
                    <button type="button" onclick="if(window.openChildSettingsModal) window.openChildSettingsModal();" style="background: #2563eb; color: white; border: none; padding: 9px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);">
                        ⚙️ 자녀 정보 및 성적 설정하기
                    </button>
                </div>
            `;
        }
        return;
    }

    // 기본 자녀 정보 파악 (activeChild의 실시간 저장 값 최우선 반영)
    const currentChildName = activeChild ? (activeChild.name || '자녀') : (savedNeisProfile?.studentInfo?.name || '자녀');
    const currentSchoolName = activeChild ? (activeChild.schoolName || '서운중학교') : (savedNeisProfile?.studentInfo?.schoolName || '서운중학교');
    const currentGrade = activeChild ? (parseInt(String(activeChild.grade).replace(/\D/g, ''), 10) || 2) : (savedNeisProfile?.studentInfo?.grade || 2);
    const currentMajor = activeChild ? (activeChild.targetMajor || '') : (savedNeisProfile?.studentInfo?.targetMajor || '일반 / 미정');
    const currentAllergies = activeChild 
        ? (Array.isArray(activeChild.allergies) ? activeChild.allergies : (typeof activeChild.allergies === 'string' ? activeChild.allergies.split(',').map(s => s.trim()).filter(Boolean) : []))
        : (savedNeisProfile?.studentInfo?.allergies || []);

    const calcAch = (score) => {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'E';
    };

    // 학교알리미 실제 공시 학교 매칭 (선택된 타겟 학교, 서울 데이터 또는 지도 선택 학교)
    let alrimiSchool = window.selectedTargetSchool || orchestrator?.state?.selectedSchool || null;
    const targetSchoolPool = (typeof schoolsData !== 'undefined' && Array.isArray(schoolsData)) 
        ? schoolsData 
        : ((typeof schoolsDatabase !== 'undefined' && Array.isArray(schoolsDatabase)) ? schoolsDatabase : (window.schoolsDatabase || []));

    if (!alrimiSchool && targetSchoolPool.length > 0) {
        if (activeChild && activeChild.schoolId) {
            alrimiSchool = targetSchoolPool.find(s => String(s.school_id || s.id) === String(activeChild.schoolId)) || null;
        }
        if (!alrimiSchool && activeChild && activeChild.schoolRegion) {
            alrimiSchool = targetSchoolPool.find(s => 
                (s.school_name === currentSchoolName || s.name === currentSchoolName) && 
                ((s.region || s.district || '').includes(activeChild.schoolRegion) || activeChild.schoolRegion.includes(s.region || ''))
            ) || null;
        }
        if (!alrimiSchool) {
            alrimiSchool = targetSchoolPool.find(s => s.school_name === currentSchoolName || s.name === currentSchoolName) || null;
        }
    }

    const agent = new NEISAgent();

    // ★★★ 핵심 연동: activeChild가 존재할 경우 agent.service.profile에 실제 저장된 자녀 정보 및 성적을 100% 동기화 주입 ★★★
    if (activeChild) {
        if (!agent.service.profile) {
            agent.service.profile = agent.service.getDefaultTemplate();
        }
        agent.service.profile.studentInfo = {
            ...agent.service.profile.studentInfo,
            name: currentChildName,
            schoolName: currentSchoolName,
            grade: currentGrade,
            targetMajor: currentMajor || '일반 / 미정',
            allergies: currentAllergies
        };

        const korScore = Number(activeChild.korean) || 0;
        const mathScore = Number(activeChild.math) || 0;
        const engScore = Number(activeChild.english) || 0;
        const socScore = Number(activeChild.society) || 80;
        const hisScore = Number(activeChild.history) || 80;
        const sciScore = Number(activeChild.science) || 80;

        const currentGrades = Array.isArray(agent.service.profile.grades) ? [...agent.service.profile.grades] : [];
        const updateOrAddGrade = (subj, score, defAvg, defStd) => {
            const idx = currentGrades.findIndex(g => g.subject === subj);
            const ach = calcAch(score);
            if (idx >= 0) {
                currentGrades[idx].rawScore = score;
                currentGrades[idx].writtenScore = score;
                currentGrades[idx].perfScore = score;
                currentGrades[idx].achievement = ach;
            } else {
                currentGrades.push({
                    subject: subj,
                    rawScore: score,
                    writtenScore: score,
                    perfScore: score,
                    avg: defAvg,
                    std: defStd,
                    achievement: ach
                });
            }
        };

        updateOrAddGrade('국어', korScore, 75.0, 14.0);
        updateOrAddGrade('수학', mathScore, 70.0, 16.0);
        updateOrAddGrade('영어', engScore, 72.0, 15.0);
        updateOrAddGrade('사회', socScore, 74.0, 14.0);
        updateOrAddGrade('역사', hisScore, 73.0, 14.5);
        updateOrAddGrade('과학', sciScore, 71.0, 15.0);

        agent.service.profile.grades = currentGrades;
        agent.service.profile.isConnected = true;

        if (agent.service.profile.schoolRecord?.competencyScores) {
            agent.service.profile.schoolRecord.competencyScores.academic = Math.round((korScore + mathScore + engScore + socScore + hisScore + sciScore) / 6);
        }

        try {
            localStorage.setItem('learnmap_neis_local_profile', JSON.stringify(agent.service.profile));
        } catch (e) {}
    }

    let report = agent.generateFusionReport(alrimiSchool);

    if (!report) {
        report = agent.generateFusionReport(null);
    }

    if (footerStatus) {
        footerStatus.innerHTML = `🟢 진단 활성화 (<strong style="color: #1e293b;">${currentChildName}</strong> · ${currentSchoolName})`;
    }

    const studentInfo = report.student || {};
    const allergiesList = (currentAllergies && currentAllergies.length > 0) ? currentAllergies.join(', ') : '없음';

    // -------------------------------------------------------------------------
    // Tab 1: Sync (진단 프로필 & 생기부/성적표 원클릭 파일 업로드)
    // -------------------------------------------------------------------------
    if (tabName === 'sync') {
        const el = document.getElementById('neisTabSync');
        if (!el) return;
        el.style.display = 'block';

        const gradesList = report.grades?.subjects || [];
        const gradesDisplayRows = gradesList.map(g => `
            <tr>
                <td style="font-weight: 700; color: #1e293b;">${g.subject}</td>
                <td style="text-align: center; font-weight: 800; color: #2563eb;">${g.rawScore}점</td>
                <td style="text-align: center; color: #64748b;">${g.avg}점</td>
                <td style="text-align: center; color: #64748b;">${g.std}</td>
                <td style="text-align: center;"><span class="neis-badge neis-badge-info">${g.achievement}</span></td>
                <td style="text-align: center; font-weight: 700; color: #059669;">상위 ${g.percentile}%</td>
            </tr>
        `).join('');

        el.innerHTML = `
            <!-- 1. 자녀 진단 프로필 카드 -->
            <div class="neis-card" style="background: #ffffff; border: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">👦</div>
                        <div>
                            <h4 style="margin: 0; font-size: 14.5px; font-weight: 800; color: #1e293b;">${studentInfo.name || currentChildName} 학생 프로필</h4>
                            <span style="font-size: 11px; color: #64748b;">학교알리미 공시 통계 결합 내신 진단</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        ${currentChildProfiles.length > 1 ? `
                            <select onchange="window.switchNEISChild(this.value);" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 11.5px; font-weight: 600; color: #334155; cursor: pointer; outline: none;" title="자녀 선택">
                                ${currentChildProfiles.map((c, i) => `<option value="${c.id}" ${c.id === (activeChild?.id) ? 'selected' : ''}>${c.name || '자녀'} (${c.schoolName || '서운중'})</option>`).join('')}
                            </select>
                        ` : ''}
                        <span class="neis-badge neis-badge-success">🟢 진단 활성화</span>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 12px; background: #f8fafc; border-radius: 10px; padding: 10px 12px; border: 1px solid #f1f5f9;">
                    <div><span style="color: #64748b;">학생 성명:</span> <strong style="color: #1e293b;">${studentInfo.name || currentChildName}</strong></div>
                    <div><span style="color: #64748b;">소속 학교:</span> <strong style="color: #1e293b;">${studentInfo.schoolName || currentSchoolName} (${studentInfo.grade || currentGrade}학년)</strong></div>
                    <div><span style="color: #64748b;">희망 계열:</span> <strong style="color: #2563eb;">${studentInfo.targetMajor || '일반 / 미정'}</strong></div>
                    <div><span style="color: #64748b;">알레르기:</span> <strong style="color: #d97706;">${allergiesList}</strong></div>
                </div>
            </div>

            <!-- 2. 나이스 생기부/성적표 원클릭 파일 업로드 & AI 분석 카드 -->
            <div class="neis-card" style="border: 1.5px dashed #cbd5e1; background: #f8fafc;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">📄</span>
                        <div>
                            <h4 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #1e293b;">생기부·성적표 파일(PDF·TXT) 간편 분석</h4>
                            <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">나이스/정부24 문서를 넣으시면 과목 성적·출결·PAPS를 자동 추출합니다.</p>
                        </div>
                    </div>
                </div>

                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                    <span style="font-size: 11.5px; color: #64748b;">지원 형식: <strong>PDF (.pdf)</strong>, <strong>텍스트 (.txt)</strong></span>
                    <div>
                        <input type="file" id="neisRecordFileInput" accept=".pdf,.txt" style="display: none;" onchange="window.handleNEISFileUpload(event)">
                        <button type="button" id="btnNeisUploadFile" onclick="document.getElementById('neisRecordFileInput').click();" style="background: #2563eb; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; box-shadow: 0 1px 3px rgba(37,99,235,0.2);">
                            📁 파일 선택하기
                        </button>
                    </div>
                </div>
            </div>

            <!-- 3. 과목별 등록 성적 현황 표 -->
            <div class="neis-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <h4 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #1e293b;">📊 과목별 성적 현황</h4>
                        <span style="font-size: 11px; color: #64748b;">현재 저장되어 실시간 정밀 진단에 반영 중인 성적표입니다.</span>
                    </div>
                    <button type="button" onclick="if(window.openChildSettingsModal) window.openChildSettingsModal();" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc';" onmouseout="this.style.background='#ffffff';">
                        ⚙️ 성적 수정
                    </button>
                </div>

                <div class="neis-table-wrapper" style="border: 1px solid #e2e8f0; border-radius: 10px; overflow-x: auto;">
                    <table class="neis-table">
                        <thead>
                            <tr>
                                <th style="text-align: left;">과목</th>
                                <th>원점수</th>
                                <th>평균</th>
                                <th>표준편차</th>
                                <th>성취도</th>
                                <th>석차백분위</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${gradesDisplayRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } 
    // -------------------------------------------------------------------------
    // Tab 2: Grades (학교알리미 실제 공시 통계 결합 정밀 진단표)
    // -------------------------------------------------------------------------
    else if (tabName === 'grades') {
        const el = document.getElementById('neisTabGrades');
        if (!el) return;
        el.style.display = 'block';

        const gradesObj = report.grades || {};
        const subjectList = gradesObj.subjects || [];
        const isOfficialStatsUsed = Boolean(alrimiSchool);

        const subjectRows = subjectList.map(sub => `
            <tr>
                <td style="font-weight: 700; color: #1e293b; text-align: left;">${sub.subject}</td>
                <td style="text-align: center; font-weight: 800; color: #2563eb;">${sub.rawScore}점</td>
                <td style="text-align: center; color: #64748b; line-height: 1.2;">${sub.avg}점<br><span style="font-size: 9.5px; color: #94a3b8; font-weight: normal;">(±${sub.std})</span></td>
                <td style="text-align: center;"><span class="neis-badge neis-badge-info">상위 ${sub.percentile}%</span></td>
                <td style="text-align: center; font-weight: 700; color: #2563eb; line-height: 1.2;">${sub.estimatedGrade}등급<br><span style="font-size: 9.5px; color: #64748b; font-weight: 500;">(${sub.achievement})</span></td>
                <td style="text-align: center;">
                    ${sub.perfGap > 5 
                        ? `<span class="neis-badge neis-badge-warning" title="수행평가 감점 ${sub.perfGap}점">수행 -${sub.perfGap}</span>` 
                        : `<span class="neis-badge neis-badge-success">균형</span>`}
                </td>
            </tr>
        `).join('');

        const schoolMatchHtml = report.schoolMatch ? `
            <div class="neis-card" style="background: #eff6ff; border: 1px solid #bfdbfe; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <h4 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #1e40af;">🏫 공시 결합 분석 (${report.schoolMatch.schoolName})</h4>
                    <span class="neis-badge neis-badge-info">학교알리미 실측 매칭</span>
                </div>
                <div style="font-size: 12px; color: #1e3a8a;">
                    학교 평균 <strong>${report.schoolMatch.schoolAvg}점</strong> vs 내 자녀 평균 <strong style="color: #2563eb;">${report.schoolMatch.childAvg}점</strong> 
                    (${report.schoolMatch.diffScore >= 0 ? `+${report.schoolMatch.diffScore}점 우위` : `${report.schoolMatch.diffScore}점 보완 필요`}) ➔ <span class="neis-badge neis-badge-success">${report.schoolMatch.matchStatus}</span>
                </div>
            </div>
        ` : '';

        el.innerHTML = `
            ${schoolMatchHtml}
            <div class="neis-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <h4 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #1e293b;">📊 과목별 성적 정밀 분석표</h4>
                        <span style="font-size: 11px; color: ${isOfficialStatsUsed ? '#059669' : '#64748b'}; font-weight: 500;">
                            ${isOfficialStatsUsed ? `🟢 [${alrimiSchool.school_name || alrimiSchool.name}] 학교알리미 공시 통계 결합` : '⚪ 교육과정 표준 통계 기반'}
                        </span>
                    </div>
                    <span style="font-size: 12px; color: #334155; font-weight: 600;">전체 평균: <strong style="color: #2563eb;">${gradesObj.overallAvgScore || 80}점</strong> (상위 <strong>${gradesObj.overallPercentile || 25}%</strong>)</span>
                </div>
                <div class="neis-table-wrapper" style="border: 1px solid #e2e8f0; border-radius: 10px; overflow-x: auto;">
                    <table class="neis-table">
                        <thead>
                            <tr>
                                <th style="text-align: left;">과목</th>
                                <th>원점수</th>
                                <th>학교평균</th>
                                <th>백분위</th>
                                <th>예상등급</th>
                                <th>수행·지필</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subjectRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } 
    // -------------------------------------------------------------------------
    // Tab 3: Record (생기부 / 세특 AI 역량 리포트)
    // -------------------------------------------------------------------------
    else if (tabName === 'record') {
        const el = document.getElementById('neisTabRecord');
        if (!el) return;
        el.style.display = 'block';

        const recordObj = report.record || {};
        const compScores = recordObj.competencyScores || { academic: 85, majorSuitability: 82, community: 88 };
        const keywordsHtml = (recordObj.keywords || ['자기주도학습', '성실성']).map(k => `<span class="neis-badge neis-badge-info" style="font-size: 11px;">#${k}</span>`).join(' ');
        const strengthsHtml = (recordObj.strengths || ['수업 참여 태도 양호', '과제 성실성 우수']).map(s => `<li style="margin-bottom: 5px; display: flex; align-items: flex-start; gap: 6px;"><span style="color: #059669;">✔</span> <span>${s}</span></li>`).join('');
        const weaknessesHtml = (recordObj.weaknesses || ['심화 서술형 문항 연습 권장']).map(w => `<li style="margin-bottom: 5px; display: flex; align-items: flex-start; gap: 6px; color: #dc2626;"><span style="color: #dc2626;">⚠</span> <span>${w}</span></li>`).join('');

        el.innerHTML = `
            <div class="neis-card" style="background: #f8fafc; border: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h4 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #1e293b;">🎯 희망 계열 적합도: <span style="color: #2563eb;">${studentInfo.targetMajor || '일반 / 미정'}</span></h4>
                    <span class="neis-badge neis-badge-info">AI 역량 정량화</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; margin-bottom: 12px;">
                    <div style="background: #ffffff; padding: 10px 6px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                        <div style="font-size: 11px; color: #2563eb; font-weight: 600;">학업 역량</div>
                        <div style="font-size: 18px; font-weight: 800; color: #1e293b; margin-top: 2px;">${compScores.academic}점</div>
                    </div>
                    <div style="background: #ffffff; padding: 10px 6px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                        <div style="font-size: 11px; color: #7c3aed; font-weight: 600;">전공 적합성</div>
                        <div style="font-size: 18px; font-weight: 800; color: #1e293b; margin-top: 2px;">${compScores.majorSuitability}점</div>
                    </div>
                    <div style="background: #ffffff; padding: 10px 6px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                        <div style="font-size: 11px; color: #059669; font-weight: 600;">공동체/인성</div>
                        <div style="font-size: 18px; font-weight: 800; color: #1e293b; margin-top: 2px;">${compScores.community}점</div>
                    </div>
                </div>
                <div style="font-size: 11.5px; color: #64748b;">
                    <strong>추출 탐구 키워드:</strong> 
                    <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px;">${keywordsHtml}</div>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
                <div class="neis-card" style="margin-bottom: 0;">
                    <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 800; color: #059669; display: flex; align-items: center; gap: 5px;">
                        <span>🌟</span> 세특 & 생기부 핵심 강점
                    </h4>
                    <ul style="padding-left: 0; list-style: none; font-size: 12px; color: #334155; margin: 0;">${strengthsHtml}</ul>
                </div>
                <div class="neis-card" style="margin-bottom: 0;">
                    <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 800; color: #dc2626; display: flex; align-items: center; gap: 5px;">
                        <span>💡</span> 보완 권장 영역
                    </h4>
                    <ul style="padding-left: 0; list-style: none; font-size: 12px; margin: 0;">${weaknessesHtml}</ul>
                </div>
            </div>
        `;
    } 
    // -------------------------------------------------------------------------
    // Tab 4: Schedule (실제 교육부 NEIS 학사일정 실시간 API 연동 & 달력 보기)
    // -------------------------------------------------------------------------
    else if (tabName === 'schedule') {
        const el = document.getElementById('neisTabSchedule');
        if (!el) return;
        el.style.display = 'block';

        // 학사 일정 상태 관리 객체 초기화
        if (!window.__neisScheduleState) {
            window.__neisScheduleState = {
                viewMode: 'calendar', // 기본 달력보기 우선 노출
                year: new Date().getFullYear(),
                month: new Date().getMonth(),
                selectedDate: new Date().toISOString().slice(0, 10),
                list: report.schedule || [],
                schoolName: currentSchoolName,
                isLive: false
            };
        } else {
            window.__neisScheduleState.schoolName = currentSchoolName;
            if (!window.__neisScheduleState.list || window.__neisScheduleState.list.length === 0) {
                window.__neisScheduleState.list = report.schedule || [];
            }
        }

        // 캘린더 & 목록 렌더링 함수 정의
        window.renderNEISScheduleView = function() {
            const scheduleContainer = document.getElementById('neisLiveScheduleContainer');
            if (!scheduleContainer) return;
            const st = window.__neisScheduleState;
            const { viewMode, year, month, selectedDate, list, schoolName, isLive } = st;

            // 상단 헤더: 타이틀 + 실시간 연동 배지 + [📋 목록 / 📅 달력] 전환 스위처
            const headerHtml = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <h4 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #1e293b;">📅 주요 학사 일정 & 수행평가</h4>
                        <span style="font-size: 11px; color: ${isLive ? '#059669' : '#64748b'}; font-weight: 500;">
                            ${isLive ? `🟢 교육부 나이스 실시간 연동 (${schoolName})` : `${schoolName} 등록 일정`}
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="background: #f1f5f9; padding: 2px; border-radius: 8px; display: inline-flex; gap: 2px;">
                            <button type="button" onclick="window.toggleNEISScheduleView('list');" style="border: none; border-radius: 6px; padding: 4px 9px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s; background: ${viewMode === 'list' ? '#ffffff' : 'transparent'}; color: ${viewMode === 'list' ? '#1e293b' : '#64748b'}; box-shadow: ${viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};">
                                📋 목록
                            </button>
                            <button type="button" onclick="window.toggleNEISScheduleView('calendar');" style="border: none; border-radius: 6px; padding: 4px 9px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s; background: ${viewMode === 'calendar' ? '#ffffff' : 'transparent'}; color: ${viewMode === 'calendar' ? '#1e293b' : '#64748b'}; box-shadow: ${viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};">
                                📅 달력
                            </button>
                        </div>
                        <span class="neis-badge ${isLive ? 'neis-badge-success' : 'neis-badge-info'}">${isLive ? '나이스 실시간' : '기본'}</span>
                    </div>
                </div>
            `;

            // 1) [목록 보기] 모드
            if (viewMode === 'list') {
                const scheduleItems = (list && list.length > 0) ? list.map(item => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 7px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                        <div style="flex: 1; min-width: 0; padding-right: 8px;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                                <span class="neis-badge ${item.type === 'exam' ? 'neis-badge-danger' : (item.type === 'perf' ? 'neis-badge-warning' : (item.type === 'vacation' ? 'neis-badge-success' : 'neis-badge-info'))}">
                                    ${item.type === 'exam' ? '지필시험' : (item.type === 'perf' ? '수행평가' : (item.type === 'vacation' ? '방학/휴업' : '학사행사'))}
                                </span>
                                <strong style="font-size: 12.5px; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</strong>
                            </div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 1px;">${item.detail}</div>
                        </div>
                        <div style="font-size: 11.5px; font-weight: 700; color: #2563eb; white-space: nowrap;">${item.date}</div>
                    </div>
                `).join('') : '<div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">등록된 학사 일정이 없습니다.</div>';

                scheduleContainer.innerHTML = headerHtml + scheduleItems;
            } 
            // 2) [달력 보기] 모드
            else {
                const firstDayIndex = new Date(year, month, 1).getDay();
                const lastDate = new Date(year, month + 1, 0).getDate();
                const prevLastDate = new Date(year, month, 0).getDate();
                const todayStr = new Date().toISOString().slice(0, 10);

                let cellsHtml = '';

                // 이전 달 잔여 날짜 (연한 회색)
                for (let i = firstDayIndex - 1; i >= 0; i--) {
                    const pDay = prevLastDate - i;
                    cellsHtml += `<div style="padding: 6px 2px; text-align: center; color: #cbd5e1; font-size: 11px; user-select: none;">${pDay}</div>`;
                }

                // 당월 일자 그리드 생성
                for (let day = 1; day <= lastDate; day++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = (dateStr === todayStr);
                    const isSelected = (dateStr === selectedDate);
                    const dayOfWeek = (firstDayIndex + day - 1) % 7;
                    const isSun = (dayOfWeek === 0);
                    const isSat = (dayOfWeek === 6);

                    // 해당 일자의 학사 일정 조회
                    const dayEvents = list.filter(item => item.date === dateStr);
                    const hasExam = dayEvents.some(e => e.type === 'exam');
                    const hasPerf = dayEvents.some(e => e.type === 'perf');
                    const hasVacation = dayEvents.some(e => e.type === 'vacation');
                    const hasEvent = dayEvents.some(e => e.type === 'event' || !e.type);

                    let dotsHtml = '';
                    if (hasExam) dotsHtml += '<span style="width: 5px; height: 5px; border-radius: 50%; background: #ef4444; display: inline-block;" title="지필시험"></span>';
                    if (hasPerf) dotsHtml += '<span style="width: 5px; height: 5px; border-radius: 50%; background: #f59e0b; display: inline-block;" title="수행평가"></span>';
                    if (hasVacation) dotsHtml += '<span style="width: 5px; height: 5px; border-radius: 50%; background: #10b981; display: inline-block;" title="방학/휴업"></span>';
                    if (hasEvent && !hasExam && !hasPerf && !hasVacation) dotsHtml += '<span style="width: 5px; height: 5px; border-radius: 50%; background: #2563eb; display: inline-block;" title="학사행사"></span>';

                    let numColor = '#1e293b';
                    if (isSun) numColor = '#ef4444';
                    else if (isSat) numColor = '#2563eb';

                    cellsHtml += `
                        <div onclick="window.selectNEISCalendarDate('${dateStr}');" style="padding: 5px 2px; text-align: center; border-radius: 8px; cursor: pointer; transition: all 0.15s; background: ${isSelected ? '#eff6ff' : (isToday ? '#f8fafc' : 'transparent')}; border: ${isSelected ? '1.5px solid #2563eb' : (isToday ? '1px solid #bfdbfe' : '1px solid transparent')}; position: relative; min-height: 42px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start;">
                            <span style="font-size: 11.5px; font-weight: ${isSelected || isToday ? '800' : '600'}; color: ${isSelected ? '#2563eb' : numColor}; line-height: 1;">${day}</span>
                            <div style="display: flex; gap: 2px; margin-top: 4px; justify-content: center; min-height: 5px;">${dotsHtml}</div>
                        </div>
                    `;
                }

                // 익월 잔여 날짜 채우기 (7열 배수 맞추기)
                const totalCells = firstDayIndex + lastDate;
                const remaining = (7 - (totalCells % 7)) % 7;
                for (let n = 1; n <= remaining; n++) {
                    cellsHtml += `<div style="padding: 6px 2px; text-align: center; color: #cbd5e1; font-size: 11px; user-select: none;">${n}</div>`;
                }

                // 선택된 날짜의 상세 일정 카드
                const selectedEvents = list.filter(item => item.date === selectedDate);
                const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                const selDateObj = selectedDate ? new Date(selectedDate) : new Date();
                const selDayName = dayNames[selDateObj.getDay()];

                const selectedEventsHtml = (selectedEvents.length > 0) ? selectedEvents.map(e => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                                <span class="neis-badge ${e.type === 'exam' ? 'neis-badge-danger' : (e.type === 'perf' ? 'neis-badge-warning' : (e.type === 'vacation' ? 'neis-badge-success' : 'neis-badge-info'))}">
                                    ${e.type === 'exam' ? '지필시험' : (e.type === 'perf' ? '수행평가' : (e.type === 'vacation' ? '방학/휴업' : '학사행사'))}
                                </span>
                                <strong style="font-size: 12.5px; color: #1e293b;">${e.title}</strong>
                            </div>
                            <div style="font-size: 11px; color: #64748b;">${e.detail}</div>
                        </div>
                    </div>
                `).join('') : `
                    <div style="text-align: center; padding: 14px; background: #ffffff; border: 1px dashed #e2e8f0; border-radius: 8px; color: #94a3b8; font-size: 11.5px;">
                        선택하신 날짜에 등록된 공식 일정이 없습니다.
                    </div>
                `;

                const calendarHtml = `
                    <!-- 월간 캘린더 네비게이션 & 그리드 -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <button type="button" onclick="window.changeNEISCalendarMonth(-1);" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 11px; color: #475569;" title="이전 달">&lt;</button>
                                <span style="font-size: 13.5px; font-weight: 800; color: #1e293b;">${year}년 ${month + 1}월</span>
                                <button type="button" onclick="window.changeNEISCalendarMonth(1);" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 11px; color: #475569;" title="다음 달">&gt;</button>
                            </div>
                            <button type="button" onclick="window.setNEISCalendarToday();" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 700; color: #2563eb; cursor: pointer;">오늘</button>
                        </div>

                        <!-- 요일 헤더 -->
                        <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 11px; font-weight: 700; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                            <div style="color: #ef4444;">일</div>
                            <div style="color: #64748b;">월</div>
                            <div style="color: #64748b;">화</div>
                            <div style="color: #64748b;">수</div>
                            <div style="color: #64748b;">목</div>
                            <div style="color: #64748b;">금</div>
                            <div style="color: #2563eb;">토</div>
                        </div>

                        <!-- 날짜 셀 그리드 -->
                        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px;">
                            ${cellsHtml}
                        </div>

                        <!-- 일정 유형 범례 -->
                        <div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #e2e8f0; font-size: 10.5px; color: #64748b; flex-wrap: wrap;">
                            <span style="display: inline-flex; align-items: center; gap: 3px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #ef4444;"></span> 지필시험</span>
                            <span style="display: inline-flex; align-items: center; gap: 3px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #f59e0b;"></span> 수행평가</span>
                            <span style="display: inline-flex; align-items: center; gap: 3px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span> 방학/휴업</span>
                            <span style="display: inline-flex; align-items: center; gap: 3px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #2563eb;"></span> 학사행사</span>
                        </div>
                    </div>

                    <!-- 선택된 날짜 상세 일정 카드 -->
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <h5 style="margin: 0; font-size: 12.5px; font-weight: 800; color: #1e293b;">
                                📌 ${selectedDate || todayStr} (${selDayName || '오늘'}) 일정
                            </h5>
                            <span style="font-size: 11px; color: #2563eb; font-weight: 700;">${selectedEvents.length}건</span>
                        </div>
                        ${selectedEventsHtml}
                    </div>
                `;

                scheduleContainer.innerHTML = headerHtml + calendarHtml;
            }
        };

        window.toggleNEISScheduleView = function(mode) {
            if (!window.__neisScheduleState) return;
            window.__neisScheduleState.viewMode = mode;
            window.renderNEISScheduleView();
        };

        window.changeNEISCalendarMonth = function(offset) {
            if (!window.__neisScheduleState) return;
            let { year, month } = window.__neisScheduleState;
            month += offset;
            if (month < 0) {
                month = 11;
                year--;
            } else if (month > 11) {
                month = 0;
                year++;
            }
            window.__neisScheduleState.year = year;
            window.__neisScheduleState.month = month;
            window.renderNEISScheduleView();
        };

        window.setNEISCalendarToday = function() {
            if (!window.__neisScheduleState) return;
            const now = new Date();
            window.__neisScheduleState.year = now.getFullYear();
            window.__neisScheduleState.month = now.getMonth();
            window.__neisScheduleState.selectedDate = now.toISOString().slice(0, 10);
            window.renderNEISScheduleView();
        };

        window.selectNEISCalendarDate = function(dateStr) {
            if (!window.__neisScheduleState) return;
            window.__neisScheduleState.selectedDate = dateStr;
            window.renderNEISScheduleView();
        };

        // 로딩 플레이스홀더 렌더링
        el.innerHTML = `
            <div class="neis-card" id="neisLiveScheduleContainer">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div>
                        <h4 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #1e293b;">📅 주요 학사 일정 & 수행평가</h4>
                        <span style="font-size: 11px; color: #64748b;">${currentSchoolName} 공식 학사일정 조회 중...</span>
                    </div>
                    <span class="neis-badge neis-badge-info">실시간 동기화 중</span>
                </div>
                <div style="text-align: center; padding: 24px 10px; color: #64748b; font-size: 12px;">
                    🔄 교육부 나이스 서버에서 [${currentSchoolName}] 실제 학사 일정을 조회하고 있습니다...
                </div>
            </div>
        `;

        // 비동기 실제 학사일정 API 호출 (지역 정보 함께 전달하여 동명 학교 구분)
        const schoolRegionParam = activeChild?.schoolRegion || window.selectedTargetSchool?.region || '';
        agent.service.fetchRealSchedule(currentSchoolName, schoolRegionParam).then(realScheduleData => {
            const list = realScheduleData?.schedule && realScheduleData.schedule.length > 0 ? realScheduleData.schedule : (report.schedule || []);
            const isLive = Boolean(realScheduleData?.isLive);

            window.__neisScheduleState.list = list;
            window.__neisScheduleState.isLive = isLive;
            window.__neisScheduleState.schoolName = currentSchoolName;

            window.renderNEISScheduleView();
        }).catch(err => {
            console.error('Live schedule fetch failed:', err);
            window.__neisScheduleState.list = report.schedule || [];
            window.__neisScheduleState.isLive = false;
            window.renderNEISScheduleView();
        });
    } 
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // Tab 5: Health & Meals (실제 NEIS 급식 API & 미래 식단 미리보기 & 알레르기 연동)
    // -------------------------------------------------------------------------
    else if (tabName === 'health') {
        const el = document.getElementById('neisTabHealth');
        if (!el) return;
        el.style.display = 'block';

        const healthObj = report.health || {};

        // 급식 상태 객체 초기화
        if (!window.__neisMealsState) {
            window.__neisMealsState = {
                schoolName: currentSchoolName,
                currentDate: new Date().toISOString().slice(0, 10),
                allMeals: [],
                userAllergies: currentAllergies || [],
                isLive: false
            };
        } else {
            window.__neisMealsState.schoolName = currentSchoolName;
            window.__neisMealsState.userAllergies = currentAllergies || [];
        }

        // 급식 상세 뷰 렌더링 함수 정의
        window.renderNEISMealView = function() {
            const mealsContainer = document.getElementById('neisLiveMealsContainer');
            if (!mealsContainer) return;

            const st = window.__neisMealsState;
            if (!st || !st.allMeals || st.allMeals.length === 0) {
                mealsContainer.innerHTML = `
                    <div style="text-align: center; padding: 24px 10px; color: #64748b; font-size: 12px;">
                        등록된 급식 식단 정보가 없습니다.
                    </div>
                `;
                return;
            }

            const { allMeals, schoolName, isLive, userAllergies } = st;
            const todayStr = new Date().toISOString().slice(0, 10);
            const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

            // 날짜순 오름차순 정렬
            allMeals.sort((a, b) => a.date.localeCompare(b.date));

            // 현재 날짜에 해당하는 식단 탐색 (없으면 오늘 이후 가장 가까운 식단)
            let curMeal = allMeals.find(m => m.date === st.currentDate);
            if (!curMeal) {
                curMeal = allMeals.find(m => m.date >= todayStr) || allMeals[0];
                st.currentDate = curMeal.date;
            }

            const curIndex = allMeals.findIndex(m => m.date === st.currentDate);
            const hasPrev = curIndex > 0;
            const hasNext = curIndex < allMeals.length - 1;

            // 요일 계산
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            const curDateObj = new Date(st.currentDate);
            const curDayName = dayNames[curDateObj.getDay()];

            // 오늘 / 내일 / D+N 뱃지
            let dateBadge = '';
            if (st.currentDate === todayStr) {
                dateBadge = '<span class="neis-badge neis-badge-info" style="font-size: 10px; margin-left: 4px;">오늘</span>';
            } else if (st.currentDate === tomorrowStr) {
                dateBadge = '<span class="neis-badge neis-badge-warning" style="font-size: 10px; margin-left: 4px;">내일</span>';
            } else if (st.currentDate > todayStr) {
                const diffDays = Math.round((new Date(st.currentDate) - new Date(todayStr)) / 86400000);
                dateBadge = `<span class="neis-badge neis-badge-info" style="font-size: 10px; margin-left: 4px;">${diffDays}일 뒤</span>`;
            }

            // 반찬별 알레르기 분석
            const processedDishes = (curMeal.dishes || []).map(dish => {
                const dishAllergies = dish.allergies || [];
                const matches = dishAllergies.filter(a => userAllergies.some(userA => a.includes(userA) || userA.includes(a)));
                return {
                    name: dish.name,
                    allergies: dishAllergies,
                    hasAllergyRisk: matches.length > 0,
                    matchedAllergies: matches
                };
            });

            const totalRisks = processedDishes.filter(d => d.hasAllergyRisk);

            const menuItemsHtml = processedDishes.map(m => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: ${m.hasAllergyRisk ? '#fef2f2' : '#ffffff'}; border: 1px solid ${m.hasAllergyRisk ? '#fecaca' : '#e2e8f0'}; border-radius: 8px; margin-bottom: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                    <span style="font-size: 12px; font-weight: 600; color: ${m.hasAllergyRisk ? '#991b1b' : '#334155'};">${m.name}</span>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        ${(m.allergies || []).length > 0 ? `<span style="font-size: 10.5px; color: #64748b;">(${(m.allergies || []).join(', ')})</span>` : ''}
                        ${m.hasAllergyRisk 
                            ? `<span class="neis-badge neis-badge-danger">⚠️ 유발 (${(m.matchedAllergies || []).join(', ')})</span>` 
                            : `<span class="neis-badge neis-badge-success">안전</span>`}
                    </div>
                </div>
            `).join('');

            mealsContainer.innerHTML = `
                <!-- 헤더 바 -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
                    <div>
                        <h4 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #1e293b;">🍱 학교 급식 식단표 (날짜별 미리보기)</h4>
                        <span style="font-size: 11px; color: ${isLive ? '#059669' : '#64748b'}; font-weight: 500;">
                            ${isLive ? `🟢 교육부 나이스 실시간 식단 (${schoolName})` : `${schoolName} 등록 식단`}
                        </span>
                    </div>
                    <span class="neis-badge ${isLive ? 'neis-badge-success' : 'neis-badge-info'}">${isLive ? '나이스 실시간' : '기본'}</span>
                </div>

                <!-- 날짜 이동 컨트롤러 바 -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <button type="button" onclick="window.changeNEISMealDate(-1);" ${!hasPrev ? 'disabled' : ''} style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 700; color: ${hasPrev ? '#334155' : '#cbd5e1'}; cursor: ${hasPrev ? 'pointer' : 'default'}; opacity: ${hasPrev ? '1' : '0.5'};" title="이전 급식일">&lt; 이전</button>
                    
                    <div style="text-align: center;">
                        <div style="font-size: 13px; font-weight: 800; color: #1e293b; display: flex; align-items: center; justify-content: center;">
                            📅 ${st.currentDate} (${curDayName}) ${dateBadge}
                        </div>
                        <div style="font-size: 10.5px; color: #64748b; margin-top: 1px;">
                            ${curMeal.mealType || '중식'}${curMeal.calories ? ` · ${curMeal.calories}` : ''}
                        </div>
                    </div>

                    <button type="button" onclick="window.changeNEISMealDate(1);" ${!hasNext ? 'disabled' : ''} style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 700; color: ${hasNext ? '#334155' : '#cbd5e1'}; cursor: ${hasNext ? 'pointer' : 'default'}; opacity: ${hasNext ? '1' : '0.5'};" title="다음 급식일">다음 &gt;</button>
                </div>

                <!-- 퀵 날짜 바로가기 버튼들 -->
                <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px; overflow-x: auto; padding-bottom: 2px;">
                    <button type="button" onclick="window.setNEISMealDate('${todayStr}');" style="padding: 3px 9px; border-radius: 6px; border: 1px solid ${st.currentDate === todayStr ? '#2563eb' : '#cbd5e1'}; background: ${st.currentDate === todayStr ? '#eff6ff' : '#ffffff'}; color: ${st.currentDate === todayStr ? '#2563eb' : '#475569'}; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap;">오늘</button>
                    <button type="button" onclick="window.setNEISMealDate('${tomorrowStr}');" style="padding: 3px 9px; border-radius: 6px; border: 1px solid ${st.currentDate === tomorrowStr ? '#2563eb' : '#cbd5e1'}; background: ${st.currentDate === tomorrowStr ? '#eff6ff' : '#ffffff'}; color: ${st.currentDate === tomorrowStr ? '#2563eb' : '#475569'}; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap;">내일</button>
                    <span style="font-size: 10.5px; color: #94a3b8; margin-left: auto; white-space: nowrap;">총 ${allMeals.length}일치 식단 연동 중</span>
                </div>

                <!-- 알레르기 위험 경고 배너 (해당 일자 식단에 알레르기 반찬이 있는 경우) -->
                ${totalRisks.length > 0 ? `
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 8px 12px; margin-bottom: 10px; font-size: 11.5px; color: #991b1b; display: flex; align-items: flex-start; gap: 6px;">
                        <span style="font-size: 13px;">⚠️</span>
                        <div>
                            <strong>알레르기 주의:</strong> 이 날 급식에 등록된 자녀 알레르기 유발 식품(<strong>${totalRisks.map(r => (r.matchedAllergies||[]).join(',')).filter(Boolean).join(', ')}</strong>)이 포함되어 있습니다.
                        </div>
                    </div>
                ` : ''}

                <!-- 반찬 리스트 -->
                ${menuItemsHtml}
            `;
        };

        window.changeNEISMealDate = function(offset) {
            if (!window.__neisMealsState || !window.__neisMealsState.allMeals) return;
            const { allMeals, currentDate } = window.__neisMealsState;
            const curIdx = allMeals.findIndex(m => m.date === currentDate);
            if (curIdx >= 0) {
                const nextIdx = curIdx + offset;
                if (nextIdx >= 0 && nextIdx < allMeals.length) {
                    window.__neisMealsState.currentDate = allMeals[nextIdx].date;
                    window.renderNEISMealView();
                }
            }
        };

        window.setNEISMealDate = function(dateStr) {
            if (!window.__neisMealsState || !window.__neisMealsState.allMeals) return;
            const exists = window.__neisMealsState.allMeals.some(m => m.date === dateStr);
            if (exists) {
                window.__neisMealsState.currentDate = dateStr;
            } else {
                const upcoming = window.__neisMealsState.allMeals.find(m => m.date >= dateStr);
                if (upcoming) window.__neisMealsState.currentDate = upcoming.date;
            }
            window.renderNEISMealView();
        };

        // 로딩 플레이스홀더 렌더링
        el.innerHTML = `
            <div class="neis-card" style="background: #f0fdf4; border: 1px solid #bbf7d0; margin-bottom: 12px;">
                <h4 style="margin: 0 0 4px 0; font-size: 13.5px; font-weight: 800; color: #166534;">🏃 PAPS 학생건강체력평가</h4>
                <div style="font-size: 12px; color: #15803d;">
                    체력 등급: <strong style="font-size: 13px;">${healthObj.papsGrade || 1}등급 (우수)</strong> | 체질량: <strong>${healthObj.bmiStatus || '표준'}</strong>
                </div>
            </div>
            <div class="neis-card" id="neisLiveMealsContainer">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div>
                        <h4 style="margin: 0; font-size: 13.5px; font-weight: 800; color: #1e293b;">🍱 오늘 학교 급식 식단표</h4>
                        <span style="font-size: 11px; color: #64748b;">${currentSchoolName} 실제 급식 일정을 조회하고 있습니다...</span>
                    </div>
                    <span class="neis-badge neis-badge-info">실시간 식단 조회 중</span>
                </div>
                <div style="text-align: center; padding: 24px 10px; color: #64748b; font-size: 12px;">
                    🔄 교육부 나이스 서버에서 [${currentSchoolName}] 실제 식단을 불러오는 중입니다...
                </div>
            </div>
        `;

        // 비동기 실제 급식 식단표 API 호출 (지역 정보 함께 전달하여 동명 학교 구분)
        const mealSchoolRegionParam = activeChild?.schoolRegion || window.selectedTargetSchool?.region || '';
        agent.service.fetchRealMeals(currentSchoolName, currentAllergies, mealSchoolRegionParam).then(realMealData => {
            const isLive = Boolean(realMealData?.isLive);
            const rawMeals = realMealData?.allMeals && realMealData.allMeals.length > 0 
                ? realMealData.allMeals 
                : (realMealData?.checkedMenu ? [{
                    date: realMealData.mealDate || new Date().toISOString().slice(0, 10),
                    mealType: realMealData.mealType || '중식',
                    calories: realMealData.calories || '',
                    dishes: realMealData.checkedMenu
                }] : [
                    {
                        date: new Date().toISOString().slice(0, 10),
                        mealType: '중식',
                        calories: '685 kcal',
                        dishes: [
                            { name: '현미찹쌀밥', allergies: [] },
                            { name: '맑은 쇠고기뭇국', allergies: ['대두'] },
                            { name: '수제 닭강정', allergies: ['밀', '닭고기'] },
                            { name: '시금치나물무침', allergies: ['대두'] },
                            { name: '깍두기', allergies: [] }
                        ]
                    }
                ]);

            window.__neisMealsState.allMeals = rawMeals;
            window.__neisMealsState.isLive = isLive;
            window.__neisMealsState.schoolName = currentSchoolName;
            window.__neisMealsState.currentDate = realMealData?.mealDate || new Date().toISOString().slice(0, 10);

            window.renderNEISMealView();
        }).catch(err => {
            console.error('Live meal fetch failed:', err);
            window.__neisMealsState.allMeals = [];
            window.__neisMealsState.isLive = false;
            window.renderNEISMealView();
        });
    }
};

// 초기 데이터 세팅
    initAuthModule();
    initNEISLocalModule();
    loadDistrictData();
})();
});



