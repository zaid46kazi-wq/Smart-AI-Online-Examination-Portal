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
