-- ==============================================================================
-- 학업여지도 (LearnMap) 블로그 & 학군 칼럼 시스템 Supabase DDL & RLS 스크립트
-- ==============================================================================
-- 대상 데이터베이스: PostgreSQL (Supabase)
-- 실행 방법: Supabase 대시보드 -> SQL Editor -> New Query 붙여넣기 -> Run (실행)
-- ==============================================================================

-- 1. blog_posts 테이블 생성
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id TEXT PRIMARY KEY,                                      -- 고유 식별자 (예: 'post-1730160000000' 또는 uuid_generate_v4()::text)
    slug TEXT UNIQUE,                                         -- SEO 친화적 URL 슬러그 (기본값: id와 동일)
    title TEXT NOT NULL,                                      -- 칼럼 제목
    category VARCHAR(50) NOT NULL DEFAULT '학군 분석',        -- 카테고리 (학군 분석, 입시 정보, 학군지 부동산, 서비스 소식)
    summary TEXT,                                             -- 검색 결과 및 카드 목록용 간략 요약
    content TEXT NOT NULL,                                    -- 마크다운 형식 본문 내용
    thumbnail TEXT,                                           -- 대표 썸네일 이미지 URL 또는 SVG data URI
    images JSONB DEFAULT '[]'::jsonb,                         -- 본문 첨부 이미지 메타데이터 목록 (URL, 파일명, 원본명, 크기)
    tags JSONB DEFAULT '[]'::jsonb,                           -- 태그 목록 (예: ["강남학군", "특목고", "대치동"])
    author VARCHAR(100) DEFAULT '학업여지도 리서치팀',         -- 작성자 이름
    author_role VARCHAR(100) DEFAULT '수석연구원',             -- 작성자 직책/소속
    read_time VARCHAR(30) DEFAULT '4분',                      -- 예상 읽는 시간 (예: '3분', '5분')
    views INTEGER DEFAULT 0,                                  -- 누적 조회수
    likes INTEGER DEFAULT 0,                                  -- 누적 좋아요 수
    is_published BOOLEAN DEFAULT true,                        -- 사용자 공개 여부 (true: 발행, false: 임시저장)
    related_schools JSONB DEFAULT '[]'::jsonb,                -- 본문 연동 학교 목록 (예: [{"name": "대청중학교", "region": "서울 강남구"}])
    created_at TIMESTAMPTZ DEFAULT NOW(),                     -- 등록 일시
    updated_at TIMESTAMPTZ DEFAULT NOW()                      -- 수정 일시
);

-- [DB 마이그레이션] 이미 blog_posts 테이블이 생성되어 있는 경우 images 컬럼 추가
ALTER TABLE public.blog_posts 
    ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- 2. 고속 조회를 위한 B-Tree 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts (category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON public.blog_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_views ON public.blog_posts (views DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_is_published ON public.blog_posts (is_published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON public.blog_posts USING gin (tags);

-- 3. 수정 시 updated_at 자동 갱신 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER tr_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. 조회수 동시성 안전 증가 RPC 함수
CREATE OR REPLACE FUNCTION public.increment_blog_post_view(post_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    new_views INTEGER;
BEGIN
    UPDATE public.blog_posts
    SET views = views + 1
    WHERE id = post_id
    RETURNING views INTO new_views;

    RETURN new_views;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Row Level Security (RLS) 활성화 및 접근 제어 정책
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 있다면 삭제 후 재설정
DROP POLICY IF EXISTS "Public can view published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow anon full access for blog management" ON public.blog_posts;

-- 일반 사용자: 발행된(is_published = true) 글만 SELECT 가능
CREATE POLICY "Public can view published blog posts"
    ON public.blog_posts
    FOR SELECT
    USING (is_published = true OR auth.role() = 'authenticated');

-- 관리자 및 API 서버(anon/service role): 전체 작업(SELECT, INSERT, UPDATE, DELETE) 허용
CREATE POLICY "Allow anon full access for blog management"
    ON public.blog_posts
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. 권한 부여 (anon 및 authenticated)
GRANT ALL ON TABLE public.blog_posts TO anon;
GRANT ALL ON TABLE public.blog_posts TO authenticated;
GRANT ALL ON TABLE public.blog_posts TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_blog_post_view(TEXT) TO anon, authenticated, service_role;
