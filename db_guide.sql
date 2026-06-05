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
