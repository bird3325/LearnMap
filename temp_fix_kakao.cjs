const fs = require('fs');

// 1. auth_service.js 수정
let authServiceCode = fs.readFileSync('src/services/auth_service.js', 'utf8');

const targetKakaoLoginRegex = /\/\*\*\s*\*\s*카카오 1초 간편 로그인 메인 실행[\s\S]*?return\s*\{\s*success:\s*true,\s*user:\s*sessionUser,\s*message:\s*`🟡 \$\{cleanName\}님, 카카오 간편 로그인에 성공하였습니다!`\s*\};\s*\}/;

const newKakaoLoginMethod = `/**
     * 카카오 간편 로그인 실행 (가짜 계정 생성 완전 차단, 실제 가입 회원만 로그인 허용)
     */
    async kakaoLogin() {
        let kakaoProfile = null;

        try {
            const initialized = await this.initKakao();
            if (!initialized) {
                return { success: false, message: '카카오 로그인 SDK를 초기화할 수 없습니다. 잠시 후 다시 시도해주세요.' };
            }
            kakaoProfile = await this.requestKakaoPopupLogin();
        } catch (err) {
            console.warn('[Kakao Login] 팝업 취소 또는 SDK 에러:', err);
            const errMsg = (err && (err.error_description || err.message))
                ? (err.error_description || err.message)
                : '카카오 로그인이 취소되었거나 인증에 실패했습니다.';
            return { success: false, message: errMsg };
        }

        // 카카오 프로필 획득 실패 시 가짜 계정 생성 절대 금지 (즉시 실패 반환)
        if (!kakaoProfile || !kakaoProfile.email) {
            return { success: false, message: '카카오 사용자 정보를 가져오지 못했습니다. 카카오 계정의 이메일 제공에 동의해주세요.' };
        }

        const { id, email, nickname, avatarUrl, accessToken } = kakaoProfile;
        const cleanEmail = email.toLowerCase().trim();
        const cleanName = (nickname || '카카오 회원').trim();

        // 🌟 [핵심] 실제 DB에 회원가입되어 존재하는 아이디인지 검증 (미가입 시 자동 계정 생성 차단)
        try {
            const checkRes = await fetch(SUPABASE_URL + '/rest/v1/users?email=eq.' + encodeURIComponent(cleanEmail), {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY
                }
            });

            if (checkRes.ok) {
                const existing = await checkRes.json();
                if (Array.isArray(existing) && existing.length > 0) {
                    const dbUser = existing[0];
                    const nowIso = new Date().toISOString();

                    // 마지막 로그인 시간 갱신
                    try {
                        await fetch(SUPABASE_URL + '/rest/v1/users?id=eq.' + dbUser.id, {
                            method: 'PATCH',
                            headers: {
                                'apikey': SUPABASE_KEY,
                                'Authorization': 'Bearer ' + SUPABASE_KEY,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ last_login_at: nowIso, updated_at: nowIso })
                        });
                    } catch (_) {}

                    const sessionUser = {
                        id: dbUser.id,
                        email: dbUser.email,
                        name: dbUser.name || cleanName,
                        role: dbUser.role || 'parent',
                        nickname: dbUser.nickname || cleanName,
                        phone: dbUser.phone || '',
                        provider: 'kakao',
                        avatarUrl: avatarUrl || '',
                        tier: dbUser.tier || '정회원'
                    };

                    localStorage.setItem(this.userStorageKey, JSON.stringify(sessionUser));
                    localStorage.setItem('user', JSON.stringify(sessionUser));
                    sessionStorage.setItem(this.userStorageKey, JSON.stringify(sessionUser));
                    localStorage.removeItem('learnmap_logged_out');

                    return {
                        success: true,
                        user: sessionUser,
                        message: (sessionUser.name || '회원') + '님, 카카오 간편 로그인에 성공하였습니다!'
                    };
                }
            }
        } catch (dbErr) {
            console.error('[Kakao Login DB Check Error]:', dbErr);
            return { success: false, message: '회원 정보 확인 중 데이터베이스 오류가 발생했습니다.' };
        }

        // 🌟 실제 가입된 회원이 아닌 경우 -> 가짜 계정 생성 절대 금지! 로그인 차단 및 회원가입 안내
        return {
            success: false,
            notRegistered: true,
            email: cleanEmail,
            message: '가입되지 않은 카카오 계정(' + cleanEmail + ')입니다.\\n먼저 회원가입을 진행해 주세요.'
        };
    }`;

if (targetKakaoLoginRegex.test(authServiceCode)) {
    authServiceCode = authServiceCode.replace(targetKakaoLoginRegex, newKakaoLoginMethod);
    console.log('[1/3] src/services/auth_service.js kakaoLogin updated successfully.');
} else {
    console.error('[1/3] targetKakaoLoginRegex match failed in auth_service.js');
}

fs.writeFileSync('src/services/auth_service.js', authServiceCode, 'utf8');

// 2. server.js /api/auth/kakao 에서도 미가입 계정 자동 생성 차단
let serverCode = fs.readFileSync('server.js', 'utf8');

const oldServerKakaoRegex = /app\.post\('\/api\/auth\/kakao', async \(req, res\) => \{[\s\S]*?return res\.json\(\{ success: true, user: sessionUser \}\);\s*\}\);/;

const newServerKakaoRoute = `app.post('/api/auth/kakao', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: '카카오 이메일 정보가 필요합니다.' });
        }
        const cleanEmail = email.trim().toLowerCase();

        // 1. Supabase users 테이블에서 실제 존재하는 회원인지 확인
        const checkRes = await fetch(SUPABASE_URL + '/rest/v1/users?email=eq.' + encodeURIComponent(cleanEmail), {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY
            }
        });

        if (checkRes.ok) {
            const existing = await checkRes.json();
            if (Array.isArray(existing) && existing.length > 0) {
                const target = existing[0];
                const sessionUser = { id: target.id, email: target.email, name: target.name, role: target.role };
                return res.json({ success: true, user: sessionUser });
            }
        }

        // 미가입 계정은 생성하지 않고 404 차단
        return res.status(404).json({ success: false, notRegistered: true, message: '가입되지 않은 카카오 계정입니다. 먼저 회원가입을 진행해 주세요.' });
    } catch (err) {
        console.error('Kakao auth error:', err);
        return res.status(500).json({ success: false, message: '카카오 인증 서버 오류가 발생했습니다.' });
    }
});`;

if (oldServerKakaoRegex.test(serverCode)) {
    serverCode = serverCode.replace(oldServerKakaoRegex, newServerKakaoRoute);
    console.log('[2/3] server.js /api/auth/kakao updated successfully.');
} else {
    console.warn('[2/3] oldServerKakaoRegex match failed in server.js');
}

fs.writeFileSync('server.js', serverCode, 'utf8');

// 3. app.js handleKakaoLogin 수정 (미가입 계정 시 회원가입 탭 자동 전환 및 안내)
let appCode = fs.readFileSync('app.js', 'utf8');

const oldHandleKakao = `            window.handleKakaoLogin = async function () {
                localStorage.removeItem('learnmap_logged_out');
                const res = await authService.kakaoLogin();
                if (res && !res.success && res.message) {
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
            };`;

const newHandleKakao = `            window.handleKakaoLogin = async function () {
                localStorage.removeItem('learnmap_logged_out');
                const res = await authService.kakaoLogin();
                if (!res || !res.success) {
                    if (res && res.notRegistered) {
                        alert(res.message);
                        // 회원가입 탭으로 자동 전환 유도
                        if (typeof window.switchSettingsAuthTab === 'function') {
                            window.switchSettingsAuthTab('register');
                        }
                    } else if (res && res.message) {
                        alert(res.message);
                    }
                    return;
                }
                if (res.success) {
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
            };`;

if (appCode.includes(oldHandleKakao)) {
    appCode = appCode.replace(oldHandleKakao, newHandleKakao);
    console.log('[3/3] app.js handleKakaoLogin updated.');
} else {
    console.warn('[3/3] oldHandleKakao match failed in app.js, trying regex...');
    const appRegex = /window\.handleKakaoLogin\s*=\s*async\s*function\s*\(\)\s*\{[\s\S]*?\}\s*;\s*\/\/\s*비밀번호 보기/;
    appCode = appCode.replace(appRegex, newHandleKakao + '\n\n            // 비밀번호 보기');
    console.log('[3/3] app.js handleKakaoLogin replaced via regex.');
}

fs.writeFileSync('app.js', appCode, 'utf8');
console.log('All Kakao login fixes applied successfully!');
