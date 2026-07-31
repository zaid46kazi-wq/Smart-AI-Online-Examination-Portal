/**
 * AI Service — Gemini question generation from PDF
 */
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

let pdfjsLib = null;

async function readPDF(buffer) {
    if (!pdfjsLib) {
        try {
            pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        } catch (err) {
            console.error('[AI] Failed to load pdfjs-dist:', err.message);
            throw new Error('PDF parsing unavailable');
        }
    }
    const data = new Uint8Array(buffer);
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text;
}

async function generateQuestions(filePath, numQuestions = 30, difficulty = 'Medium', subjectName = 'General') {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY or GOOGLE_GENAI_API_KEY is not set in environment variables');
    }

    const fileBuffer = fs.readFileSync(filePath);
    const text = await readPDF(fileBuffer);

    if (!text || text.trim().length === 0) {
        throw new Error('Could not extract text from PDF');
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an AI Question Generator. Read the following text from a syllabus/module for the subject "${subjectName}" and generate exactly ${numQuestions} multiple-choice questions.
The difficulty level of these questions should be: ${difficulty}.
Return ONLY a strictly valid JSON array of objects with the following keys:
"question" (string), "option1" (string), "option2" (string), "option3" (string), "option4" (string), "correct_answer" (string: exactly "A", "B", "C", or "D").
Your response MUST be ONLY the raw JSON array, without any markdown formatting like \`\`\`json.

Text:
${text.substring(0, 30000)}`;

    const modelsToTry = [
        'gemini-flash-latest',
        'gemini-flash-lite-latest',
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash'
    ];
    const MAX_RETRIES = 3;
    let lastError = null;
    let resultText = '';

    for (const modelName of modelsToTry) {
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`[AI] Trying ${modelName} (attempt ${attempt}/${MAX_RETRIES})...`);
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: prompt,
                });
                resultText = response.text;
                console.log(`[AI] Success with ${modelName} on attempt ${attempt}`);
                lastError = null;
                break;
            } catch (e) {
                lastError = e;
                console.warn(`[AI] ${modelName} attempt ${attempt} failed: ${e.message}`);
                const isRetryable = /503|429|UNAVAILABLE|overloaded|high demand|RESOURCE_EXHAUSTED/i.test(e.message);
                if (!isRetryable) break;
                if (attempt < MAX_RETRIES) {
                    await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
                }
            }
        }
        if (!lastError) break;
    }

    if (lastError || !resultText) {
        throw new Error('AI generation failed: ' + (lastError?.message || 'No response'));
    }

    resultText = resultText.replace(/^\s*(```json)/i, '').replace(/(```)\s*$/i, '').trim();
    const questions = JSON.parse(resultText);

    if (!Array.isArray(questions)) {
        throw new Error("AI didn't return a valid array");
    }

    const validQuestions = questions
        .filter(q => q && typeof q === 'object' && q.question && String(q.question).trim().length > 0)
        .filter(q => (q.option1 || q.option2 || q.option3 || q.option4))
        .map((q, i) => {
            let correct = String(q.correct_answer || 'A').trim().toUpperCase().charAt(0);
            if (!['A', 'B', 'C', 'D'].includes(correct)) correct = 'A';
            return {
                question: `${i + 1}. ${(q.question || 'Untitled Question').replace(/^\d+\.\s*/, '')}`,
                option1: String(q.option1 || '').trim(),
                option2: String(q.option2 || '').trim(),
                option3: String(q.option3 || '').trim(),
                option4: String(q.option4 || '').trim(),
                correct_answer: correct,
                marks: 1
            };
        });

    if (validQuestions.length === 0) {
        throw new Error('AI generated questions, but none met minimum quality standards (non-empty question and options).');
    }

    return validQuestions.slice(0, numQuestions);
}

module.exports = { generateQuestions };
