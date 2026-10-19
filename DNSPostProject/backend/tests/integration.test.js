const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
const TEST_USERNAME = process.env.TEST_STUDENT_USERNAME || 'student1';
const TEST_PASSWORD = process.env.TEST_STUDENT_PASSWORD || 'pass1';

const { pool } = require('../config/db');

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

async function downloadRequest(url, headers = {}) {
    const response = await fetch(`${BASE_URL}${url}`, { headers });
    return { response, bytes: new Uint8Array(await response.arrayBuffer()) };
}

async function login() {
    const { response, body } = await apiRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify({
            username: TEST_USERNAME,
            password: TEST_PASSWORD,
            role: 'student',
        }),
    });
    assert.equal(response.status, 200, `Login failed: ${JSON.stringify(body)}`);
    return { token: body.token, userId: body.user.id, username: body.user.username };
}

test('health endpoint proves the API and MySQL database are healthy', async () => {
    const { response, body } = await apiRequest('/api/health');
    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.database.ok, true);
});

test('invalid student credentials are rejected', async () => {
    const { response, body } = await apiRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify({
            username: TEST_USERNAME,
            password: 'definitely-wrong-password',
            role: 'student',
        }),
    });
    assert.equal(response.status, 401);
    assert.equal(body.error, 'Invalid credentials');
});

test('authenticated student can retrieve exams and questions', async () => {
    const { token } = await login();
    const auth = { Authorization: `Bearer ${token}` };
    const { response: examsResponse, body: exams } = await apiRequest('/api/exams', { headers: auth });
    assert.equal(examsResponse.status, 200);
    assert.ok(Array.isArray(exams));
    assert.ok(exams.length > 0);

    const eligibleExam = exams.find((exam) => exam.exam_status === 'published' && exam.already_attempted !== true);
    assert.ok(eligibleExam, 'No unattempted published exam was available');

    const { response: questionsResponse, body: questions } = await apiRequest(
        `/api/exam-questions/${eligibleExam.id}`,
        { headers: auth },
    );
    assert.equal(questionsResponse.status, 200, JSON.stringify(questions));
    assert.ok(questions.total_questions > 0);
    assert.ok(Array.isArray(questions.questions));
});

test('student submission, scoring, and downloadable reports work and test data is cleaned', async () => {
    const { token, userId } = await login();
    const auth = { Authorization: `Bearer ${token}` };
    const { body: exams } = await apiRequest('/api/exams', { headers: auth });
    const eligibleExam = exams.find((exam) => exam.exam_status === 'published' && exam.already_attempted !== true);
    assert.ok(eligibleExam, 'No unattempted published exam was available');

    const { response: questionsResponse, body: questions } = await apiRequest(
        `/api/exam-questions/${eligibleExam.id}`,
        { headers: auth },
    );
    if (questionsResponse.status !== 200) {
        throw new Error(`Exam ${eligibleExam.id} cannot be started: ${JSON.stringify(questions)}`);
    }

    let submission = null;
    let resultId = null;
    try {
        const response = await apiRequest('/api/submit', {
            method: 'POST',
            headers: auth,
            body: JSON.stringify({
                exam_id: eligibleExam.id,
                answers: {},
                autoSubmit: false,
                reason: 'INTEGRATION_TEST',
            }),
        });
        assert.equal(response.response.status, 200, JSON.stringify(response.body));
        submission = response.body;
        resultId = submission.result_id;
        assert.equal(submission.success, true);
        assert.equal(submission.total_marks, questions.total_questions);
        assert.equal(submission.score, 0);
        assert.equal(submission.percentage, 0);
        assert.equal(submission.passed, false);

        const certificate = await downloadRequest(`/api/result-pdf/${resultId}`, auth);
        assert.equal(certificate.response.status, 200);
        assert.ok(certificate.response.headers.get('content-type')?.includes('application/pdf'));
        assert.ok(certificate.bytes.length > 100);

        const hallTicket = await downloadRequest(`/api/hall-ticket/${eligibleExam.id}`, auth);
        assert.equal(hallTicket.response.status, 200);
        assert.ok(hallTicket.response.headers.get('content-type')?.includes('application/pdf'));
        assert.ok(hallTicket.bytes.length > 100);
    } finally {
        const { query } = require('../config/db');
        if (resultId) {
            await query('DELETE FROM results WHERE id = ?', [resultId]);
        }
        await query('DELETE FROM proctor_status WHERE student_id = ? AND exam_id = ?', [userId, eligibleExam.id]);
    }
});
