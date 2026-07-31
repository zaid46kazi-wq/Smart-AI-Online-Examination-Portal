# 🎓 Smart AI Online Examination Portal

An enterprise-ready, AI-powered Online Examination System developed with modern web technologies, automated proctoring, and intelligent question generation.

---

## 🚀 Key Features

- 🤖 **AI Proctoring Engine**: Real-time webcam monitoring using MediaPipe Face Landmarker AI for multi-face detection, head pose tracking, eye gaze analysis, tab switches, and object detection.
- ⚡ **AI Question Paper Generator**: Automated MCQ paper creation from PDF/Text materials powered by Google Gemini AI (`@google/genai`).
- 🔒 **Secure Examination Environment**: Fullscreen enforcement, strict anti-cheating violations tracking, and automated security reporting.
- 📊 **Real-time Analytics & Leaderboards**: Instant result calculation, rank list generation, subject-wise analytics, and PDF certificates using PDFKit.
- 🔑 **Robust Authentication & Security**: JWT authentication with `bcrypt` password hashing, Zod schema validation middleware, rate limiting, and RBAC (Student & Admin roles).
- 💾 **High-Performance Database**: Scalable MySQL 8 backend utilizing `mysql2/promise` with connection pooling, prepared statements, and transactional safety.

---

## 📂 Project Architecture

```
DNSPostProject/
├── backend/                 # Express Node.js Server Architecture
│   ├── config/             # DB & JWT configurations
│   ├── controllers/        # Express Route Controllers
│   ├── middleware/         # Auth, Zod Validation, Error Handling
│   ├── models/             # MySQL 8 Data Access Objects
│   ├── routes/             # API Route Definitions
│   ├── services/           # Gemini AI & PDFKit Services
│   ├── utils/              # Zod validation schemas
│   └── server.js           # Express + Socket.IO Entry Point
├── frontend/                # React 18 + Vite Frontend Application
│   ├── src/
│   │   ├── components/     # MediaPipeProctor, Navbar, Sidebar, Toast
│   │   ├── context/        # Auth Context Management
│   │   ├── pages/          # Login, Dashboards, Exam, Results, AISettings
│   │   ├── services/       # API Axios Client & Interceptors
│   │   ├── App.jsx         # React Router v6 Configuration
│   │   └── main.jsx        # App Entry Point
│   ├── index.html
│   └── vite.config.js
├── database/
│   └── database.sql        # Complete MySQL 8 Schema & Initial Data
└── docs/                   # Additional Documentation
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, React Router v6, CSS Modules / Custom Design System, MediaPipe Vision SDK (`@mediapipe/tasks-vision`), Socket.IO Client
- **Backend**: Node.js (>=18.0), Express 5, Socket.IO, Cookie-Parser, Compression, CORS, Multer, Zod
- **Database**: MySQL 8 (`mysql2/promise`)
- **AI Integration**: Google Gemini 2.0 / 1.5 Flash (`@google/genai`), MediaPipe Face Landmarker
- **PDF & Export Engine**: PDFKit, XLSX

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js >= 18.0.0
- MySQL 8 Server running locally or remotely

### 2. Environment Configuration
Copy `.env.example` in `DNSPostProject` to `.env` and update your settings:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=online_exam_system
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Database Initialization
Import the schema into MySQL:
```bash
mysql -u root -p < DNSPostProject/database/database.sql
```

### 4. Running the Application
```bash
# Start Backend API Server
npm run dev:backend

# Start React Frontend Dev Server (in separate terminal)
npm run dev:frontend
```

---

## 📜 License & Author

Developed by **Sayed Zaid Kazi**.  
Licensed under the [ISC License](LICENSE).
