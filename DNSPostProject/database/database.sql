-- MySQL 8 Database DDL & DML Script
-- Online Examination System
-- AGMR College of Engineering

CREATE DATABASE IF NOT EXISTS online_exam_system;
USE online_exam_system;

-- 1. Table: students (Users: Admin & Students)
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Student',
    name VARCHAR(255) DEFAULT '',
    usn VARCHAR(100) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table: subjects
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_name VARCHAR(255) NOT NULL,
    subject_code VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Table: exams
CREATE TABLE IF NOT EXISTS exams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject_id INT NOT NULL,
    total_questions INT DEFAULT 0,
    total_marks INT DEFAULT 0,
    time_limit INT DEFAULT 30,
    exam_date DATE DEFAULT (CURRENT_DATE),
    start_time VARCHAR(20) DEFAULT '00:00',
    end_time VARCHAR(20) DEFAULT '23:59',
    exam_status VARCHAR(50) DEFAULT 'published',
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    INDEX idx_subject (subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Table: questions
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    question TEXT NOT NULL,
    option1 TEXT NOT NULL,
    option2 TEXT NOT NULL,
    option3 TEXT NOT NULL,
    option4 TEXT NOT NULL,
    correct_answer VARCHAR(10) NOT NULL,
    marks INT NOT NULL DEFAULT 1,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    INDEX idx_exam (exam_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Table: results
CREATE TABLE IF NOT EXISTS results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    exam_id INT NOT NULL,
    score INT NOT NULL,
    total_marks INT NOT NULL,
    exam_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    auto_submit TINYINT(1) DEFAULT 0,
    submit_reason VARCHAR(255) DEFAULT 'NORMAL',
    UNIQUE KEY unique_student_exam (student_id, exam_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Table: proctor_status
CREATE TABLE IF NOT EXISTS proctor_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    exam_id INT NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    violations_count INT DEFAULT 0,
    violation_type VARCHAR(100) DEFAULT NULL,
    live_risk_score INT DEFAULT 0,
    identity_verified TINYINT(1) DEFAULT 0,
    reference_image LONGTEXT DEFAULT NULL,
    last_violation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    exam_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_student_exam_session (student_id, exam_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Table: warnings (Proctor Incidents & Snapshots)
CREATE TABLE IF NOT EXISTS warnings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    user_id INT NOT NULL,
    type VARCHAR(100) NOT NULL,
    confidence FLOAT DEFAULT 1.0,
    risk_score INT DEFAULT 0,
    details JSON DEFAULT NULL,
    image_url LONGTEXT DEFAULT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Table: ai_settings (Configurable Proctoring Thresholds)
CREATE TABLE IF NOT EXISTS ai_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Table: sessions (JWT active sessions tracking)
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_id VARCHAR(255) NOT NULL,
    ip_address VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Default AI Settings
INSERT IGNORE INTO ai_settings (setting_key, setting_value) VALUES
('max_warnings', '3'),
('auto_submit_enabled', '1'),
('face_timeout_seconds', '5'),
('head_yaw_threshold_deg', '22'),
('head_pitch_threshold_deg', '18'),
('eye_gaze_threshold', '0.12'),
('phone_confidence_threshold', '0.50'),
('screenshot_quality', '0.5'),
('detection_sensitivity', 'medium'),
('risk_weights', '{"LOOKING_AWAY":10,"HEAD_YAW":10,"HEAD_PITCH":10,"FACE_MISSING":20,"MULTIPLE_FACES":40,"PHONE_DETECTED":30,"TAB_SWITCH":15,"FULLSCREEN_EXIT":10,"KEYBOARD_SHORTCUT":5,"RIGHT_CLICK":5}');

-- Seed Default Admin & Students (Passwords hashed with bcrypt: 'admin123', 'pass1', 'pass2')
INSERT IGNORE INTO students (username, password, role, name, usn, email) VALUES 
('admin', '$2b$10$CLoPqH7Or2kL6xXfzruCtesJX85tdL9cIh6dYZfdFMrc7FU8gHite', 'Admin', 'Administrator', 'ADMIN001', 'admin@agmr.edu'),
('student1', '$2b$10$KYHbM79zfqefphgtaxYFVeIWg1Iw7AM9XyLwu7W9/qlmy6KV8QqGW', 'Student', 'Rahul Sharma', '1AG21CS001', 'student1@agmr.edu'),
('student2', '$2b$10$SPAXLPpectGlmV/itR2T8Onz5zB3biKC5akkVqJdEg6.5SHOKRHtS', 'Student', 'Priya Patel', '1AG21CS002', 'student2@agmr.edu');

-- ============================================================
-- AI Answer Booklet Evaluation Tables
-- ============================================================

-- 1. Evaluation Sessions
CREATE TABLE IF NOT EXISTS evaluation_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT DEFAULT NULL,
    exam_name VARCHAR(255) NOT NULL DEFAULT '',
    semester VARCHAR(50) DEFAULT '',
    academic_year VARCHAR(20) DEFAULT '',
    evaluation_title VARCHAR(255) DEFAULT '',
    evaluation_mode ENUM('easy', 'hard') DEFAULT NULL,
    created_by INT NOT NULL,
    status ENUM(
        'draft',
        'question_paper_uploaded',
        'question_paper_confirmed',
        'scheme_uploaded',
        'scheme_confirmed',
        'mode_selected',
        'ready_for_evaluation',
        'evaluation_in_progress',
        'evaluation_completed',
        'approved'
    ) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_created_by (created_by),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Uploaded Documents Metadata
CREATE TABLE IF NOT EXISTS evaluation_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    doc_type ENUM('question_paper', 'valuation_scheme', 'module_pdf') NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    stored_path VARCHAR(1000) NOT NULL,
    file_size INT DEFAULT 0,
    mime_type VARCHAR(100) DEFAULT '',
    processing_status ENUM('uploaded', 'processing', 'extracted', 'needs_correction', 'confirmed', 'error') DEFAULT 'uploaded',
    extracted_content JSON DEFAULT NULL,
    confirmed_by_faculty TINYINT(1) DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES evaluation_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_doc (session_id, doc_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Extracted Questions from Question Paper
CREATE TABLE IF NOT EXISTS evaluation_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    question_number VARCHAR(20) NOT NULL,
    sub_question VARCHAR(20) DEFAULT '',
    question_text TEXT NOT NULL,
    max_marks INT NOT NULL DEFAULT 0,
    has_internal_choice TINYINT(1) DEFAULT 0,
    choice_group VARCHAR(20) DEFAULT '',
    faculty_confirmed TINYINT(1) DEFAULT 0,
    extracted_raw JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES evaluation_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_qnum (session_id, question_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Confirmed Valuation Scheme Entries
CREATE TABLE IF NOT EXISTS evaluation_scheme (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    question_id INT DEFAULT NULL,
    question_number VARCHAR(20) NOT NULL DEFAULT '',
    sub_question VARCHAR(20) DEFAULT '',
    expected_answer TEXT DEFAULT NULL,
    marking_breakdown JSON DEFAULT NULL,
    partial_marks_rules JSON DEFAULT NULL,
    faculty_confirmed TINYINT(1) DEFAULT 0,
    scheme_raw JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES evaluation_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES evaluation_questions(id) ON DELETE SET NULL,
    INDEX idx_session_scheme (session_id, question_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Student Answer Booklets + OCR Results
CREATE TABLE IF NOT EXISTS evaluation_booklets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT DEFAULT NULL,
    student_usn VARCHAR(100) DEFAULT '',
    student_name VARCHAR(255) DEFAULT '',
    original_filename VARCHAR(500) NOT NULL,
    stored_path VARCHAR(1000) NOT NULL,
    processing_status ENUM('uploaded', 'processing', 'ocr_complete', 'ocr_confirmed', 'evaluating', 'evaluated', 'approved', 'error') DEFAULT 'uploaded',
    ocr_output JSON DEFAULT NULL,
    faculty_ocr_confirmed TINYINT(1) DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES evaluation_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
    INDEX idx_session_booklet (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Per-Question Evaluation Results
CREATE TABLE IF NOT EXISTS evaluation_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    booklet_id INT NOT NULL,
    question_id INT NOT NULL,
    ai_suggested_marks DECIMAL(6,2) DEFAULT 0,
    faculty_final_marks DECIMAL(6,2) DEFAULT NULL,
    max_marks INT NOT NULL DEFAULT 0,
    correct_concepts JSON DEFAULT NULL,
    missing_points JSON DEFAULT NULL,
    incorrect_statements JSON DEFAULT NULL,
    ai_explanation TEXT DEFAULT NULL,
    evidence TEXT DEFAULT NULL,
    ocr_confidence FLOAT DEFAULT 0,
    eval_confidence FLOAT DEFAULT 0,
    needs_review TINYINT(1) DEFAULT 0,
    faculty_approved TINYINT(1) DEFAULT 0,
    audit_history JSON DEFAULT NULL,
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (session_id) REFERENCES evaluation_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (booklet_id) REFERENCES evaluation_booklets(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES evaluation_questions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_booklet_question (booklet_id, question_id),
    INDEX idx_session_results (session_id, booklet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
