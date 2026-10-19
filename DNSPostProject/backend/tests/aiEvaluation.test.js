const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5000';
const { query, queryOne, pool } = require('../config/db');
const aiEvalService = require('../services/aiEvaluationService');

test.after(async () => {
    await pool.end();
});

async function apiRequest(url, options = {}) {
    const response = await fetch(`${BASE_URL}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    });
    const text = await response.text();
    let body = null;
    if (text) {
        try {
            body = JSON.parse(text);
        } catch {
            body = text;
        }
    }
    return { response, body };
}

async function loginUser(username, password, role) {
    const res = await apiRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, role }),
    });
    assert.equal(res.response.status, 200, `Login failed for ${username}: ${JSON.stringify(res.body)}`);
    return { token: res.body.token, user: res.body.user };
}

test('AI Evaluation E2E: Complete Answer Booklet Evaluation Lifecycle with Gemini AI', async () => {
    const admin = await loginUser('admin', 'admin123', 'Admin');
    const authHeaders = { Authorization: `Bearer ${admin.token}` };

    const subject = await queryOne('SELECT id FROM subjects LIMIT 1');
    assert.ok(subject, 'A subject must exist in database');

    let sessionId = null;
    try {
        // 1. Create Evaluation Session
        const createSessionRes = await apiRequest('/api/evaluation/sessions', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                subject_id: subject.id,
                semester: '6th Semester',
                exam_name: 'Database Systems Final Exam',
                academic_year: '2025-2026',
                evaluation_title: 'Automated AI Booklet Evaluation QA Test'
            })
        });
        assert.equal(createSessionRes.response.status, 201, `Create session failed: ${JSON.stringify(createSessionRes.body)}`);
        sessionId = createSessionRes.body.session.id;
        assert.ok(sessionId, 'Session ID must exist');

        // 2. Insert and Confirm Question Paper question
        // "Explain database normalization and its advantages. Maximum marks: 10."
        const qInsert = await query(`
            INSERT INTO evaluation_questions 
            (session_id, question_number, sub_question, question_text, max_marks, faculty_confirmed)
            VALUES (?, '1', '', 'Explain database normalization and its advantages.', 10, 1)
        `, [sessionId]);
        const questionId = qInsert.insertId;

        // Add document record to satisfy mode prerequisites
        await query(`
            INSERT INTO evaluation_documents
            (session_id, doc_type, original_filename, stored_path, file_size, mime_type, processing_status, confirmed_by_faculty)
            VALUES (?, 'question_paper', 'qp_test.pdf', 'dummy_qp.pdf', 1000, 'application/pdf', 'confirmed', 1)
        `, [sessionId]);

        // 3. Insert and Confirm Valuation Scheme
        await query(`
            INSERT INTO evaluation_scheme
            (session_id, question_id, question_number, sub_question, expected_answer, marking_breakdown, partial_marks_rules, faculty_confirmed)
            VALUES (?, ?, '1', '', 
                'Normalization is the process of organizing data in a database to reduce redundancy and improve data integrity.',
                ?, ?, 1)
        `, [
            sessionId,
            questionId,
            JSON.stringify([
                { point: 'Correct definition', marks: 2 },
                { point: 'Reduced data redundancy', marks: 2 },
                { point: 'Insertion anomalies', marks: 2 },
                { point: 'Update and deletion anomalies', marks: 2 },
                { point: 'Data integrity and consistency', marks: 2 }
            ]),
            JSON.stringify('Award partial marks based on points covered')
        ]);

        await query(`
            INSERT INTO evaluation_documents
            (session_id, doc_type, original_filename, stored_path, file_size, mime_type, processing_status, confirmed_by_faculty)
            VALUES (?, 'valuation_scheme', 'scheme_test.pdf', 'dummy_scheme.pdf', 1000, 'application/pdf', 'confirmed', 1)
        `, [sessionId]);

        // 4. Set Evaluation Mode to Easy
        const modeRes = await apiRequest(`/api/evaluation/set-mode/${sessionId}`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ mode: 'easy' })
        });
        assert.equal(modeRes.response.status, 200, `Set mode failed: ${JSON.stringify(modeRes.body)}`);
        assert.equal(modeRes.body.mode, 'easy');

        // 5. Create student answer booklet with sample response
        const studentAnswerText = "Normalization organizes database information into related tables instead of repeatedly storing the same details. It reduces duplicate data and helps prevent mistakes when records are updated. It also avoids situations where information cannot be inserted without unrelated data, or deleting one record accidentally removes other useful information. This improves consistency and data integrity.";

        const ocrPayload = [
            {
                question_number: '1',
                sub_question: '',
                answer_text: studentAnswerText,
                ocr_confidence: 0.95,
                page_number: 1,
                has_diagram: false,
                is_readable: true,
                uncertain_parts: []
            }
        ];

        const bookletInsert = await query(`
            INSERT INTO evaluation_booklets
            (session_id, student_usn, student_name, original_filename, stored_path, processing_status, ocr_output, faculty_ocr_confirmed)
            VALUES (?, '1AG22CS099', 'QA Test Student', 'answer_booklet.pdf', 'dummy_booklet.pdf', 'ocr_confirmed', ?, 1)
        `, [sessionId, JSON.stringify(ocrPayload)]);
        const bookletId = bookletInsert.insertId;

        // 6. Execute AI Evaluation against live Gemini AI
        console.log('[TEST] Calling /api/evaluation/evaluate with Gemini AI...');
        const evalRes = await apiRequest(`/api/evaluation/evaluate/${sessionId}/${bookletId}`, {
            method: 'POST',
            headers: authHeaders
        });

        assert.equal(evalRes.response.status, 200, `Evaluation endpoint failed: ${JSON.stringify(evalRes.body)}`);
        assert.equal(evalRes.body.success, true);
        assert.equal(evalRes.body.total_evaluated, 1);

        const results = evalRes.body.results;
        assert.ok(Array.isArray(results) && results.length === 1, 'Results must contain 1 evaluated question');
        const r = results[0];

        console.log(`[TEST] AI suggested marks: ${r.ai_suggested_marks}/${r.max_marks}`);
        console.log(`[TEST] AI Explanation: ${r.ai_explanation}`);
        console.log(`[TEST] Correct concepts: ${JSON.stringify(r.correct_concepts)}`);
        console.log(`[TEST] Missing points: ${JSON.stringify(r.missing_points)}`);

        // Verify marks constraints
        assert.ok(r.ai_suggested_marks >= 0 && r.ai_suggested_marks <= 10, `Marks must be between 0 and 10: got ${r.ai_suggested_marks}`);
        assert.equal(r.max_marks, 10);
        assert.ok(r.ai_suggested_marks >= 6, `Student answer covers all criteria well, score should be >= 6/10: got ${r.ai_suggested_marks}`);

        // 6b. Verify repeated evaluation submission does not create duplicate records
        const repeatEvalRes = await apiRequest(`/api/evaluation/evaluate/${sessionId}/${bookletId}`, {
            method: 'POST',
            headers: authHeaders
        });
        assert.equal(repeatEvalRes.response.status, 200);
        const countInDb = await query('SELECT count(*) as cnt FROM evaluation_results WHERE booklet_id = ? AND question_id = ?', [bookletId, questionId]);
        assert.equal(countInDb[0].cnt, 1, 'Repeated evaluation must not create duplicate results (ON DUPLICATE KEY UPDATE)');

        // 7. Verify persistence in MySQL
        const dbResult = await queryOne('SELECT * FROM evaluation_results WHERE booklet_id = ? AND question_id = ?', [bookletId, questionId]);
        assert.ok(dbResult, 'Evaluation result must be stored in MySQL');
        assert.equal(parseFloat(dbResult.ai_suggested_marks), parseFloat(r.ai_suggested_marks));

        // 8. Verify getResults endpoint returns both results and booklet
        const getRes = await apiRequest(`/api/evaluation/results/${bookletId}`, { headers: authHeaders });
        assert.equal(getRes.response.status, 200);
        assert.ok(Array.isArray(getRes.body.results), 'Results should be an array');
        assert.equal(getRes.body.results.length, 1);
        assert.ok(getRes.body.booklet, 'Booklet metadata must exist');

        // 9. Faculty Edit Marks (supports both marks and faculty_final_marks)
        const editRes = await apiRequest(`/api/evaluation/results/${r.id}/marks`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ marks: 9.5, feedback: 'Well structured and clear explanation' })
        });
        assert.equal(editRes.response.status, 200, `Edit marks failed: ${JSON.stringify(editRes.body)}`);

        // Verify edit in DB
        const dbAfterEdit = await queryOne('SELECT faculty_final_marks FROM evaluation_results WHERE id = ?', [r.id]);
        assert.equal(parseFloat(dbAfterEdit.faculty_final_marks), 9.5);

        // 10. Approve booklet
        const approveRes = await apiRequest(`/api/evaluation/approve/${sessionId}/${bookletId}`, {
            method: 'POST',
            headers: authHeaders
        });
        assert.equal(approveRes.response.status, 200);

        // 11. Verify session summary
        const summaryRes = await apiRequest(`/api/evaluation/summary/${sessionId}`, { headers: authHeaders });
        assert.equal(summaryRes.response.status, 200);
        assert.ok(Array.isArray(summaryRes.body), 'Summary must return an array');
        assert.equal(summaryRes.body.length, 1);
        assert.equal(parseFloat(summaryRes.body[0].total_marks), 9.5);
        assert.equal(summaryRes.body[0].processing_status, 'approved');

    } finally {
        // Clean up created session (CASCADE will delete documents, questions, scheme, booklets, results)
        if (sessionId) {
            await query('DELETE FROM evaluation_sessions WHERE id = ?', [sessionId]);
        }
    }
});

test('AI Evaluation: Hard Mode evaluation produces valid rubric assessment with Gemini AI', async () => {
    const studentAnswerText = "Normalization organizes database information into related tables instead of repeatedly storing the same details. It reduces duplicate data and helps prevent mistakes when records are updated. It also avoids situations where information cannot be inserted without unrelated data, or deleting one record accidentally removes other useful information. This improves consistency and data integrity.";

    const res = await aiEvalService.evaluateStudentAnswer({
        question: {
            question_number: '1',
            question_text: 'Explain database normalization and its advantages.',
            max_marks: 10
        },
        scheme: {
            question_number: '1',
            expected_answer: 'Normalization is the process of organizing data to reduce redundancy and eliminate insertion, update, and deletion anomalies while maintaining data integrity.',
            marking_breakdown: [
                { point: 'Correct definition of normalization', marks: 2 },
                { point: 'Reduction of data redundancy', marks: 2 },
                { point: 'Prevention of insertion anomalies', marks: 2 },
                { point: 'Prevention of update and deletion anomalies', marks: 2 },
                { point: 'Improved data integrity and consistency', marks: 2 }
            ]
        },
        studentAnswer: studentAnswerText,
        evaluationMode: 'hard',
        maxMarks: 10
    });

    console.log(`[TEST HARD MODE] Marks: ${res.suggested_marks}/10`);
    console.log(`[TEST HARD MODE] Explanation: ${res.scoring_explanation}`);
    assert.ok(res.suggested_marks >= 0 && res.suggested_marks <= 10, 'Hard mode marks must be within 0-10');
    assert.ok(res.suggested_marks >= 6, 'Well-formulated student answer should achieve >= 6 in hard mode');
    assert.ok(Array.isArray(res.correct_concepts), 'correct_concepts must be an array');
});

test('AI Evaluation: Unattempted / blank answer returns 0 marks safely', async () => {
    const res = await aiEvalService.evaluateStudentAnswer({
        question: {
            question_number: '2',
            question_text: 'Derive the B-Tree search time complexity.',
            max_marks: 8
        },
        scheme: {
            question_number: '2',
            expected_answer: 'O(log_B N) derivation steps...',
            marking_breakdown: [{ point: 'Derivation', marks: 8 }]
        },
        studentAnswer: '',
        evaluationMode: 'hard',
        maxMarks: 8
    });

    assert.equal(res.suggested_marks, 0);
    assert.equal(res.maximum_marks, 8);
    assert.ok(res.scoring_explanation.toLowerCase().includes('zero marks') || res.scoring_explanation.toLowerCase().includes('no response'));
});

test('AI Evaluation: Error handling — Missing booklet or session returns 404', async () => {
    const admin = await loginUser('admin', 'admin123', 'Admin');
    const authHeaders = { Authorization: `Bearer ${admin.token}` };

    const res1 = await apiRequest('/api/evaluation/evaluate/999999/999999', { method: 'POST', headers: authHeaders });
    assert.equal(res1.response.status, 404);

    const res2 = await apiRequest('/api/evaluation/results/999999', { headers: authHeaders });
    assert.equal(res2.response.status, 200);
    assert.equal(res2.body.results.length, 0);
});

test('AI Evaluation: Security — Unauthenticated and non-admin requests are blocked', async () => {
    // 1. Unauthenticated request
    const unauthRes = await apiRequest('/api/evaluation/sessions');
    assert.equal(unauthRes.response.status, 401, 'Unauthenticated request must receive 401');

    // 2. Student role
    const student = await loginUser('student1', 'pass1', 'Student');
    const authHeaders = { Authorization: `Bearer ${student.token}` };

    const studentRes = await apiRequest('/api/evaluation/sessions', { headers: authHeaders });
    assert.equal(studentRes.response.status, 403, 'Student must receive 403 Forbidden');
});

test('AI Evaluation: File Upload validation rejects disallowed formats and empty uploads', async () => {
    const admin = await loginUser('admin', 'admin123', 'Admin');
    const authHeaders = { Authorization: `Bearer ${admin.token}` };

    // 1. Missing file in multipart form
    const emptyFormData = new FormData();
    const resNoFile = await fetch(`${BASE_URL}/api/evaluation/upload/1/question_paper`, {
        method: 'POST',
        headers: authHeaders,
        body: emptyFormData
    });
    assert.equal(resNoFile.status, 400, 'Missing file payload should return 400 Bad Request');
    const bodyNoFile = await resNoFile.json();
    assert.ok(bodyNoFile.error.includes('No file uploaded'));

    // 2. Disallowed file extension (.txt or .exe)
    const badFormData = new FormData();
    const badBlob = new Blob(['malicious executable'], { type: 'application/x-msdownload' });
    badFormData.append('file', badBlob, 'malicious.exe');

    const resBadFile = await fetch(`${BASE_URL}/api/evaluation/upload/1/question_paper`, {
        method: 'POST',
        headers: authHeaders,
        body: badFormData
    });
    // Multer rejects with error, Express returns 500 or error json
    assert.ok(resBadFile.status >= 400, `Disallowed file type must fail with error code >= 400: got ${resBadFile.status}`);
});
