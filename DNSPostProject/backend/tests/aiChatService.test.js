const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const {
    normalizeChatHistory,
    buildAcademicChatPrompt,
    generateAcademicReply,
} = require('../services/aiChatService');

test('normalizes bounded chat history to the contract used by Gemini', () => {
    const history = [
        { role: 'user', content: 'What is inheritance?' },
        { role: 'assistant', content: 'A concept.' },
        { role: 'user', content: 'Give me an example.' },
        { role: 'unknown', content: 'Ignored.' },
        { role: 'user', content: 'x'.repeat(1000) },
    ];

    assert.deepEqual(normalizeChatHistory(history, 2), [
        { role: 'user', content: 'Give me an example.' },
        { role: 'user', content: 'x'.repeat(500) },
    ]);
});

test('builds a safe academic prompt with no student data or answer keys', () => {
    const prompt = buildAcademicChatPrompt({
        message: 'Explain binary search',
        history: [{ role: 'user', content: 'What is inheritance?' }],
        studentName: 'Student One',
    });

    assert.match(prompt, /You are a knowledgeable, friendly AI academic tutor/);
    assert.match(prompt, /Explain binary search/);
    assert.match(prompt, /active live exam question/i);
    assert.doesNotMatch(prompt, /Student One/);
    assert.doesNotMatch(prompt, /correct answer/i);
});

test('the real Gemini service returns a concise academic response', async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is required for the live Gemini integration test');
    }

    const reply = await generateAcademicReply({
        message: 'Explain binary search in simple terms',
        history: [],
        apiKey,
        model: process.env.AI_MODEL || 'gemini-3.5-flash-lite',
        timeoutMs: 15000,
    });

    assert.ok(reply.length >= 20);
    assert.doesNotMatch(reply, /I cannot provide the answer to an active exam/i);
});
