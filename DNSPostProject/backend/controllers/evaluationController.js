/**
 * Evaluation Controller — API endpoints for AI Answer Booklet Evaluation workflow
 */
const path = require('path');
const fs = require('fs');
const evaluationModel = require('../models/evaluationModel');
const aiEvalService = require('../services/aiEvaluationService');
const PDFDocument = require('pdfkit');

// ─── Helper: Get confirmed questions + scheme for a session ──────

async function getSessionContext(session_id) {
    const questions = await evaluationModel.getQuestionsBySession(session_id);
    const scheme = await evaluationModel.getSchemeBySession(session_id);
    const moduleDocs = await evaluationModel.getModulePDFs(session_id);

    let moduleConcepts = [];
    for (const doc of moduleDocs) {
        if (doc.extracted_content) {
            try {
                const parsed = typeof doc.extracted_content === 'string'
                    ? JSON.parse(doc.extracted_content) : doc.extracted_content;
                if (Array.isArray(parsed.concepts)) {
                    moduleConcepts = moduleConcepts.concat(parsed.concepts);
                }
            } catch (_) {}
        }
    }

    return { questions, scheme, moduleConcepts };
}

// ─── Sessions ────────────────────────────────────────────────────

exports.createSession = async (req, res) => {
    try {
        const { subject_id, exam_name, semester, academic_year, evaluation_title } = req.body;
        if (!evaluation_title && !exam_name) {
            return res.status(400).json({ error: 'Evaluation title or exam name is required' });
        }
        const id = await evaluationModel.createSession({
            subject_id, exam_name, semester, academic_year,
            evaluation_title, created_by: req.userId
        });
        const session = await evaluationModel.getSessionById(id);
        res.status(201).json({ success: true, session });
    } catch (err) {
        console.error('[EVAL] Create session error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.getSessions = async (req, res) => {
    try {
        const sessions = await evaluationModel.getSessionsByUser(req.userId);
        res.json(sessions || []);
    } catch (err) {
        console.error('[EVAL] Get sessions error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.getSession = async (req, res) => {
    try {
        const session = await evaluationModel.getSessionById(req.params.session_id);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const documents = await evaluationModel.getDocumentsBySession(session.id);
        const questions = await evaluationModel.getQuestionsBySession(session.id);
        const scheme = await evaluationModel.getSchemeBySession(session.id);
        const booklets = await evaluationModel.getBookletsBySession(session.id);

        res.json({ session, documents, questions, scheme, booklets });
    } catch (err) {
        console.error('[EVAL] Get session error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteSession = async (req, res) => {
    try {
        await evaluationModel.deleteSession(req.params.session_id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Document Upload ─────────────────────────────────────────────

exports.uploadDocument = async (req, res) => {
    try {
        const { session_id, doc_type } = req.params;
        if (!['question_paper', 'valuation_scheme', 'module_pdf'].includes(doc_type)) {
            return res.status(400).json({ error: 'Invalid document type' });
        }

        const session = await evaluationModel.getSessionById(session_id);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const docId = await evaluationModel.addDocument({
            session_id: parseInt(session_id),
            doc_type,
            original_filename: req.file.originalname,
            stored_path: req.file.path,
            file_size: req.file.size,
            mime_type: req.file.mimetype
        });

        // Process the document asynchronously
        await evaluationModel.updateDocumentStatus(docId, 'processing');

        let extractedContent = null;
        let processingStatus = 'extracted';

        try {
            if (doc_type === 'question_paper') {
                const questions = await aiEvalService.extractQuestionsFromDocument(req.file.path, req.file.mimetype);
                extractedContent = questions;
                await evaluationModel.bulkInsertQuestions(parseInt(session_id), questions);
                await evaluationModel.updateSessionStatus(parseInt(session_id), 'question_paper_uploaded');
            } else if (doc_type === 'valuation_scheme') {
                const existingQuestions = await evaluationModel.getQuestionsBySession(parseInt(session_id));
                const schemeEntries = await aiEvalService.extractValuationScheme(req.file.path, req.file.mimetype, existingQuestions);

                // Auto-match scheme entries to questions
                const questions = await evaluationModel.getQuestionsBySession(parseInt(session_id));
                const matchedEntries = schemeEntries.map(entry => {
                    const match = questions.find(q =>
                        String(q.question_number) === String(entry.question_number) &&
                        String(q.sub_question || '') === String(entry.sub_question || '')
                    );
                    return { ...entry, question_id: match ? match.id : null };
                });

                extractedContent = matchedEntries;
                await evaluationModel.bulkInsertScheme(parseInt(session_id), matchedEntries);
                await evaluationModel.updateSessionStatus(parseInt(session_id), 'scheme_uploaded');
            } else if (doc_type === 'module_pdf') {
                const concepts = await aiEvalService.extractModuleConcepts(req.file.path, req.file.mimetype);
                extractedContent = concepts;
            }
        } catch (extractErr) {
            console.error('[EVAL] Extraction error:', extractErr.message);
            processingStatus = 'error';
            extractedContent = { error: extractErr.message };
        }

        await evaluationModel.updateDocumentStatus(docId, processingStatus, extractedContent);

        const doc = await evaluationModel.getDocumentByType(parseInt(session_id), doc_type);
        const questions = doc_type === 'question_paper'
            ? await evaluationModel.getQuestionsBySession(parseInt(session_id)) : undefined;
        const scheme = doc_type === 'valuation_scheme'
            ? await evaluationModel.getSchemeBySession(parseInt(session_id)) : undefined;

        res.json({
            success: true,
            document: doc,
            questions,
            scheme,
            processing_status: processingStatus
        });
    } catch (err) {
        console.error('[EVAL] Upload error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ─── Confirm Questions ───────────────────────────────────────────

exports.confirmQuestions = async (req, res) => {
    try {
        const { session_id } = req.params;
        const corrections = req.body.corrections || req.body.questions; // Optional array of {id, question_text, max_marks, ...}

        if (corrections && Array.isArray(corrections)) {
            for (const c of corrections) {
                if (c.id) await evaluationModel.updateQuestion(c.id, c);
            }
        }

        await evaluationModel.confirmQuestions(parseInt(session_id));
        const doc = await evaluationModel.getDocumentByType(parseInt(session_id), 'question_paper');
        if (doc) await evaluationModel.confirmDocument(doc.id);
        await evaluationModel.updateSessionStatus(parseInt(session_id), 'question_paper_confirmed');

        const questions = await evaluationModel.getQuestionsBySession(parseInt(session_id));
        res.json({ success: true, questions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Confirm Scheme ──────────────────────────────────────────────

exports.confirmScheme = async (req, res) => {
    try {
        const { session_id } = req.params;
        const corrections = req.body.corrections || req.body.scheme;

        if (corrections && Array.isArray(corrections)) {
            for (const c of corrections) {
                if (c.id) await evaluationModel.updateSchemeEntry(c.id, c);
            }
        }

        await evaluationModel.confirmScheme(parseInt(session_id));
        const doc = await evaluationModel.getDocumentByType(parseInt(session_id), 'valuation_scheme');
        if (doc) await evaluationModel.confirmDocument(doc.id);
        await evaluationModel.updateSessionStatus(parseInt(session_id), 'scheme_confirmed');

        const scheme = await evaluationModel.getSchemeBySession(parseInt(session_id));
        res.json({ success: true, scheme });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Set Evaluation Mode ─────────────────────────────────────────

exports.setMode = async (req, res) => {
    try {
        const { session_id } = req.params;
        const { mode } = req.body;
        if (!['easy', 'hard'].includes(mode)) {
            return res.status(400).json({ error: 'Mode must be "easy" or "hard"' });
        }

        const session = await evaluationModel.getSessionById(parseInt(session_id));
        if (!session) return res.status(404).json({ error: 'Session not found' });

        // Validate prerequisites
        const qpDoc = await evaluationModel.getDocumentByType(parseInt(session_id), 'question_paper');
        const schemeDoc = await evaluationModel.getDocumentByType(parseInt(session_id), 'valuation_scheme');

        if (!qpDoc || !qpDoc.confirmed_by_faculty) {
            return res.status(400).json({ error: 'Question paper must be uploaded and confirmed before setting mode' });
        }
        if (!schemeDoc || !schemeDoc.confirmed_by_faculty) {
            return res.status(400).json({ error: 'Valuation scheme must be uploaded and confirmed before setting mode' });
        }

        await evaluationModel.updateSessionMode(parseInt(session_id), mode);
        res.json({ success: true, mode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Upload Answer Booklet ───────────────────────────────────────

exports.uploadBooklet = async (req, res) => {
    try {
        const { session_id } = req.params;
        const { student_id, student_usn, student_name } = req.body;

        const session = await evaluationModel.getSessionById(parseInt(session_id));
        if (!session) return res.status(404).json({ error: 'Session not found' });
        if (!session.evaluation_mode) {
            return res.status(400).json({ error: 'Evaluation mode must be selected before uploading booklets' });
        }

        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const bookletId = await evaluationModel.addBooklet({
            session_id: parseInt(session_id),
            student_id: student_id || null,
            student_usn: student_usn || '',
            student_name: student_name || '',
            original_filename: req.file.originalname,
            stored_path: req.file.path
        });

        // Run OCR
        await evaluationModel.updateBookletStatus(bookletId, 'processing');

        try {
            const questions = await evaluationModel.getQuestionsBySession(parseInt(session_id));
            const ocrResults = await aiEvalService.extractAnswerBookletOCR(req.file.path, req.file.mimetype, questions);
            await evaluationModel.updateBookletStatus(bookletId, 'ocr_complete', ocrResults);

            await evaluationModel.updateSessionStatus(parseInt(session_id), 'ready_for_evaluation');

            const booklet = await evaluationModel.getBookletById(bookletId);
            res.json({ success: true, booklet, ocr_results: ocrResults });
        } catch (ocrErr) {
            console.error('[EVAL] OCR error:', ocrErr.message);
            await evaluationModel.updateBookletStatus(bookletId, 'error', { error: ocrErr.message });
            res.status(500).json({ error: 'OCR processing failed: ' + ocrErr.message });
        }
    } catch (err) {
        console.error('[EVAL] Upload booklet error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ─── Confirm OCR ─────────────────────────────────────────────────

exports.confirmBookletOCR = async (req, res) => {
    try {
        const { booklet_id } = req.params;
        const corrections = req.body.corrections || req.body.ocr_output; // Optional array or object of corrected OCR entries

        if (corrections) {
            await evaluationModel.updateBookletOCR(parseInt(booklet_id), corrections);
        }

        await evaluationModel.confirmBookletOCR(parseInt(booklet_id));
        const booklet = await evaluationModel.getBookletById(parseInt(booklet_id));
        res.json({ success: true, booklet });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Update Booklet Student ──────────────────────────────────────

exports.updateBookletStudent = async (req, res) => {
    try {
        const { booklet_id } = req.params;
        const { student_id, student_usn, student_name } = req.body;
        await evaluationModel.updateBookletStudent(parseInt(booklet_id), { student_id, student_usn, student_name });
        const booklet = await evaluationModel.getBookletById(parseInt(booklet_id));
        res.json({ success: true, booklet });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Run AI Evaluation ───────────────────────────────────────────

exports.evaluate = async (req, res) => {
    try {
        const { session_id, booklet_id } = req.params;

        const session = await evaluationModel.getSessionById(parseInt(session_id));
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const booklet = await evaluationModel.getBookletById(parseInt(booklet_id));
        if (!booklet) return res.status(404).json({ error: 'Booklet not found' });

        // Validate readiness
        if (!session.evaluation_mode) {
            return res.status(400).json({ error: 'Evaluation mode not set' });
        }

        const { questions, scheme, moduleConcepts } = await getSessionContext(parseInt(session_id));
        if (questions.length === 0) {
            return res.status(400).json({ error: 'No confirmed questions found' });
        }

        // Parse OCR output defensively
        let ocrAnswers = [];
        try {
            ocrAnswers = typeof booklet.ocr_output === 'string'
                ? JSON.parse(booklet.ocr_output) : (booklet.ocr_output || []);
        } catch (_) {}

        if (!Array.isArray(ocrAnswers) && ocrAnswers && Array.isArray(ocrAnswers.answers)) {
            ocrAnswers = ocrAnswers.answers;
        }

        if (!Array.isArray(ocrAnswers) || ocrAnswers.length === 0) {
            return res.status(400).json({ error: 'No OCR data available for this booklet' });
        }

        await evaluationModel.updateBookletStatus(parseInt(booklet_id), 'evaluating');
        await evaluationModel.updateSessionStatus(parseInt(session_id), 'evaluation_in_progress');

        const evaluationResults = [];
        const normQ = (q) => String(q || '').replace(/^Q\.?\s*/i, '').trim().toLowerCase();
        const normSub = (s) => String(s || '').trim().toLowerCase();

        for (const question of questions) {
            // Find matching student answer
            const studentAnswer = ocrAnswers.find(a =>
                normQ(a.question_number) === normQ(question.question_number) &&
                normSub(a.sub_question) === normSub(question.sub_question)
            );

            // Find matching scheme entry (by question_id first, then normalized question number)
            const schemeEntry = scheme.find(s =>
                (s.question_id && s.question_id === question.id) ||
                (normQ(s.question_number) === normQ(question.question_number) &&
                 normSub(s.sub_question) === normSub(question.sub_question))
            );

            const maxMarks = question.max_marks || 0;

            try {
                const result = await aiEvalService.evaluateStudentAnswer({
                    question,
                    scheme: schemeEntry || null,
                    studentAnswer: studentAnswer ? studentAnswer.answer_text : '',
                    evaluationMode: session.evaluation_mode,
                    moduleConcepts,
                    maxMarks
                });

                // Flag for review if OCR confidence was low or no scheme entry
                const needsReview = result.needs_review ||
                    (studentAnswer && studentAnswer.ocr_confidence < 0.6) ||
                    !schemeEntry;

                evaluationResults.push({
                    session_id: parseInt(session_id),
                    booklet_id: parseInt(booklet_id),
                    question_id: question.id,
                    ai_suggested_marks: result.suggested_marks,
                    max_marks: maxMarks,
                    correct_concepts: result.correct_concepts,
                    missing_points: result.missing_points,
                    incorrect_statements: result.incorrect_statements,
                    ai_explanation: result.explanation,
                    evidence: result.evidence,
                    ocr_confidence: studentAnswer ? studentAnswer.ocr_confidence : 0,
                    eval_confidence: result.eval_confidence,
                    needs_review: needsReview
                });
            } catch (evalErr) {
                console.error(`[EVAL] Evaluation failed for Q${question.question_number}: ${evalErr.message}`);
                evaluationResults.push({
                    session_id: parseInt(session_id),
                    booklet_id: parseInt(booklet_id),
                    question_id: question.id,
                    ai_suggested_marks: 0,
                    max_marks: maxMarks,
                    correct_concepts: [],
                    missing_points: ['Evaluation failed — requires faculty review'],
                    incorrect_statements: [],
                    ai_explanation: `AI evaluation failed: ${evalErr.message}`,
                    evidence: '',
                    ocr_confidence: studentAnswer ? studentAnswer.ocr_confidence : 0,
                    eval_confidence: 0,
                    needs_review: true
                });
            }
        }

        // Store results
        if (evaluationResults.length > 0) {
            await evaluationModel.bulkInsertResults(evaluationResults);
        }

        await evaluationModel.updateBookletStatus(parseInt(booklet_id), 'evaluated');

        // Check if all booklets are evaluated
        const allBooklets = await evaluationModel.getBookletsBySession(parseInt(session_id));
        const allEvaluated = allBooklets.every(b => b.processing_status === 'evaluated' || b.processing_status === 'approved');
        if (allEvaluated && allBooklets.length > 0) {
            await evaluationModel.updateSessionStatus(parseInt(session_id), 'evaluation_completed');
        }

        const results = await evaluationModel.getResultsByBooklet(parseInt(booklet_id));
        res.json({ success: true, results, total_evaluated: evaluationResults.length });
    } catch (err) {
        console.error('[EVAL] Evaluation error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ─── Get Results ─────────────────────────────────────────────────

exports.getResults = async (req, res) => {
    try {
        const { booklet_id } = req.params;
        const results = await evaluationModel.getResultsByBooklet(parseInt(booklet_id));
        const booklet = await evaluationModel.getBookletById(parseInt(booklet_id));
        res.json({ results: results || [], booklet });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Edit Marks ──────────────────────────────────────────────────

exports.editMarks = async (req, res) => {
    try {
        const { result_id } = req.params;
        const faculty_final_marks = req.body.faculty_final_marks !== undefined
            ? req.body.faculty_final_marks
            : req.body.marks;

        if (faculty_final_marks === undefined || faculty_final_marks === null) {
            return res.status(400).json({ error: 'faculty_final_marks or marks is required' });
        }

        await evaluationModel.updateResultMarks(parseInt(result_id), parseFloat(faculty_final_marks), req.userId);
        res.json({ success: true, result_id, faculty_final_marks });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Approve Results ─────────────────────────────────────────────

exports.approveBooklet = async (req, res) => {
    try {
        const { session_id, booklet_id } = req.params;
        await evaluationModel.approveAllBookletResults(parseInt(booklet_id), req.userId);

        // Check if all booklets approved
        const allBooklets = await evaluationModel.getBookletsBySession(parseInt(session_id));
        const allApproved = allBooklets.every(b => b.processing_status === 'approved');
        if (allApproved && allBooklets.length > 0) {
            await evaluationModel.updateSessionStatus(parseInt(session_id), 'approved');
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Session Summary ─────────────────────────────────────────────

exports.getSessionSummary = async (req, res) => {
    try {
        const summary = await evaluationModel.getSessionSummary(parseInt(req.params.session_id));
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Export Marks (PDF) ──────────────────────────────────────────

exports.exportPDF = async (req, res) => {
    try {
        const { session_id } = req.params;
        const session = await evaluationModel.getSessionById(parseInt(session_id));
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const summary = await evaluationModel.getSessionSummary(parseInt(session_id));

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="evaluation_marks_${session_id}.pdf"`);
        doc.pipe(res);

        // Header
        doc.fontSize(18).font('Helvetica-Bold').text('AGMR College of Engineering', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('AI Answer Booklet Evaluation — Marks Sheet', { align: 'center' });
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#2563EB');
        doc.moveDown(1);

        // Session Info
        doc.fontSize(11).font('Helvetica-Bold').text(`Subject: ${session.subject_name || 'N/A'}`);
        doc.font('Helvetica').text(`Exam: ${session.exam_name || ''} | Semester: ${session.semester || ''} | Year: ${session.academic_year || ''}`);
        doc.text(`Evaluation: ${session.evaluation_title || ''} | Mode: ${(session.evaluation_mode || '').toUpperCase()}`);
        doc.moveDown(1);

        // Table Header
        const startX = 50;
        let y = doc.y;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('#', startX, y, { width: 25 });
        doc.text('Student Name', startX + 30, y, { width: 140 });
        doc.text('USN', startX + 175, y, { width: 100 });
        doc.text('Marks', startX + 280, y, { width: 70 });
        doc.text('Total', startX + 355, y, { width: 50 });
        doc.text('Status', startX + 410, y, { width: 80 });
        y += 18;
        doc.moveTo(startX, y).lineTo(545, y).stroke('#ccc');
        y += 5;

        doc.font('Helvetica').fontSize(9);
        summary.forEach((s, idx) => {
            if (y > 750) {
                doc.addPage();
                y = 50;
            }
            doc.text(String(idx + 1), startX, y, { width: 25 });
            doc.text(s.student_name || 'Unknown', startX + 30, y, { width: 140 });
            doc.text(s.student_usn || '-', startX + 175, y, { width: 100 });
            doc.text(String(parseFloat(s.total_marks || 0).toFixed(1)), startX + 280, y, { width: 70 });
            doc.text(String(s.total_max_marks || 0), startX + 355, y, { width: 50 });
            doc.text(s.processing_status === 'approved' ? 'APPROVED' : 'PENDING', startX + 410, y, { width: 80 });
            y += 16;
        });

        doc.moveDown(2);
        doc.fontSize(8).fillColor('#666').text(`Generated: ${new Date().toLocaleString('en-IN')} | AI-Assisted Evaluation`, { align: 'center' });

        doc.end();
    } catch (err) {
        console.error('[EVAL] PDF export error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ─── Export Marks (JSON/CSV) ─────────────────────────────────────

exports.exportData = async (req, res) => {
    try {
        const { session_id } = req.params;
        const { format } = req.query;

        const session = await evaluationModel.getSessionById(parseInt(session_id));
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const summary = await evaluationModel.getSessionSummary(parseInt(session_id));

        if (format === 'csv') {
            let csv = 'SNo,StudentName,USN,MarksObtained,TotalMarks,Percentage,Status\n';
            summary.forEach((s, idx) => {
                const pct = s.total_max_marks > 0 ? ((s.total_marks / s.total_max_marks) * 100).toFixed(1) : '0.0';
                csv += `${idx + 1},"${s.student_name || 'Unknown'}","${s.student_usn || '-'}",${parseFloat(s.total_marks || 0).toFixed(1)},${s.total_max_marks || 0},${pct}%,${s.processing_status === 'approved' ? 'APPROVED' : 'PENDING'}\n`;
            });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="evaluation_marks_${session_id}.csv"`);
            return res.send(csv);
        }

        res.json({ session, summary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
