/**
 * AI Evaluation Service — Gemini-powered document extraction & answer evaluation
 * Uses Gemini Vision for OCR, question extraction, scheme parsing, and semantic evaluation.
 */
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

let pdfjsLib = null;

const EVAL_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
const VISION_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];
const REQUEST_TIMEOUT = 60000;

function getApiKey() {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not configured');
    return key;
}

function createAI() {
    return new GoogleGenAI({ apiKey: getApiKey() });
}

function withTimeout(promise, ms = REQUEST_TIMEOUT) {
    let timer;
    return Promise.race([
        promise.finally(() => clearTimeout(timer)),
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`AI request timed out after ${ms}ms`)), ms);
        })
    ]);
}

async function callGemini(prompt, models = EVAL_MODELS, timeoutMs = REQUEST_TIMEOUT) {
    const ai = createAI();
    let lastError = null;

    for (const model of models) {
        try {
            console.log(`[AI-EVAL] Trying model "${model}"...`);
            const response = await withTimeout(
                ai.models.generateContent({ model, contents: prompt }),
                timeoutMs
            );
            const text = response?.text || '';
            if (text.trim().length > 0) {
                console.log(`[AI-EVAL] Model "${model}" responded (${text.length} chars)`);
                return text;
            }
        } catch (err) {
            lastError = err;
            console.warn(`[AI-EVAL] Model "${model}" failed: ${err.message}`);
            if (err.status === 401 || err.status === 403) throw err;
        }
    }
    throw lastError || new Error('All AI models failed to respond');
}

async function callGeminiWithFile(prompt, filePath, mimeType, models = VISION_MODELS) {
    const ai = createAI();
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    let lastError = null;

    for (const model of models) {
        try {
            console.log(`[AI-EVAL] Vision request with model "${model}"...`);
            const response = await withTimeout(
                ai.models.generateContent({
                    model,
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { inlineData: { mimeType, data: base64Data } },
                                { text: prompt }
                            ]
                        }
                    ]
                }),
                90000
            );
            const text = response?.text || '';
            if (text.trim().length > 0) {
                console.log(`[AI-EVAL] Vision model "${model}" responded (${text.length} chars)`);
                return text;
            }
        } catch (err) {
            lastError = err;
            console.warn(`[AI-EVAL] Vision model "${model}" failed: ${err.message}`);
            if (err.status === 401 || err.status === 403) throw err;
        }
    }
    throw lastError || new Error('All vision models failed');
}

function parseJSONFromAI(text) {
    // Try direct parse
    try {
        return JSON.parse(text);
    } catch (_) {}

    // Strip markdown fences
    let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    try {
        return JSON.parse(cleaned);
    } catch (_) {}

    // Find array or object
    const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (match) {
        try { return JSON.parse(match[0]); } catch (_) {}
    }

    throw new Error('Could not parse AI response as JSON');
}

async function readPDFText(filePath) {
    if (!pdfjsLib) {
        try {
            pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        } catch (err) {
            console.error('[AI-EVAL] pdfjs-dist unavailable:', err.message);
            return '';
        }
    }
    const data = new Uint8Array(fs.readFileSync(filePath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text;
}

// ─── Question Paper Extraction ──────────────────────────────────────

async function extractQuestionsFromDocument(filePath, mimeType) {
    const isImage = mimeType && mimeType.startsWith('image/');
    const isPDF = mimeType === 'application/pdf';

    const prompt = `You are an expert university question paper parser.
Analyze this question paper document and extract ALL questions with their structure.

For EACH question, extract:
- question_number: The main question number (e.g., "1", "2", "3")
- sub_question: Sub-question letter/number if any (e.g., "a", "b", "i", "ii", or empty string)
- question_text: The full question text
- max_marks: Maximum marks for this question/sub-question
- has_internal_choice: true if this question has OR/alternative choices
- choice_group: If there's an internal choice, group identifier (e.g., "1a_or" for questions that are alternatives)

Return ONLY a valid JSON array of objects. Example:
[
  {"question_number": "1", "sub_question": "a", "question_text": "Define polymorphism...", "max_marks": 5, "has_internal_choice": false, "choice_group": ""},
  {"question_number": "1", "sub_question": "b", "question_text": "Explain inheritance...", "max_marks": 5, "has_internal_choice": true, "choice_group": "1b_or"},
  {"question_number": "1", "sub_question": "b_or", "question_text": "Discuss encapsulation...", "max_marks": 5, "has_internal_choice": true, "choice_group": "1b_or"}
]

Extract ALL questions. Do not skip any. Return ONLY the JSON array.`;

    let responseText;

    if (isImage || isPDF) {
        // Try vision-based extraction first
        try {
            responseText = await callGeminiWithFile(prompt, filePath, isPDF ? 'application/pdf' : mimeType);
        } catch (err) {
            console.warn('[AI-EVAL] Vision extraction failed, trying text extraction:', err.message);
        }
    }

    // Fallback: extract text from PDF and use text-based AI
    if (!responseText && isPDF) {
        const pdfText = await readPDFText(filePath);
        if (pdfText && pdfText.trim().length > 50) {
            responseText = await callGemini(prompt + '\n\nDocument text:\n' + pdfText.substring(0, 40000));
        }
    }

    if (!responseText) {
        throw new Error('Could not extract questions from the document. The file may be unreadable.');
    }

    const questions = parseJSONFromAI(responseText);
    if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('No questions could be extracted from the document.');
    }

    return questions.map((q, idx) => ({
        question_number: String(q.question_number || idx + 1),
        sub_question: String(q.sub_question || ''),
        question_text: String(q.question_text || '').trim(),
        max_marks: parseInt(q.max_marks) || 0,
        has_internal_choice: !!q.has_internal_choice,
        choice_group: String(q.choice_group || ''),
        raw: q
    }));
}

// ─── Valuation Scheme Extraction ────────────────────────────────────

async function extractValuationScheme(filePath, mimeType, existingQuestions = []) {
    const questionContext = existingQuestions.length > 0
        ? '\n\nConfirmed question numbers from the question paper:\n' +
          existingQuestions.map(q => `- Q${q.question_number}${q.sub_question ? '(' + q.sub_question + ')' : ''}: ${q.question_text.substring(0, 80)}... [${q.max_marks} marks]`).join('\n')
        : '';

    const prompt = `You are an expert university valuation scheme parser.
Analyze this official scheme of valuation / answer key document and extract the marking scheme for each question.

For EACH answer/marking entry, extract:
- question_number: The question number this scheme entry applies to
- sub_question: Sub-question if any (e.g., "a", "b")
- expected_answer: The model/expected answer or key points
- marking_breakdown: Array of objects with {"point": "description", "marks": number} for each marking criterion
- partial_marks_rules: Any rules for partial marks (e.g., "Award 1 mark for each correct step")

IMPORTANT: 
- Do NOT invent marking rules if the document does not specify them.
- Extract only what is explicitly stated in the scheme.
- If a question's scheme is missing or unclear, set expected_answer to "" and marking_breakdown to [].
${questionContext}

Return ONLY a valid JSON array. Example:
[
  {
    "question_number": "1",
    "sub_question": "a",
    "expected_answer": "Polymorphism is the ability of an object to take many forms...",
    "marking_breakdown": [
      {"point": "Definition of polymorphism", "marks": 2},
      {"point": "Types: compile-time and runtime", "marks": 2},
      {"point": "Example", "marks": 1}
    ],
    "partial_marks_rules": "Award marks for each valid point mentioned"
  }
]`;

    let responseText;
    const isImage = mimeType && mimeType.startsWith('image/');
    const isPDF = mimeType === 'application/pdf';

    if (isImage || isPDF) {
        try {
            responseText = await callGeminiWithFile(prompt, filePath, isPDF ? 'application/pdf' : mimeType);
        } catch (err) {
            console.warn('[AI-EVAL] Vision scheme extraction failed:', err.message);
        }
    }

    if (!responseText && isPDF) {
        const pdfText = await readPDFText(filePath);
        if (pdfText && pdfText.trim().length > 50) {
            responseText = await callGemini(prompt + '\n\nScheme text:\n' + pdfText.substring(0, 40000));
        }
    }

    if (!responseText) {
        throw new Error('Could not extract valuation scheme from the document.');
    }

    const entries = parseJSONFromAI(responseText);
    if (!Array.isArray(entries) || entries.length === 0) {
        throw new Error('No scheme entries could be extracted.');
    }

    return entries.map(e => ({
        question_number: String(e.question_number || ''),
        sub_question: String(e.sub_question || ''),
        expected_answer: String(e.expected_answer || ''),
        marking_breakdown: Array.isArray(e.marking_breakdown) ? e.marking_breakdown : [],
        partial_marks_rules: e.partial_marks_rules || null,
        raw: e
    }));
}

// ─── Module PDF Concept Extraction ──────────────────────────────────

async function extractModuleConcepts(filePath, mimeType) {
    const pdfText = await readPDFText(filePath);
    if (!pdfText || pdfText.trim().length < 50) {
        return { concepts: [], rawText: '' };
    }

    const prompt = `Extract the key academic concepts, definitions, formulas, and important points from this study material.
Return a JSON object with:
- "concepts": array of strings, each being a key concept or definition (max 50 items)

Return ONLY the JSON object.

Text:
${pdfText.substring(0, 30000)}`;

    try {
        const text = await callGemini(prompt);
        const parsed = parseJSONFromAI(text);
        return {
            concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
            rawText: pdfText.substring(0, 10000)
        };
    } catch (err) {
        console.warn('[AI-EVAL] Module extraction fallback:', err.message);
        return { concepts: [], rawText: pdfText.substring(0, 10000) };
    }
}

// ─── Answer Booklet OCR ─────────────────────────────────────────────

async function extractAnswerBookletOCR(filePath, mimeType, confirmedQuestions = []) {
    const questionContext = confirmedQuestions.length > 0
        ? '\n\nThe student is answering these confirmed questions:\n' +
          confirmedQuestions.map(q => `- Q${q.question_number}${q.sub_question ? '(' + q.sub_question + ')' : ''}: ${q.question_text.substring(0, 60)}...`).join('\n')
        : '';

    const prompt = `You are an expert OCR system for handwritten university examination answer booklets.

Carefully read and transcribe ALL handwritten answers from this scanned answer booklet.

For each answer found, extract:
- question_number: The question number the student is answering
- sub_question: Sub-question if any
- answer_text: The transcribed text of the student's handwritten answer (preserve their words, formulas, diagrams descriptions)
- ocr_confidence: Your confidence in the OCR accuracy (0.0 to 1.0)
- page_number: Which page this answer appears on (estimate if unclear)
- has_diagram: true if the answer contains a diagram or figure
- is_readable: true if the handwriting is clearly readable, false if uncertain
- uncertain_parts: Array of strings describing any parts you're uncertain about

IMPORTANT:
- Transcribe exactly what the student wrote, even if it contains errors.
- If handwriting is unclear, provide your best reading and set ocr_confidence lower.
- Do NOT skip answers just because handwriting is poor.
- Match answers to question numbers when the student has written them.
- If you cannot determine the question number, use "unknown_N" where N is sequential.
${questionContext}

Return ONLY a valid JSON array. Example:
[
  {
    "question_number": "1",
    "sub_question": "a",
    "answer_text": "Polymorphism refers to the ability...",
    "ocr_confidence": 0.92,
    "page_number": 1,
    "has_diagram": false,
    "is_readable": true,
    "uncertain_parts": []
  }
]`;

    const isImage = mimeType && mimeType.startsWith('image/');
    const isPDF = mimeType === 'application/pdf';

    let responseText;
    if (isImage || isPDF) {
        responseText = await callGeminiWithFile(prompt, filePath, isPDF ? 'application/pdf' : mimeType);
    }

    if (!responseText) {
        throw new Error('Could not perform OCR on the answer booklet. The file may be unreadable.');
    }

    const answers = parseJSONFromAI(responseText);
    if (!Array.isArray(answers)) {
        throw new Error('Could not parse OCR results.');
    }

    return answers.map((a, idx) => ({
        question_number: String(a.question_number || `unknown_${idx + 1}`),
        sub_question: String(a.sub_question || ''),
        answer_text: String(a.answer_text || ''),
        ocr_confidence: parseFloat(a.ocr_confidence) || 0.5,
        page_number: parseInt(a.page_number) || 1,
        has_diagram: !!a.has_diagram,
        is_readable: a.is_readable !== false,
        uncertain_parts: Array.isArray(a.uncertain_parts) ? a.uncertain_parts : []
    }));
}

// ─── Answer Evaluation ──────────────────────────────────────────────

async function evaluateStudentAnswer({
    question,
    scheme,
    studentAnswer,
    evaluationMode,
    moduleConcepts = [],
    maxMarks
}) {
    const modeInstructions = evaluationMode === 'easy'
        ? `EASY EVALUATION MODE:
- Generous, concept-centric evaluation.
- Accept technically correct explanations written in the student's own words.
- Recognize synonyms, diagrams, flowcharts, and alternative valid methods.
- Award appropriate partial marks for relevant concepts and understanding.
- Forgiving on minor syntax, typo, or unit omission mistakes.
- Deduct marks only for clear factual errors and completely missing concepts.`
        : `HARD EVALUATION MODE:
- Strict, rigorous evaluation adhering strictly to the official valuation scheme.
- Enforce precision in definitions, mathematical steps, derivations, and diagrams.
- Deduct marks for omitted steps, missing key formulae, or incorrect reasoning.
- Do not award marks for vague assertions or incomplete explanations.
- Accept equivalent technical wording only when meaning is completely accurate.`;

    const moduleContext = moduleConcepts.length > 0
        ? `\n\nRELEVANT SUBJECT MATERIALS (Reference only, not a replacement for scheme):\n${moduleConcepts.slice(0, 20).map(c => `- ${c}`).join('\n')}`
        : '';

    const schemeText = scheme
        ? `Expected Answer / Ideal Points: ${scheme.expected_answer || 'Not specified'}
Marking Breakdown: ${JSON.stringify(scheme.marking_breakdown || [])}
Partial Marks Rules: ${scheme.partial_marks_rules || 'Award partial marks according to breakdown'}`
        : 'No specific scheme available — evaluate based on fundamental engineering principles and flag for manual faculty review.';

    const prompt = `You are an academic answer evaluator for an engineering college examination system.

Your task is to suggest marks based on the question, maximum marks, faculty-approved valuation scheme, relevant subject materials, and the student's answer.

RULES:
1. Treat the confirmed official valuation scheme as the primary marking authority.
2. Recognize correct explanations expressed in the student's own words.
3. Evaluate meaning and technical correctness, not just keyword presence.
4. Award partial marks only when supported by the applicable rubric.
5. Do not award marks for irrelevant content or incorrect statements simply because expected keywords appear.
6. Do not penalize grammar or spelling unless relevant to the question.
7. Follow the selected Easy or Hard evaluation mode without changing the official maximum marks or overriding mandatory marking rules.
8. Never invent official marking rules. Flag missing or ambiguous criteria for faculty review.
9. Identify evidence from the student's answer supporting each awarded mark.
10. Distinguish incorrect content from missing content and unreadable OCR text.
11. If the answer is unreadable or the question match is uncertain, request manual review instead of guessing.
12. Return structured JSON matching the backend's defined schema.
13. Suggested marks are provisional and must be reviewed by faculty before becoming official.

EVALUATION MODE SPECIFICS:
${modeInstructions}

QUESTION DETAILS:
Question: Q${question.question_number}${question.sub_question ? '(' + question.sub_question + ')' : ''}: ${question.question_text}
Maximum Marks: ${maxMarks}

FACULTY-APPROVED VALUATION SCHEME:
${schemeText}
${moduleContext}

STUDENT'S ANSWER (TRANSCRIPTION / OCR):
${studentAnswer ? studentAnswer.trim() : '[No answer provided / Blank]'}

Use only the information provided and reliable subject knowledge appropriate to the question. Never claim that your score is an official VTU valuation unless the authorized faculty approves it.

Return ONLY a valid JSON object matching this schema:
{
  "maximum_marks": ${maxMarks},
  "suggested_marks": <number between 0 and ${maxMarks}>,
  "credited_concepts": ["list of correct concepts identified in the student's answer"],
  "missing_concepts": ["list of expected scheme points the student missed"],
  "incorrect_statements": ["list of inaccuracies or incorrect statements identified"],
  "evidence_from_answer": "Direct quotes or evidence from the student's answer supporting awarded marks",
  "scoring_explanation": "Clear step-by-step rationale for marks awarded based on rubric and mode",
  "evaluation_confidence": <float between 0.0 and 1.0>,
  "requires_manual_review": <true if OCR is ambiguous, criteria are missing, or evaluation is uncertain, else false>
}`;

    const text = await callGemini(prompt, EVAL_MODELS, 45000);
    const result = parseJSONFromAI(text);

    // Enforce constraints
    let marks = parseFloat(result.suggested_marks) || 0;
    if (marks < 0) marks = 0;
    if (marks > maxMarks) marks = maxMarks;

    const credited = Array.isArray(result.credited_concepts)
        ? result.credited_concepts
        : (Array.isArray(result.correct_concepts) ? result.correct_concepts : []);

    const missing = Array.isArray(result.missing_concepts)
        ? result.missing_concepts
        : (Array.isArray(result.missing_points) ? result.missing_points : []);

    const incorrect = Array.isArray(result.incorrect_statements)
        ? result.incorrect_statements : [];

    const explanation = String(result.scoring_explanation || result.explanation || '');
    const evidence = String(result.evidence_from_answer || result.evidence || '');
    const evalConfidence = Math.min(1, Math.max(0, parseFloat(result.evaluation_confidence || result.eval_confidence) || 0.5));
    const needsReview = result.requires_manual_review !== undefined
        ? !!result.requires_manual_review
        : !!result.needs_review;

    return {
        maximum_marks: maxMarks,
        suggested_marks: marks,
        credited_concepts: credited,
        correct_concepts: credited, // compatibility alias
        missing_concepts: missing,
        missing_points: missing,     // compatibility alias
        incorrect_statements: incorrect,
        evidence_from_answer: evidence,
        evidence: evidence,          // compatibility alias
        scoring_explanation: explanation,
        explanation: explanation,    // compatibility alias
        evaluation_confidence: evalConfidence,
        eval_confidence: evalConfidence, // compatibility alias
        requires_manual_review: needsReview,
        needs_review: needsReview    // compatibility alias
    };
}

module.exports = {
    extractQuestionsFromDocument,
    extractValuationScheme,
    extractModuleConcepts,
    extractAnswerBookletOCR,
    evaluateStudentAnswer,
    readPDFText
};
