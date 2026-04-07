# 🚀 Development Server Startup Guide

## Quick Start

### Option 1: Windows Batch Script (Recommended)
```bash
.\start-dev.bat
```

### Option 2: Direct Node Command
```bash
npm run dev
```

### Option 3: Explicit Node
```bash
node server.js
```

---

## 📊 Server Configuration

| Setting | Value |
|---------|-------|
| **Default Port** | 3000 |
| **Address** | 0.0.0.0 (all interfaces) |
| **Environment** | Node.js ≥18.0.0 |
| **Framework** | Express 5.2.1 |
| **Real-time** | Socket.IO 4.8.3 |
| **Database** | Supabase |
| **Timeout** | ~30 seconds |

---

## 🌐 Access Points

Once the server starts, access the system at:

| Route | URL | Purpose |
|-------|-----|---------|
| **Login** | http://localhost:3000/login | User authentication |
| **Student Dashboard** | http://localhost:3000/student | Student interface |
| **Admin Dashboard** | http://localhost:3000/admin | Instructor panel |
| **Exam Interface** | http://localhost:3000/exam | Take exam |
| **Create Exam** | http://localhost:3000/create-exam | Create new exam |
| **Results** | http://localhost:3000/results | View results |
| **Result Detail** | http://localhost:3000/result | Single result view |

---

## 🔧 Environment Variables

The server uses these environment variables (with defaults):

```javascript
// Supabase Configuration
SUPABASE_URL = 'https://ttmdiobkwbxyhyasttke.supabase.co'
SUPABASE_KEY = 'sb_publishable_6FWcaoaf5jdqVSB0ZBjWfA_mRwgVzt6'

// Server Port
PORT = 3000

// Email Configuration (Optional)
EMAIL_USER = 'agmr.exam.system@gmail.com'
EMAIL_PASS = 'placeholder_app_password'

// Google GenAI (Optional)
GEMINI_API_KEY = 'your_gemini_key_here'
```

### Setting Environment Variables

**Windows:**
```bash
set PORT=4000
set SUPABASE_URL=your_url
node server.js
```

**Linux/Mac:**
```bash
export PORT=4000
export SUPABASE_URL=your_url
npm run dev
```

---

## ✅ Server Startup Checklist

The server automatically performs these checks on startup:

- [x] Express.js initialization
- [x] Socket.IO configuration
- [x] Cookie parser middleware
- [x] Static file serving from `/public`
- [x] Database connection to Supabase
- [x] Email transporter configuration
- [x] Route definitions (7 main routes)
- [x] Middleware stacks
- [x] API endpoint registration
- [x] Security headers
- [x] Session verification middleware
- [x] Error handling middleware

---

## 🔌 API Endpoints Available

### Authentication (7 endpoints)
```
POST   /api/login              - User login
POST   /api/logout             - User logout
POST   /api/signup             - User registration
GET    /api/verify-session     - Session verification
POST   /api/refresh-token      - Token refresh
GET    /api/user-profile       - User information
POST   /api/change-password    - Password change
```

### Exams (12 endpoints)
```
GET    /api/exams              - List all exams
GET    /api/exams/:id          - Get exam details
POST   /api/exams              - Create exam (admin)
PUT    /api/exams/:id          - Update exam (admin)
DELETE /api/exams/:id          - Delete exam (admin)
POST   /api/exams/:id/start    - Start exam
POST   /api/exams/:id/submit   - Submit exam
GET    /api/exam-questions/:id - Get exam questions
POST   /api/save-answer        - Save answer
GET    /api/exam-timer/:id     - Get timer status
POST   /api/flag-violation     - Report security violation
GET    /api/exam-security-status - Get security status
```

### Results (4 endpoints)
```
GET    /api/results            - List results
GET    /api/results/:id        - Get result detail
POST   /api/calculate-score    - Calculate score
GET    /api/student-results    - Student's results
```

### Admin (5 endpoints)
```
GET    /api/admin/dashboard    - Dashboard stats
GET    /api/admin/students     - List students
POST   /api/admin/reports      - Generate reports
GET    /api/admin/violations   - View violations
POST   /api/api/students/import - Import students
```

---

## 🔐 Security Features Active

The server includes:

```
✅ Session token validation
✅ IP-based session verification
✅ httpOnly secure cookies
✅ CORS protection
✅ Rate limiting (if configured)
✅ SQL injection prevention (Supabase)
✅ XSS protection
✅ CSRF protection
✅ Encryption for sensitive data
✅ Error message sanitization
```

---

## 📁 File Structure (Runtime)

```
Root Directory
├── server.js              Main server application
├── public/
│   ├── index.html         Home page
│   ├── login.html         Login page
│   ├── student.html       Student dashboard
│   ├── admin.html         Admin dashboard
│   ├── exam.html          Exam interface
│   ├── create-exam.html   Exam creator
│   ├── results.html       Results page
│   ├── result.html        Result detail
│   ├── exam-security.js   Anti-cheating module
│   └── css/               Stylesheets
├── node_modules/          Dependencies
├── App_Code/              ASP.NET code (legacy)
├── App_Data/              Data files
└── database.sqlite        Local SQLite (if used)
```

---

## 🎯 Health Check

After starting, verify the server is running:

```bash
# Check if server responds
curl http://localhost:3000

# Check login page
curl http://localhost:3000/login

# Check API health
curl http://localhost:3000/api/verify-session

# Check Socket.IO
curl http://localhost:3000/socket.io/?transport=websocket
```

---

## 🐛 Troubleshooting

### Issue: Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Use different port
set PORT=3001
npm run dev

# Or kill process on port 3000
# Windows: taskkill /PID <pid> /F
# Linux: lsof -ti :3000 | xargs kill -9
```

### Issue: Supabase Connection Failed
```
Error: Error creating Supabase client
```

**Solution:**
- Check internet connection
- Verify SUPABASE_URL is correct
- Verify SUPABASE_KEY is valid
- Check Supabase project status

### Issue: Module Not Found
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
npm install
```

### Issue: Email Transporter Not Configured
```
Warn: Email transporter not configured
```

**Solution (Optional):**
Set EMAIL_USER and EMAIL_PASS environment variables

### Issue: Socket.IO Connection Failed
Check browser console for connection errors. Verify CORS is enabled.

---

## 📊 Expected Console Output

When the server starts successfully, you should see:

```
PRO VERSION Server running on port 3000

✅ Express app initialized
✅ Static files serving from public/
✅ Routes registered:
   • GET  /
   • GET  /login
   • GET  /student
   • GET  /admin
   • GET  /exam
   • GET  /create-exam
   • GET  /results
   • GET  /result

✅ API endpoints ready (25+)
✅ Socket.IO configured
✅ Database connection: Supabase
✅ Session management: Active
✅ Security middleware: Active

📍 Access the system at:
   → http://localhost:3000
   → http://localhost:3000/login
   → http://localhost:3000/admin
```

---

## 🔄 Restart Server

To restart the server:

1. **Stop Current Server**
   - Press `Ctrl+C` in the terminal
   - Wait for graceful shutdown (5-10 seconds)

2. **Start New Server**
   ```bash
   npm run dev
   ```

---

## 📈 Performance Monitoring

Monitor these metrics while running:

```
✅ CPU Usage: Should be <20% idle
✅ Memory: Should be <100MB
✅ Response Time: Should be <500ms
✅ Socket.IO Connections: Should be stable
✅ Database Queries: Should complete <200ms
```

---

## 🛑 Stopping the Server

**Graceful Shutdown:**
```bash
# In the terminal running the server
Press Ctrl+C
```

**Force Kill:**
```bash
# Windows
taskkill /PID <process_id> /F

# Linux/Mac
kill -9 <process_id>
```

---

## 📞 Next Steps

1. **Start the server**
   ```bash
   npm run dev
   ```

2. **Open browser**
   ```
   http://localhost:3000
   ```

3. **Login as Student or Admin**
   - Use test credentials
   - Or create new account

4. **Run tests**
   ```bash
   npm test
   ```

5. **Check security features**
   - Try taking an exam
   - Verify anti-cheat measures

6. **Monitor Socket.IO**
   - Open browser dev tools
   - Check Network → WS tab

---

## 📚 Related Documentation

- **README.md** - Complete system guide
- **QUICK_REFERENCE.md** - Fast lookup
- **INTEGRATION_GUIDE.md** - Architecture
- **TEST_RESULTS.md** - Test suite info
- **DEPLOYMENT_READY.md** - Production setup

---

**Status**: ✅ Server Ready  
**Framework**: Express 5.2.1  
**Real-time**: Socket.IO 4.8.3  
**Database**: Supabase  
**Environment**: Node.js ≥18.0.0
