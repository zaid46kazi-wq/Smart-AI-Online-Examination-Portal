/**
 * Exam Controller — CRUD, Questions, Excel/AI Generation, Factory Reset
 */
const fs = require('fs');
const XLSX = require('xlsx');
const examModel = require('../models/examModel');
const questionModel = require('../models/questionModel');
const subjectModel = require('../models/subjectModel');
const resultModel = require('../models/resultModel');
const proctorModel = require('../models/proctorModel');
const { generateQuestions } = require('../services/aiService');
const { query } = require('../config/db');

const examController = {
    getAll: async (req, res, next) => {
        try {
            res.setHeader('Cache-Control', 'no-cache');
            const role = (req.userRole || '').toLowerCase();
            if (role === 'student') {
                const exams = await examModel.findAllForStudent(req.userId);
                return res.json(exams);
            }
            const exams = await examModel.findAll();
            return res.json(exams);
        } catch (err) { next(err); }
    },

    getQuestions: async (req, res, next) => {
        try {
            const examId = parseInt(req.params.exam_id);
            if (isNaN(examId)) return res.status(400).json({ error: 'Invalid exam ID' });

            const exam = await examModel.findById(examId);
            if (!exam) return res.status(404).json({ error: 'Exam not found' });

            // Enforce Exam Date and Time Window for Students
            if (req.userRole === 'Student' && exam.exam_date) {
                const now = new Date();
                const examDateStr = new Date(exam.exam_date).toISOString().split('T')[0];
                const todayStr = now.toISOString().split('T')[0];

                if (todayStr < examDateStr) {
                    return res.status(403).json({ error: `Exam is scheduled for ${examDateStr}. You cannot start early.` });
                }

                if (todayStr === examDateStr && exam.start_time && exam.end_time) {
                    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    if (currentTime < exam.start_time) {
                        return res.status(403).json({ error: `Exam starts at ${exam.start_time}. Please wait.` });
                    }
                    if (currentTime > exam.end_time) {
                        return res.status(403).json({ error: `Exam ended at ${exam.end_time}. You missed the exam window.` });
                    }
                }
            }

            const existingResult = await resultModel.findByStudentAndExam(req.userId, examId);
            if (existingResult) {
                return res.status(403).json({
                    error: 'You have already submitted this exam. Only one attempt is allowed.',
                    already_submitted: true,
                    score: existingResult.score
                });
            }

            const pStat = await proctorModel.getStatus(req.userId, examId);
            if (pStat && (pStat.violations_count >= 3 || pStat.status === 'submitted')) {
                return res.status(403).json({
                    error: pStat.status === 'submitted' ? 'You have already submitted this exam.' : 'Maximum warnings exceeded.',
                    violations_reached: pStat.violations_count >= 3,
                    already_submitted: pStat.status === 'submitted'
                });
            }

            if (!pStat) {
                await proctorModel.updateStatus({
                    student_id: req.userId, exam_id: examId, status: 'active', violations_count: 0
                });
            }

            const questions = await questionModel.findByExamIdForStudent(examId);
            if (!questions || questions.length === 0) {
                return res.status(400).json({ error: 'No questions configured for this exam' });
            }

            // Fisher-Yates shuffle
            const shuffled = [...questions];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            return res.json({
                time_limit: exam.time_limit || 60,
                exam_name: exam.name || 'Online Examination',
                subject_name: exam.subjects?.subject_name || 'General',
                exam_id: examId,
                total_questions: shuffled.length,
                total_marks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
                init_violations: pStat ? pStat.violations_count : 0,
                questions: shuffled,
                timestamp: new Date().toISOString()
            });
        } catch (err) { next(err); }
    },

    getStatus: async (req, res, next) => {
        try {
            const examId = parseInt(req.params.exam_id);
            if (isNaN(examId)) return res.status(400).json({ error: 'Invalid exam ID' });
            const existing = await resultModel.findByStudentAndExam(req.userId, examId);
            return res.json({
                exam_id: examId,
                student_id: req.userId,
                already_attempted: !!existing,
                timestamp: new Date().toISOString()
            });
        } catch (err) { next(err); }
    },

    create: async (req, res, next) => {
        try {
            const { exam_name, subject_id, subject_name, total_questions, total_marks, time_limit, exam_date, start_time, end_time, questions } = req.body;
            let finalSubjectId = parseInt(subject_id) || 0;

            // Verify if specified subject_id actually exists in MySQL subjects table
            if (finalSubjectId > 0) {
                const existingSubject = await subjectModel.findById(finalSubjectId);
                if (!existingSubject) {
                    finalSubjectId = 0; // Reset if subject_id not found in DB
                }
            }

            // If subject_id is missing or invalid, find or create by subject_name
            if (!finalSubjectId && subject_name && subject_name.trim().length > 0) {
                const nameTrimmed = subject_name.trim();
                const existing = await subjectModel.findByName(nameTrimmed);
                if (existing) {
                    finalSubjectId = existing.id;
                } else {
                    finalSubjectId = await subjectModel.create({
                        subject_name: nameTrimmed,
                        subject_code: nameTrimmed.substring(0, 4).toUpperCase()
                    });
                }
            }

            if (!finalSubjectId) return res.status(400).json({ error: 'Valid subject is required' });

            const examId = await examModel.create({
                name: exam_name,
                subject_id: finalSubjectId,
                total_questions: parseInt(total_questions) || (questions ? questions.length : 0),
                total_marks: parseInt(total_marks) || (questions ? questions.reduce((s, q) => s + (q.marks || 1), 0) : 0),
                time_limit: parseInt(time_limit),
                exam_date,
                start_time,
                end_time
            });

            if (questions && questions.length > 0) {
                const formatted = questions.map(q => ({
                    exam_id: examId,
                    question: q.question,
                    option1: q.option1, option2: q.option2, option3: q.option3, option4: q.option4,
                    correct_answer: q.correct_answer,
                    marks: parseInt(q.marks) || 1
                }));
                await questionModel.createBatch(formatted);
            }

            return res.json({ success: true, id: examId });
        } catch (err) { next(err); }
    },

    uploadQuestionsExcel: async (req, res, next) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
            const examId = parseInt(req.params.exam_id);
            const fileBuffer = fs.readFileSync(req.file.path);
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            if (rows.length === 0) return res.status(400).json({ error: 'File is empty' });

            let totalMarks = 0;
            const questions = rows.map(r => {
                const marks = parseInt(r.marks || r.Marks || 1);
                totalMarks += marks;
                return {
                    exam_id: examId,
                    question: String(r.question || r.Question || ''),
                    option1: String(r.option1 || r.Option1 || r['Option A'] || ''),
                    option2: String(r.option2 || r.Option2 || r['Option B'] || ''),
                    option3: String(r.option3 || r.Option3 || r['Option C'] || ''),
                    option4: String(r.option4 || r.Option4 || r['Option D'] || ''),
                    correct_answer: String(r.correct_answer || r.Answer || r['Correct Answer'] || 'A'),
                    marks
                };
            });

            await questionModel.createBatch(questions);
            await examModel.updateCounters(examId, questions.length, totalMarks);

            if (req.file?.path && fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => {});
            return res.json({ success: true, count: questions.length });
        } catch (err) {
            if (req.file?.path && fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => {});
            next(err);
        }
    },

    generateAIQuestions: async (req, res, next) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
            const numQuestions = parseInt(req.body.count || '30');
            const difficulty = req.body.difficulty || 'Medium';
            const subjectName = req.body.subject_name || 'General';
            const questions = await generateQuestions(req.file.path, numQuestions, difficulty, subjectName);
            if (req.file?.path && fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => {});
            return res.json({ success: true, questions });
        } catch (err) {
            if (req.file?.path && fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => {});
            next(err);
        }
    },

    delete: async (req, res, next) => {
        try {
            await examModel.delete(parseInt(req.params.id));
            return res.json({ success: true, message: 'Exam deleted successfully.' });
        } catch (err) { next(err); }
    },

    factoryReset: async (req, res, next) => {
        try {
            if (process.env.NODE_ENV === 'production') {
                return res.status(403).json({ error: 'Factory reset is disabled in production environment.' });
            }
            await query(`DELETE FROM warnings`);
            await query(`DELETE FROM proctor_status`);
            await query(`DELETE FROM results`);
            await query(`DELETE FROM questions`);
            await query(`DELETE FROM exams`);
            await query(`DELETE FROM subjects`);
            await query(`DELETE FROM students WHERE role = 'Student'`);
            return res.json({ success: true, message: 'System data wiped successfully.' });
        } catch (err) { next(err); }
    }
};

module.exports = examController;
