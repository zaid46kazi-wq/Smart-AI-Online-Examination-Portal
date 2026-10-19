/**
 * Evaluation Routes — AI Answer Booklet Evaluation API
 */
const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const evaluationController = require('../controllers/evaluationController');

const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure upload directory for evaluation docs
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const evalUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`)
    }),
    limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
        if (allowedExts.includes(ext) || file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only PDF and image files (.jpg, .jpeg, .png, .webp) are allowed.'));
    }
});

// Sessions
router.get('/sessions', requireAdmin, evaluationController.getSessions);
router.post('/sessions', requireAdmin, evaluationController.createSession);
router.get('/sessions/:session_id', requireAdmin, evaluationController.getSession);
router.delete('/sessions/:session_id', requireAdmin, evaluationController.deleteSession);

// Document Upload
router.post('/upload/:session_id/:doc_type', requireAdmin, evalUpload.single('file'), evaluationController.uploadDocument);

// Confirm Questions & Scheme
router.post('/confirm-questions/:session_id', requireAdmin, evaluationController.confirmQuestions);
router.post('/confirm-scheme/:session_id', requireAdmin, evaluationController.confirmScheme);

// Evaluation Mode
router.post('/set-mode/:session_id', requireAdmin, evaluationController.setMode);

// Booklets
router.post('/upload-booklet/:session_id', requireAdmin, evalUpload.single('file'), evaluationController.uploadBooklet);
router.post('/confirm-ocr/:booklet_id', requireAdmin, evaluationController.confirmBookletOCR);
router.put('/booklet-student/:booklet_id', requireAdmin, evaluationController.updateBookletStudent);

// Evaluation
router.post('/evaluate/:session_id/:booklet_id', requireAdmin, evaluationController.evaluate);
router.get('/results/:booklet_id', requireAdmin, evaluationController.getResults);

// Marks Editing & Approval
router.put('/results/:result_id/marks', requireAdmin, evaluationController.editMarks);
router.post('/approve/:session_id/:booklet_id', requireAdmin, evaluationController.approveBooklet);

// Summary & Export
router.get('/summary/:session_id', requireAdmin, evaluationController.getSessionSummary);
router.get('/export-pdf/:session_id', requireAdmin, evaluationController.exportPDF);
router.get('/export/:session_id', requireAdmin, evaluationController.exportData);

module.exports = router;
