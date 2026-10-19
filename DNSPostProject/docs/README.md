# 🎓 Smart AI Online Examination System — Technical Documentation (v3.1.0)

An enterprise-grade, AI-powered online examination platform developed for colleges and universities.

Migrated to **React 18**, **Vite 6**, **Express 5 Node.js Backend**, **MySQL 8 Database**, **JWT Authentication**, **Zod Request Validation**, **MediaPipe Face Landmarker AI Proctoring**, **TensorFlow COCO-SSD Object Detection**, and **Google Gemini 2.0 AI Question Generation**.

---

## 🚀 Technical Stack

- **Frontend**: React 18, Vite 6, React Router DOM v6, Custom CSS Design System (`app.css`), MediaPipe Vision SDK (`@mediapipe/tasks-vision`), TensorFlow.js (`@tensorflow/tfjs`), COCO-SSD (`@tensorflow-models/coco-ssd`).
- **Backend**: Node.js (>=18.0), Express 5, Socket.IO, Cookie-Parser, Compression, CORS, Multer, Express-Rate-Limit.
- **Database**: MySQL 8 using `mysql2/promise` with connection pooling, prepared statements, and transactions.
- **Authentication**: JWT (JSON Web Tokens) with `bcrypt` password hashing and cookie/header support.
- **Validation**: Zod schema validation middleware.
- **AI Question Generator**: Google Gemini 2.0/1.5 Flash (`@google/genai`) with multi-model fallback cascades and exponential backoff retry logic.
- **PDF Engine**: PDFKit (result certificates, hall tickets, & formal proctoring audit reports).

---

## 📂 Project Directory Structure

```
DNSPostProject/
├── backend/                 # Express Node.js Server Architecture
│   ├── config/
│   │   ├── db.js           # MySQL 8 pool connection (mysql2/promise)
│   │   └── jwt.js          # JWT token signing & verification
│   ├── controllers/        # Express Route Controllers
│   │   ├── authController.js
│   │   ├── examController.js
│   │   ├── studentController.js
│   │   ├── subjectController.js
│   │   ├── resultController.js
│   │   ├── proctorController.js
│   │   └── analyticsController.js
│   ├── middleware/
│   │   ├── auth.js         # JWT RBAC (Student, Admin)
│   │   ├── validate.js     # Zod schema validator
│   │   └── errorHandler.js # Global error handler
│   ├── models/             # MySQL 8 Data Access Objects
│   │   ├── userModel.js
│   │   ├── examModel.js
│   │   ├── subjectModel.js
│   │   ├── questionModel.js
│   │   ├── resultModel.js
│   │   └── proctorModel.js
│   ├── routes/             # API Route Definitions
│   ├── services/           # Gemini AI, PDFKit & Email services
│   ├── utils/              # Zod validation schemas
│   ├── uploads/            # Temporary file uploads
│   └── server.js           # Express + Socket.IO entry point
├── frontend/                # React + Vite Frontend App
│   ├── src/
│   │   ├── components/     # MediaPipeProctor, Navbar, Sidebar, Footer, Toast, ErrorBoundary
│   │   ├── context/        # AuthContext for JWT state
│   │   ├── css/            # app.css unified design system
│   │   ├── pages/          # Login, AdminDashboard, StudentDashboard, ExamPage, CreateExam, ResultView, AllResults, AISettings
│   │   ├── services/       # api.js client with JWT header interceptor
│   │   ├── App.jsx         # React Router v6 setup
│   │   └── main.jsx        # Vite entry point
│   ├── index.html
│   └── vite.config.js
├── database/
│   ├── database.sql        # MySQL 8 DDL DML seed script
│   ├── schema.sql
│   └── init_db.js
├── docs/
│   └── README.md
├── .env.example
└── .env
```

---

## ⚙️ Database & Server Setup

1. **Install Dependencies**:
   ```bash
   # Install Backend dependencies
   cd backend && npm install

   # Install Frontend dependencies
   cd ../frontend && npm install
   ```

2. **Database Setup**:
   Import `database/database.sql` into your MySQL 8 instance:
   ```bash
   mysql -u root -p < database/database.sql
   ```

3. **Environment Configuration**:
   Update `.env` with your MySQL, JWT, and Gemini API configuration:
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

4. **Running the System**:
   ```bash
   # Run Express Backend (Terminal 1)
   npm run dev:backend

   # Run React Vite Frontend (Terminal 2)
   npm run dev:frontend
   ```
