// Main entry point
import { Orchestrator } from './src/agents/orchestrator.js';
let orchestrator;
let currentLoadedSchools = [];
window.customCommuteStart = null;
window.customCommuteEnd = null;
window.mapClickMode = 'none';

document.addEventListener('DOMContentLoaded', () => {
    orchestrator = new Orchestrator();

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

    // --- Custom Confirm Modal Override (Promise based) ---
    window.confirm = function(message) {
        return new Promise((resolve) => {
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
                            <button id="btnConfirmOk" style="background:var(--danger-red, #d9534f); color:white; border:none; border-radius:8px; padding:12px 24px; font-size:15px; font-weight:bold; cursor:pointer; outline:none; transition:background 0.2s;">확인</button>
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
            
            document.getElementById('btnConfirmOk').onclick = () => close(true);
            document.getElementById('btnConfirmCancel').onclick = () => close(false);
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
    const parentsFilterContent = document.getElementById('parentsFilterContent');
    const parentsFilterIndicator = document.getElementById('parentsFilterIndicator');

    if (parentsFilterToggle && parentsFilterContent) {
        parentsFilterToggle.addEventListener('click', () => {
            if (parentsFilterContent.style.display === 'none' || parentsFilterContent.style.display === '') {
                parentsFilterContent.style.display = 'flex';
                parentsFilterIndicator.innerText = '▲';
            } else {
                parentsFilterContent.style.display = 'none';
                parentsFilterIndicator.innerText = '▼';
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

    // New Advanced Filters bindings
    bindRangeText('filterMinAvgScore', 'valMinAvgScore', '점');
    bindRangeText('filterMinSubjectScore', 'valMinSubjectScore', '점');
    bindRangeText('filterMinTopRatio', 'valMinTopRatio', '%');
    bindRangeText('filterMaxBottomRatio', 'valMaxBottomRatio', '%');
    bindRangeText('filterMaxStudentPerTeacher', 'valMaxStudentPerTeacher', '명');
    bindRangeText('filterMinGraduateRate', 'valMinGraduateRate', '%');
    bindRangeText('filterMinSpecialAdmission', 'valMinSpecialAdmission', '%');
    bindRangeText('filterMaxViolence', 'valMaxViolence', '건');

    // 플로팅 창 알파값 조정 이벤트 연동
    const opacityRange = document.getElementById('overlayOpacityRange');
    const opacityValText = document.getElementById('valOverlayOpacity');
    if (opacityRange && opacityValText) {
        const updateOpacity = () => {
            const val = (opacityRange.value / 100).toFixed(2);
            opacityValText.innerText = val;
            document.documentElement.style.setProperty('--overlay-bg-alpha', val);
        };
        opacityRange.addEventListener('input', updateOpacity);
        updateOpacity(); // 초기값 적용
    }

    // 다중 자녀 상태 (1명 이상 지원)
    let childProfiles = [
        { id: 'child_1', name: '자녀 1', grade: 'm2', korean: 85, english: 78, math: 72 }
    ];
    let selectedChildId = 'child_1';

    // Supabase DB 자녀 프로필 데이터 동기화
    async function loadChildProfilesFromSupabase() {
        if (!supabase) {
            loadChildProfilesFromLocalStorage();
            return;
        }
        try {
            const { data, error } = await supabase
                .from('child_profiles')
                .select('*')
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            if (data && data.length > 0) {
                childProfiles = data.map(item => ({
                    id: item.id,
                    name: item.name,
                    grade: item.grade || 'm2',
                    korean: parseInt(item.korean) || 0,
                    english: parseInt(item.english) || 0,
                    math: parseInt(item.math) || 0
                }));
                selectedChildId = childProfiles[0].id;
            } else {
                // 데이터가 없을 경우 초기 기본 자녀 1명 insert
                const defaultChild = { name: '자녀 1', grade: 'm2', korean: 85, english: 78, math: 72 };
                const { data: insertedData, error: insertErr } = await supabase
                    .from('child_profiles')
                    .insert([defaultChild])
                    .select();
                if (!insertErr && insertedData && insertedData.length > 0) {
                    childProfiles = insertedData.map(item => ({
                        id: item.id,
                        name: item.name,
                        grade: item.grade,
                        korean: item.korean,
                        english: item.english,
                        math: item.math
                    }));
                    selectedChildId = childProfiles[0].id;
                }
            }
            refreshChildSelectUI();
        } catch (err) {
            console.error('Error fetching child profiles from Supabase:', err);
            loadChildProfilesFromLocalStorage();
        }
    }

    function loadChildProfilesFromLocalStorage() {
        const saved = localStorage.getItem('learnmap_child_profiles');
        if (saved) {
            try {
                childProfiles = JSON.parse(saved);
                if (childProfiles.length > 0) {
                    selectedChildId = childProfiles[0].id;
                }
            } catch (e) {
                console.error(e);
            }
        }
        refreshChildSelectUI();
    }

    function saveChildProfilesToLocalStorage() {
        localStorage.setItem('learnmap_child_profiles', JSON.stringify(childProfiles));
    }

    async function saveChildProfileToSupabase(child) {
        if (!supabase) return;
        try {
            // id가 child_로 시작하면 임시 로컬 id이므로 insert 처리
            const isTempId = typeof child.id === 'string' && child.id.startsWith('child_');
            if (isTempId) {
                const { data, error } = await supabase
                    .from('child_profiles')
                    .insert([{
                        name: child.name,
                        grade: child.grade,
                        korean: child.korean,
                        english: child.english,
                        math: child.math
                    }])
                    .select();
                if (error) throw error;
                if (data && data.length > 0) {
                    child.id = data[0].id; // 발급받은 실제 DB ID로 치환
                }
            } else {
                const { error } = await supabase
                    .from('child_profiles')
                    .update({
                        name: child.name,
                        grade: child.grade,
                        korean: child.korean,
                        english: child.english,
                        math: child.math
                    })
                    .eq('id', child.id);
                if (error) throw error;
            }
        } catch (err) {
            console.error('Supabase save error:', err);
        }
    }

    async function deleteChildProfileFromSupabase(id) {
        if (!supabase) return;
        const isTempId = typeof id === 'string' && id.startsWith('child_');
        if (isTempId) return;
        try {
            const { error } = await supabase
                .from('child_profiles')
                .delete()
                .eq('id', id);
            if (error) throw error;
        } catch (err) {
            console.error('Supabase delete error:', err);
        }
    }

    const settingsChildSelect = document.getElementById('settingsChildSelect');
    const settingsChildName = document.getElementById('settingsChildName');
    const settingsChildGrade = document.getElementById('settingsChildGrade');
    const settingsChildKor = document.getElementById('settingsChildKor');
    const settingsChildEng = document.getElementById('settingsChildEng');
    const settingsChildMath = document.getElementById('settingsChildMath');

    // 분석 결과창 내 자녀 변경 시 실시간 분석 실행 바인딩
    const analysisChildSelect = document.getElementById('analysisChildSelect');
    if (analysisChildSelect) {
        analysisChildSelect.addEventListener('change', () => {
            const targetId = analysisChildSelect.value;
            const child = childProfiles.find(c => c.id === targetId);
            if (child) {
                selectedChildId = targetId;
                // 통합 설정 양방향 동기화
                if (settingsChildSelect) settingsChildSelect.value = targetId;
                updateFormWithSelectedChild();
                
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

    function refreshChildSelectUI() {
        if (!settingsChildSelect) return;
        settingsChildSelect.innerHTML = '';
        
        // 분석창 자녀 셀렉트도 동시에 갱신
        if (analysisChildSelect) analysisChildSelect.innerHTML = '';

        childProfiles.forEach(child => {
            // 모달용 옵션
            const opt1 = document.createElement('option');
            opt1.value = child.id;
            opt1.innerText = `${child.name} (${child.grade.toUpperCase()})`;
            if (child.id === selectedChildId) {
                opt1.selected = true;
            }
            settingsChildSelect.appendChild(opt1);

            // 분석 결과창용 옵션
            if (analysisChildSelect) {
                const opt2 = document.createElement('option');
                opt2.value = child.id;
                opt2.innerText = child.name;
                if (child.id === selectedChildId) {
                    opt2.selected = true;
                }
                analysisChildSelect.appendChild(opt2);
            }
        });
        updateFormWithSelectedChild();
    }

    function updateFormWithSelectedChild() {
        const child = childProfiles.find(c => c.id === selectedChildId);
        if (!child) return;
        if (settingsChildName) settingsChildName.value = child.name;
        if (settingsChildGrade) settingsChildGrade.value = child.grade;
        if (settingsChildKor) settingsChildKor.value = child.korean;
        if (settingsChildEng) settingsChildEng.value = child.english;
        if (settingsChildMath) settingsChildMath.value = child.math;
        
        // 자녀별 점수 텍스트(Label)도 동적 갱신
        const lblKor = document.getElementById('valSettingsChildKor');
        const lblEng = document.getElementById('valSettingsChildEng');
        const lblMath = document.getElementById('valSettingsChildMath');
        if (lblKor) lblKor.innerText = `${child.korean}점`;
        if (lblEng) lblEng.innerText = `${child.english}점`;
        if (lblMath) lblMath.innerText = `${child.math}점`;

        // 현재 선택된 자녀 정보로 Orchestrator 상태 동기화 및 사이드바 인풋 동기화
        syncActiveChildWithOrchestrator(child);
    }

    // 슬라이더 조작 시 텍스트 즉각 갱신 이벤트 등록
    const setupSliderIndicatorSync = (sliderEl, labelId) => {
        if (sliderEl) {
            sliderEl.addEventListener('input', (e) => {
                const label = document.getElementById(labelId);
                if (label) label.innerText = `${e.target.value}점`;
            });
        }
    };
    setupSliderIndicatorSync(settingsChildKor, 'valSettingsChildKor');
    setupSliderIndicatorSync(settingsChildEng, 'valSettingsChildEng');
    setupSliderIndicatorSync(settingsChildMath, 'valSettingsChildMath');

    function syncActiveChildWithOrchestrator(child) {
        if (!child) return;
        orchestrator.state.childProfile.name = child.name;
        orchestrator.state.childProfile.grade = child.grade;
        orchestrator.state.childProfile.scores = {
            korean: child.korean,
            english: child.english,
            math: child.math
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
    }

    if (settingsChildSelect) {
        settingsChildSelect.addEventListener('change', () => {
            selectedChildId = settingsChildSelect.value;
            updateFormWithSelectedChild();
        });
    }

    // 자녀 추가 버튼 이벤트
    const btnAddNewChild = document.getElementById('btnAddNewChild');
    if (btnAddNewChild) {
        btnAddNewChild.addEventListener('click', () => {
            const newId = `child_${Date.now()}`;
            const newChild = {
                id: newId,
                name: `자녀 ${childProfiles.length + 1}`,
                grade: 'm2',
                korean: 80,
                english: 80,
                math: 80
            };
            childProfiles.push(newChild);
            selectedChildId = newId;
            refreshChildSelectUI();
        });
    }

    // 자녀 삭제 버튼 이벤트
    const btnDeleteSelectedChild = document.getElementById('btnDeleteSelectedChild');
    if (btnDeleteSelectedChild) {
        btnDeleteSelectedChild.addEventListener('click', async () => {
            if (childProfiles.length <= 1) {
                alert('최소 1명의 자녀 정보는 필요합니다.');
                return;
            }
            if (await confirm('선택된 자녀 정보를 삭제하시겠습니까?')) {
                const targetId = selectedChildId;
                childProfiles = childProfiles.filter(c => c.id !== targetId);
                selectedChildId = childProfiles[0].id;
                
                await deleteChildProfileFromSupabase(targetId);
                saveChildProfilesToLocalStorage();
                refreshChildSelectUI();
            }
        });
    }

    // 설정 모달이 열릴 때 Supabase 데이터를 기준으로 동기화
    const btnOpenSettings = document.getElementById('btnOpenSettings');
    if (btnOpenSettings) {
        btnOpenSettings.addEventListener('click', async () => {
            await loadChildProfilesFromSupabase();
        });
    }

    // 자녀 성적 저장 및 동기화 버튼 클릭 이벤트
    const btnSaveSettingsScores = document.getElementById('btnSaveSettingsScores');
    if (btnSaveSettingsScores) {
        btnSaveSettingsScores.addEventListener('click', async () => {
            const child = childProfiles.find(c => c.id === selectedChildId);
            if (!child) return;

            const elModalName = document.getElementById('settingsChildName');
            const elModalGrade = document.getElementById('settingsChildGrade');
            const elModalKor = document.getElementById('settingsChildKor');
            const elModalEng = document.getElementById('settingsChildEng');
            const elModalMath = document.getElementById('settingsChildMath');

            child.name = elModalName ? elModalName.value.trim() || '자녀' : '자녀';
            child.grade = elModalGrade ? elModalGrade.value : 'm2';
            child.korean = elModalKor ? parseInt(elModalKor.value) || 0 : 0;
            child.english = elModalEng ? parseInt(elModalEng.value) || 0 : 0;
            child.math = elModalMath ? parseInt(elModalMath.value) || 0 : 0;

            // 로컬 스토리지 저장 및 동기화
            saveChildProfilesToLocalStorage();
            syncActiveChildWithOrchestrator(child);

            // Supabase 비동기 업서트 처리
            await saveChildProfileToSupabase(child);

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

            alert('자녀 성적 정보가 성공적으로 저장되었습니다.');
            // 자녀 성적 저장 및 동기화 시 설정 모달을 닫지 않고 상태를 유지하도록 수정함
            // const settingsModal = document.getElementById('settingsModal');
            // if (settingsModal) settingsModal.style.display = 'none';
        });
    }

    // 초기 로딩 시 자녀 정보 연동
    loadChildProfilesFromLocalStorage();
    if (supabase) {
        loadChildProfilesFromSupabase();
    }

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
                targetId: 'academy_registration_request',
                nickname: '학부모 제안',
                content: `[신규 학원 등록 요청]\n학원명: ${name}\n주소: ${address}\n과목: ${type}\n연락처: ${contact}\n비고: ${comments}`
            };

            try {
                const response = await fetch('/api/towntalk', {
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
                    document.getElementById('academyRegisterCard').style.display = 'none';
                    document.getElementById('welcomeCard').style.display = 'block';
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
                targetId: 'information_edit_request',
                nickname: '학부모 제보',
                content: `[잘못된 정보 수정 요청]\n대상: ${targetName}\n내용: ${details}\n제보자: ${contact}`
            };

            try {
                const response = await fetch('/api/towntalk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    alert('정보 수정 요청이 제출되었습니다. 검토 후 신속하게 조치하겠습니다.');
                    document.getElementById('sidebarEditTargetName').value = '';
                    document.getElementById('sidebarEditDetails').value = '';
                    document.getElementById('sidebarEditContact').value = '';
                    document.getElementById('infoEditRequestCard').style.display = 'none';
                    document.getElementById('welcomeCard').style.display = 'block';
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
                targetId: 'ad_business_inquiry',
                nickname: '제휴 파트너',
                content: `[광고 및 제휴 문의]\n회사/단체명: ${company}\n연락처/이메일: ${contact}\n내용: ${details}`
            };

            try {
                const response = await fetch('/api/towntalk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    alert('광고 및 제휴 문의가 제출되었습니다. 확인 후 메일이나 연락처로 답변을 드리겠습니다.');
                    document.getElementById('sidebarAdCompanyName').value = '';
                    document.getElementById('sidebarAdContact').value = '';
                    document.getElementById('sidebarAdDetails').value = '';
                    document.getElementById('adInquiryCard').style.display = 'none';
                    document.getElementById('welcomeCard').style.display = 'block';
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

    if (btnShowTutorial) {
        btnShowTutorial.addEventListener('click', () => {
            const onboardingModal = document.getElementById('onboardingModal');
            if (onboardingModal) {
                document.getElementById('onboardingStep1').style.display = 'block';
                document.getElementById('onboardingStep2').style.display = 'none';
                document.getElementById('onboardingStep3').style.display = 'none';
                onboardingModal.style.display = 'flex';
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
                mapMarkers.forEach(marker => marker.setMap(null));
                mapMarkers = [];
                if (clusterer) clusterer.clear();
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
            alert('⚙️ 상단 [통합 설정] 버튼을 눌러 자녀의 최근 시험 성적 정보를 먼저 저장해 주세요.');
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) {
                settingsModal.style.display = 'flex';
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
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.style.display = 'flex';
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

    btnCompareBoard.addEventListener('click', () => {
        if (!orchestrator.state.selectedSchool) return;
        
        const exists = orchestrator.state.comparisonList.some(s => s.school_id === orchestrator.state.selectedSchool.school_id);
        if (exists) {
            // 이미 추가되었을 경우 비교보드 매트릭스를 그대로 다시 렌더링하여 화면에 보여줍니다.
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
    });

    btnCloseCompare.addEventListener('click', () => {
        compareOverlay.style.display = 'none';
        updateCompareFloatingButton();
    });

    function updateCompareFloatingButton() {
        if (!btnOpenCompareFloating) return;
        const count = (orchestrator && orchestrator.state && orchestrator.state.comparisonList) 
            ? orchestrator.state.comparisonList.length 
            : 0;
        const isOverlayVisible = compareOverlay && compareOverlay.style.display !== 'none';
        
        if (count > 0 && !isOverlayVisible) {
            btnOpenCompareFloating.style.display = 'flex';
            if (compareCountBadge) {
                compareCountBadge.innerText = count;
            }
        } else {
            btnOpenCompareFloating.style.display = 'none';
        }
    }

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

                        kakao.maps.event.addListener(clusterer, 'clusterclick', (cluster) => {
                            const level = kakaoMap.getLevel() - 1;
                            kakaoMap.setLevel(level, { anchor: cluster.getCenter() });
                        });

                        // Register Map Interaction events
                        let dragThrottleTimeout = null;
                        kakao.maps.event.addListener(kakaoMap, 'drag', () => {
                            if (!dragThrottleTimeout) {
                                dragThrottleTimeout = setTimeout(() => {
                                    const chk = document.getElementById('safetyGuideCheckbox');
                                    if (chk && chk.checked) {
                                        updateSafetyGuideLayers(orchestrator.state.selectedSchool);
                                    }
                                    const chkCrime = document.getElementById('crimeZoneToggleCheckbox');
                                    if (chkCrime && chkCrime.checked) {
                                        updateCrimeZoneLayers(orchestrator.state.selectedSchool);
                                    }
                                    dragThrottleTimeout = null;
                                }, 300);
                            }
                        });

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
                                if (orchestrator.state.selectedSchool) {
                                    window.updateMapLayers(orchestrator.state.selectedSchool);
                                }
                                if (typeof window.updatePointSelectorButtons === 'function') {
                                    window.updatePointSelectorButtons();
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
                    onMapAction();
                    updateCompareFloatingButton();
                    hideLoadingOverlay();
                });
            });
        } else {
            logDiagnostic('오프라인 대체 모드로 시뮬레이션을 작동합니다.');
            schoolsLoadPromise = loadSchoolsDatabase();
            schoolsLoadPromise.then(() => {
                renderPins(schoolsDatabase.slice(0, 10), false);
                updateCompareFloatingButton();
                hideLoadingOverlay();
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
        if (typeof resetSafeCommute === 'function') resetSafeCommute();
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
        const zoomLevel = kakaoMap.getLevel();
        orchestrator.state.filters.schoolType = schoolTypeFilter.value;

        // Check if map center actually moved
        const hasMoved = !lastMapCenter || 
            Math.abs(lastMapCenter.getLat() - center.getLat()) > 0.0001 || 
            Math.abs(lastMapCenter.getLng() - center.getLng()) > 0.0001;

        if (!hasMoved && lastDetectedRegion) {
            // Map did not move: render synchronously using cached region to avoid geocoder latency
            _renderMapForRegion(zoomLevel, lastDetectedRegion);
            return;
        }

        lastMapCenter = center;

        const doRender = (regionToUse) => {
            lastDetectedRegion = regionToUse;
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
            doRender(regionFilter.value);
        }
    }
    window.onMapAction = onMapAction;

    // 학부모 맞춤 필터 및 가중치 기반 학교 필터링 함수
    function filterSchools(schools, selectedRegion, typeLabel) {
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

            // 3. 3년 연속 우상향 필터
            if (showTrendUpward) {
                const isUpward = (avgPrev2 <= avgPrev1) && (avgPrev1 <= school.weightedAvg);
                if (!isUpward) return false;
            }

            // 4. 자녀 내신 추천 필터 (자녀 내신 - 10점 ~ 목표 내신 + 5점 범위)
            if (school.weightedAvg < curLevel - 10 || school.weightedAvg > tarLevel + 5) {
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

            // --- 학교 특성 필터 체크 ---
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

            // --- 교육환경 스코어 계산 ---
            const scoreScore = school.weightedAvg;
            const teacherScore = Math.max(0, 100 - (school.class_avg_size * 2.8));
            const safetyScore = Math.max(0, 100 - (school.violence_stats ? school.violence_stats.total_cases * 12 : 0));
            const budgetScore = Math.min(100, (school.extracurricular_budget || 0) * 0.5);
            
            const envScore = Math.round(scoreScore * pScore + teacherScore * pTeacher + safetyScore * pViolence + budgetScore * pBudget);
            school.envScore = envScore;
            school.envScoresDetails = { scoreScore, teacherScore, safetyScore, budgetScore };

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

            // 공통 필터 적용
            const filteredForCluster = filterSchools(schoolsDatabase, selectedRegion, typeLabel);

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
                <span style="font-weight: 600; color: var(--text-main);">80점 이상 (우수)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--success-green);"></span>
                <span style="font-weight: 600; color: var(--text-main);">70점 ~ 80점 미만 (양호)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--warning-yellow);"></span>
                <span style="font-weight: 600; color: var(--text-main);">60점 ~ 70점 미만 (보통)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--info-gray);"></span>
                <span style="font-weight: 600; color: var(--text-muted);">60점 미만 (보완) / 결측치</span>
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

        filtered = filtered.slice(0, 30); // Prevent overlay flooding
        currentLoadedSchools = filtered;
        renderPins(filtered, false);
        updateSafetyGuideLayers(orchestrator.state.selectedSchool);
        updateCrimeZoneLayers(orchestrator.state.selectedSchool);
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
            
            let trendSummary = "최근 3년간 학업성취도가 안정적으로 유지되는 분위기입니다.";
            if (fullSchool.trendData) {
                const diff = fullSchool.trendData[2] - fullSchool.trendData[0];
                if (diff > 1.5) trendSummary = "📈 최근 3년간 학력 지표가 뚜렷한 상승세를 기록하고 있습니다.";
                else if (diff < -1.5) trendSummary = "📉 최근 3년간 학력 지표가 다소 하락 추세를 보이고 있어 기초 보강이 권장됩니다.";
            }
            schoolInsight.innerHTML = `<div style="font-weight: 800; color: var(--primary-blue); margin-bottom: 6px;">📍 서울시 전체 중 상위 ${percentRank}% 수준</div>
                                       <div>${summary.insight}</div>
                                       <div style="margin-top: 4px; font-weight: 500;">${trendSummary}</div>`;
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
        if (totalEnvLabel) totalEnvLabel.innerText = `${fullSchool.envScore}점`;

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
            if (startValEl) startValEl.innerText = `${pts[0]}점`;
            if (endValEl) endValEl.innerText = `${pts[2]}점`;
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
                                const avgScore = (fullSchool.subjects.korean.avg + fullSchool.subjects.english.avg + fullSchool.subjects.math.avg) / 3;
                                const avgSaleInEok = avgSale / 10000;
                                const rawIndex = avgScore / avgSaleInEok;
                                const efficiencyScore = Math.min(100, Math.round(rawIndex * 10));
                                
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
                            }
                        } catch (e) {
                            console.error(e);
                            if (rsSale) rsSale.innerText = '조회 실패';
                            if (rsJeonse) rsJeonse.innerText = '조회 실패';
                            if (rsIndex) rsIndex.innerText = '분석 실패';
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

                                // 신규 학원 부가 서비스 연동 (계산기 & 타운 톡)
                                // 탭 상태 기본값(후기 & 톡)으로 초기화
                                const tabRev = document.getElementById('tabAcademyReviews');
                                const tabCalc = document.getElementById('tabAcademyCalculator');
                                const secRev = document.getElementById('sectionAcademyReviews');
                                const secCalc = document.getElementById('sectionAcademyCalculator');
                                if (tabRev && tabCalc && secRev && secCalc) {
                                    tabRev.style.borderBottomColor = 'var(--primary-blue)';
                                    tabRev.style.color = 'var(--primary-blue)';
                                    tabCalc.style.borderBottomColor = 'transparent';
                                    tabCalc.style.color = 'var(--text-muted)';
                                    secRev.style.display = 'block';
                                    secCalc.style.display = 'none';
                                }

                                if (typeof window.renderAcademyFeeCalculator === 'function') {
                                    window.renderAcademyFeeCalculator(acadName, shortSubject);
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
        } else if (school.school_type && school.school_type.includes('초등학교')) {
            if (compIndex2026 >= 70) {
                strategyHTML = `
                    <div style="background: #ffe0b2; border: 1px solid #ffb74d; border-radius: 8px; padding: 12px; margin-top: 12px;">
                        <strong style="color: #e65100; font-size: 11px; display: block; margin-bottom: 4px;">💡 중학교 진학 추천 가이드: 명문 학군중 진학 및 연계 대비</strong>
                        <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #4e342e; letter-spacing: -0.2px;">
                            주변의 높은 교육열과 학생들의 기초 학력이 탄탄한 학군지입니다. 중학교 진학 후 급격히 심화되는 수학 계통성 학습과 영어 서술형 평가에 대비하여, 초등 고학년 시기부터 교과 구멍이 없도록 꼼꼼한 기본-응용 연계 지도와 독서 토론을 강화하는 것을 권장합니다.
                        </p>
                    </div>
                `;
            } else {
                strategyHTML = `
                    <div style="background: #f1f8e9; border: 1px solid #aed581; border-radius: 8px; padding: 12px; margin-top: 12px;">
                        <strong style="color: #33691e; font-size: 11px; display: block; margin-bottom: 4px;">💡 초등 학습 지도 가이드: 자기주도 독서 및 기초 연산 확립</strong>
                        <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #1b5e20; letter-spacing: -0.2px;">
                            안정적이고 여유로운 학업 분위기를 띄고 있습니다. 무리한 속진 선행보다는 자기주도적 독서 습관을 기르고, 연산 속도 및 문해력을 튼튼히 쌓으며 초등 과정의 완벽한 개념 체화를 지향하는 것이 장기적으로 고교 내신 성취에 유리합니다.
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
                    <span style="font-weight: 600; color: var(--text-main);">학군 우수 (85점 이상)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: rgba(22,165,74,0.4); border: 2px solid var(--success-green);"></span>
                    <span style="font-weight: 600; color: var(--text-main);">학군 양호 (78점 ~ 85점 미만)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: rgba(202,138,4,0.4); border: 2px solid var(--warning-yellow);"></span>
                    <span style="font-weight: 600; color: var(--text-main);">학군 보통 (70점 ~ 78점 미만)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: rgba(117,117,117,0.45); border: 2px solid #757575;"></span>
                    <span style="font-weight: 600; color: var(--text-muted);">학군 보완 (70점 미만)</span>
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

    function initSimulationDropdowns() {
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

            // 시도 변경 시 구군 채우기 핸들러 (이벤트가 중복 부착되지 않도록 확인 후 1회만 등록)
            const setupSidoChangeHandler = (sidoEl, gugunEl, dongEl) => {
                if (sidoEl.dataset.hasChangeListener) return;
                sidoEl.dataset.hasChangeListener = "true";
                sidoEl.addEventListener('change', () => {
                    const selectedSido = sidoEl.value;
                    gugunEl.innerHTML = '<option value="">구군 선택</option>';
                    dongEl.innerHTML = '<option value="">동 선택</option>';

                    if (!selectedSido) return;

                    const sidoItem = districtData.find(item => Object.keys(item)[0] === selectedSido);
                    if (sidoItem) {
                        const guguns = sidoItem[selectedSido];
                        guguns.forEach(gugun => {
                            const opt = document.createElement('option');
                            opt.value = gugun;
                            opt.innerText = gugun;
                            gugunEl.appendChild(opt);
                        });
                    }
                });
            };

            // 구군 변경 시 동 채우기 핸들러 (이벤트가 중복 부착되지 않도록 확인 후 1회만 등록)
            const setupGugunChangeHandler = (sidoEl, gugunEl, dongEl) => {
                if (gugunEl.dataset.hasChangeListener) return;
                gugunEl.dataset.hasChangeListener = "true";
                gugunEl.addEventListener('change', () => {
                    const selectedSido = sidoEl.value;
                    const selectedGugun = gugunEl.value;
                    if (!selectedSido || !selectedGugun) {
                        dongEl.innerHTML = '<option value="">동 선택</option>';
                        return;
                    }
                    updateDongDropdown(selectedSido, selectedGugun, dongEl);
                });
            };

            // 이벤트 바인딩 적용
            setupSidoChangeHandler(sidoA, gugunA, dongA);
            setupSidoChangeHandler(sidoB, gugunB, dongB);
            setupGugunChangeHandler(sidoA, gugunA, dongA);
            setupGugunChangeHandler(sidoB, gugunB, dongB);

            // 공통 학교급 필터 변경 시 양측 동 목록 갱신
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
                });
            }

            console.log('initSimulationDropdowns populated successfully.');
        } catch (e) {
            console.error('행정구역 데이터 초기화 에러:', e);
        }
    }
    window.initSimulationDropdowns = initSimulationDropdowns;

    async function updateDongDropdown(sido, gugun, dongSelectEl) {
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
            return;
        }

        dongSelectEl.innerHTML = '<option value="">동 로딩 중...</option>';

        // 해당 구군 및 학교급에 속하는 학교들만 추출
        let filteredSchools = schoolsDatabase.filter(s => {
            const matchRegion = s.region === sido && s.address && s.address.includes(gugun);
            if (!matchRegion) return false;

            if (simSchoolTypeVal !== 'all' && s.school_type !== simSchoolTypeVal) {
                return false;
            }
            return true;
        });

        if (filteredSchools.length === 0) {
            dongSelectEl.innerHTML = '<option value="">학교 없음</option>';
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
        }
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
                // 카카오 API 좌표 실패 시 폴백 (도로명 매치)
                const term = regionA.split(' ').pop();
                schoolsA = schoolsDatabase.filter(s => {
                    if (simSchoolTypeVal !== 'all' && s.school_type !== simSchoolTypeVal) return false;
                    return s.address && s.address.toLowerCase().includes(term.toLowerCase());
                });
            }

            if (coordsB) {
                schoolsB = schoolsDatabase.filter(s => {
                    if (!s.lat || !s.lng) return false;
                    if (simSchoolTypeVal !== 'all' && s.school_type !== simSchoolTypeVal) return false;
                    return getDistance(coordsB.lat, coordsB.lng, s.lat, s.lng) <= 1.8;
                });
            } else {
                const term = regionB.split(' ').pop();
                schoolsB = schoolsDatabase.filter(s => {
                    if (simSchoolTypeVal !== 'all' && s.school_type !== simSchoolTypeVal) return false;
                    return s.address && s.address.toLowerCase().includes(term.toLowerCase());
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

            resultPanel.innerHTML = `
                <div style="font-size: 12.5px; font-weight: bold; color: var(--deep-blue); margin-bottom: 12px; background: #e8f4ff; padding: 10px; border-radius: 8px; border-left: 4px solid var(--primary-blue);">
                    💡 분석 결과: ${nameA} (${statsA.count}개교) vs ${nameB} (${statsB.count}개교)
                </div>
                
                <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 12px; margin-bottom: 16px;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color); background: #f8f9fa; font-weight: bold; color: var(--deep-blue);">
                            <th style="padding: 10px 6px; text-align: left;">비교 항목</th>
                            <th style="padding: 10px 6px; color: var(--primary-blue);">${nameA}</th>
                            <th style="padding: 10px 6px; color: var(--success-green);">${nameB}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 8px 6px; text-align: left; font-weight: 500;">🏫 대상 학교 수</td>
                            <td style="padding: 8px 6px; font-weight: bold;">${statsA.count}개교</td>
                            <td style="padding: 8px 6px; font-weight: bold;">${statsB.count}개교</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 8px 6px; text-align: left; font-weight: 500;">📊 학업성취도 평균</td>
                            <td style="padding: 8px 6px; font-weight: bold; color: var(--primary-blue);">${statsA.avg}점</td>
                            <td style="padding: 8px 6px; font-weight: bold; color: var(--success-green);">${statsB.avg}점</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color); background: #fdfaf2;">
                            <td style="padding: 8px 6px; text-align: left; font-weight: 600; color: #b7791f;">🎯 자녀 예상 백분위</td>
                            <td style="padding: 8px 6px; font-weight: bold; color: var(--primary-blue);">상위 ${percentileA.toFixed(1)}%</td>
                            <td style="padding: 8px 6px; font-weight: bold; color: var(--success-green);">상위 ${percentileB.toFixed(1)}%</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color); background: #f3fbf3;">
                            <td style="padding: 8px 6px; text-align: left; font-weight: 600; color: #2e7d32;">✨ 종합 면학 분위기</td>
                            <td style="padding: 8px 6px; font-weight: bold; color: var(--primary-blue);">${atmosphereA}점 / 100</td>
                            <td style="padding: 8px 6px; font-weight: bold; color: var(--success-green);">${atmosphereB}점 / 100</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 8px 6px; text-align: left; font-weight: 500;">🧑‍🏫 학급 평균 학생수</td>
                            <td style="padding: 8px 6px;">${statsA.classSize}명</td>
                            <td style="padding: 8px 6px;">${statsB.classSize}명</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 8px 6px; text-align: left; font-weight: 500;">💰 평균 창체 예산</td>
                            <td style="padding: 8px 6px;">${statsA.budget}만원</td>
                            <td style="padding: 8px 6px;">${statsB.budget}만원</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 8px 6px; text-align: left; font-weight: 500;">🛡️ 평균 학교폭력 발생</td>
                            <td style="padding: 8px 6px; color: ${statsA.violence > 3 ? 'var(--danger-red)' : '#2e7d32'};">${statsA.violence}건/년</td>
                            <td style="padding: 8px 6px; color: ${statsB.violence > 3 ? 'var(--danger-red)' : '#2e7d32'};">${statsB.violence}건/년</td>
                        </tr>
                    </tbody>
                </table>

                <!-- 자녀 위치 비교 시각화 바 -->
                <div style="background: #f8f9fa; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                    <strong style="font-size: 12px; color: var(--deep-blue); display: block; margin-bottom: 8px;">📊 자녀 가상 위치 비교 (상위 %가 낮을수록 우수)</strong>
                    <div style="margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
                            <span>${nameA} (상위 ${percentileA.toFixed(1)}%)</span>
                        </div>
                        <div style="background: #e9ecef; height: 10px; border-radius: 5px; overflow: hidden;">
                            <div style="background: var(--primary-blue); width: ${100 - percentileA}%; height: 100%;"></div>
                        </div>
                    </div>
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
                            <span>${nameB} (상위 ${percentileB.toFixed(1)}%)</span>
                        </div>
                        <div style="background: #e9ecef; height: 10px; border-radius: 5px; overflow: hidden;">
                            <div style="background: var(--success-green); width: ${100 - percentileB}%; height: 100%;"></div>
                        </div>
                    </div>
                </div>

                <div style="padding: 12px; background: #fff9db; border-radius: 8px; font-size: 11.5px; color: #856404; line-height: 1.5; border-left: 4px solid #ffe066;">
                    <strong>💡 학군 이사 종합 조언:</strong><br>
                    • <strong>자녀 성적 변화</strong>: 현재 자녀의 내신 수준(${childScore}점) 기준, <strong>${percentileA < percentileB ? nameA : nameB}</strong> 지역으로 이사할 경우 상대적 백분위가 더 우수할 것(상위 ${Math.min(percentileA, percentileB).toFixed(1)}%)으로 예측되어 내신 관리 경쟁에서 보다 유리할 수 있습니다.<br>
                    • <strong>면학 분위기</strong>: 종합 면학 분위기 지수는 <strong>${atmosphereA > atmosphereB ? nameA : nameB}</strong>(평균 ${Math.max(atmosphereA, atmosphereB)}점) 지역이 상대적으로 우수하게 형성되어 있습니다.<br>
                    • <strong>학급 과밀도</strong>: ${Math.abs(statsA.classSize - statsB.classSize) > 2
                        ? `학급당 학생 수는 <strong>${statsA.classSize > statsB.classSize ? nameA : nameB}</strong>가 더 과밀한 편이므로 참고하세요.`
                        : '두 지역의 학급당 평균 학생 수 및 교육환경 리스크는 유사한 수준입니다.'
                    }
                </div>
            `;
        });
    }

    const handleReset = () => {
        const defaults = {
            'currentLevelRange': 80,
            'targetLevelRange': 90,
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
            'dongRatingCheckbox': false
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

        // Reset region and school type select options
        if (regionFilter) regionFilter.value = '서울특별시';
        if (schoolTypeFilter) schoolTypeFilter.value = 'middle';

        // Clear commute radius/marker
        commuteCenter = null;
        updateCommuteCircle();

        // Clear selected school details (simulate clicking deselect button)
        const btnDeselectSchool = document.getElementById('btnDeselectSchool');
        if (btnDeselectSchool) {
            btnDeselectSchool.click();
        } else {
            orchestrator.state.selectedSchool = null;
            if (schoolCard) schoolCard.style.display = 'none';
            if (childFormCard) childFormCard.style.display = 'none';
            if (diagnosisResultCard) diagnosisResultCard.style.display = 'none';
            if (welcomeCard) welcomeCard.style.display = 'block';
        }

        // Close accordion if open
        const parentsFilterContent = document.getElementById('parentsFilterContent');
        const parentsFilterIndicator = document.getElementById('parentsFilterIndicator');
        if (parentsFilterContent && parentsFilterIndicator) {
            parentsFilterContent.style.display = 'none';
            parentsFilterIndicator.innerText = '▼';
        }

        // Reset map view using local variable in scope
        if (kakaoMap) {
            kakaoMap.setCenter(new kakao.maps.LatLng(37.4979, 127.0276));
            kakaoMap.setLevel(5);
        }

        onMapAction();
        alert('필터 설정과 탐색 프리셋이 모두 초기화되었습니다.');
    };

    const btnResetPreset = document.getElementById('btnResetPreset');
    if (btnResetPreset) {
        btnResetPreset.addEventListener('click', handleReset);
    }
    const btnResetFilters = document.getElementById('btnResetFilters');
    if (btnResetFilters) {
        btnResetFilters.addEventListener('click', handleReset);
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
    const sidebarContent = document.getElementById('sidebarContent');
    if (sidebarContent) sidebarContent.style.display = 'none';
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

        // Open accordion
        const parentsFilterContent = document.getElementById('parentsFilterContent');
        const parentsFilterIndicator = document.getElementById('parentsFilterIndicator');
        if (parentsFilterContent && parentsFilterIndicator) {
            parentsFilterContent.style.display = 'flex';
            parentsFilterIndicator.innerText = '▲';
        }
        
        if (window.kakaoMapInstance) {
            window.kakaoMapInstance.setLevel(6);
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
        if (favs.length === 0) {
            if (favContainer) favContainer.style.display = 'none';
        } else {
            if (favContainer) favContainer.style.display = 'block';
            if (favList) {
                favList.innerHTML = '';
                favs.forEach(school => {
                    const btn = document.createElement('button');
                    btn.style.cssText = 'padding: 8px 12px; font-size: 12px; font-weight: 600; text-align: left; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; color: var(--deep-blue); display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;';
                    btn.innerHTML = `<span>🏫 ${school.name} (${school.type})</span><span style="font-size:10px; color:var(--text-muted);">이동 ➔</span>`;
                    
                    btn.onmouseover = () => btn.style.borderColor = 'var(--primary-blue)';
                    btn.onmouseout = () => btn.style.borderColor = 'var(--border-color)';
                    
                    btn.onclick = () => {
                        window.selectSchoolById(school.id);
                    };
                    
                    favList.appendChild(btn);
                });
            }
        }
    };

    // Globally expose toggleFavoriteSchool for inline HTML onclick handler
    window.toggleFavoriteSchool = () => {
        const btn = document.getElementById('btnSaveFavorite');
        if (!orchestrator.state.selectedSchool) {
            alert('저장할 학교를 선택해 주세요.');
            return;
        }
        const school = orchestrator.state.selectedSchool;
        const favs = JSON.parse(localStorage.getItem('favoriteSchools') || '[]');
        
        const exists = favs.some(f => f.id === school.school_id);
        if (exists) {
            // Remove if already exists (toggle)
            const filtered = favs.filter(f => f.id !== school.school_id);
            localStorage.setItem('favoriteSchools', JSON.stringify(filtered));
            if (btn) {
                btn.innerHTML = '⭐';
                btn.title = '관심 학교 저장';
            }
            alert(`${school.school_name}이(가) 관심 학교에서 제거되었습니다.`);
        } else {
            favs.push({ id: school.school_id, name: school.school_name, type: school.school_type });
            localStorage.setItem('favoriteSchools', JSON.stringify(favs));
            if (btn) {
                btn.innerHTML = '🌟';
                btn.title = '관심 학교 저장됨';
            }
            alert(`${school.school_name}이(가) 관심 학교로 등록되었습니다.`);
        }
        updateFavUI();
    };

    // Observe changes to update Save Favorite Button state
    const originalSelectSchool = orchestrator.selectSchool;
    orchestrator.selectSchool = function(school) {
        const res = originalSelectSchool.call(orchestrator, school);
        setTimeout(() => {
            const favs = JSON.parse(localStorage.getItem('favoriteSchools') || '[]');
            const exists = favs.some(f => f.id === school.school_id);
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
            if (typeof drawEstateTrendGraph === 'function') drawEstateTrendGraph(school);
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
            if (typeof clearMapLayers === 'function') clearMapLayers();
            if (schoolCard) schoolCard.style.display = 'none';
            if (childFormCard) childFormCard.style.display = 'none';
            if (diagnosisResultCard) diagnosisResultCard.style.display = 'none';
            if (welcomeCard) welcomeCard.style.display = 'block';
            
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
                        }
                    }
                })
                .catch(err => {
                    console.error('[Safe Commute API] OSRM 라우팅 호출 실패, 백업 격자 경로를 그립니다:', err);
                    const pathCoordinates = [
                        startPoint,
                        new kakao.maps.LatLng(startLat, lng),
                        endPoint
                    ];
                    drawCommutePath(pathCoordinates);
                });

            // 주변 안전 지킴이 시설(치안센터, 파출소, 아동보호시설 등) 검색 및 지도에 표시
            if (window.kakao && kakao.maps.services) {
                const ps = new kakao.maps.services.Places();
                
                // 1. 아동안전지킴이집 검색 및 마커 표시
                ps.keywordSearch('아동안전지킴이집', (result, status) => {
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
                    }
                }, {
                    location: endPoint,
                    radius: 800
                });
            }
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
            
            // 아동안전지킴이집 2000m 검색
            ps.keywordSearch('아동안전지킴이집', (result, status) => {
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
    };

    window.updateCrimeZoneLayers = function(school) {
        initGroundOverlayPolyfill(); // 지도가 다 로드된 시점에 안전하게 폴리필 적용
        clearCrimeZoneLayers();
        if (!window.kakaoMapInstance) return;

        const chk = document.getElementById('crimeZoneToggleCheckbox');
        if (!chk || !chk.checked) {
            return;
        }

        // 범례 플로팅 가이드 바 노출
        const legendBar = document.getElementById('crimeZoneLegendFloatingBar');
        if (legendBar) legendBar.style.display = 'flex';

        if (window.kakaoMapInstance.getLevel() >= 7) {
            return;
        }

        // 현재 카카오맵의 영역(bounds) 획득
        const bounds = window.kakaoMapInstance.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        // WMS API는 EPSG:4326(WGS84 위경도) 형식을 필요로 함 (경도,위도,경도,위도)
        const bbox = `${sw.getLng()},${sw.getLat()},${ne.getLng()},${ne.getLat()}`;

        // 카카오맵 컨테이너의 가로/세로 픽셀 사이즈 획득
        const mapNode = window.kakaoMapInstance.getNode();
        const width = mapNode.offsetWidth || 500;
        const height = mapNode.offsetHeight || 500;

        // 백엔드 프록시 API 호출 URL
        const imageUrl = `/api/crime-zones?bbox=${encodeURIComponent(bbox)}&width=${width}&height=${height}`;

        // 카카오맵 GroundOverlay 생성 및 지도 표시
        crimeZoneOverlay = new kakao.maps.GroundOverlay(imageUrl, bounds);
        crimeZoneOverlay.setMap(window.kakaoMapInstance);
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
        
        clearMapLayers();
        if (typeof window.updatePointSelectorButtons === 'function') {
            window.updatePointSelectorButtons();
        }
    }
    window.resetSafeCommute = resetSafeCommute;

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

        if (type === 'commute') {
            if (cPath) cPath.checked = checked;
            if (cPathAca) cPathAca.checked = checked;
            if (panel) panel.style.display = checked ? 'flex' : 'none';
            if (panelAca) panelAca.style.display = checked ? 'flex' : 'none';
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
        }
    });

    // 출발지 및 초기화 버튼 동작 리스너 등록
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-set-start')) {
            window.mapClickMode = window.mapClickMode === 'setStart' ? 'none' : 'setStart';
            window.updatePointSelectorButtons();
        } else if (e.target.classList.contains('btn-reset-commute')) {
            window.customCommuteStart = null;
            window.customCommuteEnd = null;
            window.mapClickMode = 'none';
            if (orchestrator.state.selectedSchool) {
                window.updateMapLayers(orchestrator.state.selectedSchool);
            }
            window.updatePointSelectorButtons();
        } else if (e.target.id === 'tabAcademyReviews') {
            const tabRev = document.getElementById('tabAcademyReviews');
            const tabCalc = document.getElementById('tabAcademyCalculator');
            const secRev = document.getElementById('sectionAcademyReviews');
            const secCalc = document.getElementById('sectionAcademyCalculator');
            if (tabRev && tabCalc && secRev && secCalc) {
                tabRev.style.borderBottomColor = 'var(--primary-blue)';
                tabRev.style.color = 'var(--primary-blue)';
                tabCalc.style.borderBottomColor = 'transparent';
                tabCalc.style.color = 'var(--text-muted)';
                secRev.style.display = 'block';
                secCalc.style.display = 'none';
            }
        } else if (e.target.id === 'tabAcademyCalculator') {
            const tabRev = document.getElementById('tabAcademyReviews');
            const tabCalc = document.getElementById('tabAcademyCalculator');
            const secRev = document.getElementById('sectionAcademyReviews');
            const secCalc = document.getElementById('sectionAcademyCalculator');
            if (tabRev && tabCalc && secRev && secCalc) {
                tabRev.style.borderBottomColor = 'transparent';
                tabRev.style.color = 'var(--text-muted)';
                tabCalc.style.borderBottomColor = 'var(--primary-blue)';
                tabCalc.style.color = 'var(--primary-blue)';
                secRev.style.display = 'none';
                secCalc.style.display = 'block';
            }
        }
    });

    // 2. 부동산 가격 추이 그래프 및 관심단지 알림
    function showCustomAlert(title, message) {
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

    function drawEstateTrendGraph(school) {
        const svg = document.getElementById('estateTrendGraph');
        if (!svg) return;
        svg.innerHTML = '';

        const seed = school.school_id ? school.school_id.charCodeAt(school.school_id.length - 1) : 5;
        const basePrice = 8 + (seed % 12);
        const data = [
            basePrice - 1.2 - (seed % 2) * 0.3,
            basePrice - 0.5 + (seed % 3) * 0.2,
            basePrice
        ];

        const width = svg.clientWidth || 300;
        const height = 80;
        const padding = 20;

        const points = data.map((val, idx) => {
            const x = padding + (idx / 2) * (width - padding * 2);
            const minVal = basePrice - 2.0;
            const maxVal = basePrice + 1.0;
            const y = height - padding - ((val - minVal) / (maxVal - minVal)) * (height - padding * 2);
            return { x, y, val };
        });

        let pathD = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            pathD += ` L ${points[i].x} ${points[i].y}`;
        }

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'var(--success-green)');
        path.setAttribute('stroke-width', '2.5');
        svg.appendChild(path);

        const years = ['3년 전', '1년 전', '현재'];
        points.forEach((pt, idx) => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pt.x);
            circle.setAttribute('cy', pt.y);
            circle.setAttribute('r', '4');
            circle.setAttribute('fill', 'var(--success-green)');
            svg.appendChild(circle);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', pt.x);
            text.setAttribute('y', pt.y - 6);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '10px');
            text.setAttribute('fill', 'var(--text-main)');
            text.setAttribute('font-weight', 'bold');
            text.textContent = `${pt.val.toFixed(1)}억`;
            svg.appendChild(text);

            const yearText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            yearText.setAttribute('x', pt.x);
            yearText.setAttribute('y', height - 2);
            yearText.setAttribute('text-anchor', 'middle');
            yearText.setAttribute('font-size', '9px');
            yearText.setAttribute('fill', 'var(--text-muted)');
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
    window.renderAcademyFeeCalculator = function(acadName, subject) {
        const calculatorContent = document.getElementById('calculatorContent');
        if (!calculatorContent) return;

        const seed = acadName.charCodeAt(0) + (acadName.charCodeAt(acadName.length - 1) || 0);
        const originalFee = 250000 + (seed % 21) * 10000;
        const avgFee = 320000;
        
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
            <div style="font-weight: bold; font-size: 13px; color: var(--deep-blue); margin-bottom: 4px;">${acadName}</div>
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
                💡 <strong>산출 근거:</strong> 기본금 250,000원 + 학원별 가중 가변액(${(seed % 21) * 10000}원)
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
});
