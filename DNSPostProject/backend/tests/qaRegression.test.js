const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5000';
const { query, pool } = require('../config/db');

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

test('QA Regression 1: Leaderboard endpoint does not crash on LIMIT parameter', async () => {
    const { token } = await loginUser('student1', 'pass1', 'Student');
    const { response, body } = await apiRequest('/api/leaderboard', {
        headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body), 'Leaderboard body must be an array');
});

test('QA Regression 2: Validator accepts 2-option questions (True/False / binary choice)', async () => {
    const { token } = await loginUser('admin', 'admin123', 'Admin');
    const auth = { Authorization: `Bearer ${token}` };

    const subject = await query('SELECT id FROM subjects LIMIT 1');
    assert.ok(subject.length > 0, 'Subject must exist');

    const res = await apiRequest('/api/exams', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
            name: 'QA Binary Choice Exam',
            subject_id: subject[0].id,
            time_limit: 15,
            questions: [
                {
                    question: 'Hadoop is a distributed storage and processing framework.',
                    option1: 'True',
                    option2: 'False',
                    option3: '',
                    option4: '',
                    correct_answer: 'A',
                    marks: 1
                }
            ]
        })
    });

    assert.equal(res.response.status, 200, `Creating 2-option exam failed: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.id, 'Exam ID must be returned');

    // Clean up created test exam
    await query('DELETE FROM exams WHERE id = ?', [res.body.id]);
});

test('QA Regression 3: IDOR Security — Student cannot access another student proctoring report', async () => {
    const student1 = await loginUser('student1', 'pass1', 'Student');
    const student2 = await loginUser('student2', 'pass1', 'Student');
    const admin = await loginUser('admin', 'admin123', 'Admin');

    const examRow = await query('SELECT id FROM exams LIMIT 1');
    assert.ok(examRow.length > 0, 'Exam must exist');
    const examId = examRow[0].id;

    // Create a temporary mock result for student2
    const tempResult = await query(
        'INSERT INTO results (student_id, exam_id, score, total_marks, submit_reason) VALUES (?, ?, 4, 5, "QA_TEST")',
        [student2.user.id, examId]
    );
    const resultId = tempResult.insertId;

    try {
        // 1. Student1 tries to access Student2's report data -> MUST BE 403
        const unauthorizedData = await apiRequest(`/api/proctor/report/${resultId}`, {
            headers: { Authorization: `Bearer ${student1.token}` }
        });
        assert.equal(unauthorizedData.response.status, 403, 'Unauthorized student must be denied report data');
        assert.match(unauthorizedData.body.error, /access denied/i);

        // 2. Student1 tries to download Student2's report PDF -> MUST BE 403
        const unauthorizedPDF = await apiRequest(`/api/proctor/report-pdf/${resultId}`, {
            headers: { Authorization: `Bearer ${student1.token}` }
        });
        assert.equal(unauthorizedPDF.response.status, 403, 'Unauthorized student must be denied report PDF');

        // 3. Student2 (owner) CAN access own report data -> 200
        const ownerData = await apiRequest(`/api/proctor/report/${resultId}`, {
            headers: { Authorization: `Bearer ${student2.token}` }
        });
        assert.equal(ownerData.response.status, 200, 'Owner student must be allowed to view own report');

        // 4. Admin CAN access any report data -> 200
        const adminData = await apiRequest(`/api/proctor/report/${resultId}`, {
            headers: { Authorization: `Bearer ${admin.token}` }
        });
        assert.equal(adminData.response.status, 200, 'Admin must be allowed to view student report');
    } finally {
        await query('DELETE FROM results WHERE id = ?', [resultId]);
    }
});

test('QA Regression 4: Role-based authorization blocks Student from Admin endpoints', async () => {
    const student = await loginUser('student1', 'pass1', 'Student');
    const auth = { Authorization: `Bearer ${student.token}` };

    // 1. Student cannot access /api/exams POST
    const examCreate = await apiRequest('/api/exams', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ name: 'Hacked Exam' })
    });
    assert.equal(examCreate.response.status, 403);

    // 2. Student cannot update proctoring settings
    const settingsUpdate = await apiRequest('/api/proctor/settings', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ max_warnings: 10 })
    });
    assert.equal(settingsUpdate.response.status, 403);

    // 3. Student cannot access all students list
    const studentList = await apiRequest('/api/students', {
        headers: auth
    });
    assert.equal(studentList.response.status, 403);
});

test('QA Regression 5: Double-submit race condition returns 403 instead of 500 error', async () => {
    const student = await loginUser('student1', 'pass1', 'Student');
    const auth = { Authorization: `Bearer ${student.token}` };

    const examRow = await query('SELECT id FROM exams LIMIT 1');
    const examId = examRow[0].id;

    // Create an existing result for student1
    const tempResult = await query(
        'INSERT INTO results (student_id, exam_id, score, total_marks, submit_reason) VALUES (?, ?, 5, 5, "QA_TEST")',
        [student.user.id, examId]
    );
    const resultId = tempResult.insertId;

    try {
        // Attempting to submit again
        const res = await apiRequest('/api/submit', {
            method: 'POST',
            headers: auth,
            body: JSON.stringify({
                exam_id: examId,
                answers: {},
                autoSubmit: false,
                reason: 'DUPLICATE_RACE'
            })
        });
        assert.equal(res.response.status, 403, 'Resubmission must return 403');
        assert.equal(res.body.error, 'This exam has already been submitted.');
    } finally {
        await query('DELETE FROM results WHERE id = ?', [resultId]);
        await query('DELETE FROM proctor_status WHERE student_id = ? AND exam_id = ?', [student.user.id, examId]);
    }
});

test('QA Regression 6: AI Performance Analysis returns valid structured analysis without errors', async () => {
    const student = await loginUser('student1', 'pass1', 'Student');
    const auth = { Authorization: `Bearer ${student.token}` };

    const examRow = await query('SELECT id FROM exams LIMIT 1');
    const examId = examRow[0].id;

    const tempResult = await query(
        'INSERT INTO results (student_id, exam_id, score, total_marks, submit_reason) VALUES (?, ?, 4, 5, "QA_TEST")',
        [student.user.id, examId]
    );
    const resultId = tempResult.insertId;

    try {
        const res = await apiRequest(`/api/ai-analysis/${resultId}`, { headers: auth });
        assert.equal(res.response.status, 200, `AI Analysis failed: ${JSON.stringify(res.body)}`);
        assert.equal(res.body.success, true);
        assert.ok(res.body.analysis, 'Analysis object must exist');
        assert.ok(res.body.analysis.summary, 'Summary must exist in analysis');
        assert.ok(Array.isArray(res.body.analysis.strengths), 'Strengths must be array');
        assert.ok(Array.isArray(res.body.analysis.weaknesses), 'Weaknesses must be array');
    } finally {
        await query('DELETE FROM results WHERE id = ?', [resultId]);
    }
});

test('QA Regression 7: Proctoring incident logging, live risk scoring, and identity verification', async () => {
    const student = await loginUser('student1', 'pass1', 'Student');
    const auth = { Authorization: `Bearer ${student.token}` };

    const examRow = await query('SELECT id FROM exams LIMIT 1');
    const examId = examRow[0].id;

    try {
        // 1. Identity verification
        const verifyRes = await apiRequest('/api/proctor/verify-identity', {
            method: 'POST',
            headers: auth,
            body: JSON.stringify({
                exam_id: examId,
                image_data: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
            })
        });
        assert.equal(verifyRes.response.status, 200);
        assert.equal(verifyRes.body.verified, true);

        // 2. Flag violation
        const flagRes = await apiRequest('/api/flag-violation', {
            method: 'POST',
            headers: auth,
            body: JSON.stringify({
                exam_id: examId,
                violation_type: 'TAB_SWITCH',
                confidence: 0.98,
                risk_score: 15,
                details: { message: 'Switched tab' }
            })
        });
        assert.equal(flagRes.response.status, 200);
        assert.ok(flagRes.body.warningCount >= 1);
        assert.ok(flagRes.body.liveRiskScore >= 15);

        // 3. Security status check
        const secRes = await apiRequest(`/api/exam-security-status?exam_id=${examId}`, { headers: auth });
        assert.equal(secRes.response.status, 200);
        assert.equal(secRes.body.active, true);
        assert.equal(secRes.body.identity_verified, true);
        assert.ok(secRes.body.warnings >= 1);
    } finally {
        await query('DELETE FROM warnings WHERE user_id = ? AND exam_id = ?', [student.user.id, examId]);
        await query('DELETE FROM proctor_status WHERE student_id = ? AND exam_id = ?', [student.user.id, examId]);
    }
});
