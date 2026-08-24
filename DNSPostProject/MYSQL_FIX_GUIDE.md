# 🔧 MySQL Database Connection Fix Guide

## Problem
❌ MySQL database is not running on port 3306
- Port 3306 is not listening
- Backend cannot connect to database
- CORS error masks the real database connection issue

## Solutions

### ⭐ Option 1: Install MySQL Community Server (Recommended - Windows Native)
1. **Download MySQL 8.0.37** from: https://dev.mysql.com/downloads/mysql/
   - Choose **Windows (x86, 64-bit), MSI Installer**
   
2. **Run the Installer** and follow these steps:
   - Choose **Setup Type**: "Developer Default" or "Server only"
   - Click **Next** through the license agreement
   - Installation folder: Use default (`C:\Program Files\MySQL\MySQL Server 8.0`)
   - Click **Execute** to download and install
   
3. **MySQL Server Configuration Wizard**:
   - Config Type: **"Standalone MySQL Server / MySQL Router"**
   - MySQL Port: `3306` (default)
   - Windows Service: Check **"Configure MySQL Server as a Windows Service"**
   - Service Name: `MySQL80` (default)
   - Click **Next**
   
4. **Authentication & Logging**:
   - Authentication Method: **"Use Legacy Authentication Plugin"** (for compatibility)
   - Click **Next**
   
5. **Accounts & Roles**:
   - Root Password: `zaid7411310473` (must match your `.env`)
   - Create user: (skip for now)
   - Click **Next → Finish**
   
6. **Verify Installation**:
   - Open Command Prompt/PowerShell **as Administrator**
   - Run: `net start MySQL80`
   - Should print: "The MySQL80 service is starting. The MySQL80 service has been started successfully."

### Option 2: Use Pre-Installed MySQL (If Already Installed)
```powershell
# Open PowerShell as Administrator and run:
net start MySQL80
# or if you have MySQL 5.7:
net start MySQL57
# or if you have MySQL 5.6:
net start MySQL56
```

### Option 3: ❌ Docker (Requires Docker Desktop)
Docker is not installed. Skip this option unless you install Docker Desktop first.

## Verification

After starting MySQL, run this to verify:
```powershell
# Check port
netstat -ano | findstr "3306"

# Try connecting
mysql -h 127.0.0.1 -u root -p
# Password: zaid7411310473
```

## Current Configuration
Your `.env` file has:
- **Host:** `127.0.0.1`
- **Port:** `3306`
- **User:** `root`
- **Password:** `zaid7411310473` (⚠️ Change this in production!)
- **Database:** `online_exam_system`

## Next Steps
1. Install/Start MySQL
2. Run the backend: `npm start` in backend/ folder
3. Backend will auto-initialize the database schema
4. Try login again
