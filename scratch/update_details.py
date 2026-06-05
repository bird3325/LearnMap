import os

filepath = 'app.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Define calculateSchoolSuitability, getActiveChildProfile, closeInquiryCard, refreshSelectedSchoolDetails
helper_code = """
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

    window.closeInquiryCard = function(cardId) {
        document.getElementById(cardId).style.display = 'none';
        document.getElementById('settingsModal').style.display = 'block';
        
        // 이전 선택되었던 카드 복구
        const isSchoolSelected = orchestrator && orchestrator.state && orchestrator.state.selectedSchool;
        if (isSchoolSelected) {
            document.getElementById('schoolCard').style.display = 'block';
            document.getElementById('welcomeCard').style.display = 'none';
        } else {
            document.getElementById('welcomeCard').style.display = 'block';
            document.getElementById('schoolCard').style.display = 'none';
        }
    };

    window.refreshSelectedSchoolDetails = function() {
        if (orchestrator && orchestrator.state && orchestrator.state.selectedSchool) {
            const summary = orchestrator.analysisAgent.getSchoolSummary(orchestrator.state.selectedSchool);
            showSchoolDetails(summary, orchestrator.state.selectedSchool);
        }
    };
"""

# Insert helpers at the top of DOMContentLoaded or right before showSchoolDetails
content = content.replace("function showSchoolDetails(summary, fullSchool) {", helper_code + "\n    function showSchoolDetails(summary, fullSchool) {")

# 2. Modify showSchoolDetails innerHTML to include suitability
target_insight = """            schoolInsight.innerHTML = `<div style="font-weight: 800; color: var(--primary-blue); margin-bottom: 6px;">📍 서울시 전체 중 상위 ${percentRank}% 수준</div>
                                       <div>${summary.insight}</div>
                                       <div style="margin-top: 4px; font-weight: 500;">${trendSummary}</div>`;"""

replacement_insight = """            // Calculate suitability
            const profile = getActiveChildProfile();
            const suitability = calculateSchoolSuitability(fullSchool, profile);
            
            let suitabilityHTML = '';
            if (suitability.score > 0) {
                suitabilityHTML = `
                    <div style="margin-top: 10px; padding: 10.5px; background: ${suitability.score >= 70 ? '#e8f5e9' : '#fff3e0'}; border-radius: 8px; border-left: 4px solid ${suitability.score >= 70 ? 'var(--success-green)' : 'var(--warning-yellow)'};">
                        <strong style="color: var(--deep-blue); font-weight: 800; font-size: 12.5px;">🎯 우리 아이 맞춤 적합도: <span style="color: ${suitability.score >= 70 ? 'var(--success-green)' : '#ef6c00'}; font-weight: bold;">${suitability.score}점 (${suitability.level})</span></strong>
                        <div style="font-size: 11px; margin-top: 5px; color: var(--text-main); line-height: 1.4;">${suitability.desc}</div>
                        ${suitability.warning ? `<div style="font-size: 11px; margin-top: 5px; color: #ef6c00; font-weight: bold;">${suitability.warning}</div>` : ''}
                    </div>
                `;
            }

            schoolInsight.innerHTML = `<div style="font-weight: 800; color: var(--primary-blue); margin-bottom: 6px;">📍 서울시 전체 중 상위 ${percentRank}% 수준</div>
                                       <div>${summary.insight}</div>
                                       <div style="margin-top: 4px; font-weight: 500;">${trendSummary}</div>
                                       ${suitabilityHTML}`;"""

content = content.replace(target_insight, replacement_insight)

# 3. Add change event listeners for filters to refresh SelectedSchoolDetails
bind_refresh_events = """
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
"""

# Place it inside the DOMContentLoaded setup area
content = content.replace("bindRangeText('filterMaxViolence', 'valMaxViolence', '건');", "bindRangeText('filterMaxViolence', 'valMaxViolence', '건');" + bind_refresh_events)

# 4. Update populateComparisonTable in app.js
target_table_rows = """        const rows = [
            { label: '🧑‍🎓 학생 수', key: 'student_count' },
            { label: '🏫 학급 평균 규모', key: 'class_avg_size' },
            { label: '📖 국어 평균점', key: 'korean_avg', suffix: '점' },
            { label: '🇬🇧 영어 평균점', key: 'english_avg', suffix: '점' },
            { label: '📐 수학 평균점', key: 'math_avg', suffix: '점' },
            { label: '⚖️ 가중 평균점', key: 'weightedAvg', suffix: '점' },
            { label: '🎯 강점 교과', key: 'strong_subject' },
            { label: '💰 창체 활동비', key: 'extracurricular_budget', suffix: '만원' },
            { label: '🛡️ 학교폭력 발생 건수', key: 'violence_stats', callback: (val) => val ? `${val.total_cases}건` : '0건' },
            { label: '🏫 종합 교육환경 점수', key: 'envScore', suffix: '점' },"""

replacement_table_rows = """        const rows = [
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
            { label: '🏫 종합 교육환경 점수', key: 'envScore', suffix: '점' },"""

content = content.replace(target_table_rows, replacement_table_rows)

# 5. Update renderComparisonBoard card grid (compareGrid details)
target_card_grid = """                <div style="font-size:12px;margin-bottom:5px;">⚖️ 가중 평균 점수: <strong>${weightedAvgLabel}</strong></div>
                <div style="font-size:12px;margin-bottom:5px;">🎯 강점 과목: <strong>${item.strong_subject}</strong></div>
                <div style="font-size:12px;margin-bottom:5px;">💰 창체 활동비: <strong>${item.extracurricular_budget}만원</strong></div>"""

replacement_card_grid = """                <div style="font-size:12px;margin-bottom:5px;">⚖️ 가중 평균 점수: <strong>${weightedAvgLabel}</strong></div>
                <div style="font-size:12px;margin-bottom:5px;">🎯 강점 과목: <strong>${item.strong_subject}</strong></div>
                <div style="font-size:12px;margin-bottom:5px;">🏠 평균 매매가: <strong style="color:var(--success-green);">${item.housing_sale}</strong></div>
                <div style="font-size:12px;margin-bottom:5px;">🔑 평균 전세가: <strong style="color:var(--success-green);">${item.housing_jeonse}</strong></div>
                <div style="font-size:12px;margin-bottom:5px;">📚 주변 학원 수: <strong>${item.academy_count_est}개</strong></div>
                <div style="font-size:12px;margin-bottom:5px;">💰 창체 활동비: <strong>${item.extracurricular_budget}만원</strong></div>"""

content = content.replace(target_card_grid, replacement_card_grid)

# 6. Update submission success redirects
content = content.replace(
    """                    // 웰컴 카드로 이동
                    document.getElementById('academyRegisterCard').style.display = 'none';
                    document.getElementById('welcomeCard').style.display = 'block';""",
    """                    // 웰컴 카드로 이동
                    if (typeof window.closeInquiryCard === 'function') {
                        window.closeInquiryCard('academyRegisterCard');
                    } else {
                        document.getElementById('academyRegisterCard').style.display = 'none';
                        document.getElementById('welcomeCard').style.display = 'block';
                    }"""
)

content = content.replace(
    """                    document.getElementById('infoEditRequestCard').style.display = 'none';
                    document.getElementById('welcomeCard').style.display = 'block';""",
    """                    if (typeof window.closeInquiryCard === 'function') {
                        window.closeInquiryCard('infoEditRequestCard');
                    } else {
                        document.getElementById('infoEditRequestCard').style.display = 'none';
                        document.getElementById('welcomeCard').style.display = 'block';
                    }"""
)

content = content.replace(
    """                    document.getElementById('adInquiryCard').style.display = 'none';
                    document.getElementById('welcomeCard').style.display = 'block';""",
    """                    if (typeof window.closeInquiryCard === 'function') {
                        window.closeInquiryCard('adInquiryCard');
                    } else {
                        document.getElementById('adInquiryCard').style.display = 'none';
                        document.getElementById('welcomeCard').style.display = 'block';
                    }"""
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Success: App.js suitability, comparisons and inquiry handlers updated successfully")
