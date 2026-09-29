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

