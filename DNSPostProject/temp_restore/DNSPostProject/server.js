const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Database
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error(err.message);
    else console.log('Connected to the SQLite database.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS Users (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Username TEXT UNIQUE,
        Password TEXT,
        Role TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS Questions (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        QuestionText TEXT,
        OptionA TEXT, OptionB TEXT, OptionC TEXT, OptionD TEXT,
        CorrectOption TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS Results (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Username TEXT,
        Score INTEGER,
        ExamDate DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed Data
    db.get("SELECT COUNT(*) AS count FROM Users", (err, row) => {
        if (row.count === 0) {
            db.run("INSERT INTO Users (Username, Password, Role) VALUES ('admin', 'admin123', 'Admin')");
            db.run("INSERT INTO Users (Username, Password, Role) VALUES ('student1', 'pass1', 'Student')");
            db.run("INSERT INTO Users (Username, Password, Role) VALUES ('student2', 'pass2', 'Student')");
        }
    });

    db.get("SELECT COUNT(*) AS count FROM Questions", (err, row) => {
        if (row.count === 0) {
            const seedQueries = [
                `INSERT INTO Questions (QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption) VALUES
                ('What does ASP.NET stand for?', 'Active Server Pages Network Enabled Technologies', 'Active Server Pages .NET', 'Active Server Panel .NET', 'None of the above', 'B')`,
                `INSERT INTO Questions (QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption) VALUES
                ('Which of the following is true about ASP.NET?', 'It is a framework', 'It is a language', 'It is a database', 'It is an OS', 'A')`,
                `INSERT INTO Questions (QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption) VALUES
                ('What is the default scripting language in ASP.NET?', 'VBScript', 'JavaScript', 'C#', 'C++', 'C')`,
                `INSERT INTO Questions (QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption) VALUES
                ('Which file contains configuration settings for a Web application?', 'web.config', 'machine.config', 'global.asax', 'default.aspx', 'A')`,
                `INSERT INTO Questions (QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption) VALUES
                ('What is the first event in the ASP.NET page life cycle?', 'Page_Load', 'Page_Init', 'PreInit', 'PreLoad', 'C')`,
                `INSERT INTO Questions (QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption) VALUES
                ('Which object is used to share data across all users?', 'Session', 'Application', 'ViewState', 'Cookie', 'B')`,
                `INSERT INTO Questions (QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption) VALUES
                ('What is the use of ViewState?', 'To retain state across postbacks', 'To store data securely', 'To share data between users', 'To store session data', 'A')`,
                `INSERT INTO Questions (QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption) VALUES
                ('Which control is used to display tabular data?', 'Repeater', 'DataList', 'GridView', 'All of the above', 'D')`,
                `INSERT INTO Questions (QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption) VALUES
                ('Which validation control ensures a value is provided?', 'RequiredFieldValidator', 'CompareValidator', 'RangeValidator', 'RegularExpressionValidator', 'A')`,
                `INSERT INTO Questions (QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption) VALUES
                ('How long is the default Session timeout in ASP.NET?', '10 mins', '20 mins', '30 mins', '60 mins', 'B')`
            ];
            seedQueries.forEach(q => db.run(q));
        }
    });
});

// Middleware to check roles
const requireAuth = (req, res, next) => {
    if (!req.cookies.user) return res.status(401).json({ error: "Unauthorized" });
    next();
};

const requireAdmin = (req, res, next) => {
    if (req.cookies.role !== 'Admin') return res.status(403).json({ error: "Forbidden" });
    next();
};

const requireStudent = (req, res, next) => {
    if (req.cookies.role !== 'Student') return res.status(403).json({ error: "Forbidden" });
    next();
};

// API Routes
app.post('/api/login', (req, res) => {
    const { username, password, role } = req.body;
    db.get("SELECT Role FROM Users WHERE Username = ? AND Password = ? AND Role = ?", [username, password, role], (err, row) => {
        if (err || !row) return res.status(401).json({ error: "Invalid credentials" });
        res.cookie('user', username, { httpOnly: false });
        res.cookie('role', row.Role, { httpOnly: false });
        res.json({ success: true, role: row.Role, username: username });
    });
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('user');
    res.clearCookie('role');
    res.json({ success: true });
});

app.get('/api/questions', requireAuth, (req, res) => {
    db.all("SELECT Id, QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption FROM Questions", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/exam-questions', requireStudent, (req, res) => {
    db.all("SELECT Id, QuestionText, OptionA, OptionB, OptionC, OptionD FROM Questions ORDER BY RANDOM() LIMIT 10", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/questions', requireAdmin, (req, res) => {
    const { QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption } = req.body;
    db.run(`INSERT INTO Questions (QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption) VALUES (?, ?, ?, ?, ?, ?)`,
        [QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

app.delete('/api/questions/:id', requireAdmin, (req, res) => {
    db.run("DELETE FROM Questions WHERE Id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/results', requireAdmin, (req, res) => {
    db.all("SELECT Username, Score, ExamDate FROM Results ORDER BY Score DESC, ExamDate DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/leaderboard', requireAuth, (req, res) => {
    db.all("SELECT Username, MAX(Score) as Score FROM Results GROUP BY Username ORDER BY MAX(Score) DESC LIMIT 5", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/submit', requireStudent, (req, res) => {
    const answers = req.body.answers; // Expecting { questionId: 'A' }
    let score = 0;
    db.all("SELECT Id, CorrectOption FROM Questions", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const correctAnswers = {};
        rows.forEach(r => correctAnswers[r.Id] = r.CorrectOption);

        for (const [qId, ans] of Object.entries(answers)) {
            if (correctAnswers[qId] === ans) score++;
        }

        db.run("INSERT INTO Results (Username, Score) VALUES (?, ?)", [req.cookies.user, score], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, score: score });
        });
    });
});

// Fallback all routes to index.html (SPA like routing just in case)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = 8080;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
