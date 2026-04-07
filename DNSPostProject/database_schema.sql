-- Supabase Database Schema DDL
-- Online Examination System - PRO VERSION
-- AGMR College of Engineering | Developer: Sayed Zaid Kazi

-- 1. Table: students (Also stores admin accounts)
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT DEFAULT '',
    usn TEXT DEFAULT '',
    email TEXT DEFAULT ''
);

-- Add new columns if they don't exist (for existing databases)
DO $$ BEGIN
    ALTER TABLE students ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE students ADD COLUMN IF NOT EXISTS usn TEXT DEFAULT '';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE students ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Table: subjects
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    subject_name TEXT NOT NULL,
    subject_code TEXT NOT NULL
);

-- 3. Table: exams (uses 'name' column — not 'exam_name')
CREATE TABLE IF NOT EXISTS exams (
    id SERIAL PRIMARY KEY,
    name TEXT DEFAULT '',
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    total_questions INTEGER DEFAULT 0,
    total_marks INTEGER DEFAULT 0,
    time_limit INTEGER DEFAULT 30,
    exam_date DATE DEFAULT CURRENT_DATE,
    start_time TEXT DEFAULT '00:00',
    end_time TEXT DEFAULT '23:59',
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 30;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_date DATE DEFAULT CURRENT_DATE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS start_time TEXT DEFAULT '00:00';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS end_time TEXT DEFAULT '23:59';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_status TEXT DEFAULT 'published';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. Table: questions (CREATE IF NOT EXISTS — never drop!)
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    option1 TEXT NOT NULL,
    option2 TEXT NOT NULL,
    option3 TEXT NOT NULL,
    option4 TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    marks INTEGER NOT NULL DEFAULT 1
);

-- 5. Table: results (CREATE IF NOT EXISTS — never drop!)
CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_marks INTEGER NOT NULL,
    exam_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    auto_submit BOOLEAN DEFAULT FALSE,
    submit_reason TEXT DEFAULT 'NORMAL',
    UNIQUE(student_id, exam_id) -- BLOCK MULTIPLE SUBMISSIONS
);

-- 6. Table: access_tracking (Legacy IP Tracking)
CREATE TABLE IF NOT EXISTS access_tracking (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    token TEXT NOT NULL,
    ipaddress TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Table: proctor_status (For AI-State Retention)
CREATE TABLE IF NOT EXISTS proctor_status (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    violations_count INTEGER DEFAULT 0,
    last_violation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exam_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, exam_id) -- BLOCK SIMULTANEOUS SESSIONS
);

-- =============================================
-- 10. POST-CREATION SECURITY CONSTRAINTS (FORCED)
-- =============================================
-- Ensure the 'One Exam, One Attempt' rule is enforced at the database level
-- sessions table definition (Production status tracking)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'in_progress',
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    UNIQUE(user_id, exam_id) -- BLOCK MULTIPLE ATTEMPTS
);

-- results table constraint
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_student_exam_result') THEN
        ALTER TABLE results ADD CONSTRAINT unique_student_exam_result UNIQUE (student_id, exam_id);
    END IF;
END $$;

-- proctor_status table constraint (Blocks redundant sessions)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_student_exam_session') THEN
        ALTER TABLE proctor_status ADD CONSTRAINT unique_student_exam_session UNIQUE (student_id, exam_id);
    END IF;
END $$;

-- Ensure proctor_status has the correct column for warning count if it was created before
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proctor_status' AND column_name='violations_count') THEN
        ALTER TABLE proctor_status RENAME COLUMN warnings TO violations_count;
    END IF;
EXCEPTION WHEN OTHERS THEN 
    -- If warnings doesn't exist either, we'll just ignore this rename
END $$;

-- Final cleanup of any legacy tables provided in user request (optional)
-- DROP TABLE IF EXISTS otp_codes;

-- Grant access to Supabase Anon and Authenticated Roles
GRANT ALL ON TABLE students TO anon, authenticated;
GRANT ALL ON TABLE subjects TO anon, authenticated;
GRANT ALL ON TABLE exams TO anon, authenticated;
GRANT ALL ON TABLE questions TO anon, authenticated;
GRANT ALL ON TABLE results TO anon, authenticated;
GRANT ALL ON TABLE sessions TO anon, authenticated;
GRANT ALL ON TABLE otp_codes TO anon, authenticated;
GRANT ALL ON TABLE proctor_status TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Reload Supabase Schema Cache
NOTIFY pgrst, 'reload schema';

-- Auto-Seed Default Users (only if not present)
INSERT INTO students (username, password, role, name, usn, email) VALUES ('admin', 'admin123', 'Admin', 'Administrator', 'ADMIN001', 'admin@agmr.edu') ON CONFLICT (username) DO NOTHING;
INSERT INTO students (username, password, role, name, usn, email) VALUES ('student1', 'pass1', 'Student', 'Rahul Sharma', '1AG21CS001', 'student1@agmr.edu') ON CONFLICT (username) DO NOTHING;
INSERT INTO students (username, password, role, name, usn, email) VALUES ('student2', 'pass2', 'Student', 'Priya Patel', '1AG21CS002', 'student2@agmr.edu') ON CONFLICT (username) DO NOTHING;
