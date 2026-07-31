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

    submit: async (req, res, next) => {
        try {
            const { exam_id, answers = {}, autoSubmit = false, reason = 'SUBMITTED' } = req.body;
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
                submit_reason: reason
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
    }
};

module.exports = resultController;
