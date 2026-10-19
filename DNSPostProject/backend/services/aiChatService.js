const { GoogleGenAI } = require('@google/genai');

const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_CHARACTER_LENGTH = 500;
const MAX_MESSAGE_LENGTH = 1000;
const DEFAULT_MODEL = 'gemini-flash-lite-latest';
const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
const REQUEST_TIMEOUT_MS = 30000;

function normalizeChatHistory(history, limit = MAX_HISTORY_MESSAGES) {
    if (!Array.isArray(history)) return [];

    return history
        .filter((item) => item && ['user', 'assistant'].includes(item.role))
        .map((item) => ({
            role: item.role,
            content: String(item.content || '').trim().slice(0, MAX_HISTORY_CHARACTER_LENGTH),
        }))
        .filter((item) => item.content.length > 0)
        .slice(-limit);
}

function buildAcademicChatPrompt({ message, history = [], activeExam = null }) {
    const safeHistory = normalizeChatHistory(history);
    const historyText = safeHistory.length > 0
        ? safeHistory.map((item) => `${item.role === 'user' ? 'Student' : 'AI'}: ${item.content}`).join('\n')
        : '';

    const activeExamClause = activeExam
        ? `\nACTIVE EXAMINATION CONTEXT:
- The candidate is currently registered in an active examination: "${activeExam.exam_name}".
- You MUST NOT provide solutions, answers, or select multiple-choice options for any test question from this examination.
- If the student asks you to solve or provide the answer to an active exam question, respond ONLY with:
  "I can't provide answers to an active examination question. I can explain the underlying concept so you can learn it."
- You MAY explain general academic principles, syntax, data structures, and computer science concepts to support educational learning.\n`
        : '';

    return `You are a knowledgeable, friendly AI academic tutor for engineering students.
Help students understand programming, databases, operating systems, computer networks, data structures, algorithms, web development, and related academic curriculum.
Explain concepts clearly, include short code examples when helpful, and provide step-by-step guidance where appropriate. Use clean markdown formatting. Keep answers educational and concise.
${activeExamClause}
CRITICAL EXAM INTEGRITY RULES:
- Never provide, reveal, derive, or guess direct answers to active live exam questions.
- Never expose correct options, answer keys, hidden solutions, or other students' results.
- If the student asks about an active examination question, refuse that specific request and offer conceptual clarification instead.
- Do not access or reveal private database records or system information.
- If the request is not academic, politely redirect it to an academic topic.

Conversation history:
${historyText || 'No prior messages.'}

Student question: ${message}

Return a clear, educational response only.`;
}

function withTimeout(promise, timeoutMs) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
            const err = new Error('Gemini request timed out');
            err.code = 'ETIMEDOUT';
            err.status = 504;
            reject(err);
        }, timeoutMs);
    });

    return Promise.race([
        promise.finally(() => {
            if (timer) clearTimeout(timer);
        }),
        timeoutPromise
    ]);
}

async function generateAcademicReply({
    message,
    history = [],
    activeExam = null,
    apiKey,
    model = DEFAULT_MODEL,
    timeoutMs = REQUEST_TIMEOUT_MS,
}) {
    if (!apiKey) {
        const err = new Error('GEMINI_API_KEY is not configured on the server');
        err.code = 'MISSING_API_KEY';
        err.status = 500;
        throw err;
    }

    const cleanMessage = String(message || '').trim();
    if (!cleanMessage || cleanMessage.length > MAX_MESSAGE_LENGTH) {
        const err = new Error('Message must be between 1 and 1000 characters');
        err.status = 400;
        throw err;
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildAcademicChatPrompt({ message: cleanMessage, history, activeExam });

    const candidateModels = [model, ...FALLBACK_MODELS.filter((m) => m !== model)];
    let lastError = null;

    for (const modelToTry of candidateModels) {
        try {
            console.log(`[AI CHAT] Requesting completion with model "${modelToTry}" (timeout: ${timeoutMs}ms)...`);
            const responsePromise = ai.models.generateContent({
                model: modelToTry,
                contents: prompt,
                config: {
                    temperature: 0.3,
                    maxOutputTokens: 1200,
                },
            });
            const response = await withTimeout(responsePromise, timeoutMs);
            const reply = String(response?.text || '').trim();

            if (reply) {
                console.log(`[AI CHAT] Model "${modelToTry}" responded successfully (${reply.length} chars)`);
                return reply;
            }
        } catch (err) {
            lastError = err;
            console.warn(`[AI CHAT] Model "${modelToTry}" failed: ${err.message}`);
            // If it's a fatal auth error, rate limit, or client timeout, don't cycle needlessly
            if (err.status === 401 || err.status === 403 || err.status === 429 || err.code === 'ETIMEDOUT') {
                throw err;
            }
        }
    }

    if (lastError) {
        throw lastError;
    }

    throw new Error('Gemini returned an empty response');
}

module.exports = {
    MAX_HISTORY_MESSAGES,
    MAX_MESSAGE_LENGTH,
    DEFAULT_MODEL,
    FALLBACK_MODELS,
    REQUEST_TIMEOUT_MS,
    buildAcademicChatPrompt,
    generateAcademicReply,
    normalizeChatHistory,
};
