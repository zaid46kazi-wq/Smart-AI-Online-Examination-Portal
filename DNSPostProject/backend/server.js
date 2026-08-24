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

// --- Middleware ---
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
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
    'application/vnd.ms-excel'
];

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`)
    }),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const validExt = ['.pdf', '.xlsx', '.xls'].includes(ext);
        const validMime = allowedMimeTypes.includes(file.mimetype) || file.mimetype === 'application/octet-stream';
        if (validExt && validMime) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only PDF and Excel files (.pdf, .xlsx, .xls) are allowed.'));
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
app.get('/api/result-pdf/:result_id', requireAuth, resultController.downloadPDF);
app.get('/api/hall-ticket/:exam_id', requireStudent, resultController.downloadHallTicket);
app.post('/api/proctor-status', requireStudent, proctorController.updateStatus);
app.post('/api/flag-violation', requireAuth, validate(flagViolationSchema), proctorController.flagViolation);
app.get('/api/exam-security-status', requireStudent, proctorController.getSecurityStatus);
app.get('/api/incidents/:exam_id', requireAdmin, proctorController.getIncidents);
app.post('/api/proctor/verify-identity', requireStudent, proctorController.verifyIdentity);
app.get('/api/proctor/settings', requireAuth, proctorController.getSettings);
app.post('/api/proctor/settings', requireAdmin, proctorController.updateSettings);
app.get('/api/proctor/report/:result_id', requireAuth, proctorController.getReportData);
app.get('/api/proctor/report-pdf/:result_id', requireAuth, proctorController.generateReportPDF);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
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
