/**
 * Online Examination System — Backend Entry Point
 * Express 5 + MySQL 8 + JWT + Socket.IO + React Build Serving
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

// --- Routes ---
const authRoutes = require('./routes/authRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const examRoutes = require('./routes/examRoutes');
const studentRoutes = require('./routes/studentRoutes');
const resultRoutes = require('./routes/resultRoutes');
const proctorRoutes = require('./routes/proctorRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const evaluationRoutes = require('./routes/evaluationRoutes');

// --- Middleware ---
const { errorHandler } = require('./middleware/errorHandler');
const { query } = require('./config/db');
const { generateAcademicReply, normalizeChatHistory } = require('./services/aiChatService');

const app = express();

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function hasAnswerIntent(message) {
    const normalized = normalizeText(message);
    if (!normalized) return false;

    const answerPatterns = [
        'answer', 'answers', 'correct answer', 'correct option', 'which option',
        'select the', 'choose the', 'solve this', 'solve the', 'solve question',
        'multiple choice', 'mcq', 'question no', 'question number', 'option a',
        'option b', 'option c', 'option d', 'give me the answer', 'give answer'
    ];

    return answerPatterns.some((pattern) => normalized.includes(pattern));
}

function isLikelyCurrentExamQuestion(message, examQuestionText) {
    const normalizedMessage = normalizeText(message);
    const normalizedQuestion = normalizeText(examQuestionText);

    if (!normalizedMessage || !normalizedQuestion) return false;
    
    // Direct identical copy
    if (normalizedMessage === normalizedQuestion) return true;

    const answerSeeking = hasAnswerIntent(message);

    // If message asks specifically for the answer to a question number while in exam
    if (answerSeeking && (/question\s*\d+|q\s*\d+/i.test(message) || /answer\s+to\s+question/i.test(message))) {
        return true;
    }

    // Substring containment only if long enough and indicates exam answer intent
    if (normalizedQuestion.length > 20 && (
        normalizedQuestion.includes(normalizedMessage) ||
        normalizedMessage.includes(normalizedQuestion)
    )) {
        if (answerSeeking || normalizedMessage.length > 30) {
            return true;
        }
    }

    const messageWords = normalizedMessage.split(/\s+/).filter((word) => word.length > 2);
    const questionWords = normalizedQuestion.split(/\s+/).filter((word) => word.length > 2);

    if (messageWords.length < 3 || questionWords.length < 3) return false;

    const overlap = messageWords.filter((word) => questionWords.includes(word));
    const overlapRatio = overlap.length / Math.max(messageWords.length, questionWords.length);

    // High overlap + explicit answer-seeking intent indicates student is trying to solve the test question
    return overlapRatio >= 0.65 && answerSeeking;
}

// --- CORS & Security Headers ---
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:3000', 'http://127.0.0.1:5000'];

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true
    },
    transports: ['websocket', 'polling']
});

app.set('io', io);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS policy violation: Origin not allowed'));
    },
    credentials: true
}));
app.use(compression({ level: 6, threshold: 1024 }));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    handler: (req, res) => res.status(429).json({ error: 'Too many requests, please try again later.' })
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    skipSuccessfulRequests: true,
    handler: (req, res) => res.status(429).json({ error: 'Too many failed login attempts.' })
});

app.use('/api/', apiLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security Headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
    next();
});

// --- Upload Config with Strict File Type Validation ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/plain',
    'application/csv'
];

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`)
    }),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const validExt = ['.pdf', '.xlsx', '.xls', '.csv'].includes(ext);
        const validMime = allowedMimeTypes.includes(file.mimetype) || file.mimetype === 'application/octet-stream';
        if (validExt && validMime) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only PDF, Excel (.xlsx, .xls), and CSV (.csv) files are allowed.'));
    }
});

// --- Validation Schemas & Utilities for Direct Aliases ---
const { validate } = require('./middleware/validate');
const { requireAuth, requireAdmin, requireStudent } = require('./middleware/auth');
const { submitExamSchema, flagViolationSchema } = require('./utils/validators');
const examController = require('./controllers/examController');
const resultController = require('./controllers/resultController');
const proctorController = require('./controllers/proctorController');

// --- API Router Mapping ---
app.use('/api/login', loginLimiter);
app.use('/api', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/questions', upload.single('file'), examRoutes);
app.use('/api/students', upload.single('file'), studentRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/proctor', proctorRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/evaluation', evaluationRoutes);

// --- Direct Compatibility Alias Endpoints ---
app.post('/api/questions/generate-ai', upload.single('file'), requireAdmin, examController.generateAIQuestions);
app.post('/api/questions/upload/:exam_id', upload.single('file'), requireAdmin, examController.uploadQuestionsExcel);
app.post('/api/factory-reset', requireAdmin, examController.factoryReset);
app.get('/api/exam-questions/:exam_id', requireStudent, examController.getQuestions);
app.get('/api/exam-status/:exam_id', requireStudent, examController.getStatus);
app.get('/api/my-results', requireStudent, resultController.getMyResults);
app.get('/api/rank-list/:exam_id', requireAuth, resultController.getRankList);
app.get('/api/leaderboard', requireAuth, resultController.getLeaderboard);
app.post('/api/submit', requireStudent, validate(submitExamSchema), resultController.submit);
app.post('/api/submit-exam', requireStudent, validate(submitExamSchema), resultController.submit);
app.get('/api/result/:id', requireAuth, resultController.getById);
app.get('/api/results/:id', requireAuth, resultController.getById);
app.get('/api/result-pdf/:result_id', requireAuth, resultController.downloadPDF);
app.get('/api/hall-ticket/:exam_id', requireStudent, resultController.downloadHallTicket);
app.get('/api/ai-analysis/:result_id', requireAuth, resultController.getAIAnalysis);
app.post('/api/proctor-status', requireStudent, proctorController.updateStatus);
app.post('/api/flag-violation', requireAuth, validate(flagViolationSchema), proctorController.flagViolation);
app.get('/api/exam-security-status', requireStudent, proctorController.getSecurityStatus);
app.post('/api/proctor/verify-identity', requireStudent, proctorController.verifyIdentity);
app.get('/api/proctor/settings', requireAuth, proctorController.getSettings);
app.post('/api/proctor/settings', requireAdmin, proctorController.updateSettings);
app.get('/api/proctor/report/:result_id', requireAuth, proctorController.getReportData);
app.get('/api/proctor/report-pdf/:result_id', requireAuth, proctorController.generateReportPDF);

// Canonical student-facing AI tutor endpoint.
app.post('/api/ai/chat', requireStudent, async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Message is required.' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('[AI ERROR] Gemini API key is not configured on the server.');
            return res.status(503).json({
                success: false,
                error: 'AI assistant is currently unavailable. Gemini API key is not configured on the server.'
            });
        }

        // 1. Housekeeping: expire stale active sessions whose time limit has elapsed
        await query(`
            UPDATE proctor_status ps
            JOIN exams e ON ps.exam_id = e.id
            SET ps.status = 'expired'
            WHERE ps.student_id = ?
              AND ps.status = 'active'
              AND ps.exam_started_at IS NOT NULL
              AND TIMESTAMPDIFF(MINUTE, ps.exam_started_at, NOW()) >= e.time_limit
        `, [req.userId]).catch(() => {});

        // 2. Housekeeping: mark submitted sessions where student submitted an attempt
        await query(`
            UPDATE proctor_status ps
            JOIN results r ON ps.student_id = r.student_id AND ps.exam_id = r.exam_id
            SET ps.status = 'submitted'
            WHERE ps.student_id = ?
              AND ps.status = 'active'
        `, [req.userId]).catch(() => {});

        // 3. Check if candidate currently has a verified, ongoing active exam session
        const activeExamRows = await query(`
            SELECT ps.id, ps.exam_id, ps.exam_started_at, e.name as exam_name, e.time_limit
            FROM proctor_status ps
            JOIN exams e ON ps.exam_id = e.id
            WHERE ps.student_id = ?
              AND ps.status IN ('active', 'flagged')
              AND ps.identity_verified = 1
              AND ps.exam_started_at IS NOT NULL
              AND TIMESTAMPDIFF(MINUTE, ps.exam_started_at, NOW()) < e.time_limit
              AND NOT EXISTS (
                  SELECT 1 FROM results r 
                  WHERE r.student_id = ps.student_id AND r.exam_id = ps.exam_id
              )
            ORDER BY ps.exam_started_at DESC
            LIMIT 1
        `, [req.userId]);

        const activeExam = activeExamRows.length > 0 ? activeExamRows[0] : null;

        // 4. Anti-cheating verification if candidate has an ongoing exam in progress
        if (activeExam) {
            const activeQuestions = await query(
                `SELECT question FROM questions WHERE exam_id = ?`,
                [activeExam.exam_id]
            );

            const isExamQuestion = activeQuestions.some((qRow) =>
                isLikelyCurrentExamQuestion(message, qRow.question)
            );

            if (isExamQuestion) {
                console.log(`[AI RESTRICTION] Blocked prompt matching active exam ${activeExam.exam_id} for student ${req.userId}: "${message.slice(0, 50)}"`);
                return res.status(403).json({
                    success: false,
                    error: "I can't provide answers to an active examination question. I can explain the underlying concept so you can learn it."
                });
            }
        }

        console.log(`[AI] Request received from student ${req.userId}: "${message.slice(0, 50)}..."`);
        console.log('[AI] Gemini request started');

        const configuredModel = process.env.AI_MODEL || 'gemini-flash-lite-latest';
        const configuredTimeout = parseInt(process.env.AI_CHAT_TIMEOUT_MS || '30000', 10);

        const reply = await generateAcademicReply({
            message: message.trim(),
            history: normalizeChatHistory(history),
            activeExam,
            apiKey,
            model: configuredModel,
            timeoutMs: configuredTimeout,
        });

        console.log('[AI] Gemini response received successfully');
        return res.json({ success: true, reply });
    } catch (err) {
        console.error('[AI ERROR] Gemini request failed:', {
            code: err?.code,
            status: err?.status,
            message: err.message,
            stack: err.stack
        });

        let status = 500;
        let message = 'AI service is temporarily unavailable. Please try again.';

        if (err.status === 400 || err.code === 400) {
            status = 400;
            message = err.message || 'Invalid request to AI assistant.';
        } else if (err.status === 401 || err.code === 401 || err.code === 'MISSING_API_KEY') {
            status = 503;
            message = 'AI assistant configuration issue on server. Please contact administrator.';
        } else if (err.status === 403 || err.code === 403) {
            status = 403;
            message = err.message || "I can't provide answers to an active examination question. I can explain the underlying concept so you can learn it.";
        } else if (err.status === 429 || err.code === 429 || /rate limit|quota|resource exhausted/i.test(err.message)) {
            status = 429;
            message = 'AI service rate limit reached. Please wait a moment and try again.';
        } else if (err.status === 504 || err.code === 'ETIMEDOUT' || /timed? ?out/i.test(err.message)) {
            status = 504;
            message = 'AI request timed out while generating response. Please try again.';
        } else if (err.status === 404 || /not found|retired|unavailable/i.test(err.message)) {
            status = 502;
            message = 'The configured AI model is currently unavailable. Please try again later.';
        }

        return res.status(status).json({ success: false, error: message });
    }
});

// Health Check Endpoint — verifies both the HTTP process and MySQL connectivity.
app.get('/api/health', async (req, res) => {
    try {
        await query('SELECT 1 AS healthy');
        res.json({
            status: 'ok',
            database: { ok: true, engine: 'mysql8' },
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (error) {
        console.error('[HEALTH] MySQL check failed:', error.message);
        res.status(503).json({
            status: 'degraded',
            database: { ok: false, error: 'MySQL connectivity unavailable' },
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    }
});

// --- Serve React Build Frontend ---
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.use((req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}

const { verifyToken } = require('./config/jwt');

// Socket.IO Authentication Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
        // Allow unauthenticated connections in development for status monitoring if needed, but attach flag
        socket.user = null;
        return next();
    }
    const decoded = verifyToken(token);
    if (decoded) {
        socket.user = decoded;
    }
    next();
});

io.on('connection', (socket) => {
    const userInfo = socket.user ? `${socket.user.username} (${socket.user.role})` : 'Anonymous';
    console.log(`[WS] Client connected: ${socket.id} — ${userInfo}`);
    socket.on('disconnect', () => console.log('[WS] Client disconnected:', socket.id));
});

app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '5000', 10);
if (require.main === module) {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`\n  🎓 AGMR Online Examination System Backend`);
        console.log(`  ──────────────────────────────────────────`);
        console.log(`  ✅ Server running on port ${PORT}`);
        console.log(`  🐬 MySQL 8 database ready`);
        console.log(`  🔑 JWT Authentication active\n`);
    });
}

module.exports = { app, server };
