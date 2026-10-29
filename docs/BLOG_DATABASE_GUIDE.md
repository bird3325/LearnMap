# 학업여지도 블로그 & 학군 칼럼 데이터베이스 가이드 (Database Guide)

본 문서는 학업여지도(LearnMap)의 **블로그 및 학군 칼럼 시스템**을 위한 Supabase(PostgreSQL) 데이터베이스 구축, 테이블 스키마 명세, RLS 보안 정책 및 SQL 쿼리 가이드입니다.

---

## 1. 개요 및 아키텍처

* **데이터베이스**: PostgreSQL (호스팅: [Supabase](https://supabase.com))
* **연동 방식**:
  * Node.js / Express 백엔드 ([server.js](file:///d:/100%20shop/LearnMap/server.js))에서 Supabase PostgREST API를 통해 CRUD 수행
  * 네트워크 장애 또는 신규 환경 대응을 위해 로컬 JSON 캐시([src/data/blog_posts.json](file:///d:/100%20shop/LearnMap/src/data/blog_posts.json))와 이중화 안전 동기화
* **대상 테이블명**: `public.blog_posts`

---

## 2. 테이블 스키마 상세 명세 (`public.blog_posts`)

| 컬럼명 | 데이터 타입 | Null 허용 | 기본값 | 설명 및 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **`id`** | `TEXT` | ❌ NOT NULL | - | **기본키(PK)**. 고유 식별자 (`post-타임스탬프`) |
| **`slug`** | `TEXT` | ❌ NOT NULL | - | **고유값(UNIQUE)**. SEO 친화적 URL 슬러그 |
| **`title`** | `TEXT` | ❌ NOT NULL | - | 칼럼 제목 |
| **`category`** | `VARCHAR(50)` | ❌ NOT NULL | `'학군 분석'` | 카테고리 (`학군 분석`, `입시 정보`, `학군지 부동산`, `서비스 소식`) |
| **`summary`** | `TEXT` | ✔️ NULL 허용 | `''` | 2~3줄 요약문 (목록 및 SNS 프리뷰용) |
| **`content`** | `TEXT` | ❌ NOT NULL | - | 마크다운(Markdown) 본문 텍스트 |
| **`thumbnail`** | `TEXT` | ✔️ NULL 허용 | `''` | 대표 이미지 URL 또는 SVG data URI |
| **`images`** | `JSONB` | ✔️ NULL 허용 | `'[]'::jsonb` | 본문 첨부 이미지 메타데이터 목록 (`[{"url": "...", "name": "...", "size": 12345}]`) |
| **`tags`** | `JSONB` | ✔️ NULL 허용 | `'[]'::jsonb` | 검색 및 필터용 태그 배열 (`["대치동", "특목고"]`) |
| **`author`** | `VARCHAR(100)` | ✔️ NULL 허용 | `'학업여지도 리서치팀'` | 작성자명 |
| **`author_role`**| `VARCHAR(100)` | ✔️ NULL 허용 | `'수석연구원'` | 작성자 소속 및 직책 |
| **`read_time`** | `VARCHAR(30)` | ✔️ NULL 허용 | `'4분'` | 예상 독서 시간 |
| **`views`** | `INTEGER` | ❌ NOT NULL | `0` | 누적 조회수 |
| **`likes`** | `INTEGER` | ❌ NOT NULL | `0` | 누적 좋아요 수 |
| **`is_published`**| `BOOLEAN` | ❌ NOT NULL | `true` | 공개 여부 (`true`: 발행, `false`: 임시보관) |
| **`related_schools`** | `JSONB` | ✔️ NULL 허용 | `'[]'::jsonb` | 본문 내 연동 학교 목록 (`[{"name":"대청중학교"}]`) |
| **`created_at`**| `TIMESTAMPTZ` | ❌ NOT NULL | `NOW()` | 최초 생성 일시 |
| **`updated_at`**| `TIMESTAMPTZ` | ❌ NOT NULL | `NOW()` | 최종 수정 일시 (트리거로 자동 갱신) |

---

## 3. Supabase SQL 에디터 실행 가이드

Supabase 대시보드에서 테이블을 생성하려면 다음 3단계를 수행하세요:

1. [Supabase 대시보드](https://supabase.com/dashboard)에 로그인 후 해당 프로젝트를 선택합니다.
2. 좌측 메뉴에서 **SQL Editor** 아이콘을 클릭합니다.
3. **New query**를 누른 뒤, 아래의 **[4. 전체 DDL SQL 쿼리]** (또는 기존 테이블 보유 시 **[기존 테이블 마이그레이션 SQL]**)를 복사하여 붙여넣고 우측 하단의 **Run (실행)** 버튼을 클릭합니다.

> [!TIP]
> 프로젝트 루트의 [supabase_blog_posts.sql](file:///d:/100%20shop/LearnMap/supabase_blog_posts.sql) 파일에도 동일한 SQL 스크립트가 저장되어 있습니다.

---

## 4. 전체 DDL 및 정책 SQL 스크립트

```sql
-- 1. blog_posts 테이블 생성
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE,
    title TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT '학군 분석',
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

-- [DB 마이그레이션] 이미 blog_posts 테이블이 생성되어 있는 경우
ALTER TABLE public.blog_posts 
    ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- 2. 고속 조회를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts (category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON public.blog_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_views ON public.blog_posts (views DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_is_published ON public.blog_posts (is_published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON public.blog_posts USING gin (tags);

-- 3. 수정 시 updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.handle_blog_posts_updated_at()
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
    EXECUTE FUNCTION public.handle_blog_posts_updated_at();

-- 4. 조회수 안전 증가 RPC 함수
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

-- 5. Row Level Security (RLS) 활성화 및 권한 설정
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow anon full access for blog management" ON public.blog_posts;

-- 일반 사용자: 발행된 글(is_published = true)만 조회 가능
CREATE POLICY "Public can view published blog posts"
    ON public.blog_posts
    FOR SELECT
    USING (is_published = true OR auth.role() = 'authenticated');

-- 관리자 및 API 서버(anon/service role): CRUD 전체 권한 부여
CREATE POLICY "Allow anon full access for blog management"
    ON public.blog_posts
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 권한 부여
GRANT ALL ON TABLE public.blog_posts TO anon;
GRANT ALL ON TABLE public.blog_posts TO authenticated;
GRANT ALL ON TABLE public.blog_posts TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_blog_post_view(TEXT) TO anon, authenticated, service_role;
```

---

## 5. 주요 DML SQL 쿼리 예시

### ① 신규 칼럼 작성 (INSERT)
```sql
INSERT INTO public.blog_posts (
    id, slug, title, category, summary, content, tags, author, author_role, read_time, is_published
) VALUES (
    'post-' || floor(extract(epoch from now()) * 1000)::text,
    'gangnam-analysis-2026',
    '2026 강남·서초 학군 심층 리포트',
    '학군 분석',
    '강남 주요 중학교의 학업성취도 지표와 특목고 진학률 분석 요약입니다.',
    '## 1. 개요\n\n대치동과 반포동의 학업성취도 데이터를 비교 분석합니다...',
    '["강남학군", "특목고", "대치동"]'::jsonb,
    '학업여지도 리서치팀',
    '수석연구원',
    '4분',
    true
);
```

### ② 칼럼 목록 조회 (SELECT - 정렬 및 페이징)
```sql
-- 최신순 조회 (발행된 글만)
SELECT id, title, category, summary, thumbnail, author, views, likes, created_at
FROM public.blog_posts
WHERE is_published = true
ORDER BY created_at DESC
LIMIT 10 OFFSET 0;

-- 카테고리별 인기순 조회
SELECT id, title, views, likes
FROM public.blog_posts
WHERE is_published = true AND category = '학군 분석'
ORDER BY views DESC;
```

### ③ 칼럼 수정 (UPDATE)
```sql
UPDATE public.blog_posts
SET title = '수정된 칼럼 제목',
    summary = '수정된 요약 내용입니다.',
    is_published = true
WHERE id = 'post-1730160000000';
```

### ④ 칼럼 삭제 (DELETE)
```sql
DELETE FROM public.blog_posts
WHERE id = 'post-1730160000000';
```

---

## 6. 에디터 이미지 첨부 기능 지원 DB 마이그레이션 SQL

기존에 `blog_posts` 테이블을 이미 구축하여 운영 중인 경우, Supabase SQL Editor에서 아래 1줄의 ALTER TABLE 문을 실행하시면 기존 데이터를 100% 안전하게 보존하면서 이미지 첨부 메타데이터 저장이 가능합니다.

```sql
-- [필수] 이미지 첨부 컬럼 추가 (기존 데이터 보존)
ALTER TABLE public.blog_posts 
    ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- 컬럼 코멘트 등록 (선택)
COMMENT ON COLUMN public.blog_posts.images IS '본문 첨부 이미지 메타데이터 목록 (URL, 파일명, 원본명, 크기)';
```

