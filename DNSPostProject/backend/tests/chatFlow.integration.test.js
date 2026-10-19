const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');

const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const { query, pool } = require('../config/db');
const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5000';
const tempUsername = `chat_verify_${Date.now()}`;

test.after(async () => {
    await pool.end();
});

async function apiRequest(url, options = {}) {
    const response = await fetch(`${BASE_URL}${url}`, options);
    const body = await response.json();
    return { response, body };
}

async function login(username, password) {
    return apiRequest('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role: 'student' }),
    });
}

test('chatbot completes authenticated Gemini flow, preserves context, and blocks invalid use', async () => {
    const password = 'chat-verification-password';
    const hash = await bcrypt.hash(password, 10);
    const created = await query(
        'INSERT INTO students (username, password, role, name, usn, email) VALUES (?, ?, ?, ?, ?, ?)',
        [tempUsername, hash, 'Student', 'Chat Verification', 'CHATVERIFY', 'chat-verify@example.invalid']
    );

    try {
        const loginResponse = await login(tempUsername, password);
        assert.equal(loginResponse.response.status, 200);
        const auth = { Authorization: `Bearer ${loginResponse.body.token}`, 'Content-Type': 'application/json' };

        const first = await apiRequest('/api/ai/chat', {
            method: 'POST',
            headers: auth,
            body: JSON.stringify({ message: 'Explain DBMS normalization', history: [] }),
        });
        assert.equal(first.response.status, 200, JSON.stringify(first.body));
        assert.equal(first.body.success, true);
        assert.ok(first.body.reply.length > 100);
        assert.doesNotMatch(JSON.stringify(first.body), /GEMINI_API_KEY|GOOGLE_GENAI_API_KEY/);

        const second = await apiRequest('/api/ai/chat', {
            method: 'POST',
            headers: auth,
            body: JSON.stringify({
                message: 'Give me an example',
                history: [
                    { role: 'user', content: 'Explain DBMS normalization' },
                    { role: 'assistant', content: first.body.reply },
                ],
            }),
        });
        assert.equal(second.response.status, 200, JSON.stringify(second.body));
        assert.equal(second.body.success, true);
        assert.ok(second.body.reply.length > 20);

        const empty = await apiRequest('/api/ai/chat', {
            method: 'POST',
            headers: auth,
            body: JSON.stringify({ message: '   ' }),
        });
        assert.equal(empty.response.status, 400);
        assert.equal(empty.body.success, false);

        const unauthenticated = await apiRequest('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Explain binary search' }),
        });
        assert.equal(unauthenticated.response.status, 401);

        const activeLogin = await login('student1', 'pass1');
        assert.equal(activeLogin.response.status, 200);

        // Ensure student1 has an active verified exam session in proctor_status for the test
        const student1Row = await query('SELECT id FROM students WHERE username = ?', ['student1']);
        const examRow = await query('SELECT id FROM exams LIMIT 1');
        if (student1Row.length > 0 && examRow.length > 0) {
            await query(`
                INSERT INTO proctor_status (student_id, exam_id, status, identity_verified, exam_started_at)
                VALUES (?, ?, 'active', 1, NOW())
                ON DUPLICATE KEY UPDATE status = 'active', identity_verified = 1, exam_started_at = NOW()
            `, [student1Row[0].id, examRow[0].id]);
        }

        try {
            const activeExam = await apiRequest('/api/ai/chat', {
                method: 'POST',
                headers: { Authorization: `Bearer ${activeLogin.body.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Give me the answer to question 4' }),
            });
            assert.equal(activeExam.response.status, 403);
            assert.match(activeExam.body.error, /active examination question/i);
            assert.doesNotMatch(JSON.stringify(activeExam.body), /GEMINI_API_KEY|GOOGLE_GENAI_API_KEY/);

            console.log(`PASS authenticatedReply=${first.body.reply.length} multiTurnReply=${second.body.reply.length} emptyStatus=${empty.response.status} unauthStatus=${unauthenticated.response.status} activeExamStatus=${activeExam.response.status}`);
        } finally {
            if (student1Row.length > 0 && examRow.length > 0) {
                await query('DELETE FROM proctor_status WHERE student_id = ? AND exam_id = ?', [student1Row[0].id, examRow[0].id]);
            }
        }
    } finally {
        await query('DELETE FROM students WHERE id = ?', [created.insertId]);
    }
});
