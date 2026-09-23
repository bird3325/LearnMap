-- LearnMap User Authentication & NEIS MyData SQL Schema
-- Compatible with PostgreSQL, MySQL 8.0+, and Supabase SQL Editor

-- 1. 회원 기본 정보 테이블 (users)
CREATE TABLE IF NOT EXISTS users (
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

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. 자녀 나이스 마이데이터 연동 프로필 테이블 (user_neis_profiles)
CREATE TABLE IF NOT EXISTS user_neis_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_name VARCHAR(100) NOT NULL,
    school_name VARCHAR(150) NOT NULL,
    grade INT NOT NULL CHECK (grade BETWEEN 1 AND 3),
    class_num INT DEFAULT 1,
    student_num INT DEFAULT 1,
    target_major VARCHAR(150),
    allergies JSONB DEFAULT '[]'::jsonb,
    is_connected BOOLEAN DEFAULT TRUE,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_neis_profiles_user ON user_neis_profiles(user_id);

-- 3. 과목별 성적 및 지필/수행평가 테이블 (user_student_grades)
CREATE TABLE IF NOT EXISTS user_student_grades (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES user_neis_profiles(id) ON DELETE CASCADE,
    semester VARCHAR(20) NOT NULL DEFAULT '2026-1',
    subject_name VARCHAR(50) NOT NULL,
    raw_score NUMERIC(5, 2) NOT NULL,
    written_score NUMERIC(5, 2),
    perf_score NUMERIC(5, 2),
    school_avg NUMERIC(5, 2) NOT NULL,
    std_dev NUMERIC(5, 2) NOT NULL,
    achievement CHAR(1) CHECK (achievement IN ('A', 'B', 'C', 'D', 'E')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_grades_profile ON user_student_grades(profile_id);

-- 4. 학생 생활기록부 & AI 세특 역량 진단 테이블 (user_school_records)
CREATE TABLE IF NOT EXISTS user_school_records (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES user_neis_profiles(id) ON DELETE CASCADE,
    academic_score INT DEFAULT 90,
    major_suitability_score INT DEFAULT 85,
    community_score INT DEFAULT 90,
    keywords JSONB DEFAULT '[]'::jsonb,
    strengths JSONB DEFAULT '[]'::jsonb,
    weaknesses JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_school_records_profile ON user_school_records(profile_id);
