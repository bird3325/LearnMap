-- LearnMap User Authentication & NEIS MyData SQL Schema
-- Compatible with PostgreSQL, MySQL 8.0+, and Supabase SQL Editor

-- =========================================================================
-- 1. 회원 기본 정보 테이블 (users)
-- =========================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                                        -- 회원 고유 식별자 (UUID)
    email VARCHAR(255) NOT NULL UNIQUE,                                                  -- 로그인 이메일 계정 (아이디, 고유값)
    password_hash VARCHAR(255) NOT NULL,                                                 -- 단방향 암호화된 비밀번호 해시
    name VARCHAR(100) NOT NULL,                                                          -- 회원 성명
    role VARCHAR(20) NOT NULL DEFAULT 'parent' CHECK (role IN ('parent', 'student', 'admin')), -- 회원 구분 ('parent': 학부모, 'student': 학생, 'admin': 관리자)
    phone VARCHAR(20),                                                                   -- 연락처 전화번호
    is_active BOOLEAN NOT NULL DEFAULT TRUE,                                             -- 계정 활성화 상태 (TRUE: 정상, FALSE: 탈퇴/정지)
    last_login_at TIMESTAMP WITH TIME ZONE,                                              -- 마지막 로그인 일시
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,                       -- 회원가입 일시
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP                        -- 회원정보 최종 수정 일시
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- users 테이블 및 컬럼 코멘트 (PostgreSQL / Supabase 메타데이터 등록)
COMMENT ON TABLE users IS '회원 기본 정보 테이블';
COMMENT ON COLUMN users.id IS '회원 고유 식별자 (UUID, PK)';
COMMENT ON COLUMN users.email IS '로그인 이메일 계정 (아이디, 중복 불가)';
COMMENT ON COLUMN users.password_hash IS '단방향 암호화된 비밀번호 해시';
COMMENT ON COLUMN users.name IS '회원 성명';
COMMENT ON COLUMN users.role IS '회원 역할 구분 (parent: 학부모, student: 학생, admin: 관리자)';
COMMENT ON COLUMN users.phone IS '연락처 전화번호';
COMMENT ON COLUMN users.is_active IS '계정 활성화 상태 (TRUE: 사용 가능, FALSE: 비활성/탈퇴)';
COMMENT ON COLUMN users.last_login_at IS '마지막 로그인 일시';
COMMENT ON COLUMN users.created_at IS '회원가입 일시';
COMMENT ON COLUMN users.updated_at IS '회원정보 최종 수정 일시';


-- =========================================================================
-- 2. 자녀 나이스 마이데이터 연동 프로필 테이블 (user_neis_profiles)
-- =========================================================================
CREATE TABLE IF NOT EXISTS user_neis_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                                        -- 자녀 프로필 고유 식별자 (UUID)
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,                        -- 학부모 회원 고유 ID (users.id 외래키)
    student_name VARCHAR(100) NOT NULL,                                                  -- 자녀(학생) 성명
    school_name VARCHAR(150) NOT NULL,                                                   -- 재학 중이거나 배정/목표 학교명
    grade INT NOT NULL CHECK (grade BETWEEN 1 AND 6),                                    -- 학년 (초등 1~6학년, 중·고등 1~3학년)
    class_num INT DEFAULT 1,                                                             -- 학급 반 번호
    student_num INT DEFAULT 1,                                                           -- 학생 출석 번호
    target_major VARCHAR(150),                                                           -- 희망/목표 학과 및 정밀 학년 코드 (예: grade:e5)
    allergies JSONB DEFAULT '[]'::jsonb,                                                 -- 알레르기 유발 식품 정보 목록 (JSON 배열)
    is_connected BOOLEAN DEFAULT TRUE,                                                   -- 나이스(NEIS) 마이데이터 연동 상태 (TRUE: 연동됨)
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,                       -- 최근 나이스 데이터 동기화 일시
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,                       -- 자녀 정보 등록 일시
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP                        -- 자녀 정보 최종 수정 일시
);

CREATE INDEX IF NOT EXISTS idx_neis_profiles_user ON user_neis_profiles(user_id);

-- user_neis_profiles 테이블 및 컬럼 코멘트
COMMENT ON TABLE user_neis_profiles IS '자녀 나이스 마이데이터 연동 프로필 테이블';
COMMENT ON COLUMN user_neis_profiles.id IS '자녀 프로필 고유 식별자 (UUID, PK)';
COMMENT ON COLUMN user_neis_profiles.user_id IS '학부모 회원 고유 ID (users.id 외래키 참조)';
COMMENT ON COLUMN user_neis_profiles.student_name IS '자녀(학생) 성명';
COMMENT ON COLUMN user_neis_profiles.school_name IS '재학 중이거나 배정/목표 학교명';
COMMENT ON COLUMN user_neis_profiles.grade IS '학년 (초등 1~6학년, 중·고등 1~3학년)';
COMMENT ON COLUMN user_neis_profiles.class_num IS '학급 반 번호';
COMMENT ON COLUMN user_neis_profiles.student_num IS '학생 출석 번호';
COMMENT ON COLUMN user_neis_profiles.target_major IS '희망/목표 학과 및 정밀 학년 코드 (예: grade:e5)';
COMMENT ON COLUMN user_neis_profiles.allergies IS '급식 알레르기 유발 식품 목록 (JSONB 배열)';
COMMENT ON COLUMN user_neis_profiles.is_connected IS '나이스(NEIS) 마이데이터 연동 상태';
COMMENT ON COLUMN user_neis_profiles.synced_at IS '최근 나이스 동기화 일시';
COMMENT ON COLUMN user_neis_profiles.created_at IS '자녀 프로필 등록 일시';
COMMENT ON COLUMN user_neis_profiles.updated_at IS '자녀 프로필 최종 수정 일시';


-- =========================================================================
-- 3. 과목별 성적 및 지필/수행평가 테이블 (user_student_grades)
-- =========================================================================
CREATE TABLE IF NOT EXISTS user_student_grades (
    id BIGSERIAL PRIMARY KEY,                                                            -- 성적 레코드 고유 ID (자동 증가 번호)
    profile_id UUID NOT NULL REFERENCES user_neis_profiles(id) ON DELETE CASCADE,        -- 대상 자녀 ID (user_neis_profiles.id 외래키)
    semester VARCHAR(20) NOT NULL DEFAULT '2026-1',                                      -- 해당 학기 정보 (예: '2026-1')
    subject_name VARCHAR(50) NOT NULL,                                                   -- 교과목명 (국어, 수학, 영어, 사회, 과학 등)
    raw_score NUMERIC(5, 2) NOT NULL,                                                    -- 학생 취득 원점수 (100점 만점 기준)
    written_score NUMERIC(5, 2),                                                         -- 지필평가 점수 (중간/기말고사)
    perf_score NUMERIC(5, 2),                                                            -- 수행평가 점수
    school_avg NUMERIC(5, 2) NOT NULL,                                                   -- 해당 과목 학교/학년 전체 평균 점수
    std_dev NUMERIC(5, 2) NOT NULL,                                                      -- 해당 과목 표준편차
    achievement CHAR(1) CHECK (achievement IN ('A', 'B', 'C', 'D', 'E')),                -- 성취도 등급 (A, B, C, D, E)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP                        -- 성적 데이터 등록 일시
);

CREATE INDEX IF NOT EXISTS idx_student_grades_profile ON user_student_grades(profile_id);

-- user_student_grades 테이블 및 컬럼 코멘트
COMMENT ON TABLE user_student_grades IS '과목별 성적 및 지필/수행평가 테이블';
COMMENT ON COLUMN user_student_grades.id IS '성적 레코드 고유 ID (BIGSERIAL, PK)';
COMMENT ON COLUMN user_student_grades.profile_id IS '대상 자녀 프로필 고유 ID (user_neis_profiles.id 참조)';
COMMENT ON COLUMN user_student_grades.semester IS '해당 학기 정보 (예: 2026-1)';
COMMENT ON COLUMN user_student_grades.subject_name IS '교과목명 (국어, 수학, 영어 등)';
COMMENT ON COLUMN user_student_grades.raw_score IS '학생 취득 원점수 (100점 만점 기준)';
COMMENT ON COLUMN user_student_grades.written_score IS '지필평가 점수 (중간/기말고사)';
COMMENT ON COLUMN user_student_grades.perf_score IS '수행평가 점수';
COMMENT ON COLUMN user_student_grades.school_avg IS '해당 과목 학교/학년 전체 평균 점수';
COMMENT ON COLUMN user_student_grades.std_dev IS '해당 과목 표준편차';
COMMENT ON COLUMN user_student_grades.achievement IS '성취도 등급 (A, B, C, D, E)';
COMMENT ON COLUMN user_student_grades.created_at IS '성적 데이터 등록 일시';


-- =========================================================================
-- 4. 학생 생활기록부 & AI 세특 역량 진단 테이블 (user_school_records)
-- =========================================================================
CREATE TABLE IF NOT EXISTS user_school_records (
    id BIGSERIAL PRIMARY KEY,                                                            -- 생기부 진단 레코드 고유 ID (자동 증가 번호)
    profile_id UUID NOT NULL REFERENCES user_neis_profiles(id) ON DELETE CASCADE,        -- 대상 자녀 ID (user_neis_profiles.id 외래키)
    academic_score INT DEFAULT 90,                                                       -- 학업 역량 진단 점수 (100점 만점)
    major_suitability_score INT DEFAULT 85,                                              -- 전공 적합성 진단 점수 (100점 만점)
    community_score INT DEFAULT 90,                                                      -- 공동체/인성 역량 진단 점수 (100점 만점)
    keywords JSONB DEFAULT '[]'::jsonb,                                                  -- 생기부 핵심 역량 키워드 (JSON 배열)
    strengths JSONB DEFAULT '[]'::jsonb,                                                 -- AI 강점 분석 내용 (JSON 배열)
    weaknesses JSONB DEFAULT '[]'::jsonb,                                                -- AI 보완점 분석 내용 (JSON 배열)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP                        -- 진단 데이터 생성 일시
);

CREATE INDEX IF NOT EXISTS idx_school_records_profile ON user_school_records(profile_id);

-- user_school_records 테이블 및 컬럼 코멘트
COMMENT ON TABLE user_school_records IS '학생 생활기록부 & AI 세특 역량 진단 테이블';
COMMENT ON COLUMN user_school_records.id IS '생기부 진단 레코드 고유 ID (BIGSERIAL, PK)';
COMMENT ON COLUMN user_school_records.profile_id IS '대상 자녀 프로필 고유 ID (user_neis_profiles.id 참조)';
COMMENT ON COLUMN user_school_records.academic_score IS '학업 역량 진단 점수 (100점 만점)';
COMMENT ON COLUMN user_school_records.major_suitability_score IS '전공 적합성 진단 점수 (100점 만점)';
COMMENT ON COLUMN user_school_records.community_score IS '공동체 및 인성 역량 진단 점수 (100점 만점)';
COMMENT ON COLUMN user_school_records.keywords IS '생기부 핵심 역량 키워드 (JSON 배열)';
COMMENT ON COLUMN user_school_records.strengths IS 'AI 강점 분석 결과 (JSON 배열)';
COMMENT ON COLUMN user_school_records.weaknesses IS 'AI 보완점 분석 결과 (JSON 배열)';
COMMENT ON COLUMN user_school_records.created_at IS '진단 데이터 생성 일시';


-- =========================================================================
-- 5. RLS (Row Level Security) 설정 및 접근 권한 허용 (★회원가입 DB 저장 필수 실행★)
-- Supabase SQL Editor에서 아래 쿼리를 실행해 주셔야 익명(anon) 키로 회원가입 정보가 DB에 정상 저장됩니다.
-- =========================================================================

-- users 테이블의 RLS 비활성화 (회원가입/로그인 데이터 입출력 허용)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 자녀 및 나이스 마이데이터 연동 테이블 RLS 비활성화
ALTER TABLE user_neis_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_student_grades DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_school_records DISABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 6. 기존 테이블 학년 제약 변경 마이그레이션 (이미 테이블을 생성한 경우 1회 실행)
-- 초등학교 1~6학년 저장이 가능하도록 제약조건 범위를 1~6으로 확장합니다.
-- =========================================================================
-- ALTER TABLE user_neis_profiles DROP CONSTRAINT IF EXISTS user_neis_profiles_grade_check;
-- ALTER TABLE user_neis_profiles ADD CONSTRAINT user_neis_profiles_grade_check CHECK (grade BETWEEN 1 AND 6);

