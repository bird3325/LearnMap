import http from 'http';

function request(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, headers: res.headers, body });
                }
            });
        });
        req.on('error', reject);
        if (data) {
            req.write(typeof data === 'string' ? data : JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log('--- [LearnMap PRD v1.0 Business Model API Test] ---');

    // 1. 세션 조회
    try {
        const res = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/business/session',
            method: 'GET'
        });
        console.log('1. GET /api/business/session:', res.statusCode === 200 ? 'SUCCESS' : 'FAILED', res.body?.business?.name || res.statusCode);
    } catch (e) {
        console.log('1. GET /api/business/session: FAILED (Port 5000 down?) ->', e.message);
    }

    // 2. 상품 목록 조회
    try {
        const res = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/products',
            method: 'GET'
        });
        console.log('2. GET /api/products:', res.statusCode === 200 ? 'SUCCESS' : 'FAILED', 'Products count:', Array.isArray(res.body) ? res.body.length : 0);
    } catch (e) {
        console.log('2. GET /api/products: FAILED ->', e.message);
    }

    // 3. 관리자 사업자 목록
    try {
        const res = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/admin/businesses',
            method: 'GET'
        });
        console.log('3. GET /api/admin/businesses:', res.statusCode === 200 ? 'SUCCESS' : 'FAILED', 'Total:', res.body?.total, 'Pending:', res.body?.submittedCount);
    } catch (e) {
        console.log('3. GET /api/admin/businesses: FAILED ->', e.message);
    }

    // 4. 관리자 구독 목록
    try {
        const res = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/admin/subscriptions',
            method: 'GET'
        });
        console.log('4. GET /api/admin/subscriptions:', res.statusCode === 200 ? 'SUCCESS' : 'FAILED', 'MRR:', res.body?.mrr, 'Active:', res.body?.activeCount);
    } catch (e) {
        console.log('4. GET /api/admin/subscriptions: FAILED ->', e.message);
    }

    // 5. 프리미엄 활성 학원 조회 (지도용)
    try {
        const res = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/academies/premium',
            method: 'GET'
        });
        console.log('5. GET /api/academies/premium:', res.statusCode === 200 ? 'SUCCESS' : 'FAILED', 'Premium academies:', Array.isArray(res.body) ? res.body.map(a => a.name) : 0);
    } catch (e) {
        console.log('5. GET /api/academies/premium: FAILED ->', e.message);
    }

    // 6. 분석 이벤트 로깅 테스트
    try {
        const res = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/analytics/event',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            eventType: 'profile_view',
            businessId: 'biz_demo_daechi_math_01',
            metadata: { source: 'test_script' }
        });
        console.log('6. POST /api/analytics/event:', res.statusCode === 200 ? 'SUCCESS' : 'FAILED', res.body);
    } catch (e) {
        console.log('6. POST /api/analytics/event: FAILED ->', e.message);
    }

    // 7. 학부모 상담 문의 접수 테스트
    try {
        const res = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/inquiries',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            targetBusinessId: 'biz_demo_daechi_math_01',
            targetAcademyName: '대치 탑클래스 수학학원',
            parentName: '테스트학부모',
            parentPhone: '010-1234-5678',
            studentGrade: '중학교 3학년',
            inquiryContent: '특목고 대비반 상담 신청합니다.',
            consentAgreed: true
        });
        console.log('7. POST /api/inquiries:', res.statusCode === 200 ? 'SUCCESS' : 'FAILED', res.body?.message);
    } catch (e) {
        console.log('7. POST /api/inquiries: FAILED ->', e.message);
    }

    // 8. 사업자 대시보드 통계 조회 테스트
    try {
        const res = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/business/dashboard?businessId=biz_demo_daechi_math_01',
            method: 'GET'
        });
        console.log('8. GET /api/business/dashboard:', res.statusCode === 200 ? 'SUCCESS' : 'FAILED', 'Views:', res.body?.stats?.profile_views, 'Inquiries:', res.body?.inquiries?.length);
    } catch (e) {
        console.log('8. GET /api/business/dashboard: FAILED ->', e.message);
    }

    console.log('--- [Test Completed] ---');
}

runTests();
