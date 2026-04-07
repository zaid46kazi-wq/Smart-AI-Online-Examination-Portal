# 🚀 Smart AI Proctored Online Examination System

An advanced AI-powered online examination platform designed to ensure fair, secure, and monitored exams using real-time face detection, intelligent violation tracking, and snapshot-based evidence.

---

## 🔥 Features

### 🎥 AI Proctoring
- Real-time face detection using face-api.js
- Detects:
  - ❌ No face
  - 🚨 Multiple faces
  - ⚠️ Excessive head movement
- Smart stability system to reduce false warnings

### 📸 Snapshot Monitoring
- Captures snapshot on every warning
- Stores images in Supabase Storage
- Provides visual proof of violations

### 👨‍🏫 Admin Dashboard
- Monitor students in real-time
- View violation logs
- Dedicated **Warnings Section**
- View snapshots with timestamps

### 🔐 Secure Exam System
- One student → one attempt only
- Session-based tracking (in_progress / completed)
- Prevents re-attempts

### ⚡ Realtime System
- Instant updates using Supabase Realtime
- Live sync between student and admin panel

---

## 🏗️ Tech Stack

- **Frontend:** React + Vite + Tailwind CSS  
- **Backend:** Supabase (Auth + PostgreSQL + Storage + Realtime)  
- **AI:** face-api.js  

---

## 📂 Project Structure

/src
/components
/pages
/hooks
/services
/public
/models
---

## 🚀 Getting Started

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name

2️⃣ Install Dependencies
npm install
3️⃣ Setup Environment Variables

Create .env file:

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
4️⃣ Run Project
npm run dev
☁️ Deployment
Frontend deployed on Vercel
Backend powered by Supabase
HTTPS required for camera access
📸 Screenshots
Exam Interface
Admin Dashboard
Warnings Page with Snapshots

(Add your screenshots here)

🔥 Key Highlights
Real-time AI monitoring system
Snapshot-based violation proof
Secure single-attempt exam system
Live admin tracking dashboard
Production-ready architecture
🚀 Future Enhancements
Face recognition (identity verification)
AI-based cheating score
Auto-submit after multiple violations
Advanced analytics dashboard
👨‍💻 Author

Syed Zaid Kazi

⭐ Support

If you like this project, give it a ⭐ on GitHub!


---

# 💡 Why This Is PERFECT

✅ Everything in **one page**  
✅ Clean + professional  
✅ Covers:
- Features  
- Tech  
- Setup  
- Deployment  
- Future scope  

👉 Perfect for:
- College evaluator  
- Interview  
- GitHub portfolio  

---

# 🚀 Final Step

Push it:

```bash
git add README.md
git commit -m "Final README"
git push
