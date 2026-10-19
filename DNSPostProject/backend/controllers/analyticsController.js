/**
 * Analytics Controller — Instructor Dashboard Statistics
 */
const { query, queryOne } = require('../config/db');

const analyticsController = {
    getOverview: async (req, res, next) => {
        try {
            const studentCountRes = await queryOne(`SELECT COUNT(*) AS totalStudents FROM students WHERE role = 'Student'`);
            const examCountRes = await queryOne(`SELECT COUNT(*) AS totalExams FROM exams`);
            const resultsRes = await query(`SELECT score, total_marks FROM results`);
            const warningCountRes = await queryOne(`SELECT COUNT(*) AS totalWarnings FROM warnings`);

            const scores = resultsRes.map(r => r.score);
            const percentages = resultsRes.map(r => r.total_marks > 0 ? Math.round((r.score / r.total_marks) * 100) : 0);

            const distribution = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
            percentages.forEach(p => {
                if (p <= 20) distribution['0-20']++;
                else if (p <= 40) distribution['21-40']++;
                else if (p <= 60) distribution['41-60']++;
                else if (p <= 80) distribution['61-80']++;
                else distribution['81-100']++;
            });

            const passCount = percentages.filter(p => p >= 40).length;

            return res.json({
                totalStudents: studentCountRes?.totalStudents || 0,
                totalExams: examCountRes?.totalExams || 0,
                avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
                highestScore: scores.length > 0 ? Math.max(...scores) : 0,
                lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
                totalResults: scores.length,
                passPercentage: scores.length > 0 ? Math.round((passCount / scores.length) * 100) : 0,
                totalWarnings: warningCountRes?.totalWarnings || 0,
                distribution
            });
        } catch (err) { next(err); }
    },

    chatAssistant: async (req, res, next) => {
        try {
            const { message, context = {} } = req.body;
            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                return res.status(400).json({ error: 'Message cannot be empty.' });
            }

            const cleanMsg = message.trim();
            const subject = context.subject || 'Engineering & Computer Science';
            const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

            let reply = '';

            if (apiKey) {
                try {
                    const { GoogleGenAI } = require('@google/genai');
                    const ai = new GoogleGenAI({ apiKey });
                    const prompt = `You are the AI Academic Study Assistant and Examination Doubt Solver for AGMR College of Engineering.
The student is studying or taking assessments related to "${subject}".
Student query: "${cleanMsg}"

Instructions:
1. Provide a direct, technically accurate, and concise explanation in 2-4 sentences or clear bullet points.
2. If relevant, include a practical example or key formula.
3. Keep the tone academic, encouraging, and supportive.
4. Do NOT disclose answers to active live exams; instead explain the underlying conceptual principle.`;

                    const responsePromise = ai.models.generateContent({
                        model: 'gemini-3.5-flash-lite',
                        contents: prompt
                    });
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 7000));
                    const resp = await Promise.race([responsePromise, timeoutPromise]);
                    reply = resp?.text || '';
                } catch (_) {}
            }

            if (!reply || reply.trim().length === 0) {
                const lower = cleanMsg.toLowerCase();
                if (lower.includes('proctor') || lower.includes('face') || lower.includes('cheat') || lower.includes('camera')) {
                    reply = `The Smart AI Examination Portal employs multi-modal proctoring via MediaPipe Face Mesh, 3D head pose estimation, iris gaze tracking, and COCO-SSD mobile device detection. Maintain front-facing attention and ensure a well-lit environment to prevent integrity flags.`;
                } else if (lower.includes('time') || lower.includes('duration') || lower.includes('submit')) {
                    reply = `Assessments are strictly timed and monitored. Your countdown begins only after face verification is verified. Answers are auto-submitted when the timer expires or if 3 proctoring warnings are issued.`;
                } else if (lower.includes('score') || lower.includes('result') || lower.includes('grade')) {
                    reply = `Official grading is computed securely on the backend server. A score of 40% or higher is required to pass. You can download your official verified scorecard and AI Proctoring Integrity Audit report directly from your portal.`;
                } else {
                    reply = `Key concepts in ${subject} emphasize understanding the core architecture, algorithm time/space complexities, and systematic problem breakdown. For this topic, focus on mastering fundamental definitions, verifying boundary conditions, and reviewing past exam problem sets.`;
                }
            }

            return res.json({
                success: true,
                reply: reply.trim(),
                timestamp: new Date().toISOString()
            });
        } catch (err) { next(err); }
    }
};

module.exports = analyticsController;
