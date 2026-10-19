-- ============================================================
-- AI Answer Booklet Evaluation — MySQL 8 Migration
-- AGMR College of Engineering
-- ============================================================

USE online_exam_system;

-- 1. Evaluation Sessions (one per evaluation workflow)
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
