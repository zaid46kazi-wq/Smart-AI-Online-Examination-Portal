/**
 * Result Controller — Grading, PDF Certificate & Hall Ticket Generation
 */
const resultModel = require('../models/resultModel');
const questionModel = require('../models/questionModel');
const examModel = require('../models/examModel');
const userModel = require('../models/userModel');
const proctorModel = require('../models/proctorModel');
const { generateResultPDF, generateHallTicketPDF } = require('../services/pdfService');
const { sendResultEmail } = require('../services/emailService');

const { getGrade } = require('../utils/grade');

const resultController = {
    getAll: async (req, res, next) => {
        try {
            const results = await resultModel.findAll();
            const mapped = results.map(r => {
                const pct = r.total_marks > 0 ? Math.round((r.score / r.total_marks) * 100) : 0;
                return {
                    id: r.id,
                    Username: r.students?.username || 'Unknown',
                    Name: r.students?.name || '',
                    USN: r.students?.usn || '',
                    Score: r.score,
                    TotalMarks: r.total_marks,
                    Percentage: pct,
                    Grade: getGrade(pct).grade,
                    ExamName: r.exams?.name || 'Unknown',
                    ExamDate: r.exam_date
                };
            });
            return res.json(mapped);
        } catch (err) { next(err); }
    },

    getMyResults: async (req, res, next) => {
        try {
            const results = await resultModel.findByStudentId(req.userId);
            return res.json(results);
        } catch (err) { next(err); }
    },

    getRankList: async (req, res, next) => {
        try {
            const ranks = await resultModel.findRankListByExam(req.params.exam_id);
            return res.json(ranks.map((r, i) => ({
                rank: i + 1,
                name: r.students?.name || r.students?.username || 'Unknown',
                usn: r.students?.usn || '',
                score: r.score,
                totalMarks: r.total_marks
            })));
        } catch (err) { next(err); }
    },

    getLeaderboard: async (req, res, next) => {
        try {
            res.setHeader('Cache-Control', 'public, max-age=300');
            const leaderboard = await resultModel.findLeaderboard(10);
            return res.json(leaderboard);
        } catch (err) { next(err); }
    },

    getById: async (req, res, next) => {
        try {
            const resultId = parseInt(req.params.id);
            const r = await resultModel.findById(resultId);
            if (!r) return res.status(404).json({ error: 'Result not found' });

            const isOwner = r.student_id === req.userId;
            const isAdmin = req.userRole === 'Admin' || req.userRole === 'instructor' || req.userRole === 'Instructor';
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ error: 'Access denied.' });
            }

            const pct = r.total_marks > 0 ? Math.round((r.score / r.total_marks) * 100) : 0;
            return res.json({
                ...r,
                percentage: pct,
                grade: getGrade(pct).grade,
                passed: pct >= 40
            });
        } catch (err) { next(err); }
    },

    submit: async (req, res, next) => {
        try {
            const { exam_id, answers = {}, autoSubmit = false, reason = 'SUBMITTED', submission_reason } = req.body;
            const finalReason = submission_reason || reason;
            const examId = parseInt(exam_id);

            const existing = await resultModel.findByStudentAndExam(req.userId, examId);
            if (existing) {
                return res.status(403).json({
                    error: 'This exam has already been submitted.',
                    prevScore: existing.score
                });
            }

            const questions = await questionModel.findByExamId(examId);
            if (!questions || questions.length === 0) {
                return res.status(500).json({ error: 'Failed to process exam answers' });
            }

            let score = 0, totalMarks = 0;
            const qMap = {};
            questions.forEach(q => {
                qMap[q.id] = { correct: q.correct_answer, marks: q.marks || 1 };
                totalMarks += (q.marks || 1);
            });

            for (const [qId, ans] of Object.entries(answers)) {
                if (qMap[qId] && qMap[qId].correct === ans) {
                    score += qMap[qId].marks;
                }
            }

            const result_id = await resultModel.create({
                student_id: req.userId,
                exam_id: examId,
                score,
                total_marks: totalMarks,
                auto_submit: autoSubmit,
                submit_reason: finalReason
            });

            await proctorModel.updateStatus({
                student_id: req.userId,
                exam_id: examId,
                status: 'submitted'
            });

            const percentage = Math.round((score / totalMarks) * 100);
            const { grade } = getGrade(percentage);

            if (req.userEmail) {
                const examInfo = await examModel.findById(examId);
                sendResultEmail(req.userEmail, examInfo?.name || 'Examination', score, totalMarks);
            }

            return res.json({
                success: true,
                score,
                total_marks: totalMarks,
                percentage,
                grade,
                result_id,
                passed: percentage >= 40
            });
        } catch (err) { next(err); }
    },

    downloadPDF: async (req, res, next) => {
        try {
            const resultData = await resultModel.findById(parseInt(req.params.result_id));
            if (!resultData) return res.status(404).json({ error: 'Result certificate not found' });

            // SECURITY: Resource-level authorization — students can only download their own results
            const isOwner = resultData.student_id === req.userId;
            const isAdmin = req.userRole === 'Admin' || req.userRole === 'instructor' || req.userRole === 'Instructor';
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ error: 'Access denied. You can only download your own certificate.' });
            }

            generateResultPDF(resultData, res);
        } catch (err) { next(err); }
    },

    downloadHallTicket: async (req, res, next) => {
        try {
            const exam = await examModel.findById(parseInt(req.params.exam_id));
            const student = await userModel.findById(req.userId);
            if (!exam || !student) return res.status(404).json({ error: 'Hall ticket data not found' });
            generateHallTicketPDF(exam, student, res);
        } catch (err) { next(err); }
    },

    getAIAnalysis: async (req, res, next) => {
        try {
            const resultId = parseInt(req.params.result_id);
            const resultData = await resultModel.findById(resultId);
            if (!resultData) return res.status(404).json({ error: 'Result not found' });

            const isOwner = resultData.student_id === req.userId;
            const isAdmin = req.userRole === 'Admin' || req.userRole === 'instructor' || req.userRole === 'Instructor';
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ error: 'Access denied.' });
            }

            const pct = resultData.total_marks > 0 ? Math.round((resultData.score / resultData.total_marks) * 100) : 0;
            const { grade } = getGrade(pct);
            const subject = resultData.exams?.subjects?.subject_name || 'General Engineering';
            const examTitle = resultData.exams?.name || 'Examination';

            let analysis = null;
            const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

            if (apiKey) {
                try {
                    const { GoogleGenAI } = require('@google/genai');
                    const ai = new GoogleGenAI({ apiKey });
                    const prompt = `You are an expert academic evaluator at AGMR College of Engineering.
Analyze this student's exam performance:
- Subject: ${subject}
- Exam: ${examTitle}
- Score: ${resultData.score} / ${resultData.total_marks} (${pct}%)
- Letter Grade: ${grade}

Provide a structured JSON object with these EXACT keys:
{
  "summary": "2-3 sentences concise performance overview and encouragement",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Area for growth 1", "Area for growth 2"],
  "recommendations": ["Actionable study recommendation 1", "Actionable study recommendation 2", "Actionable study recommendation 3"],
  "keyTopicsToReview": ["Topic 1", "Topic 2", "Topic 3"]
}
Return ONLY valid raw JSON without markdown code fences.`;

                    const responsePromise = ai.models.generateContent({
                        model: 'gemini-3.5-flash-lite',
                        contents: prompt
                    });
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 7000));
                    const resp = await Promise.race([responsePromise, timeoutPromise]);
                    let text = (resp?.text || '').replace(/^\s*(```json)/i, '').replace(/(```)\s*$/i, '').trim();
                    const match = text.match(/\{[\s\S]*\}/);
                    if (match) text = match[0];
                    analysis = JSON.parse(text);
                } catch (_) {}
            }

            if (!analysis || !analysis.summary) {
                const isPass = pct >= 40;
                analysis = {
                    summary: isPass
                        ? `Demonstrated solid conceptual competence in ${subject} with an achieved grade of ${grade} (${pct}%). Continue reinforcing complex problem solving to reach top percentile.`
                        : `Current score in ${subject} is ${pct}%, indicating fundamental conceptual gaps that require immediate structured revision prior to the final semester evaluations.`,
                    strengths: isPass
                        ? [
                            `Consistent performance on foundational questions in ${subject}`,
                            `Effective time management during examination session`,
                            `High accuracy rate on core syllabus concepts`
                        ]
                        : [
                            `Completed assessment within allocated duration`,
                            `Full compliance with AI proctoring integrity requirements`
                        ],
                    weaknesses: isPass
                        ? [
                            `Advanced application-level questions requiring multi-step derivations`,
                            `Edge-case scenarios and specialized terminology accuracy`
                        ]
                        : [
                            `Core foundational definitions and theorem application in ${subject}`,
                            `Problem-solving speed under timed constraints`,
                            `Systematic revision needed across all syllabus modules`
                        ],
                    recommendations: isPass
                        ? [
                            `Engage with advanced practice problem sets in ${subject} to convert ${grade} into A+`,
                            `Participate in peer study discussions to debate complex system architecture questions`,
                            `Review past assessments to master high-difficulty question patterns`
                        ]
                        : [
                            `Dedicate 45 minutes daily to structured revision of key ${subject} topics`,
                            `Solve chapter-end MCQs and previous university question papers`,
                            `Schedule a one-on-one consultation with course instructor for clarification`
                        ],
                    keyTopicsToReview: [
                        `${subject} Core Architecture & Principles`,
                        `Computational Methods & Mathematical Formulations`,
                        `Implementation Standards & Case Studies`
                    ]
                };
            }

            return res.json({
                success: true,
                resultId,
                score: resultData.score,
                total_marks: resultData.total_marks,
                percentage: pct,
                grade,
                analysis
            });
        } catch (err) { next(err); }
    }
};

module.exports = resultController;
