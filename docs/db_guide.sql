-- Safehome 학부모 맞춤 서비스 고도화 - Supabase DDL 가이드
-- 아래 SQL 쿼리를 Supabase SQL Editor에 실행하여 필수 테이블을 생성해 주세요.

-- 1. 자녀 프로필 테이블 (child_profiles)
CREATE TABLE IF NOT EXISTS public.child_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    grade TEXT NOT NULL DEFAULT 'm2',
    korean INTEGER NOT NULL DEFAULT 0,
    english INTEGER NOT NULL DEFAULT 0,
    math INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) 설정 (개발 편의를 위해 전체 허용 설정)
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.child_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.child_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.child_profiles FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.child_profiles FOR DELETE USING (true);


-- 2. 관심 학교 메모 및 순위 테이블 (favorite_school_notes)
CREATE TABLE IF NOT EXISTS public.favorite_school_notes (
    school_id TEXT PRIMARY KEY,
    priority INTEGER NOT NULL DEFAULT 3, -- 1: 1순위, 2: 2순위, 3: 관심 등록
    memo TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.favorite_school_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.favorite_school_notes FOR SELECT USING (true);
CREATE POLICY "Allow public upsert access" ON public.favorite_school_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.favorite_school_notes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.favorite_school_notes FOR DELETE USING (true);


-- 3. 잘못된 정보 수정 요청 테이블 (info_edit_requests)
CREATE TABLE IF NOT EXISTS public.info_edit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_name TEXT NOT NULL,
    details TEXT NOT NULL,
    contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.info_edit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.info_edit_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.info_edit_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.info_edit_requests FOR DELETE USING (true);


-- 4. 광고 및 제휴 문의 테이블 (ad_inquiries)
CREATE TABLE IF NOT EXISTS public.ad_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    contact TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ad_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.ad_inquiries FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.ad_inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.ad_inquiries FOR DELETE USING (true);


-- 5. 학원 정보 신규 등록 요청 테이블 (academy_registration_requests)
CREATE TABLE IF NOT EXISTS public.academy_registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_name TEXT NOT NULL,
    address TEXT NOT NULL,
    academy_type TEXT NOT NULL,
    contact TEXT,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.academy_registration_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.academy_registration_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.academy_registration_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.academy_registration_requests FOR DELETE USING (true);


-- 6. 회원 기본 정보 테이블 (users) 및 RLS 보안 해제
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'parent' CHECK (role IN ('parent', 'student', 'admin')),
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 기존 users 테이블에 신규 프로필 컬럼 추가 (마이그레이션 구문)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS nickname VARCHAR(50),
ADD COLUMN IF NOT EXISTS postcode VARCHAR(20),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS address_detail TEXT;

-- RLS 비활성화 (익명 회원가입 및 로그인 저장 즉시 허용)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;


-- 7. 학군 이사 시뮬레이션 보관함 테이블 (simulation_scraps)
-- 사용자가 '시뮬레이션 담기'를 실행한 학군 비교 분석 결과를 저장/동기화합니다.
CREATE TABLE IF NOT EXISTS public.simulation_scraps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    region_a TEXT NOT NULL,
    region_b TEXT NOT NULL,
    name_a TEXT,
    name_b TEXT,
    sido_a TEXT,
    gugun_a TEXT,
    dong_a TEXT,
    sido_b TEXT,
    gugun_b TEXT,
    dong_b TEXT,
    school_type TEXT NOT NULL DEFAULT '중학교',
    price_a TEXT,
    price_b TEXT,
    price_save_text TEXT,
    score_a NUMERIC,
    score_b NUMERIC,
    percentile_a NUMERIC,
    percentile_b NUMERIC,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.simulation_scraps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.simulation_scraps FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.simulation_scraps FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.simulation_scraps FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.simulation_scraps FOR DELETE USING (true);

-- 7. 블로그 & 학군 칼럼 테이블 (blog_posts)
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE,
    title TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT '학군 분석',        -- 카테고리 (학군 분석, 입시 정보, 학군지 부동산, 학교생활, 내신·성적관리, 진로·진학, 돌봄·방과후, 통학·안전, 교육정책·공시, 사교육·학원비, 학습법, 건강·생활습관, 서비스 소식)
    summary TEXT,
    content TEXT NOT NULL,
    thumbnail TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    author VARCHAR(100) DEFAULT '학업여지도 리서치팀',
    author_role VARCHAR(100) DEFAULT '수석연구원',
    read_time VARCHAR(30) DEFAULT '4분',
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    related_schools JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 blog_posts 테이블에 images 컬럼 마이그레이션
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts (category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON public.blog_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_views ON public.blog_posts (views DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_is_published ON public.blog_posts (is_published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON public.blog_posts USING gin (tags);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow anon full access for blog management" ON public.blog_posts;

CREATE POLICY "Public can view published blog posts"
    ON public.blog_posts FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');

CREATE POLICY "Allow anon full access for blog management"
    ON public.blog_posts FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.blog_posts TO anon;
GRANT ALL ON TABLE public.blog_posts TO authenticated;
GRANT ALL ON TABLE public.blog_posts TO service_role;



-- 8. 사업자 및 파트너스 학원 프로필 테이블 (business_partners)
-- 학원 상세 프로필, 대표 로고/썸네일 및 학원 시설 전경 갤러리 사진 정보를 관리합니다.
CREATE TABLE IF NOT EXISTS public.business_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_number VARCHAR(20) NOT NULL UNIQUE,
    business_name VARCHAR(100) NOT NULL,
    representative_name VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'academy' CHECK (type IN ('academy', 'real_estate')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    phone VARCHAR(20),
    address TEXT,
    address_detail TEXT,
    academy_profile JSONB DEFAULT '{}'::jsonb,
    -- academy_profile 내부 JSONB 구조:
    --   logo_url: TEXT (학원 대표 로고 또는 썸네일 이미지 URL)
    --   photos: JSONB Array (강의실, 자습실, 로비 등 시설 사진 URL 배열 / FREE: 0장, BASIC: 3장, PRO/TEAM: 최대 10장)
    --   headline: TEXT (학원 한 줄 소개)
    --   description: TEXT (학원 상세 소개글)
    --   subjects: TEXT[] / JSONB (대표 교육 과목)
    --   grades: TEXT[] / JSONB (교육 대상 학년)
    --   class_method: TEXT (지도 방식 및 특징)
    --   website_url / blog_url / instagram_url / kakao_url: TEXT (온라인 채널)
    --   membership_plan: VARCHAR(30) (현재 활성 멤버십 플랜: free | basic | pro | team)
    --   membership_plan_name: VARCHAR(50) (플랜 표시 명칭: 학원 FREE | 학원 BASIC | 학원 PRO | 학원 TEAM)
    --   is_premium: BOOLEAN (유료 프리미엄 구독 활성 여부)
    real_estate_profile JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE public.business_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access for business_partners" ON public.business_partners FOR SELECT USING (true);
CREATE POLICY "Allow anon full access for business_partners" ON public.business_partners FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.business_partners TO anon;
GRANT ALL ON TABLE public.business_partners TO authenticated;
GRANT ALL ON TABLE public.business_partners TO service_role;



-- 9. 사업자 유료 구독 관리 테이블 (subscriptions)
-- 관리자 직권 구독 변경 및 실제 결제 플로우에서 생성/동기화되는 구독 상태를 관리합니다.
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id VARCHAR(50) PRIMARY KEY, -- 예: sub_1793517706455_adm
    business_id UUID REFERENCES public.business_partners(id) ON DELETE CASCADE,
    business_number VARCHAR(20) NOT NULL,
    plan_id VARCHAR(50) NOT NULL, -- academy_basic | academy_pro | academy_team | free | realestate_basic | realestate_premium
    plan_name VARCHAR(100) NOT NULL, -- 학원 BASIC | 학원 PRO | 학원 TEAM 등
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'free')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- 구독 종료/갱신 예정 일시 (보통 시작일로부터 30일)
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    price INTEGER NOT NULL DEFAULT 0,
    created_by VARCHAR(50) DEFAULT 'user', -- 'user' (사용자 결제) | 'admin' (관리자 직권 변경)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access for subscriptions" ON public.subscriptions FOR SELECT USING (true);
CREATE POLICY "Allow anon full access for subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.subscriptions TO anon;
GRANT ALL ON TABLE public.subscriptions TO authenticated;
GRANT ALL ON TABLE public.subscriptions TO service_role;



-- 10. 결제 내역 및 트랜잭션 기록 테이블 (partner_payments)
-- 실제 사용자 결제 및 관리자 직권 유료 구독 변경 시 실제 결제와 동일하게 생성되는 결제 트랜잭션 기록입니다.
CREATE TABLE IF NOT EXISTS public.partner_payments (
    id VARCHAR(50) PRIMARY KEY, -- 예: pay_1793517706571_3nig
    subscription_id VARCHAR(50) REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    business_id UUID REFERENCES public.business_partners(id) ON DELETE CASCADE,
    business_number VARCHAR(20) NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'KRW',
    payment_method VARCHAR(50) DEFAULT 'admin_grant', -- card | transfer | admin_grant (관리자 직권 부여)
    status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'failed', 'refunded', 'free_change')),
    plan_name VARCHAR(100) NOT NULL,
    memo TEXT, -- 관리자 변경 사유 또는 결제 메모
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.partner_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access for partner_payments" ON public.partner_payments FOR SELECT USING (true);
CREATE POLICY "Allow anon full access for partner_payments" ON public.partner_payments FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.partner_payments TO anon;
GRANT ALL ON TABLE public.partner_payments TO authenticated;
GRANT ALL ON TABLE public.partner_payments TO service_role;

