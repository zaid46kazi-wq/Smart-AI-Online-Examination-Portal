# Smart AI Online Examination Portal

An AI-powered, production-grade Online Examination System developed for colleges and universities.

Migrated to **React + Vite**, **Express Node.js Backend**, **MySQL 8 Database**, **JWT Authentication**, **Zod Request Validation**, and **MediaPipe Face Landmarker AI Proctoring**.

---

## 🚀 Technical Stack

- **Frontend**: React 18, Vite, React Router DOM v6, Custom CSS Design System (`app.css`), MediaPipe Vision SDK (`@mediapipe/tasks-vision`)
- **Backend**: Node.js (>=18.0), Express 5, Socket.IO, Cookie-Parser, Compression, CORS, Multer
- **Database**: MySQL 8 using `mysql2/promise` with connection pooling, prepared statements, and transactions
- **Authentication**: JWT (JSON Web Tokens) with `bcrypt` password hashing
- **Validation**: Zod schema validation middleware
- **AI Question Paper Generator**: Google Gemini 2.0/1.5 Flash (`@google/genai`)
- **PDF Engine**: PDFKit (result certificates & hall tickets)

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
│   │   ├── components/     # MediaPipeProctor, Navbar, Sidebar, Footer, Toast
│   │   ├── context/        # AuthContext for JWT state
│   │   ├── css/            # app.css unified design system
│   │   ├── pages/          # Login, AdminDashboard, StudentDashboard, ExamPage, CreateExam, ResultView, AllResults
│   │   ├── services/       # api.js client with JWT header interceptor
│   │   ├── utils/          # Theme manager
│   │   ├── App.jsx         # React Router v6 setup
│   │   └── main.jsx        # Vite entry point
│   ├── index.html
│   └── vite.config.js
├── database/
│   └── database.sql        # MySQL 8 DDL DML DCL seed script
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
   Update `.env` with your MySQL and JWT configuration:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=online_exam_system
   DB_USER=root
   DB_PASSWORD=your_password
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Running the System**:
   ```bash
   # Run Express Backend
   npm run dev:backend

   # Run React Vite Frontend (in separate terminal)
   npm run dev:frontend
   ```
