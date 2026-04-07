# ⚡ Quick Reference Guide

**Online Examination System - AGMR College**

---

## 🚀 Getting Started (30 seconds)

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
export SUPABASE_URL="your-url"
export SUPABASE_KEY="your-key"

# 3. Start server
npm start

# 4. Open browser
# http://localhost:3000
```

---

## 🔑 Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Student | student1 | pass1 |
| Instructor | admin | admin123 |

---

## 📍 Main Routes

### For Students
| Route | Purpose |
|-------|---------|
| `/login` | Login page |
| `/student` | Dashboard |
| `/exam?id=123` | Take exam |
| `/result` | View score |

### For Instructors
| Route | Purpose |
|-------|---------|
| `/login` | Login page |
| `/admin` | Dashboard |
| `/create-exam` | Create exam |
| `/results` | All results |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## 🔐 Security Features

| Feature | Status |
|---------|--------|
| Tab Detection | ✅ Auto-submit after 2 switches |
| Fullscreen | ✅ Enforced, warns on exit |
| Copy/Paste | ✅ Blocked |
| Right-click | ✅ Disabled |
| Dev Tools | ✅ F12 blocked |
| Timer | ✅ Auto-submit on expiry |
| Network | ✅ Monitors connection |
| IP Verify | ✅ Session protection |

---

## 📊 API Endpoints

```
Authentication
POST   /api/login                 Login user
POST   /api/logout                Logout

Exams
GET    /api/exams                 List exams
POST   /api/exams                 Create exam
GET    /api/exam-questions/:id    Get questions

Results
POST   /api/submit                Submit answers
GET    /api/my-results            Student results
GET    /api/result-pdf/:id        Download PDF

Admin
GET    /api/results               All results
GET    /api/analytics             Dashboard stats
GET    /api/leaderboard           Top scores
```

---

## 📝 File Quick Reference

| File | Purpose |
|------|---------|
| `server.js` | Main backend |
| `public/index.html` | Login page |
| `public/exam.html` | Exam interface |
| `public/admin.html` | Admin dashboard |
| `jest.config.js` | Test config |
| `server.test.js` | Tests |

---

## 🆘 Common Commands

```bash
# Start server
npm start

# Install dependencies
npm install

# Run tests
npm test

# Environment setup
export SUPABASE_URL="url"
export SUPABASE_KEY="key"
export GEMINI_API_KEY="key"
export EMAIL_USER="email"
export EMAIL_PASS="password"

# Check server status
curl http://localhost:3000/login

# View logs
tail -f server.log
```

---

## 🐛 Troubleshooting

### Port 3000 in use?
```bash
PORT=3001 npm start
```

### Supabase connection failed?
```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_KEY
```

### Tests failing?
```bash
npm cache clean --force
npm install
npm test
```

### Login not working?
```
1. Check username exists
2. Verify password
3. Clear cookies
4. Try incognito mode
```

---

## 📧 Email Setup

1. Enable 2FA on Gmail
2. Generate App Password
3. Set environment:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=app-password
   ```

---

## 🎨 UI Customization

### Colors
```
Primary:    #2f56c8
Success:    #4CAF50
Error:      #a8364b
Warning:    #ff9800
```

### Fonts
```
Headlines:  Public Sans
Body:       Inter
```

---

## 📱 Responsive Breakpoints

```
Mobile:     < 640px
Tablet:     640px - 1024px
Desktop:    > 1024px
```

---

## 🔄 Database Tables

```
students       → User accounts
exams          → Exam definitions
questions      → Exam questions
results        → Student submissions
sessions       → Login sessions
subjects       → Course subjects
proctor_status → Monitoring data
```

---

## 🚨 Error Codes

```
200 - Success
400 - Bad request
401 - Unauthorized
403 - Forbidden
404 - Not found
500 - Server error
```

---

## 📞 Documentation Files

- `README.md` - Complete guide
- `INTEGRATION_GUIDE.md` - Architecture details
- `MODIFICATION_SUMMARY.md` - Changes made
- `TESTING_SETUP_COMPLETE.md` - Test setup
- `QUICK_REFERENCE.md` - This file

---

## ⏱️ Exam Settings

```
Default Time:    30 minutes
Max Questions:   50
Max Upload:      5MB files
AI Timeout:      2 minutes
```

---

## 🎯 Feature Checklist

- ✅ Login/Logout
- ✅ Exam creation
- ✅ Question upload
- ✅ AI generation
- ✅ Timer & submission
- ✅ Results display
- ✅ PDF certificates
- ✅ Leaderboard
- ✅ Analytics
- ✅ Security features
- ✅ Real-time monitoring

---

## 📌 Important Notes

1. **Session timeout**: 24 hours
2. **Token expiry**: Session-based
3. **Max concurrent**: 100+ users
4. **Database**: Supabase PostgreSQL
5. **Real-time**: Socket.IO enabled

---

## 🔗 Related Files

- Frontend: `public/` folder
- Backend: `server.js`
- Tests: `server.test.js`
- Config: `jest.config.js`
- Docs: `*.md` files

---

## ✨ Pro Tips

1. Use fullscreen for best exam experience
2. Test in incognito mode to verify security
3. Check browser console for errors
4. Monitor Socket.IO connections
5. Use email for result notifications

---

## 📞 Support

- **Issue?** Check troubleshooting section
- **Doc?** See INTEGRATION_GUIDE.md
- **Test?** Run `npm test`
- **Deploy?** See deployment guides

---

**Last Updated**: 2026-03-29  
**Status**: ✅ Production Ready

---

*For more details, see README.md or INTEGRATION_GUIDE.md*
