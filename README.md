<div align="center">

# 🎓 AI-Powered Online Examination System

### 🚀 A Next-Generation Secure Online Examination Platform with AI Proctoring


<br>

<img src="https://img.shields.io/badge/React-19-blue?logo=react"/>
<img src="https://img.shields.io/badge/Vite-Latest-purple?logo=vite"/>
<img src="https://img.shields.io/badge/Node.js-Express-green?logo=node.js"/>
<img src="https://img.shields.io/badge/MySQL-8-orange?logo=mysql"/>
<img src="https://img.shields.io/badge/JWT-Authentication-red"/>
<img src="https://img.shields.io/badge/MediaPipe-AI-blueviolet"/>
<img src="https://img.shields.io/badge/Gemini-AI-4285F4"/>
<img src="https://img.shields.io/badge/License-MIT-success"/>

<br><br>

### 🛡️ Smart • Secure • AI-Powered • Modern

> **An enterprise-grade AI-powered online examination platform with real-time proctoring, intelligent question generation, and secure exam management.**

</div>

---

# 📖 Overview

The **AI-Powered Online Examination System** is a next-generation intelligent examination platform designed to conduct secure online examinations using Artificial Intelligence and Computer Vision.

The system combines **React**, **Node.js**, **Express**, **MySQL**, **JWT Authentication**, **Gemini AI**, and **MediaPipe Face Landmarker** to provide a complete AI-powered examination ecosystem.

### ✨ Highlights

- 🤖 AI Question Generation using Gemini AI
- 🎥 AI Proctoring with MediaPipe
- 👁️ Eye Tracking
- 😊 Face Detection & Identity Verification
- 📱 Mobile Phone Detection
- 👥 Multiple Face Detection
- 📊 AI Risk Score Engine
- ⚡ Real-Time Monitoring
- 🔐 JWT Authentication
- 📈 Analytics Dashboard
- 🗄️ MySQL Database
- 📑 AI Proctoring Reports

---

# ✨ Features

## 👨‍💼 Admin Module

- 🔐 Secure Admin Authentication
- 📊 Dashboard Analytics
- 📚 Subject Management
- 👨‍🎓 Student Management
- 📥 Bulk Student Import
- 📝 AI Question Generation
- 📖 Question Bank Management
- 📅 Exam Scheduling
- 🚀 Publish Exams
- 📈 Result Analytics
- 🤖 AI Security Configuration
- 📄 AI Proctoring Reports
- ⚙️ System Configuration

---

## 👨‍🎓 Student Module

- 🔑 Secure Login
- 🏠 Personalized Dashboard
- 📅 View Available Exams
- 👤 AI Identity Verification
- 🎥 AI Proctoring
- ⏱️ Automatic Exam Timer
- 📊 Instant Results
- 📈 Performance Reports
- 👤 Profile Management

---

# 🤖 AI Features

## 🧠 AI Question Generator

Generate intelligent examination questions using **Google Gemini AI**.

### Features

- ✅ Automatic Question Generation
- ✅ Multiple Difficulty Levels
- ✅ Subject-wise Questions
- ✅ Bloom's Taxonomy Support
- ✅ AI Prompt Engineering
- ✅ MySQL Integration
- ✅ Automatic Formatting
- ✅ Error Handling
- ✅ Secure API Communication

---

## 🎥 AI Proctoring System

The AI continuously monitors candidates throughout the examination.

### AI Modules

- 👤 Face Detection
- 🆔 Identity Verification
- 👀 Eye Tracking
- 🎯 Head Pose Detection
- 👥 Multiple Face Detection
- 📱 Mobile Phone Detection
- 🖥️ Fullscreen Monitoring
- 🔄 Tab Switching Detection
- ⌨️ Keyboard Shortcut Detection
- 📸 Screenshot Evidence
- ⚠️ Warning System
- 📊 AI Risk Score Engine
- 📄 AI Violation Reports
- ⛔ Auto Submit

---

## 🔒 Security Features

- JWT Authentication
- bcrypt Password Encryption
- Role-Based Access Control
- Protected Routes
- SQL Injection Protection
- Input Validation
- Secure File Uploads
- Environment Variables
- API Security

---

# 🏗 System Architecture

```
                   +--------------------+
                   |     React + Vite   |
                   +---------+----------+
                             |
                             |
                    REST API (Express)
                             |
         +-------------------+------------------+
         |                                      |
 Authentication                    AI Proctoring Engine
 (JWT + bcrypt)          (MediaPipe + Computer Vision)
         |                                      |
         +-------------------+------------------+
                             |
                          MySQL 8
```

```mermaid
flowchart TB

    Student["👨‍🎓 Student"]
    Admin["👨‍💼 Admin"]

    Student --> Frontend
    Admin --> Frontend

    subgraph Frontend["🌐 Frontend (React + Vite)"]
        UI["Responsive UI"]
        Dashboard["Dashboards"]
        ExamUI["Exam Interface"]
        SecurityUI["AI Security Settings"]
    end

    Frontend --> API

    subgraph Backend["⚙️ Backend (Node.js + Express)"]

        Auth["JWT Authentication"]
        Exam["Exam Management"]
        Subject["Subject Management"]
        Question["AI Question Generator"]
        StudentAPI["Student Module"]
        AdminAPI["Admin Module"]
        Report["Reports"]
        Upload["File Upload"]
        AI["AI Proctoring Engine"]

    end

    API["REST API"]

    API --> Auth
    API --> Exam
    API --> Subject
    API --> Question
    API --> StudentAPI
    API --> AdminAPI
    API --> Report
    API --> Upload
    API --> AI

    AI --> MediaPipe["MediaPipe Face Landmarker"]
    AI --> Gemini["Gemini AI"]

    Backend --> MySQL

    MySQL["🗄️ MySQL Database"]

    MySQL --> Users["Users"]
    MySQL --> Subjects["Subjects"]
    MySQL --> Exams["Exams"]
    MySQL --> Questions["Questions"]
    MySQL --> Results["Results"]
    MySQL --> Violations["AI Violations"]
    MySQL --> Security["AI Security Settings"]

```
---

# 💻 Technology Stack

| Layer | Technology |
|---------|------------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | MySQL 8 |
| Authentication | JWT + bcrypt |
| AI | Gemini API |
| Computer Vision | MediaPipe Face Landmarker |
| Validation | Zod |
| Uploads | Multer |
| ORM/Driver | mysql2 |
| Styling | Tailwind CSS |

---
```mermaid
mindmap
  root((AI Online Examination System))

    Frontend
      React
      Vite
      Tailwind CSS

    Backend
      Node.js
      Express
      JWT
      bcrypt

    Database
      MySQL
      mysql2

    Artificial Intelligence
      Gemini AI
      MediaPipe
      Face Detection
      Eye Tracking
      Head Pose
      Risk Score

    Security
      JWT
      Input Validation
      SQL Injection Protection
      File Upload Validation

    Features
      AI Question Generator
      Online Exams
      AI Proctoring
      Reports
      Dashboard
      Analytics
```
---
# 📁 Project Structure

```
AI-Online-Exam-System/

├── frontend/
├── backend/
├── database/
├── uploads/
├── public/
├── docs/
├── scripts/
├── README.md
```

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/AI-Online-Exam-System.git

cd AI-Online-Exam-System
```

---

## Backend

```bash
cd backend

npm install

npm run dev
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```
## 🚀 Technology Stack





## Database


```

Create MySQL Database

```sql
CREATE DATABASE online_exam;
```

Import SQL

```
database.sql
```

---

# 🔑 Environment Variables

Backend

```
PORT=

JWT_SECRET=

DB_HOST=

DB_PORT=

DB_USER=

DB_PASSWORD=

DB_NAME=

GEMINI_API_KEY=
```
## 🗄️ Database ER Diagram

```mermaid
erDiagram

    USERS ||--o{ EXAMS : creates

    USERS ||--o{ RESULTS : receives

    USERS ||--o{ VIOLATIONS : generates

    SUBJECTS ||--o{ EXAMS : contains

    EXAMS ||--o{ QUESTIONS : has

    EXAMS ||--o{ RESULTS : generates

    EXAMS ||--o{ VIOLATIONS : monitors

    USERS {
        int id PK
        string name
        string email
        string password
        string role
    }

    SUBJECTS {
        int id PK
        string subject_name
        string subject_code
    }

    EXAMS {
        int id PK
        int subject_id FK
        string title
        datetime start_time
        int duration
        string status
    }

    QUESTIONS {
        int id PK
        int exam_id FK
        string question
        string option_a
        string option_b
        string option_c
        string option_d
        string answer
        string difficulty
    }

    RESULTS {
        int id PK
        int user_id FK
        int exam_id FK
        int marks
        float percentage
        datetime submitted_at
    }

    VIOLATIONS {
        int id PK
        int exam_id FK
        int user_id FK
        string violation_type
        float confidence
        int risk_score
        datetime created_at
    }

    AI_SECURITY_SETTINGS {
        int id PK
        boolean eye_tracking
        boolean phone_detection
        boolean face_detection
        boolean fullscreen_monitoring
        int warning_limit
    }

```
---

# 🎯 AI Exam Flow

```
Student Login

↓

Select Exam

↓

Identity Verification

↓

Camera Permission

↓

AI Initialization

↓

Face Verification

↓

Questions Loaded

↓

Exam Timer Starts

↓

Continuous AI Monitoring

↓

Warnings

↓

Auto Submit (if required)

↓

Results

↓

AI Report
```
## 📊 AI Proctoring Workflow

```mermaid
flowchart TD

A["👨‍🎓 Student Login"]

A --> B["Select Exam"]

B --> C["Click Start Exam"]

C --> D["Request Camera Permission"]

D --> E{"Camera Allowed?"}

E -- No --> X["Exam Blocked"]

E -- Yes --> F["Initialize MediaPipe"]

F --> G["Load AI Security Settings"]

G --> H["Identity Verification"]

H --> I{"Face Verified?"}

I -- No --> X

I -- Yes --> J["Capture Reference Face"]

J --> K["Load Questions"]

K --> L["Start Exam Timer"]

L --> M["Continuous AI Monitoring"]

subgraph Monitoring

M --> N["Face Detection"]

M --> O["Eye Tracking"]

M --> P["Head Pose"]

M --> Q["Multiple Face Detection"]

M --> R["Phone Detection"]

M --> S["Tab Switching"]

M --> T["Fullscreen Monitoring"]

M --> U["Keyboard Shortcut Detection"]

end

N --> V["Risk Score Engine"]

O --> V

P --> V

Q --> V

R --> V

S --> V

T --> V

U --> V

V --> W{"Warning Limit Reached?"}

W -- No --> M

W -- Yes --> Y["Auto Submit Exam"]

M --> Z["Student Submits Exam"]

Z --> AA["Generate Result"]

AA --> AB["Generate AI Proctoring Report"]

AB --> AC["Store Evidence in MySQL"]

```
---

# 📊 AI Monitoring

During the exam the system monitors

- Face Presence
- Identity Verification
- Eye Tracking
- Head Pose
- Mobile Phone
- Multiple Faces
- Tab Switching
- Fullscreen Exit
- Keyboard Shortcuts
- Risk Score

---

# 📸 Screenshots

Add screenshots here

- Login
- Dashboard
- Admin Panel
- Student Dashboard
- AI Proctoring
- AI Question Generator
- Results
- Reports

---

# 📈 Future Improvements

- AI Voice Monitoring
- Browser Lockdown
- Live Invigilator Dashboard
- Multi-language Support
- Cloud Deployment
- AI Behaviour Analytics

---

# 🤝 Contributing

Contributions are welcome!

Feel free to fork this repository and submit a Pull Request.

---

# ⭐ Support

If you like this project,

⭐ Star this repository

🍴 Fork it

📢 Share it

---

# 📜 License

This project is licensed under the MIT License.

---

# 👨‍💻 Developer

Sayed Zaid Kazi
Developed with ❤️ using modern web technologies.

---

<div align="center">

## ⭐ If you found this project useful, don't forget to Star the Repository ⭐

**Building the Future of Secure Online Examinations with Artificial Intelligence**

</div>
