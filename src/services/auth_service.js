/**
 * LearnMap User Authentication Service Engine
 * 
 * 회원가입, 로그인, 로그인 상태 관리 및 세션 보안 관리를 담당하는 전용 서비스입니다.
 */

export class AuthService {
    constructor() {
        this.userStorageKey = 'learnmap_current_user';
        this.usersDbKey = 'learnmap_registered_users';
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
     * 회원 가입
     */
    register({ email, password, name, role = 'parent' }) {
        if (!email || !password || !name) {
            return { success: false, message: '모든 필수 입력 항목을 채워주세요.' };
        }

        let users = [];
        try {
            users = JSON.parse(localStorage.getItem(this.usersDbKey) || '[]');
        } catch (e) {
            users = [];
        }

        const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
            return { success: false, message: '이미 등록된 이메일 계정입니다. 로그인해 주세요.' };
        }

        const newUser = {
            id: 'user_' + Date.now(),
            email: email.trim(),
            password: password,
            name: name.trim(),
            role: role,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        try {
            localStorage.setItem(this.usersDbKey, JSON.stringify(users));
        } catch (e) {
            console.error('Failed to save user to local storage', e);
        }

        // 회원가입 성공 시 세션 저장 및 즉시 로그인 처리
        const sessionUser = { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role };
        try {
            localStorage.setItem(this.userStorageKey, JSON.stringify(sessionUser));
        } catch (e) {}

        return { success: true, user: sessionUser, message: '회원가입이 성공적으로 완료되었습니다!' };
    }

    /**
     * 사용자 로그인
     */
    login(email, password) {
        if (!email || !password) {
            return { success: false, message: '이메일과 비밀번호를 입력해 주세요.' };
        }

        let users = [];
        try {
            users = JSON.parse(localStorage.getItem(this.usersDbKey) || '[]');
        } catch (e) {
            users = [];
        }

        // 디폴트 로컬 체험 계정 생성 (test@learnmap.com / 1234)
        if (email === 'test@learnmap.com' && password === '1234' && !users.find(u => u.email === email)) {
            const defaultUser = {
                id: 'user_test_default',
                email: 'test@learnmap.com',
                password: '1234',
                name: '학부모 회원',
                role: 'parent',
                createdAt: new Date().toISOString()
            };
            users.push(defaultUser);
            try {
                localStorage.setItem(this.usersDbKey, JSON.stringify(users));
            } catch (e) {}
        }

        const target = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
        if (!target) {
            return { success: false, message: '이메일 또는 비밀번호가 일치하지 않습니다.' };
        }

        const sessionUser = { id: target.id, email: target.email, name: target.name, role: target.role };
        try {
            localStorage.setItem(this.userStorageKey, JSON.stringify(sessionUser));
        } catch (e) {}

        return { success: true, user: sessionUser, message: `${target.name}님 환영합니다!` };
    }

    /**
     * 카카오 1초 간편 로그인
     */
    kakaoLogin() {
        const kakaoUser = {
            id: 'user_kakao_' + Date.now(),
            email: 'kakao_user@kakao.com',
            name: '카카오 학부모 회원',
            role: 'parent',
            provider: 'kakao',
            createdAt: new Date().toISOString()
        };
        try {
            localStorage.setItem(this.userStorageKey, JSON.stringify(kakaoUser));
        } catch (e) {}
        return { success: true, user: kakaoUser, message: '🟡 카카오 간편 로그인에 성공하였습니다!' };
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
