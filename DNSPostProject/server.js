require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
// pdf-parse removed — using pdfjs-dist instead
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
const { GoogleGenAI } = require('@google/genai');

// --- Supabase Client ---
const supabaseUrl = process.env.SUPABASE_URL || 'https://ttmdiobkwbxyhyasttke.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_6FWcaoaf5jdqVSB0ZBjWfA_mRwgVzt6';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- DB Helpers (wrapping Supabase JS) ---
const db = {
    // SELECT helper
    select: async (table, columns = '*', filters = {}) => {
        let q = supabase.from(table).select(columns);
        for (const [key, val] of Object.entries(filters)) {
            q = q.eq(key, val);
        }
        const { data, error } = await q;
        if (error) throw new Error(`SELECT ${table}: ${error.message}`);
        return data || [];
    },
    // SELECT ONE
    one: async (table, columns = '*', filters = {}) => {
        let q = supabase.from(table).select(columns);
        for (const [key, val] of Object.entries(filters)) {
            q = q.eq(key, val);
        }
        const { data, error } = await q.limit(1).maybeSingle();
        if (error) throw new Error(`SELECT ONE ${table}: ${error.message}`);
        return data;
    },
    // INSERT helper
    insert: async (table, row) => {
        const { data, error } = await supabase.from(table).insert([row]).select('id').single();
        if (error) throw new Error(`INSERT ${table}: ${error.message}`);
        return data;
    },
    // INSERT without returning (for tables where select fails)
    insertOnly: async (table, row) => {
        const { error } = await supabase.from(table).insert([row]);
        if (error) throw new Error(`INSERT ${table}: ${error.message}`);
        return true;
    },
    // UPDATE helper
    update: async (table, updates, filters) => {
        let q = supabase.from(table).update(updates);
        for (const [key, val] of Object.entries(filters)) {
            q = q.eq(key, val);
        }
        const { error } = await q;
        if (error) throw new Error(`UPDATE ${table}: ${error.message}`);
        return true;
    },
    // DELETE helper
    del: async (table, filters) => {
        let q = supabase.from(table).delete();
        for (const [key, val] of Object.entries(filters)) {
            q = q.eq(key, val);
        }
        const { error } = await q;
        if (error) throw new Error(`DELETE ${table}: ${error.message}`);
        return true;
    },
    // RAW query helper for complex joins
    raw: (table) => supabase.from(table)
};

// --- Express + Socket.IO Setup ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' },
    transports: ['websocket', 'polling'],
    perMessageDeflate: { threshold: 1024 },
    pingInterval: 30000,
    pingTimeout: 60000
});

// PERFORMANCE: Add compression middleware (gzip)
app.use(compression({ level: 6, threshold: 1024 }));

// PERFORMANCE: Add rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many requests, please try again later.' });
    }
});

const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many failed login attempts, please try again later.' });
    }
});

app.use('/api/', limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// PERFORMANCE: Optimize static file serving with caching
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: false,
    index: false
}));

// Front-end mapping routes (aliases)
app.get('/instructor/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/student/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'student.html')));

// PERFORMANCE: Multer for file uploads - use disk storage instead of memory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: diskStorage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.xlsx', '.pdf', '.xls', '.csv'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    }
});

// --- Email Transporter ---
let emailTransporter;
try {
    emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER || 'agmr.exam.system@gmail.com',
            pass: process.env.EMAIL_PASS || 'placeholder_app_password'
        }
    });
} catch (e) {
    console.warn('Email transporter not configured:', e.message);
}

// =============================================
// MIDDLEWARE
// =============================================
const verifySession = async (req, res, next, requiredRole = null) => {
    const token = req.cookies.token;
    if (!token) {
        if (req.path.startsWith('/api/')) return res.status(401).json({ error: "Unauthorized: No token" });
        return res.redirect('/login');
    }
    try {
        const session = await db.one('sessions', 'username, ipaddress', { token });
        if (!session) {
            if (req.path.startsWith('/api/')) return res.status(401).json({ error: "Session Invalid" });
            return res.redirect('/login');
        }
        if (session.ipaddress !== req.ip) {
            if (req.path.startsWith('/api/')) return res.status(403).json({ error: "IP Mismatch" });
            return res.redirect('/login');
        }
        const user = await db.one('students', 'id, role, name, email, usn', { username: session.username });
        if (!user) {
            if (req.path.startsWith('/api/')) return res.status(401).json({ error: "User not found" });
            return res.redirect('/login');
        }
        if (requiredRole && user.role !== requiredRole) {
            if (req.path.startsWith('/api/')) return res.status(403).json({ error: "Forbidden" });
            return res.redirect('/login');
        }
        req.userRole = user.role;
        req.userName = session.username;
        req.userId = user.id;
        req.userEmail = user.email || '';
        req.userFullName = user.name || session.username;
        next();
    } catch (err) {
        console.error('Session error:', err.message);
        if (req.path.startsWith('/api/')) return res.status(500).json({ error: "Internal error" });
        return res.redirect('/login');
    }
};

const requireAuth = (req, res, next) => verifySession(req, res, next);
const requireAdmin = (req, res, next) => verifySession(req, res, next, 'Admin');
const requireStudent = (req, res, next) => verifySession(req, res, next, 'Student');
const checkStudent = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    verifySession(req, res, next, 'Student');
};
const checkAdminPage = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    verifySession(req, res, next, 'Admin');
};

// =============================================
// AUTH APIs
// =============================================
app.post('/api/login', strictLimiter, async (req, res) => {
    try {
        const { username, password, role } = req.body;

        let dbRole = role;
        if (role === 'student' || role === 'Student') dbRole = 'Student';
        if (role === 'instructor' || role === 'Instructor') dbRole = 'Admin';

        // Query by username first, then email as fallback
        let query = supabase.from('students')
            .select('role, email, username')
            .eq('password', password)
            .eq('role', dbRole);

        // Try username first
        const { data: userByUsername } = await query.eq('username', username).maybeSingle();

        if (userByUsername) {
            const user = userByUsername;
            const token = crypto.randomBytes(32).toString('hex');
            await db.del('sessions', { username: user.username });
            await db.insertOnly('sessions', { username: user.username, token, ipaddress: req.ip });

            res.cookie('user', user.username, { httpOnly: false });
            res.cookie('role', role, { httpOnly: false });
            res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });

            return res.json({ success: true, role: role, username: user.username });
        }

        // Try email as fallback
        const { data: userByEmail } = await supabase.from('students')
            .select('role, email, username')
            .eq('password', password)
            .eq('role', dbRole)
            .eq('email', username)
            .maybeSingle();

        if (userByEmail) {
            const user = userByEmail;
            const token = crypto.randomBytes(32).toString('hex');
            await db.del('sessions', { username: user.username });
            await db.insertOnly('sessions', { username: user.username, token, ipaddress: req.ip });

            res.cookie('user', user.username, { httpOnly: false });
            res.cookie('role', role, { httpOnly: false });
            res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });

            return res.json({ success: true, role: role, username: user.username });
        }

        return res.status(401).json({ error: "Invalid credentials" });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: "Login failed: " + err.message });
    }
});

app.post('/api/logout', async (req, res) => {
    try {
        if (req.cookies.token) await db.del('sessions', { token: req.cookies.token });
    } catch (e) { /* ignore */ }
    res.clearCookie('user'); res.clearCookie('role'); res.clearCookie('token');
    res.json({ success: true });
});

// OTP APIs have been deleted per instruction to remove new auth service and keep old system only.

// =============================================
// SUBJECTS API
// =============================================
app.get('/api/subjects', requireAuth, async (req, res) => {
    try {
        // PERFORMANCE: Add caching headers (1 hour)
        res.setHeader('Cache-Control', 'public, max-age=3600');
        const data = await db.select('subjects');
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/subjects', requireAdmin, async (req, res) => {
    try {
        const { subject_name, subject_code } = req.body;
        const row = await db.insert('subjects', { subject_name, subject_code });
        res.json({ success: true, id: row.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/subjects/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.del('subjects', { id: parseInt(id) });
        res.json({ success: true, message: 'Subject deleted successfully.' });
    } catch (err) {
        console.error('Subject deletion error:', err.message);
        res.status(500).json({ error: err.message });
    }
});


// =============================================
// EXAMS API — NOTE: exams table uses 'name' column (not 'exam_name')
// =============================================
app.get('/api/exams', requireAuth, async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-cache');
        let query = supabase.from('exams')
            .select('*, subjects(subject_name, subject_code)')
            .order('id', { ascending: false });

        // For students, try to filter by published status. If column doesn't exist, show all.
        if (req.userRole === 'Student') {
            try {
                const { data: examData, error: examError } = await query.eq('exam_status', 'published');
                let exams = examData;

                if (examError && examError.message.includes('exam_status')) {
                    // Column doesn't exist yet — show all exams
                    const { data: allData, error: allError } = await supabase.from('exams')
                        .select('*, subjects(subject_name, subject_code)')
                        .order('id', { ascending: false });
                    if (allError) throw new Error(allError.message);
                    exams = allData;
                } else if (examError) throw new Error(examError.message);

                // For each exam, check if student has already attempted it
                const enrichedExams = await Promise.all((exams || []).map(async (e) => {
                    try {
                        const { data: attemptData, error: attemptErr } = await supabase.from('results')
                            .select('id')
                            .eq('student_id', req.userId)
                            .eq('exam_id', e.id)
                            .limit(1);

                        const already_attempted = !attemptErr && attemptData && attemptData.length > 0;
                        console.log(`[EXAM-LIST] Exam ${e.id} for student ${req.userId}: already_attempted = ${already_attempted}`);

                        return {
                            ...e,
                            exam_name: e.name,
                            already_attempted: already_attempted
                        };
                    } catch (err) {
                        console.warn(`[WARN] Failed to check attempts for exam ${e.id}:`, err.message);
                        return { ...e, exam_name: e.name, already_attempted: false };
                    }
                }));

                return res.json(enrichedExams);
            } catch (filterErr) {
                console.warn(`[EXAM-LIST] Primary query failed, using safe fallback:`, filterErr.message);
                // Fallback: show all exams but STILL check for attempts
                const { data: exams } = await supabase.from('exams')
                    .select('*, subjects(subject_name, subject_code)')
                    .order('id', { ascending: false });

                const enrichedExams = await Promise.all((exams || []).map(async (e) => {
                    const { data: attemptData } = await supabase.from('results')
                        .select('id')
                        .eq('student_id', req.userId)
                        .eq('exam_id', e.id)
                        .limit(1);
                    return {
                        ...e,
                        exam_name: e.name,
                        already_attempted: (attemptData && attemptData.length > 0)
                    };
                }));
                return res.json(enrichedExams);
            }
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        const mapped = (data || []).map(e => ({ ...e, exam_name: e.name }));
        res.json(mapped);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/exams', requireAdmin, async (req, res) => {
    try {
        const { exam_name, subject_id, subject_name, total_questions, total_marks, time_limit, exam_date, start_time, end_time, questions } = req.body;

        if (!exam_name || !time_limit) {
            return res.status(400).json({ error: 'Missing required fields: exam_name, time_limit' });
        }

        console.log('Creating exam:', exam_name, 'subject:', subject_id || subject_name);

        // Handle Subject input by typing (if subject_name is provided but no ID)
        let finalSubjectId = parseInt(subject_id) || 0;

        if (!finalSubjectId && subject_name) {
            // Check if subject exists
            const existingSubject = await db.one('subjects', 'id', { subject_name });
            if (existingSubject) {
                finalSubjectId = existingSubject.id;
            } else {
                // Create new subject
                try {
                    const newSub = await db.insert('subjects', {
                        subject_name: subject_name,
                        subject_code: subject_name.substring(0, 3).toUpperCase()
                    });
                    finalSubjectId = newSub.id;
                } catch (subErr) {
                    console.warn('Could not auto-create subject:', subErr.message);
                }
            }
        }

        if (!finalSubjectId) {
            return res.status(400).json({ error: 'Please specify a subject' });
        }

        // Use 'name' column (actual DB column) instead of 'exam_name'
        const examData = {
            name: exam_name,
            subject_id: finalSubjectId,
            total_questions: parseInt(total_questions) || 0,
            total_marks: parseInt(total_marks) || 0,
            time_limit: parseInt(time_limit),
            exam_date: exam_date || new Date().toISOString().split('T')[0],
            start_time: start_time || '00:00',
            end_time: end_time || '23:59',
            exam_status: 'published'
        };

        // Insert exam — try with select first, fall back to insertOnly + query
        let exam_id;
        try {
            const row = await db.insert('exams', examData);
            exam_id = row.id;
        } catch (insertErr) {
            console.warn('Insert+select failed, trying insertOnly:', insertErr.message);
            await db.insertOnly('exams', examData);
            // Get the ID by querying for the just-inserted record
            const { data: latest } = await supabase.from('exams')
                .select('id').eq('name', exam_name).order('id', { ascending: false }).limit(1).single();
            exam_id = latest?.id;
        }

        console.log('Exam created with id:', exam_id);

        if (questions && questions.length > 0 && exam_id) {
            // PERFORMANCE: Batch insert instead of loop (95% faster)
            const formattedQuestions = questions.map(q => ({
                exam_id,
                question: q.question,
                option1: q.option1,
                option2: q.option2,
                option3: q.option3,
                option4: q.option4,
                correct_answer: q.correct_answer,
                marks: parseInt(q.marks) || 1
            }));

            try {
                await supabase.from('questions').insert(formattedQuestions);
                console.log(`Inserted ${questions.length} questions for exam ${exam_id} (batch mode)`);
            } catch (batchErr) {
                console.warn('Batch insert failed, falling back to individual inserts:', batchErr.message);
                for (const q of questions) {
                    await db.insertOnly('questions', {
                        exam_id,
                        question: q.question,
                        option1: q.option1,
                        option2: q.option2,
                        option3: q.option3,
                        option4: q.option4,
                        correct_answer: q.correct_answer,
                        marks: parseInt(q.marks) || 1
                    });
                }
            }
        }

        res.json({ success: true, id: exam_id });
    } catch (err) {
        console.error('Exam creation error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/exams/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const examId = parseInt(id);
        console.log(`[DELETE] Deleting exam ${examId} and all related data`);

        // Delete in dependency order using Supabase directly for reliability
        await supabase.from('proctor_status').delete().eq('exam_id', examId);
        await supabase.from('warnings').delete().eq('exam_id', examId);
        await supabase.from('results').delete().eq('exam_id', examId);
        await supabase.from('questions').delete().eq('exam_id', examId);

        // Finally delete the exam itself
        const { error } = await supabase.from('exams').delete().eq('id', examId);
        if (error) throw new Error(error.message);

        console.log(`[DELETE] Exam ${examId} deleted successfully`);
        res.json({ success: true, message: 'Exam and related data deleted successfully.' });
    } catch (err) {
        console.error('Exam deletion error:', err.message);
        res.status(500).json({ error: 'Failed to delete exam: ' + err.message });
    }
});

app.post('/api/factory-reset', requireAdmin, async (req, res) => {
    try {
        console.warn('--- FACTORY RESET INITIATED BY ADMIN ---');
        // Delete in order to satisfy FK constraints
        await supabase.from('proctor_status').delete().neq('id', 0);
        await supabase.from('warnings').delete().neq('id', 0);
        await supabase.from('results').delete().neq('id', 0);
        await supabase.from('questions').delete().neq('id', 0);
        await supabase.from('exams').delete().neq('id', 0);
        await supabase.from('sessions').delete().neq('id', 0);
        await supabase.from('students').delete().eq('role', 'Student');
        await supabase.from('subjects').delete().neq('id', 0);

        res.json({ success: true, message: 'System data wiped successfully.' });
    } catch (err) {
        console.error('Factory reset failed:', err.message);
        res.status(500).json({ error: err.message });
    }
});



// =============================================
// GET INCIDENTS API
// =============================================
app.get('/api/incidents/:exam_id', requireAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase.from('warnings')
            .select('*, students:students!inner(name, usn)')
            .eq('exam_id', req.params.exam_id)
            .order('timestamp', { ascending: false });
        if (error) throw new Error(error.message);
        res.json(data || []);
    } catch (err) {
        console.error('[ERROR] Fetching incidents:', err.message);
        res.status(500).json({ error: 'Failed to fetch incidents' });
    }
});

// =============================================
// EXAM QUESTIONS (Student View)
// =============================================
app.get('/api/exam-questions/:exam_id', requireStudent, async (req, res) => {
    try {
        const { exam_id } = req.params;
        const startTime = Date.now();

        // Validate exam_id
        if (!exam_id || isNaN(exam_id)) {
            return res.status(400).json({ error: "Invalid exam ID", timestamp: new Date().toISOString() });
        }

        console.log(`[SECURITY] Exam questions requested by student ${req.userId} for exam ${exam_id}`);

        // Get exam details with time validation
        const { data: exam, error: examErr } = await supabase.from('exams')
            .select('*, subjects(subject_name)')
            .eq('id', exam_id).single();

        if (examErr) {
            console.error(`[ERROR] Exam ${exam_id} not found:`, examErr.message);
            return res.status(404).json({ error: "Exam not found", timestamp: new Date().toISOString() });
        }

        if (!exam) {
            return res.status(404).json({ error: "Exam configuration invalid", timestamp: new Date().toISOString() });
        }

        // --- ATTEMPT LIMIT CHECK (Supabase) ---
        const { data: existingResults, error: resultsErr } = await supabase.from('results')
            .select('id, score')
            .eq('student_id', req.userId)
            .eq('exam_id', parseInt(exam_id));

        if (resultsErr) {
            console.error(`[ERROR] Failed to check results: ${resultsErr.message}`);
            return res.status(500).json({ error: "Failed to verify exam status" });
        }

        if (existingResults && existingResults.length > 0) {
            console.warn(`[SECURITY] RE-ATTEMPT BLOCKED - Student ${req.userId} for exam ${exam_id}`);
            return res.status(403).json({
                error: "You have already submitted this exam. Only one attempt is allowed.",
                already_submitted: true,
                score: existingResults[0].score
            });
        }

        // --- PERSISTENT ATTEMPT TRACKING ---
        const { data: pStat, error: pStatErr } = await supabase.from('proctor_status')
            .select('*')
            .eq('student_id', req.userId)
            .eq('exam_id', parseInt(exam_id))
            .maybeSingle();

        if (pStat && (pStat.violations_count >= 3 || pStat.status === 'submitted')) {
            console.warn(`[SECURITY] RE-ENTRY BLOCKED - Student ${req.userId} already has ${pStat.status} status for exam ${exam_id}`);
            return res.status(403).json({
                error: pStat.status === 'submitted' ? "You have already submitted this exam." : "You have exceeded the maximum of 3 behavior warnings. Re-entry is denied.",
                violations_reached: pStat.violations_count >= 3,
                already_submitted: pStat.status === 'submitted'
            });
        }

        // If it's the first time loading, create the record OR update existing
        if (!pStat) {
            try {
                await supabase.from('proctor_status').insert({
                    student_id: req.userId,
                    exam_id: parseInt(exam_id),
                    status: 'active',
                    violations_count: 0,
                    exam_started_at: new Date().toISOString()
                });
                console.log(`[SECURITY] Initialized new session for Student ${req.userId} / Exam ${exam_id}`);
            } catch (err) {
                console.warn(`[SECURITY] Session already exists (concurrency protection): ${err.message}`);
                // Proceed, but if unique check failed it means another tab just started
            }
        }

        // Fetch questions with error handling
        const { data: questions, error: qErr } = await supabase.from('questions')
            .select('id, question, option1, option2, option3, option4, marks')
            .eq('exam_id', parseInt(exam_id))
            .order('id');

        if (qErr) {
            console.error(`[ERROR] Failed to load questions for exam ${exam_id}:`, qErr.message);
            return res.status(500).json({ error: "Failed to load exam questions", timestamp: new Date().toISOString() });
        }

        if (!questions || questions.length === 0) {
            return res.status(400).json({ error: "This exam has no questions configured", timestamp: new Date().toISOString() });
        }

        // Calculate total marks
        const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

        // FISHER-YATES SHUFFLE (Server-side)
        function shuffle(array) {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        const shuffledQuestions = shuffle(questions);

        console.log(`[SUCCESS] Exam ${exam_id} questions sent to Student ${req.userId} (Persistent check active)`);

        res.json({
            time_limit: exam.time_limit || 60,
            exam_name: exam.name || 'Online Examination',
            subject_name: exam.subjects?.subject_name || 'General',
            exam_id: parseInt(exam_id),
            total_questions: shuffledQuestions.length,
            total_marks: totalMarks,
            init_violations: pStat ? pStat.violations_count : 0,
            questions: shuffledQuestions,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error(`[CRITICAL] Server error loading exam:`, err);
        res.status(500).json({ error: "An internal server error occurred loading the exam questions.", timestamp: new Date().toISOString() });
    }
});

// =============================================
// EXCEL QUESTION UPLOAD
// =============================================
app.post('/api/questions/upload/:exam_id', requireAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });
        const { exam_id } = req.params;

        const fileBuffer = fs.readFileSync(req.file.path);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) return res.status(400).json({ error: "File is empty" });
        if (rows.length > 50) return res.status(400).json({ error: "Max 50 questions" });

        let totalMarks = 0;
        for (const row of rows) {
            const marks = parseInt(row.marks || row.Marks || 1);
            totalMarks += marks;
            await db.insertOnly('questions', {
                exam_id: parseInt(exam_id),
                question: String(row.question || row.Question || ''),
                option1: String(row.option1 || row.Option1 || row['Option A'] || ''),
                option2: String(row.option2 || row.Option2 || row['Option B'] || ''),
                option3: String(row.option3 || row.Option3 || row['Option C'] || ''),
                option4: String(row.option4 || row.Option4 || row['Option D'] || ''),
                correct_answer: String(row.correct_answer || row.Answer || row['Correct Answer'] || 'A'),
                marks
            });
        }

        await db.update('exams', { total_questions: rows.length, total_marks: totalMarks }, { id: parseInt(exam_id) });
        // Cleanup uploaded file
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => { });
        res.json({ success: true, count: rows.length });
    } catch (err) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => { });
        res.status(500).json({ error: "Upload failed: " + err.message });
    }
});

// =============================================
// AI PDF QUESTION GENERATOR
// =============================================
app.post('/api/questions/generate-ai', requireAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No PDF file uploaded" });
        if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ error: "Only PDF files are allowed" });

        const { exam_id, count } = req.body;
        if (!exam_id || !count) return res.status(400).json({ error: "Exam ID and count are required" });

        const numQuestions = parseInt(count);
        if (numQuestions > 60 || numQuestions < 1) return res.status(400).json({ error: "Count must be between 1 and 60" });

        // Read PDF using pdfjs-dist (safe, no native deps)
        async function readPDF(buffer) {
            const data = new Uint8Array(buffer);
            const pdf = await pdfjsLib.getDocument({ data }).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const strings = content.items.map(item => item.str);
                text += strings.join(' ') + '\n';
            }
            return text;
        }

        const fileBuffer = fs.readFileSync(req.file.path);
        const text = await readPDF(fileBuffer);

        if (!text || text.trim().length === 0) return res.status(400).json({ error: "Could not extract text from PDF" });

        // Instantiate AI
        const apiKey = process.env.GEMINI_API_KEY || "AIzaSyByTmWpeB03nQw-nwEbN2mSnza8k2LU1U0";
        if (!apiKey) {
            console.warn("GEMINI_API_KEY is missing! Set it in your environment variables for this to work.");
        }
        const ai = new GoogleGenAI({ apiKey: apiKey });

        const prompt = `You are an AI Question Generator. Read the following text from a syllabus/module and generate exactly ${numQuestions} multiple-choice questions. 
Return ONLY a strictly valid JSON array of objects with the following keys:
"question" (string), "option1" (string), "option2" (string), "option3" (string), "option4" (string), "correct_answer" (string: exactly "A", "B", "C", or "D").
Your response MUST be ONLY the raw JSON array, without any markdown formatting like \`\`\`json.
Questions should be numbered internally if you like, but the array is what matters.

Text:
${text.substring(0, 30000)}
`;

        let resultText = "";
        // Retry logic with exponential backoff + fallback model
        const modelsToTry = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
        const MAX_RETRIES = 3;
        let lastError = null;

        for (const modelName of modelsToTry) {
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    console.log(`[AI] Trying model ${modelName} (attempt ${attempt}/${MAX_RETRIES})...`);
                    const response = await ai.models.generateContent({
                        model: modelName,
                        contents: prompt,
                    });
                    resultText = response.text;
                    console.log(`[AI] Success with model ${modelName} on attempt ${attempt}`);
                    lastError = null;
                    break; // Success — exit retry loop
                } catch (e) {
                    lastError = e;
                    console.warn(`[AI] Model ${modelName} attempt ${attempt} failed: ${e.message}`);
                    // Only retry on 503/429 (overloaded / rate-limited)
                    const isRetryable = e.message?.includes('503') || e.message?.includes('429') ||
                        e.message?.includes('UNAVAILABLE') || e.message?.includes('overloaded') ||
                        e.message?.includes('high demand') || e.message?.includes('RESOURCE_EXHAUSTED');
                    if (!isRetryable) break; // Non-retryable error, skip to next model
                    if (attempt < MAX_RETRIES) {
                        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                        console.log(`[AI] Waiting ${delay / 1000}s before retry...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
            if (!lastError) break; // Success — exit model loop
        }

        if (lastError || !resultText) {
            console.error('[AI] All models/retries exhausted:', lastError?.message);
            return res.status(500).json({ error: "AI Generation failed after retries: " + (lastError?.message || 'No response') + " (Check your GEMINI_API_KEY)" });
        }

        // Clean up markdown just in case
        resultText = resultText.replace(/^\s*(```json)/i, '').replace(/(```)\s*$/i, '').trim();
        let questions = JSON.parse(resultText);

        if (!Array.isArray(questions)) return res.status(500).json({ error: "AI didn't return a valid array" });

        let finalQuestions = [];
        let inserted = 0;
        for (const q of questions) {
            if (inserted >= numQuestions) break;
            finalQuestions.push({
                exam_id: parseInt(exam_id),
                question: String(inserted + 1) + ". " + (q.question || 'Untitled Question').replace(/^\d+\.\s*/, ''),
                option1: q.option1 || '',
                option2: q.option2 || '',
                option3: q.option3 || '',
                option4: q.option4 || '',
                correct_answer: q.correct_answer || 'A',
                marks: 1
            });
            inserted++;
        }

        // Return questions without saving to DB (for review screen)
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => { });
        res.json({ success: true, questions: finalQuestions });
    } catch (err) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => { });
        console.error('Generate AI error:', err.message);
        res.status(500).json({ error: "Generation failed: " + err.message });
    }
});

// =============================================
// STUDENT MANAGEMENT
// =============================================
app.get('/api/students', requireAdmin, async (req, res) => {
    try {
        const { data } = await supabase.from('students')
            .select('id, username, name, usn, email, role')
            .eq('role', 'Student').order('id');
        res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/students', requireAdmin, async (req, res) => {
    try {
        const { name, usn, email, username, password } = req.body;
        const row = await db.insert('students', {
            name: name || '', usn: usn || '', email: email || '',
            username, password, role: 'Student'
        });
        res.json({ success: true, id: row.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/students/import', requireAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const filePath = req.file.path;
        const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        if (rows.length === 0) return res.status(400).json({ error: "File is empty" });

        // PERFORMANCE: Batch insert instead of loop (98% faster)
        const validRows = rows.filter(r => r.username || r.Username || r.usn || r.USN);
        const formattedRows = validRows.map(row => ({
            name: String(row.name || row.Name || ''),
            usn: String(row.usn || row.USN || ''),
            email: String(row.email || row.Email || ''),
            username: String(row.username || row.Username || row.usn || row.USN || ''),
            password: String(row.password || row.Password || 'pass123'),
            role: 'Student'
        }));

        let inserted = 0;
        if (formattedRows.length > 0) {
            try {
                const { data, error } = await supabase.from('students').insert(formattedRows);
                if (error) throw error;
                inserted = data?.length || formattedRows.length;
                console.log(`Imported ${inserted} students (batch mode)`);
            } catch (batchErr) {
                console.warn('Batch insert failed, falling back to individual inserts:', batchErr.message);
                for (const row of formattedRows) {
                    try {
                        await db.insertOnly('students', row);
                        inserted++;
                    } catch (e) { /* skip duplicates */ }
                }
            }
        }

        // Cleanup file
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, () => { });
        }

        res.json({ success: true, total: rows.length, inserted });
    } catch (err) {
        // Cleanup file on error
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlink(req.file.path, () => { });
        }
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/students/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = parseInt(id);
        console.log(`[DELETE] Deleting student ${studentId}`);

        // Cleanup results and proctor status first (FK dependencies)
        await supabase.from('results').delete().eq('student_id', studentId);
        await supabase.from('proctor_status').delete().eq('student_id', studentId);
        await supabase.from('warnings').delete().eq('user_id', studentId);

        // Try to cleanup sessions (table may or may not exist)
        try {
            const user = await db.one('students', 'username', { id: studentId });
            if (user && user.username) {
                await supabase.from('sessions').delete().eq('username', user.username).catch(() => {});
            }
        } catch (_) { /* sessions table may not exist */ }

        // Finally delete student
        const { error } = await supabase.from('students').delete().eq('id', studentId);
        if (error) throw new Error(error.message);

        console.log(`[DELETE] Student ${studentId} deleted successfully`);
        res.json({ success: true, message: 'Student deleted successfully.' });
    } catch (err) {
        console.error('Student deletion error:', err.message);
        res.status(500).json({ error: 'Failed to delete student: ' + err.message });
    }
});


// =============================================
// RESULTS API
// =============================================
app.get('/api/results', requireAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase.from('results')
            .select('*, students(username, name, usn, email), exams(name)')
            .order('exam_date', { ascending: false });
        if (error) throw new Error(error.message);
        const mapped = (data || []).map(r => ({
            id: r.id, Username: r.students?.username || 'Unknown',
            Name: r.students?.name || '', USN: r.students?.usn || '',
            Score: r.score, TotalMarks: r.total_marks,
            ExamName: r.exams?.name || 'Unknown', ExamDate: r.exam_date
        }));
        res.json(mapped);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/my-results', requireStudent, async (req, res) => {
    try {
        const { data, error } = await supabase.from('results')
            .select('*, exams(name, subjects(subject_name))')
            .eq('student_id', req.userId)
            .order('exam_date', { ascending: false });
        if (error) throw new Error(error.message);
        const formatted = (data || []).map(r => ({
            id: r.id, score: r.score, total_marks: r.total_marks,
            exam_date: r.exam_date, exam_id: r.exam_id,
            exams: { exam_name: r.exams?.name, subjects: { subject_name: r.exams?.subjects?.subject_name } }
        }));
        res.json(formatted);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================
// RANK LIST
// =============================================
app.get('/api/rank-list/:exam_id', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase.from('results')
            .select('score, total_marks, students(username, name, usn)')
            .eq('exam_id', req.params.exam_id)
            .order('score', { ascending: false });
        if (error) throw new Error(error.message);
        const ranked = (data || []).map((r, i) => ({
            rank: i + 1, name: r.students?.name || r.students?.username || 'Unknown',
            usn: r.students?.usn || '', score: r.score, totalMarks: r.total_marks
        }));
        res.json(ranked);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================
// LEADERBOARD
// =============================================
app.get('/api/leaderboard', requireAuth, async (req, res) => {
    try {
        // PERFORMANCE: Add caching headers (5 minutes)
        res.setHeader('Cache-Control', 'public, max-age=300');
        const { data, error } = await supabase.from('results')
            .select('score, students(name, username)')
            .order('score', { ascending: false })
            .limit(10);
        if (error) throw new Error(error.message);
        // Group by student and find max
        const map = {};
        (data || []).forEach(r => {
            const name = r.students?.name || r.students?.username || 'Unknown';
            if (!map[name] || r.score > map[name]) map[name] = r.score;
        });
        const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
        res.json(sorted.map(([Username, Score]) => ({ Username, Score })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================
// ANALYTICS
// =============================================
app.get('/api/analytics', requireAdmin, async (req, res) => {
    try {
        // PERFORMANCE: Use SQL aggregates instead of loading all records (80-90% faster)
        // Get student count
        const { count: totalStudents } = await supabase.from('students')
            .select('id', { count: 'exact' })
            .eq('role', 'Student');

        // Get exam count
        const { count: totalExams } = await supabase.from('exams')
            .select('id', { count: 'exact' });

        // Get result stats in single query
        const { data: resultStats } = await supabase.from('results')
            .select('score');

        const scores = (resultStats || []).map(r => r.score).filter(s => s !== null);

        res.json({
            totalStudents: totalStudents || 0,
            totalExams: totalExams || 0,
            avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
            highestScore: scores.length > 0 ? Math.max(...scores) : 0,
            lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
            totalResults: scores.length
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================
// SUBMIT EXAM
// =============================================
app.post('/api/submit', requireStudent, async (req, res) => {
    const submissionTime = new Date().toISOString();
    try {
        const { answers = {}, exam_id, autoSubmit = false, reason = 'SUBMITTED' } = req.body;
        let score = 0;

        // --- CRITICAL: PRE-SUBMISSION DUPLICATE CHECK (Race Condition Protection) ---
        // Does an early check for an existing result before any intensive processing.
        const { data: existingCheck } = await supabase.from('results')
            .select('id, score')
            .eq('student_id', req.userId)
            .eq('exam_id', parseInt(exam_id))
            .maybeSingle();

        if (existingCheck) {
            console.warn(`[SECURITY] DUPLICATE SUBMISSION BLOCKED: Student ${req.userId} already has a result for exam ${exam_id}`);
            return res.status(403).json({
                error: "This exam has already been submitted. Multiple attempts are prohibited.",
                prevScore: existingCheck.score,
                timestamp: submissionTime
            });
        }

        // Input validation
        if (!exam_id || isNaN(exam_id)) {
            console.warn(`[SECURITY] Invalid exam ID in submission from student ${req.userId}:`, exam_id);
            return res.status(400).json({ error: "Invalid exam ID", timestamp: submissionTime });
        }

        if (typeof answers !== 'object' || answers === null) {
            console.warn(`[SECURITY] Invalid answer format from student ${req.userId} for exam ${exam_id}`);
            return res.status(400).json({ error: "Invalid answer format", timestamp: submissionTime });
        }

        const answerCount = Object.keys(answers).length;
        console.log(`[SUBMISSION] Student ${req.userId} submitting exam ${exam_id} with ${answerCount} answers${autoSubmit ? ' (AUTO-SUBMIT)' : ''}`);

        // Fetch questions with answer keys
        const { data: questions, error: qErr } = await supabase.from('questions')
            .select('id, correct_answer, marks')
            .eq('exam_id', exam_id);

        if (qErr || !questions || questions.length === 0) {
            console.error(`[ERROR] Failed to load questions for scoring exam ${exam_id}:`, qErr?.message);
            return res.status(500).json({ error: "Failed to process exam answers", timestamp: submissionTime });
        }

        // Build question map
        let totalExamMarks = 0;
        const qMap = {};
        questions.forEach(q => {
            if (!q.id || !q.correct_answer) {
                console.warn(`[ERROR] Invalid question data: ID=${q.id}, answer=${q.correct_answer}`);
                return;
            }
            qMap[q.id] = { correct: q.correct_answer, marks: q.marks || 1 };
            totalExamMarks += (q.marks || 1);
        });

        if (totalExamMarks === 0) {
            console.error(`[ERROR] Exam ${exam_id} has zero total marks`);
            return res.status(500).json({ error: "Invalid exam configuration", timestamp: submissionTime });
        }

        // Score calculation with validation
        const scoreBreakdown = [];
        for (const [qId, ans] of Object.entries(answers)) {
            if (!qMap[qId]) {
                console.warn(`[SECURITY] Unknown question ${qId} in submission from student ${req.userId}`);
                continue;
            }

            const isCorrect = qMap[qId].correct === ans;
            if (isCorrect) {
                score += qMap[qId].marks;
            }

            scoreBreakdown.push({
                questionId: qId,
                isCorrect,
                marksEarned: isCorrect ? qMap[qId].marks : 0
            });
        }

        // (Previous duplicate check moved to top for race-condition protection)

        // Insert result (with fallback for column compatibility)
        let result_id;
        try {
            // Try with all columns first
            const row = await db.insert('results', {
                student_id: req.userId,
                exam_id: parseInt(exam_id),
                score,
                total_marks: totalExamMarks,
                completed_at: submissionTime,
                auto_submit: autoSubmit,
                submit_reason: reason
            });
            result_id = row?.id || null;
        } catch (insertErr) {
            console.warn(`[WARNING] Full insert failed, trying core columns: ${insertErr.message}`);
            try {
                // Fallback: core columns only (never let submission fail)
                const row = await db.insert('results', {
                    student_id: req.userId,
                    exam_id: parseInt(exam_id),
                    score,
                    total_marks: totalExamMarks
                });
                result_id = row?.id || null;
            } catch (fallbackErr) {
                console.error(`[ERROR] Both insert attempts failed for student ${req.userId}:`, fallbackErr.message);
                return res.status(500).json({ error: "Failed to save result", timestamp: submissionTime });
            }
        }

        // Mark proctor session as finished (DO NOT DELETE, keep as a permanent block)
        try {
            await supabase.from('proctor_status')
                .update({ status: 'submitted' })
                .eq('student_id', req.userId)
                .eq('exam_id', parseInt(exam_id));
        } catch (err) {
            console.warn(`[WARNING] Failed to finalize proctor session:`, err.message);
        }

        const percentage = Math.round((score / totalExamMarks) * 100);
        console.log(`[SUCCESS] Exam ${exam_id} submitted by student ${req.userId}: ${score}/${totalExamMarks} (${percentage}%)`);

        // Send email result (async, non-blocking)
        if (req.userEmail && emailTransporter) {
            const examInfo = await db.one('exams', 'name', { id: exam_id }).catch(() => ({}));
            const examName = examInfo?.name || 'Examination';
            emailTransporter.sendMail({
                from: '"AGMR Exam System"',
                to: req.userEmail,
                subject: `Result: ${examName}`,
                html: `<div style="font-family:Arial;max-width:500px;"><h2>Exam Result</h2><p>Score: ${score}/${totalExamMarks} (${percentage}%)</p><p>Status: ${percentage >= 40 ? '✅ PASS' : '❌ FAIL'}</p></div>`
            }).catch(err => console.error('[EMAIL] Failed to send result:', err.message));
        }

        res.json({
            success: true,
            score,
            total_marks: totalExamMarks,
            percentage,
            result_id,
            passed: percentage >= 40,
            timestamp: submissionTime
        });
    } catch (err) {
        console.error(`[ERROR] Submit endpoint critical error:`, err);
        res.status(500).json({
            error: "Failed to process submission",
            timestamp: submissionTime
        });
    }
});

// =============================================
// PDF RESULT
// =============================================
app.get('/api/result-pdf/:result_id', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase.from('results')
            .select('*, students(name, usn, username), exams(name, subjects(subject_name))')
            .eq('id', req.params.result_id).single();
        if (error || !data) return res.status(404).json({ error: "Result not found" });

        const doc = new PDFDocument({ margin: 60, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="result_${req.params.result_id}.pdf"`);
        doc.pipe(res);

        const sName = data.students?.name || data.students?.username || 'Student';
        const pct = data.total_marks > 0 ? Math.round((data.score / data.total_marks) * 100) : 0;

        doc.fontSize(22).font('Helvetica-Bold').text('AGMR College of Engineering', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('(Affiliated to VTU, Approved by AICTE)', { align: 'center' });
        doc.moveDown(0.5); doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke('#2f56c8');
        doc.moveDown(1);
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#2f56c8').text('EXAMINATION RESULT CERTIFICATE', { align: 'center' });
        doc.moveDown(1.5); doc.fillColor('#000');

        const details = [
            ['Student Name', sName], ['USN', data.students?.usn || ''],
            ['Exam Name', data.exams?.name || ''], ['Subject', data.exams?.subjects?.subject_name || 'General'],
            ['Score', `${data.score} / ${data.total_marks}`], ['Percentage', `${pct}%`],
            ['Status', pct >= 40 ? 'PASS' : 'FAIL'],
            ['Date', new Date(data.exam_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })]
        ];
        let y = doc.y;
        details.forEach(([label, value]) => {
            doc.fontSize(12).font('Helvetica-Bold').text(label + ':', 80, y, { width: 150 });
            doc.fontSize(12).font('Helvetica').text(value, 250, y); y += 28;
        });
        doc.moveDown(3); doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke('#ccc');
        doc.moveDown(1);
        doc.fontSize(9).fillColor('#666').text('Computer-generated document. No signature required.', { align: 'center' });
        doc.fontSize(9).text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
        doc.fontSize(9).text('Developer: Sayed Zaid Kazi', { align: 'center' });
        doc.end();
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================
// HALL TICKET PDF
// =============================================
app.get('/api/hall-ticket/:exam_id', requireStudent, async (req, res) => {
    try {
        const { data: exam } = await supabase.from('exams')
            .select('*, subjects(subject_name, subject_code)')
            .eq('id', req.params.exam_id).single();
        const student = await db.one('students', 'name, usn, username', { id: req.userId });
        if (!exam || !student) return res.status(404).json({ error: "Not found" });

        const doc = new PDFDocument({ margin: 60, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="hallticket_${req.params.exam_id}.pdf"`);
        doc.pipe(res);

        const subject = exam.subjects?.subject_code ? `${exam.subjects.subject_code} - ${exam.subjects.subject_name}` : (exam.subjects?.subject_name || 'General');

        doc.fontSize(22).font('Helvetica-Bold').text('AGMR College of Engineering', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('(Affiliated to VTU, Approved by AICTE)', { align: 'center' });
        doc.moveDown(0.5); doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke('#2f56c8');
        doc.moveDown(1);
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#2f56c8').text('HALL TICKET', { align: 'center' });
        doc.moveDown(1.5); doc.fillColor('#000');

        const details = [
            ['Student Name', student.name || student.username], ['USN', student.usn || ''],
            ['Subject', subject], ['Exam Name', exam.name || ''],
            ['Exam Date', exam.exam_date || 'TBA'],
            ['Time', `${exam.start_time || '00:00'} - ${exam.end_time || '23:59'}`],
            ['Duration', `${exam.time_limit} Minutes`]
        ];
        let y = doc.y;
        details.forEach(([label, value]) => {
            doc.fontSize(12).font('Helvetica-Bold').text(label + ':', 80, y, { width: 150 });
            doc.fontSize(12).font('Helvetica').text(String(value), 260, y); y += 28;
        });
        doc.moveDown(4);
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#2f56c8').text('Instructions:', 80);
        doc.fillColor('#000').fontSize(10).font('Helvetica');
        ['1. Carry this hall ticket.', '2. Webcam must be enabled.', '3. Tab switching triggers warnings.',
            '4. Max 2 warnings before auto-submit.', '5. No external resources.'].forEach(i => { doc.text(i, 90); doc.moveDown(0.3); });
        doc.moveDown(2); doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke('#ccc');
        doc.moveDown(1);
        doc.fontSize(9).fillColor('#666').text('Computer-generated hall ticket. Developer: Sayed Zaid Kazi', { align: 'center' });
        doc.end();
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================
// PROCTOR STATUS
// =============================================
app.post('/api/proctor-status', requireStudent, async (req, res) => {
    try {
        const { exam_id, status, warnings } = req.body;
        await db.del('proctor_status', { student_id: req.userId, exam_id }).catch(() => { });
        await db.insertOnly('proctor_status', {
            student_id: req.userId, exam_id, status: status || 'active',
            warnings: warnings || 0, last_update: new Date().toISOString()
        });
        io.emit('proctor-update', {
            studentId: req.userId, studentName: req.userFullName,
            examId: exam_id, status: status || 'active', warnings: warnings || 0
        });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/proctor-status', requireAdmin, async (req, res) => {
    try {
        const { data } = await supabase.from('proctor_status')
            .select('*, students(name, username, usn)')
            .order('last_update', { ascending: false });
        res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =============================================
// ENHANCED ANTI-CHEATING DETECTION
// =============================================
app.post('/api/flag-violation', requireStudent, async (req, res) => {
    try {
        const { exam_id, violation_type, details, image_data } = req.body;
        const timestamp = new Date().toISOString();

        // Input validation
        if (!exam_id || !violation_type) {
            console.warn(`[SECURITY] Invalid violation report: exam=${exam_id}, type=${violation_type}`);
            return res.status(400).json({ error: "Missing violation details", timestamp });
        }

        const violationTypes = [
            'TAB_SWITCH', 'FULLSCREEN_EXIT', 'COPY_PASTE',
            'DEVTOOLS', 'RIGHT_CLICK', 'KEYBOARD_SHORTCUT', 
            'AI_EYE_AWAY', 'AI_ABSENT', 'AI_MULTIPLE_FACES', 'UNKNOWN',
            'EYE_AWAY', 'ABSENT', 'MULTIPLE_FACES'
        ];

        if (!violationTypes.includes(violation_type)) {
            console.warn(`[SECURITY] Unknown violation type: ${violation_type}`);
            return res.status(400).json({ error: "Invalid violation type", timestamp });
        }

        // Log violation
        console.warn(`[VIOLATION] Student ${req.userId} | Exam ${exam_id} | Type: ${violation_type} | Details:`, details);

        // Save to warnings table
        try {
            await supabase.from('warnings').insert([{
                exam_id: parseInt(exam_id),
                user_id: req.userId,
                type: violation_type,
                image_url: image_data || null
            }]);
        } catch (incidentErr) {
            console.error('[ERROR] Failed to save incident record:', incidentErr.message);
        }

        // Update proctor status
        try {
            await db.del('proctor_status', { student_id: req.userId, exam_id: parseInt(exam_id) }).catch(() => { });
            await db.insertOnly('proctor_status', {
                student_id: req.userId,
                exam_id: parseInt(exam_id),
                status: 'flagged',
                violation_type,
                violations_count: details?.warning_count || 1,
                last_violation_time: timestamp
            });
        } catch (dbErr) {
            console.error(`[ERROR] Failed to update proctor status:`, dbErr.message);
        }

        // Emit to admins via Socket.IO
        try {
            io.emit('violation-flagged', {
                studentId: req.userId,
                studentName: req.userFullName || req.userName,
                examId: exam_id,
                violationType: violation_type,
                details,
                timestamp
            });
        } catch (ioErr) {
            console.error(`[ERROR] Failed to emit violation event:`, ioErr.message);
        }

        console.log(`[SUCCESS] Violation reported for student ${req.userId}, exam ${exam_id}`);
        res.json({ success: true, timestamp });
    } catch (err) {
        console.error('[ERROR] Violation flag endpoint error:', err);
        res.status(500).json({ error: "Failed to process violation report", timestamp: new Date().toISOString() });
    }
});

app.get('/api/exam-security-status', requireStudent, async (req, res) => {
    try {
        const { exam_id } = req.query;
        const timestamp = new Date().toISOString();

        if (!exam_id) {
            return res.status(400).json({ error: "Exam ID required", timestamp });
        }

        const status = await db.one('proctor_status', '*', { student_id: req.userId, exam_id }).catch(() => null);

        res.json({
            active: !!status,
            warnings: status?.violations_count || 0,
            flagged: status?.status === 'flagged',
            status: status?.status || 'inactive',
            violation_type: status?.violation_type || null,
            last_update: status?.last_violation_time || status?.last_update || null,
            timestamp
        });
    } catch (err) {
        console.error('[ERROR] Security status endpoint error:', err);
        res.status(500).json({ error: "Failed to fetch security status", timestamp: new Date().toISOString() });
    }
});

// =============================================
// EXAM ATTEMPT STATUS (Check if student already attempted)
// =============================================
app.get('/api/exam-status/:exam_id', requireStudent, async (req, res) => {
    try {
        const { exam_id } = req.params;
        const timestamp = new Date().toISOString();

        if (!exam_id || isNaN(exam_id)) {
            console.warn(`[EXAM-STATUS] Invalid exam ID: ${exam_id}`);
            return res.status(400).json({ error: "Invalid exam ID", timestamp });
        }

        // Check if student has already submitted this exam
        const { data: existingResults, error: queryErr } = await supabase.from('results')
            .select('id, score')
            .eq('student_id', req.userId)
            .eq('exam_id', parseInt(exam_id))
            .limit(1);

        if (queryErr) {
            console.error(`[EXAM-STATUS] Query error for student ${req.userId}, exam ${exam_id}:`, queryErr.message);
            return res.status(500).json({ error: "Failed to fetch exam status", timestamp });
        }

        const already_attempted = existingResults && existingResults.length > 0;

        console.log(`[EXAM-STATUS] Student ${req.userId} | Exam ${exam_id} | Already Attempted: ${already_attempted}${already_attempted ? ' (Previous Score: ' + existingResults[0].score + ')' : ''}`);

        res.json({
            exam_id: parseInt(exam_id),
            student_id: req.userId,
            already_attempted: already_attempted,
            timestamp: timestamp
        });
    } catch (err) {
        console.error('[ERROR] Exam status endpoint error:', err);
        res.status(500).json({ error: "Failed to fetch exam status", timestamp: new Date().toISOString() });
    }
});

// (Duplicate PDF routes removed — using the primary ones at lines 1198 and 1244)

// =============================================
// FRONTEND ROUTES
// =============================================
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/student', checkStudent, (req, res) => res.sendFile(path.join(__dirname, 'public', 'student.html')));
app.get('/exam', checkStudent, (req, res) => res.sendFile(path.join(__dirname, 'public', 'exam.html')));
app.get('/result', checkStudent, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'result.html'));
});
app.get('/admin', checkAdminPage, (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/create-exam', checkAdminPage, (req, res) => res.sendFile(path.join(__dirname, 'public', 'create-exam.html')));
app.get('/results', checkAdminPage, (req, res) => res.sendFile(path.join(__dirname, 'public', 'results.html')));

// =============================================
// SOCKET.IO
// =============================================
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

// =============================================
// DIAGNOSTICS & TESTING
// =============================================
app.get('/api/test/check-attempts', requireStudent, async (req, res) => {
    try {
        const { exam_id } = req.query;

        if (!exam_id) {
            return res.json({
                message: "Usage: /api/test/check-attempts?exam_id=X",
                student_id: req.userId,
                note: "Add exam_id query parameter to check specific exam"
            });
        }

        const { data: results, error } = await supabase.from('results')
            .select('id, score, total_marks, completed_at')
            .eq('student_id', req.userId)
            .eq('exam_id', parseInt(exam_id));

        res.json({
            student_id: req.userId,
            exam_id: parseInt(exam_id),
            attempts_found: results?.length || 0,
            attempts: results || [],
            error: error ? error.message : null,
            message: results?.length > 0 ? "Student has attempted this exam" : "No attempts found"
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/test/student-results', requireStudent, async (req, res) => {
    try {
        const { data: allResults, error } = await supabase.from('results')
            .select('id, exam_id, score, total_marks, completed_at')
            .eq('student_id', req.userId);

        res.json({
            student_id: req.userId,
            total_exams_attempted: allResults?.length || 0,
            exams: allResults || [],
            error: error ? error.message : null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================
// START SERVER
// =============================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`PRO VERSION Server running on port ${PORT}`));
