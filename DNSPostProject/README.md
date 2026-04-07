# 🎓 Online Examination System - AGMR College of Engineering

![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Version](https://img.shields.io/badge/Version-2.0.0-blue)
![License](https://img.shields.io/badge/License-ISC-green)

**Developer**: Sayed Zaid Kazi  
**College**: AGMR College of Engineering  
**Last Updated**: 2026-03-29

---

## 📋 Overview

A comprehensive **secure online examination system** with advanced anti-cheating features, real-time monitoring, and professional UI. Built with Node.js, Express, and Supabase.

### Key Features
- ✅ Secure login with IP verification
- ✅ 10+ anti-cheating mechanisms
- ✅ Real-time exam monitoring
- ✅ Automated question generation from PDF (AI)
- ✅ Excel bulk upload support
- ✅ PDF certificates & hall tickets
- ✅ Instant result notifications
- ✅ Leaderboard & analytics
- ✅ Professional responsive UI
- ✅ Socket.IO real-time updates

---

## 🚀 Quick Start

### Prerequisites
```bash
Node.js >= 18.0.0
npm or yarn
Supabase account
```

### Installation

1. **Clone & Install**
```bash
cd "D:\6th Sem\PP-1\~Projectonline Examination system-EnggRoom.Com\DNSPostProject"
npm install
```

2. **Configure Environment**
```bash
# Create .env file or export variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your_publishable_key"
export GEMINI_API_KEY="your_gemini_api_key"
export EMAIL_USER="your_email@gmail.com"
export EMAIL_PASS="your_app_password"
export PORT=3000
```

3. **Run Server**
```bash
npm start
# Server running on http://localhost:3000
```

4. **Run Tests**
```bash
npm test
```

---

## 🔑 Default Credentials

### Student Account
```
Username: student1
Password: pass1
```

### Instructor Account
```
Username: admin
Password: admin123
```

---

## 🎯 User Workflows

### Student Flow
```
1. Login (/login)
   ↓
2. Dashboard (/student)
   - View available exams
   - Download hall ticket
   ↓
3. Take Exam (/exam?id=123)
   - Fullscreen enforced
   - Timer running
   - Answer questions
   - Auto-submit on time
   ↓
4. View Result (/result)
   - Score display
   - Download certificate
   ↓
5. Leaderboard
   - Check rankings
```

### Instructor Flow
```
1. Login (/login)
   ↓
2. Dashboard (/admin)
   - View analytics
   - Create exams
   - Import students
   ↓
3. Create Exam (/create-exam)
   - Add questions manually
   - Upload Excel
   - Generate from PDF (AI)
   - Publish exam
   ↓
4. View Results (/results)
   - All submissions
   - Export data
   - Flag violations
```

---

## 🔐 Security Architecture

### Authentication
- Email/Username-based login
- Secure session tokens (32-byte random)
- IP address verification
- HTTPOnly secure cookies
- Auto-session cleanup

### Exam Security
| Feature | Description | Status |
|---------|-------------|--------|
| Tab Switching Detection | Auto-submit after 2 switches | ✅ |
| Fullscreen Enforcement | Forces fullscreen mode | ✅ |
| Copy/Paste Prevention | Blocks clipboard access | ✅ |
| Right-Click Disable | Disables context menu | ✅ |
| Developer Tools Block | Prevents F12 & Ctrl+Shift+I | ✅ |
| Keyboard Shortcuts | Blocks dangerous shortcuts | ✅ |
| Back Button Prevention | Disables back navigation | ✅ |
| Network Monitoring | Detects connection loss | ✅ |
| Unload Prevention | Warns on page close | ✅ |
| Real-time Violation Logging | Tracks all violations | ✅ |

### Admin Monitoring
- Live proctor status via Socket.IO
- Violation alerts & logging
- Student activity tracking
- Attempt warnings

---

## 📊 API Reference

### Authentication
```bash
POST /api/login
{
  "username": "student1",
  "password": "pass1",
  "role": "student"
}

POST /api/logout
```

### Exams
```bash
GET /api/exams                          # List exams
POST /api/exams                         # Create exam (admin)
GET /api/exam-questions/:exam_id        # Get questions
GET /api/hall-ticket/:exam_id           # Download hall ticket
```

### Questions
```bash
POST /api/questions/upload/:exam_id     # Upload Excel
POST /api/questions/generate-ai         # AI generation
```

### Results
```bash
POST /api/submit                        # Submit exam
GET /api/my-results                     # Student results
GET /api/results                        # All results (admin)
GET /api/result-pdf/:result_id          # Download PDF
GET /api/rank-list/:exam_id             # Rankings
GET /api/leaderboard                    # Top 5 scores
```

### Monitoring
```bash
POST /api/proctor-status                # Log activity
GET /api/proctor-status                 # View monitoring
POST /api/flag-violation                # Flag cheating
GET /api/exam-security-status           # Security info
```

### Analytics
```bash
GET /api/analytics                      # Dashboard stats
```

---

## 🗂️ Project Structure

```
DNSPostProject/
├── server.js                    # Main Express app
├── database_schema.sql          # Supabase DDL
├── package.json                 # Dependencies
├── jest.config.js              # Test configuration
├── server.test.js              # Unit tests
│
├── public/                      # Frontend files
│   ├── index.html              # Login page
│   ├── student.html            # Student dashboard
│   ├── exam.html               # Exam interface
│   ├── result.html             # Result page
│   ├── admin.html              # Admin dashboard
│   ├── create-exam.html        # Exam creator
│   ├── results.html            # Results viewer
│   ├── exam-security.js        # Security module
│   ├── Images/                 # Media files
│   └── StyleSheets/            # Custom styles
│
├── api/                         # Legacy PHP APIs (optional)
│   ├── auth.php
│   ├── admin.php
│   ├── student.php
│   └── shared.php
│
├── App_Code/                    # ASP.NET code (optional)
├── App_Data/                    # Application data
│
├── INTEGRATION_GUIDE.md         # Integration documentation
├── TESTING_SETUP_COMPLETE.md    # Testing setup
└── README.md                    # This file
```

---

## 🎨 UI Design

### Color Palette
```
Primary Blue:    #2f56c8
Light Blue:      #6284f8
Dark Blue:       #1f49bb
White:           #ffffff
Gray:            #f8f9fa
Dark Gray:       #2d3335
Error Red:       #a8364b
Success Green:   #4CAF50
```

### Typography
- Headlines: Public Sans (700-900 weight)
- Body: Inter (400-600 weight)
- Monospace: For code/data

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## 📱 Mobile Support

- ✅ Fully responsive design
- ✅ Touch-friendly buttons
- ✅ Optimized for tablets
- ✅ Mobile-first approach
- ⚠️ Fullscreen exam recommended on desktop

---

## 🧪 Testing

### Run Tests
```bash
npm test
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report
```

### Test Coverage
- 26+ unit tests
- Authentication & authorization
- Database operations
- Security features
- Error handling

---

## 🔧 Configuration

### Environment Variables
```bash
SUPABASE_URL              # Supabase project URL
SUPABASE_KEY              # Supabase public key
GEMINI_API_KEY            # Google Gemini API key
EMAIL_USER                # Gmail address
EMAIL_PASS                # Gmail app password
PORT                      # Server port (default: 3000)
```

### Database Setup
```bash
# Run SQL schema
psql -f database_schema.sql

# Or use Supabase SQL editor to paste schema
```

---

## 📧 Email Integration

### Gmail Setup
1. Enable 2-Factor Authentication
2. Generate App Password
3. Set `EMAIL_USER` & `EMAIL_PASS`

### Email Notifications
- ✅ Result emails to students
- ✅ Exam creation notifications
- ✅ Violation alerts (optional)

---

## 🚨 Troubleshooting

### Issue: Port 3000 already in use
```bash
# Change port
PORT=3001 npm start

# Or kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Issue: Cannot connect to Supabase
```bash
# Verify credentials
echo $SUPABASE_URL
echo $SUPABASE_KEY

# Check network connectivity
curl $SUPABASE_URL
```

### Issue: Login fails
```
Check:
1. Username exists in database
2. Password is correct
3. User role is set (Student/Admin)
4. IP address matches session
```

### Issue: Exam timer not working
```
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check browser console for errors
4. Ensure JavaScript is enabled
```

---

## 📈 Performance Metrics

- **Page Load**: < 2s
- **API Response**: < 500ms
- **Database Queries**: Indexed
- **Memory Usage**: < 200MB
- **Concurrent Users**: 100+

---

## 🔄 Deployment

### Heroku
```bash
heroku create your-app-name
git push heroku main
heroku config:set SUPABASE_URL="..."
heroku config:set SUPABASE_KEY="..."
```

### AWS
```bash
# Use Elastic Beanstalk or EC2
npm install -g pm2
pm2 start server.js
pm2 startup
pm2 save
```

### Docker
```bash
docker build -t exam-system .
docker run -p 3000:3000 exam-system
```

---

## 📞 Support

### Issues & Bugs
- Check logs: `console.log` output
- Review network tab in DevTools
- Check browser compatibility
- Verify API endpoints

### Contact
- Developer: Sayed Zaid Kazi
- College: AGMR College of Engineering
- Email: agmr.exam.system@gmail.com

---

## 📄 License

ISC License - © 2026 AGMR College of Engineering

---

## 🙏 Acknowledgments

- **Tailwind CSS** - Utility-first CSS
- **Material Design** - Icons & principles
- **Supabase** - Backend database
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **Google Gemini** - AI question generation

---

## 🎯 Roadmap

### Planned Features
- [ ] Webcam proctoring
- [ ] Keyboard activity monitoring
- [ ] Mouse tracking
- [ ] Screen recording
- [ ] Biometric verification
- [ ] Mobile app
- [ ] Voice commands
- [ ] Accessibility improvements

### Coming Soon
- Multi-language support
- Dark mode
- Advanced analytics
- Plagiarism detection

---

## 📊 Version History

### v2.0.0 - Current (2026-03-29)
- ✅ Complete rewrite with modern stack
- ✅ 10+ anti-cheating features
- ✅ AI question generation
- ✅ Professional UI redesign
- ✅ Socket.IO real-time updates
- ✅ Comprehensive testing

### v1.0.0 - Legacy
- Basic exam system
- Manual question entry
- Simple results

---

## ✨ Features at a Glance

```
Authentication          ✅
Exam Management         ✅
Question Management     ✅
AI Question Generation  ✅
Excel Upload            ✅
Real-time Timer         ✅
Auto-Submit             ✅
Tab Detection           ✅
Fullscreen Mode         ✅
Copy/Paste Prevention    ✅
Results Display         ✅
PDF Certificates        ✅
Leaderboard             ✅
Analytics               ✅
Admin Dashboard         ✅
Email Notifications     ✅
IP Verification         ✅
Session Management      ✅
Violation Tracking      ✅
Socket.IO Monitoring    ✅
```

---

## 🎓 Educational Value

This project demonstrates:
- Full-stack web development
- Security best practices
- Real-time communication
- Database design
- API development
- UI/UX design
- Testing & deployment
- AI integration

---

**Built with ❤️ for AGMR College of Engineering**

---

*Last Updated: 2026-03-29 | Status: ✅ Production Ready*
