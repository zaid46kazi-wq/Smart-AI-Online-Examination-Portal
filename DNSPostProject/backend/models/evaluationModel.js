/**
 * Evaluation Model — MySQL 8 Data Access Object
 * Manages evaluation sessions, documents, questions, scheme, booklets, and results.
 */
const { query, queryOne } = require('../config/db');

const evaluationModel = {
    // ─── Sessions ────────────────────────────────────────────

    createSession: async ({ subject_id, exam_name, semester, academic_year, evaluation_title, created_by }) => {
        const sql = `INSERT INTO evaluation_sessions 
            (subject_id, exam_name, semester, academic_year, evaluation_title, created_by, status) 
            VALUES (?, ?, ?, ?, ?, ?, 'draft')`;
        const res = await query(sql, [
            subject_id || null, exam_name || '', semester || '',
            academic_year || '', evaluation_title || '', created_by
        ]);
        return res.insertId;
    },

    getSessionById: async (id) => {
        return queryOne(`
            SELECT es.*, s.subject_name, s.subject_code
            FROM evaluation_sessions es
            LEFT JOIN subjects s ON es.subject_id = s.id
            WHERE es.id = ?
        `, [id]);
    },

    getSessionsByUser: async (userId) => {
        return query(`
            SELECT es.*, s.subject_name, s.subject_code,
                (SELECT COUNT(*) FROM evaluation_booklets eb WHERE eb.session_id = es.id) AS booklet_count,
                (SELECT COUNT(*) FROM evaluation_results er WHERE er.session_id = es.id AND er.faculty_approved = 1) AS approved_count
            FROM evaluation_sessions es
            LEFT JOIN subjects s ON es.subject_id = s.id
            WHERE es.created_by = ?
            ORDER BY es.updated_at DESC
        `, [userId]);
    },

    updateSessionStatus: async (id, status) => {
        return query(`UPDATE evaluation_sessions SET status = ? WHERE id = ?`, [status, id]);
    },

    updateSessionMode: async (id, mode) => {
        return query(`UPDATE evaluation_sessions SET evaluation_mode = ?, status = 'mode_selected' WHERE id = ?`, [mode, id]);
    },

    deleteSession: async (id) => {
        return query(`DELETE FROM evaluation_sessions WHERE id = ?`, [id]);
    },

    // ─── Documents ───────────────────────────────────────────

    addDocument: async ({ session_id, doc_type, original_filename, stored_path, file_size, mime_type }) => {
        const sql = `INSERT INTO evaluation_documents 
            (session_id, doc_type, original_filename, stored_path, file_size, mime_type, processing_status) 
            VALUES (?, ?, ?, ?, ?, ?, 'uploaded')`;
        const res = await query(sql, [session_id, doc_type, original_filename, stored_path, file_size || 0, mime_type || '']);
        return res.insertId;
    },

    getDocumentsBySession: async (session_id) => {
        return query(`SELECT * FROM evaluation_documents WHERE session_id = ? ORDER BY uploaded_at DESC`, [session_id]);
    },

    getDocumentByType: async (session_id, doc_type) => {
        return queryOne(`SELECT * FROM evaluation_documents WHERE session_id = ? AND doc_type = ? ORDER BY uploaded_at DESC LIMIT 1`, [session_id, doc_type]);
    },

    getModulePDFs: async (session_id) => {
        return query(`SELECT * FROM evaluation_documents WHERE session_id = ? AND doc_type = 'module_pdf' ORDER BY uploaded_at ASC`, [session_id]);
    },

    updateDocumentStatus: async (id, status, extracted_content = null) => {
        if (extracted_content !== null) {
            return query(`UPDATE evaluation_documents SET processing_status = ?, extracted_content = ? WHERE id = ?`,
                [status, JSON.stringify(extracted_content), id]);
        }
        return query(`UPDATE evaluation_documents SET processing_status = ? WHERE id = ?`, [status, id]);
    },

    confirmDocument: async (id) => {
        return query(`UPDATE evaluation_documents SET confirmed_by_faculty = 1, processing_status = 'confirmed' WHERE id = ?`, [id]);
    },

    // ─── Questions ───────────────────────────────────────────

    bulkInsertQuestions: async (session_id, questions) => {
        if (!questions || questions.length === 0) return;
        // Clear existing unconfirmed questions first
        await query(`DELETE FROM evaluation_questions WHERE session_id = ? AND faculty_confirmed = 0`, [session_id]);

        const sql = `INSERT INTO evaluation_questions 
            (session_id, question_number, sub_question, question_text, max_marks, has_internal_choice, choice_group, extracted_raw) 
            VALUES ?`;
        const values = questions.map(q => [
            session_id,
            String(q.question_number || ''),
            String(q.sub_question || ''),
            String(q.question_text || ''),
            parseInt(q.max_marks) || 0,
            q.has_internal_choice ? 1 : 0,
            String(q.choice_group || ''),
            JSON.stringify(q.raw || null)
        ]);
        return query(sql, [values]);
    },

    getQuestionsBySession: async (session_id) => {
        return query(`SELECT * FROM evaluation_questions WHERE session_id = ? ORDER BY question_number ASC, sub_question ASC`, [session_id]);
    },

    updateQuestion: async (id, updates) => {
        const fields = [];
        const params = [];
        if (updates.question_text !== undefined) { fields.push('question_text = ?'); params.push(updates.question_text); }
        if (updates.max_marks !== undefined) { fields.push('max_marks = ?'); params.push(parseInt(updates.max_marks) || 0); }
        if (updates.question_number !== undefined) { fields.push('question_number = ?'); params.push(updates.question_number); }
        if (updates.sub_question !== undefined) { fields.push('sub_question = ?'); params.push(updates.sub_question); }
        if (updates.has_internal_choice !== undefined) { fields.push('has_internal_choice = ?'); params.push(updates.has_internal_choice ? 1 : 0); }
        if (updates.choice_group !== undefined) { fields.push('choice_group = ?'); params.push(updates.choice_group); }
        if (fields.length === 0) return;
        params.push(id);
        return query(`UPDATE evaluation_questions SET ${fields.join(', ')} WHERE id = ?`, params);
    },

    confirmQuestions: async (session_id) => {
        return query(`UPDATE evaluation_questions SET faculty_confirmed = 1 WHERE session_id = ?`, [session_id]);
    },

    // ─── Scheme ──────────────────────────────────────────────

    bulkInsertScheme: async (session_id, entries) => {
        if (!entries || entries.length === 0) return;
        await query(`DELETE FROM evaluation_scheme WHERE session_id = ? AND faculty_confirmed = 0`, [session_id]);

        const sql = `INSERT INTO evaluation_scheme 
            (session_id, question_id, question_number, sub_question, expected_answer, marking_breakdown, partial_marks_rules, scheme_raw) 
            VALUES ?`;
        const values = entries.map(e => [
            session_id,
            e.question_id || null,
            String(e.question_number || ''),
            String(e.sub_question || ''),
            String(e.expected_answer || ''),
            JSON.stringify(e.marking_breakdown || null),
            JSON.stringify(e.partial_marks_rules || null),
            JSON.stringify(e.raw || null)
        ]);
        return query(sql, [values]);
    },

    getSchemeBySession: async (session_id) => {
        return query(`
            SELECT es.*, eq.question_text, eq.max_marks as q_max_marks
            FROM evaluation_scheme es
            LEFT JOIN evaluation_questions eq ON es.question_id = eq.id
            WHERE es.session_id = ?
            ORDER BY es.question_number ASC, es.sub_question ASC
        `, [session_id]);
    },

    updateSchemeEntry: async (id, updates) => {
        const fields = [];
        const params = [];
        if (updates.expected_answer !== undefined) { fields.push('expected_answer = ?'); params.push(updates.expected_answer); }
        if (updates.marking_breakdown !== undefined) { fields.push('marking_breakdown = ?'); params.push(JSON.stringify(updates.marking_breakdown)); }
        if (updates.partial_marks_rules !== undefined) { fields.push('partial_marks_rules = ?'); params.push(JSON.stringify(updates.partial_marks_rules)); }
        if (updates.question_id !== undefined) { fields.push('question_id = ?'); params.push(updates.question_id); }
        if (fields.length === 0) return;
        params.push(id);
        return query(`UPDATE evaluation_scheme SET ${fields.join(', ')} WHERE id = ?`, params);
    },

    confirmScheme: async (session_id) => {
        return query(`UPDATE evaluation_scheme SET faculty_confirmed = 1 WHERE session_id = ?`, [session_id]);
    },

    // ─── Booklets ────────────────────────────────────────────

    addBooklet: async ({ session_id, student_id, student_usn, student_name, original_filename, stored_path }) => {
        const sql = `INSERT INTO evaluation_booklets 
            (session_id, student_id, student_usn, student_name, original_filename, stored_path, processing_status) 
            VALUES (?, ?, ?, ?, ?, ?, 'uploaded')`;
        const res = await query(sql, [session_id, student_id || null, student_usn || '', student_name || '', original_filename, stored_path]);
        return res.insertId;
    },

    getBookletsBySession: async (session_id) => {
        return query(`
            SELECT eb.*, s.name as db_student_name, s.usn as db_student_usn
            FROM evaluation_booklets eb
            LEFT JOIN students s ON eb.student_id = s.id
            WHERE eb.session_id = ?
            ORDER BY eb.uploaded_at DESC
        `, [session_id]);
    },

    getBookletById: async (id) => {
        return queryOne(`SELECT * FROM evaluation_booklets WHERE id = ?`, [id]);
    },

    updateBookletStatus: async (id, status, ocr_output = null) => {
        if (ocr_output !== null) {
            return query(`UPDATE evaluation_booklets SET processing_status = ?, ocr_output = ? WHERE id = ?`,
                [status, JSON.stringify(ocr_output), id]);
        }
        return query(`UPDATE evaluation_booklets SET processing_status = ? WHERE id = ?`, [status, id]);
    },

    updateBookletOCR: async (id, ocr_output) => {
        return query(`UPDATE evaluation_booklets SET ocr_output = ?, faculty_ocr_confirmed = 0 WHERE id = ?`,
            [JSON.stringify(ocr_output), id]);
    },

    confirmBookletOCR: async (id) => {
        return query(`UPDATE evaluation_booklets SET faculty_ocr_confirmed = 1, processing_status = 'ocr_confirmed' WHERE id = ?`, [id]);
    },

    updateBookletStudent: async (id, { student_id, student_usn, student_name }) => {
        return query(`UPDATE evaluation_booklets SET student_id = ?, student_usn = ?, student_name = ? WHERE id = ?`,
            [student_id || null, student_usn || '', student_name || '', id]);
    },

    // ─── Results ─────────────────────────────────────────────

    bulkInsertResults: async (results) => {
        if (!results || results.length === 0) return;
        const sql = `INSERT INTO evaluation_results 
            (session_id, booklet_id, question_id, ai_suggested_marks, max_marks, 
             correct_concepts, missing_points, incorrect_statements, ai_explanation, 
             evidence, ocr_confidence, eval_confidence, needs_review, audit_history) 
            VALUES ?
            ON DUPLICATE KEY UPDATE
                ai_suggested_marks = VALUES(ai_suggested_marks),
                max_marks = VALUES(max_marks),
                correct_concepts = VALUES(correct_concepts),
                missing_points = VALUES(missing_points),
                incorrect_statements = VALUES(incorrect_statements),
                ai_explanation = VALUES(ai_explanation),
                evidence = VALUES(evidence),
                ocr_confidence = VALUES(ocr_confidence),
                eval_confidence = VALUES(eval_confidence),
                needs_review = VALUES(needs_review),
                audit_history = VALUES(audit_history),
                evaluated_at = CURRENT_TIMESTAMP`;
        const values = results.map(r => [
            r.session_id, r.booklet_id, r.question_id,
            parseFloat(r.ai_suggested_marks) || 0,
            parseInt(r.max_marks) || 0,
            JSON.stringify(r.correct_concepts || []),
            JSON.stringify(r.missing_points || []),
            JSON.stringify(r.incorrect_statements || []),
            r.ai_explanation || '',
            r.evidence || '',
            parseFloat(r.ocr_confidence) || 0,
            parseFloat(r.eval_confidence) || 0,
            r.needs_review ? 1 : 0,
            JSON.stringify([{ action: 'ai_evaluated', timestamp: new Date().toISOString(), marks: parseFloat(r.ai_suggested_marks) || 0 }])
        ]);
        return query(sql, [values]);
    },

    getResultsByBooklet: async (booklet_id) => {
        return query(`
            SELECT er.*, eq.question_number, eq.sub_question, eq.question_text, eq.max_marks as q_max_marks,
                   escheme.expected_answer
            FROM evaluation_results er
            JOIN evaluation_questions eq ON er.question_id = eq.id
            LEFT JOIN evaluation_scheme escheme ON escheme.question_id = eq.id AND escheme.session_id = er.session_id
            WHERE er.booklet_id = ?
            ORDER BY eq.question_number ASC, eq.sub_question ASC
        `, [booklet_id]);
    },

    getResultsBySession: async (session_id) => {
        return query(`
            SELECT er.*, eq.question_number, eq.sub_question, eq.question_text,
                   eb.student_name, eb.student_usn, eb.id as booklet_id
            FROM evaluation_results er
            JOIN evaluation_questions eq ON er.question_id = eq.id
            JOIN evaluation_booklets eb ON er.booklet_id = eb.id
            WHERE er.session_id = ?
            ORDER BY eb.student_name ASC, eq.question_number ASC
        `, [session_id]);
    },

    updateResultMarks: async (id, faculty_final_marks, userId) => {
        // Get current result for audit
        const current = await queryOne(`SELECT * FROM evaluation_results WHERE id = ?`, [id]);
        if (!current) throw new Error('Result not found');

        let auditHistory = [];
        try { auditHistory = JSON.parse(current.audit_history) || []; } catch (_) {}
        auditHistory.push({
            action: 'faculty_edit',
            timestamp: new Date().toISOString(),
            previous_marks: parseFloat(current.faculty_final_marks ?? current.ai_suggested_marks),
            new_marks: parseFloat(faculty_final_marks),
            edited_by: userId
        });

        return query(`UPDATE evaluation_results SET faculty_final_marks = ?, audit_history = ? WHERE id = ?`,
            [parseFloat(faculty_final_marks), JSON.stringify(auditHistory), id]);
    },

    approveResult: async (id, userId) => {
        const current = await queryOne(`SELECT * FROM evaluation_results WHERE id = ?`, [id]);
        if (!current) throw new Error('Result not found');

        let auditHistory = [];
        try { auditHistory = JSON.parse(current.audit_history) || []; } catch (_) {}
        auditHistory.push({
            action: 'faculty_approved',
            timestamp: new Date().toISOString(),
            final_marks: parseFloat(current.faculty_final_marks ?? current.ai_suggested_marks),
            approved_by: userId
        });

        return query(`UPDATE evaluation_results SET faculty_approved = 1, approved_at = NOW(), audit_history = ?, 
            faculty_final_marks = COALESCE(faculty_final_marks, ai_suggested_marks) WHERE id = ?`,
            [JSON.stringify(auditHistory), id]);
    },

    approveAllBookletResults: async (booklet_id, userId) => {
        const results = await query(`SELECT * FROM evaluation_results WHERE booklet_id = ?`, [booklet_id]);
        for (const r of results) {
            if (!r.faculty_approved) {
                await evaluationModel.approveResult(r.id, userId);
            }
        }
        return query(`UPDATE evaluation_booklets SET processing_status = 'approved' WHERE id = ?`, [booklet_id]);
    },

    getSessionSummary: async (session_id) => {
        const booklets = await query(`
            SELECT eb.id, eb.student_name, eb.student_usn, eb.processing_status,
                COALESCE(SUM(COALESCE(er.faculty_final_marks, er.ai_suggested_marks)), 0) as total_marks,
                COALESCE(SUM(er.max_marks), 0) as total_max_marks,
                COUNT(er.id) as questions_evaluated,
                SUM(CASE WHEN er.faculty_approved = 1 THEN 1 ELSE 0 END) as questions_approved,
                SUM(CASE WHEN er.needs_review = 1 THEN 1 ELSE 0 END) as needs_review_count
            FROM evaluation_booklets eb
            LEFT JOIN evaluation_results er ON er.booklet_id = eb.id
            WHERE eb.session_id = ?
            GROUP BY eb.id
            ORDER BY eb.student_name ASC
        `, [session_id]);
        return booklets;
    }
};

module.exports = evaluationModel;
