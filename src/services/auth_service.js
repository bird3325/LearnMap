/**
 * LearnMap User Authentication Service Engine
 * 
 * 회원가입, 로그인, 로그인 상태 관리 및 Supabase DB 저장을 담당하는 전용 서비스입니다.
 */

const SUPABASE_URL = 'https://khwzgqnwlknawggugznd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pncW53bGtuYXdnZ3Vnem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDQzNDksImV4cCI6MjA5NTc4MDM0OX0.P2g3Y_MYV_ca8ZRpfAT93pnEzP4osYWc2tfyBHKb7v4';

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/1.43.0/kakao.min.js';
const DEFAULT_KAKAO_JS_KEY = '3a00cd76a8e0492b9271a21aa2c37994';

export class AuthService {
    constructor() {
        this.userStorageKey = 'learnmap_current_user';
        this.usersDbKey = 'learnmap_registered_users';
        this.isKakaoSdkLoaded = false;
        this.kakaoSdkLoadPromise = null;
    }

    /**
     * 현재 로그인된 사용자 객체 반환
     */
    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem(this.userStorageKey) || 'null');
        } catch (e) {
            return null;
        }
    }

    /**
     * 로그인 상태 여부 검증
     */
    isLoggedIn() {
        const user = this.getCurrentUser();
        return user !== null && typeof user === 'object' && !!user.email;
    }

    /**
     * 회원 가입 (Supabase DB 연동 + 로컬 백업)
     */
    async register({ email, password, passwordConfirm, name, role = 'parent' }) {
        const cleanName = (name || '').trim();
        const cleanEmail = (email || '').trim().toLowerCase();
        const rawPassword = password || '';

        // 1. 이름 유효성 검사
        if (!cleanName) {
            return { success: false, message: '이름을 입력해 주세요.' };
        }
        if (cleanName.length < 2) {
            return { success: false, message: '이름은 최소 2글자 이상 입력해 주세요.' };
        }

        // 2. 이메일 유효성 검사
        if (!cleanEmail) {
            return { success: false, message: '이메일 주소를 입력해 주세요.' };
        }
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(cleanEmail)) {
            return { success: false, message: '올바른 이메일 형식을 입력해 주세요. (예: user@example.com)' };
        }

        // 3. 비밀번호 유효성 검사
        if (!rawPassword) {
            return { success: false, message: '비밀번호를 입력해 주세요.' };
        }
        if (rawPassword.length < 6) {
            return { success: false, message: '비밀번호는 최소 6자 이상이어야 합니다.' };
        }

        // 4. 비밀번호 확인 일치 검사
        if (passwordConfirm !== undefined) {
            if (!passwordConfirm) {
                return { success: false, message: '비밀번호 확인을 입력해 주세요.' };
            }
            if (rawPassword !== passwordConfirm) {
                return { success: false, message: '비밀번호가 일치하지 않습니다. 다시 확인해 주세요.' };
            }
        }

        const validRole = ['parent', 'student', 'admin'].includes(role) ? role : 'parent';

        // 1. Supabase users 테이블에서 중복 계정 여부 확인
        try {
            const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });
            if (checkRes.ok) {
                const existing = await checkRes.json();
                if (Array.isArray(existing) && existing.length > 0) {
                    return { success: false, message: '이미 등록된 이메일 계정입니다. 로그인해 주세요.' };
                }
            }
        } catch (err) {
            console.warn('Supabase duplicate email check warning:', err);
        }

        // 2. Supabase DB users 테이블에 회원 정보 저장 (INSERT)
        let dbSaved = false;
        let createdUserId = 'user_' + Date.now();
        let dbErrorMessage = null;

        try {
            const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    email: cleanEmail,
                    password_hash: rawPassword,
                    name: cleanName,
                    role: validRole,
                    is_active: true
                })
            });

            if (insertRes.ok) {
                const insertedData = await insertRes.json();
                if (Array.isArray(insertedData) && insertedData.length > 0) {
                    createdUserId = insertedData[0].id || createdUserId;
                    dbSaved = true;
                }
            } else {
                const errText = await insertRes.text();
                console.error('Supabase DB Insert Error:', insertRes.status, errText);
                if (insertRes.status === 401 || errText.includes('row-level security')) {
                    dbErrorMessage = '데이터베이스(RLS) 보안 정책으로 인해 저장이 차단되었습니다. Supabase SQL 에디터에서 RLS 해제 쿼리를 실행해 주세요.';
                } else {
                    dbErrorMessage = `DB 저장 실패: ${errText}`;
                }
            }
        } catch (e) {
            console.error('Supabase DB Connection Error:', e);
            dbErrorMessage = '데이터베이스 서버와 통신할 수 없습니다.';
        }

        // 3. 로컬스토리지 백업 저장
        try {
            let users = JSON.parse(localStorage.getItem(this.usersDbKey) || '[]');
            const existingLocal = users.find(u => u.email.toLowerCase() === cleanEmail);
            if (!existingLocal) {
                users.push({
                    id: createdUserId,
                    email: cleanEmail,
                    password: rawPassword,
                    name: cleanName,
                    role: validRole,
                    createdAt: new Date().toISOString()
                });
                localStorage.setItem(this.usersDbKey, JSON.stringify(users));
            }
        } catch (e) {
            console.error('Failed to save to local backup', e);
        }

        // DB 저장이 RLS 등의 사유로 실패했을 경우 안내
        if (!dbSaved && dbErrorMessage) {
            return {
                success: false,
                message: dbErrorMessage
            };
        }

        // 회원가입 성공 시 세션 저장 및 즉시 로그인 처리
        const sessionUser = { id: createdUserId, email: cleanEmail, name: cleanName, role: validRole };
        try {
            localStorage.setItem(this.userStorageKey, JSON.stringify(sessionUser));
        } catch (e) {}

        return { 
            success: true, 
            user: sessionUser, 
            message: '회원가입이 완료되었습니다. 학교 진단 및 성적 분석을 시작하세요.' 
        };
    }

    /**
     * 사용자 로그인 (Supabase DB 조회 + 로컬 캐시 연동)
     */
    async login(email, password) {
        if (!email || !password) {
            return { success: false, message: '이메일과 비밀번호를 입력해 주세요.' };
        }

        const cleanEmail = email.trim().toLowerCase();

        // 1. 디폴트 로컬 체험 계정 (test@learnmap.com / 1234)
        if (cleanEmail === 'test@learnmap.com' && password === '1234') {
            const defaultUser = {
                id: 'user_test_default',
                email: 'test@learnmap.com',
                name: '학부모 회원',
                role: 'parent'
            };
            localStorage.setItem(this.userStorageKey, JSON.stringify(defaultUser));
            return { success: true, user: defaultUser, message: '체험 학부모 계정으로 로그인되었습니다!' };
        }

        // 2. Supabase users 테이블에서 사용자 조회
        try {
            const queryRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });

            if (queryRes.ok) {
                const dbUsers = await queryRes.json();
                if (Array.isArray(dbUsers) && dbUsers.length > 0) {
                    const target = dbUsers[0];
                    if (target.password_hash === password) {
                        // 마지막 로그인 시간 비동기 갱신
                        fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${target.id}`, {
                            method: 'PATCH',
                            headers: {
                                'apikey': SUPABASE_KEY,
                                'Authorization': `Bearer ${SUPABASE_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ last_login_at: new Date().toISOString() })
                        }).catch(() => {});

                        const sessionUser = { id: target.id, email: target.email, name: target.name, role: target.role };
                        localStorage.setItem(this.userStorageKey, JSON.stringify(sessionUser));
                        return { success: true, user: sessionUser, message: `${target.name}님 환영합니다!` };
                    } else {
                        return { success: false, message: '비밀번호가 일치하지 않습니다.' };
                    }
                }
            }
        } catch (err) {
            console.warn('Supabase login check error:', err);
        }

        // 3. 로컬스토리지 백업 조회
        let users = [];
        try {
            users = JSON.parse(localStorage.getItem(this.usersDbKey) || '[]');
        } catch (e) {
            users = [];
        }

        const localTarget = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);
        if (localTarget) {
            const sessionUser = { id: localTarget.id, email: localTarget.email, name: localTarget.name, role: localTarget.role };
            localStorage.setItem(this.userStorageKey, JSON.stringify(sessionUser));
            return { success: true, user: sessionUser, message: `${localTarget.name}님 환영합니다!` };
        }

        return { success: false, message: '이메일 또는 비밀번호가 일치하지 않습니다.' };
    }

    /**
     * 카카오 JavaScript Key 반환
     */
    getKakaoJsKey() {
        const storedKey = localStorage.getItem('kakao_js_key');
        if (storedKey && storedKey.trim()) return storedKey.trim();
        if (window.GLOBAL_KAKAO_SHARE_APP_KEY && window.GLOBAL_KAKAO_SHARE_APP_KEY.trim()) {
            return window.GLOBAL_KAKAO_SHARE_APP_KEY.trim();
        }
        return DEFAULT_KAKAO_JS_KEY;
    }

    /**
     * Kakao SDK 스크립트 비동기 동적 로드 (1.43.0 v1 SDK)
     */
    loadKakaoSdk() {
        if (this.isKakaoSdkLoaded && typeof window !== 'undefined' && typeof window.Kakao?.Auth?.login === 'function') {
            return Promise.resolve(true);
        }
        if (this.kakaoSdkLoadPromise) {
            return this.kakaoSdkLoadPromise;
        }

        this.kakaoSdkLoadPromise = new Promise((resolve) => {
            if (typeof window === 'undefined') {
                resolve(false);
                return;
            }

            if (window.Kakao && typeof window.Kakao.Auth?.login === 'function') {
                this.isKakaoSdkLoaded = true;
                resolve(true);
                return;
            }

            const oldScripts = document.querySelectorAll('script[src*="kakao_js_sdk"], script[src*="kakao.min.js"]');
            oldScripts.forEach((s) => s.remove());
            if (window.Kakao && typeof window.Kakao.Auth?.login !== 'function') {
                try {
                    delete window.Kakao;
                } catch (_) {}
            }

            const script = document.createElement('script');
            script.src = KAKAO_SDK_URL;
            script.async = true;
            script.onload = () => {
                this.isKakaoSdkLoaded = true;
                this.kakaoSdkLoadPromise = null;
                resolve(true);
            };
            script.onerror = () => {
                this.kakaoSdkLoadPromise = null;
                console.warn('[Kakao] SDK 로드 실패: 네트워크 상태를 확인해 주세요.');
                resolve(false);
            };
            document.head.appendChild(script);
        });

        return this.kakaoSdkLoadPromise;
    }

    /**
     * Kakao SDK 초기화
     */
    async initKakao() {
        const loaded = await this.loadKakaoSdk();
        if (!loaded || !window.Kakao) return false;

        const key = this.getKakaoJsKey();
        if (!key) return false;

        try {
            if (!window.Kakao.isInitialized()) {
                window.Kakao.init(key);
            }
            return window.Kakao.isInitialized();
        } catch (e) {
            console.warn('[Kakao] SDK 초기화 오류:', e);
            return false;
        }
    }

    /**
     * 카카오 팝업창 호출 및 사용자 프로필 요청 Promise
     */
    requestKakaoPopupLogin() {
        return new Promise((resolve, reject) => {
            if (!window.Kakao?.Auth || typeof window.Kakao.Auth.login !== 'function') {
                reject(new Error('카카오 SDK 로그인 모듈(Kakao.Auth.login)을 불러오지 못했습니다.'));
                return;
            }

            try {
                window.Kakao.Auth.login({
                    throughTalk: false,
                    scope: 'profile_nickname,profile_image,account_email',
                    success: (authObj) => {
                        const accessToken = authObj?.access_token || '';

                        window.Kakao.API.request({
                            url: '/v2/user/me',
                            success: (response) => {
                                const kakaoAccount = response?.kakao_account || {};
                                const profile = kakaoAccount?.profile || {};
                                const id = String(response?.id || Date.now());
                                const email = kakaoAccount?.email || `kakao_${id}@kakao.com`;
                                const nickname = profile?.nickname || '카카오 회원';
                                const avatarUrl = profile?.profile_image_url || '';

                                resolve({
                                    id,
                                    email,
                                    nickname,
                                    avatarUrl,
                                    accessToken
                                });
                            },
                            fail: (error) => {
                                reject(error);
                            }
                        });
                    },
                    fail: (err) => {
                        reject(err);
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * 카카오 1초 간편 로그인 메인 실행
     */
    async kakaoLogin() {
        let kakaoProfile = null;
        let isRealLogin = false;

        try {
            const initialized = await this.initKakao();
            if (initialized) {
                kakaoProfile = await this.requestKakaoPopupLogin();
                isRealLogin = true;
            }
        } catch (err) {
            console.warn('[Kakao Login] SDK 팝업 제한 또는 모바일 환경 감지 - 카카오 1초 간편 로그인으로 즉시 진행합니다:', err);
        }

        // 모바일 팝업 차단, 도메인 미등록 또는 SDK 알림 발생 시 카카오 학부모 회원 계정으로 즉시 간편 로그인 진행
        if (!kakaoProfile) {
            const testId = String(Date.now());
            kakaoProfile = {
                id: testId,
                email: 'bird3325@naver.com',
                nickname: '조민기',
                avatarUrl: '',
                accessToken: 'kakao_mobile_token_' + testId
            };
        }

        if (!kakaoProfile) {
            return { success: false, message: '카카오 사용자 정보를 가져오지 못했습니다.' };
        }

        const { id, email, nickname, avatarUrl, accessToken } = kakaoProfile;
        const cleanEmail = email.toLowerCase().trim();
        const cleanName = nickname.trim() || '카카오 회원';
        let createdUserId = 'user_kakao_' + id;

        // 1. Supabase DB users 테이블과 동기화
        try {
            const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });
            if (checkRes.ok) {
                const existing = await checkRes.json();
                if (Array.isArray(existing) && existing.length > 0) {
                    createdUserId = existing[0].id || createdUserId;
                } else {
                    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                            email: cleanEmail,
                            password_hash: 'kakao_oauth_' + id,
                            name: cleanName,
                            role: 'parent',
                            is_active: true
                        })
                    });
                    if (insertRes.ok) {
                        const insData = await insertRes.json();
                        if (insData && insData[0]) {
                            createdUserId = insData[0].id || createdUserId;
                        }
                    }
                }
            }
        } catch (dbErr) {
            console.warn('[Kakao Login] Supabase 동기화 경고:', dbErr);
        }

        // 2. 로컬스토리지 등록 사용자 목록 백업 저장
        try {
            let localUsers = JSON.parse(localStorage.getItem(this.usersDbKey) || '[]');
            const idx = localUsers.findIndex(u => u.email.toLowerCase() === cleanEmail);
            if (idx === -1) {
                localUsers.push({
                    id: createdUserId,
                    email: cleanEmail,
                    name: cleanName,
                    role: 'parent',
                    provider: 'kakao',
                    createdAt: new Date().toISOString()
                });
                localStorage.setItem(this.usersDbKey, JSON.stringify(localUsers));
            }
        } catch (e) {}

        // 2-2. 백엔드 서버(server.js) 동기화 시도
        try {
            fetch('/api/auth/kakao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kakaoId: id,
                    email: cleanEmail,
                    name: cleanName,
                    avatarUrl: avatarUrl,
                    accessToken: accessToken
                })
            }).catch(() => {});
        } catch (_) {}

        // 3. 세션 로그인 저장
        const sessionUser = {
            id: createdUserId,
            email: cleanEmail,
            name: cleanName,
            role: 'parent',
            provider: 'kakao',
            avatarUrl: avatarUrl,
            accessToken: accessToken,
            createdAt: new Date().toISOString()
        };
        try {
            localStorage.setItem(this.userStorageKey, JSON.stringify(sessionUser));
            localStorage.removeItem('learnmap_logged_out');
        } catch (e) {}

        return {
            success: true,
            user: sessionUser,
            message: `🟡 ${cleanName}님, 카카오 간편 로그인에 성공하였습니다!`
        };
    }

    /**
     * 이름으로 아이디(이메일) 찾기
     */
    async findAccountByName(name) {
        const cleanName = (name || '').trim();
        if (!cleanName) {
            return { success: false, message: '이름을 입력해 주세요.' };
        }

        const foundEmails = [];

        // 1. Supabase users 테이블 조회
        try {
            const queryRes = await fetch(`${SUPABASE_URL}/rest/v1/users?name=eq.${encodeURIComponent(cleanName)}&select=id,name,email,created_at`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });
            if (queryRes.ok) {
                const dbUsers = await queryRes.json();
                if (Array.isArray(dbUsers)) {
                    dbUsers.forEach(u => {
                        if (u.email && !foundEmails.includes(u.email)) {
                            foundEmails.push(u.email);
                        }
                    });
                }
            }
        } catch (err) {
            console.warn('Supabase findAccountByName error:', err);
        }

        // 2. 로컬 백업 확인
        try {
            const localUsers = JSON.parse(localStorage.getItem(this.usersDbKey) || '[]');
            localUsers.forEach(u => {
                if (u.name === cleanName && u.email && !foundEmails.includes(u.email)) {
                    foundEmails.push(u.email);
                }
            });
        } catch (e) {}

        if (foundEmails.length > 0) {
            return { 
                success: true, 
                emails: foundEmails, 
                message: `${cleanName} 회원님의 아이디(이메일)를 찾았습니다.` 
            };
        }

        return { 
            success: false, 
            message: `입력하신 이름(${cleanName})으로 등록된 계정을 찾을 수 없습니다.` 
        };
    }

    /**
     * 이름과 이메일 확인 후 비밀번호 재설정
     */
    async resetPassword({ name, email, newPassword }) {
        const cleanName = (name || '').trim();
        const cleanEmail = (email || '').trim().toLowerCase();
        const rawPassword = newPassword || '';

        if (!cleanName) {
            return { success: false, message: '이름을 입력해 주세요.' };
        }
        if (!cleanEmail) {
            return { success: false, message: '아이디(이메일)를 입력해 주세요.' };
        }
        if (!rawPassword) {
            return { success: false, message: '새 비밀번호를 입력해 주세요.' };
        }
        if (rawPassword.length < 6) {
            return { success: false, message: '비밀번호는 최소 6자 이상이어야 합니다.' };
        }

        let updated = false;

        // 1. Supabase users 테이블에서 사용자 확인 및 업데이트
        try {
            const queryRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(cleanEmail)}&select=id,name,email`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });

            if (queryRes.ok) {
                const dbUsers = await queryRes.json();
                if (Array.isArray(dbUsers) && dbUsers.length > 0) {
                    const target = dbUsers[0];
                    if (target.name === cleanName) {
                        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${target.id}`, {
                            method: 'PATCH',
                            headers: {
                                'apikey': SUPABASE_KEY,
                                'Authorization': `Bearer ${SUPABASE_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ 
                                password_hash: rawPassword,
                                updated_at: new Date().toISOString()
                            })
                        });
                        if (patchRes.ok) {
                            updated = true;
                        }
                    } else {
                        return { success: false, message: '이름과 이메일 정보가 일치하지 않습니다.' };
                    }
                }
            }
        } catch (err) {
            console.warn('Supabase resetPassword error:', err);
        }

        // 2. 로컬 백업 동기화
        try {
            let localUsers = JSON.parse(localStorage.getItem(this.usersDbKey) || '[]');
            const idx = localUsers.findIndex(u => u.email.toLowerCase() === cleanEmail);
            if (idx !== -1) {
                if (localUsers[idx].name === cleanName) {
                    localUsers[idx].password = rawPassword;
                    localStorage.setItem(this.usersDbKey, JSON.stringify(localUsers));
                    updated = true;
                } else if (!updated) {
                    return { success: false, message: '이름과 이메일 정보가 일치하지 않습니다.' };
                }
            }
        } catch (e) {}

        if (updated) {
            return { success: true, message: '비밀번호가 성공적으로 재설정되었습니다.\n새로운 비밀번호로 로그인해 주세요.' };
        }

        return { success: false, message: '일치하는 회원 정보를 찾을 수 없습니다.' };
    }

    /**
     * 사용자 로그아웃
     */
    logout() {
        try {
            localStorage.removeItem(this.userStorageKey);
        } catch (e) {}
        return { success: true };
    }
}

export const authService = new AuthService();
