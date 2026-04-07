# Supabase Authentication Setup Guide

## Overview
Your application uses **Supabase PostgreSQL** for authentication. The ASP.NET login page now calls the Node.js API to authenticate against the Supabase database.

## Prerequisites
✅ Supabase project configured  
✅ Node.js server running on port 3000  
✅ Environment variables set in `.env` file  

## Step 1: Verify Supabase Connection

Your `.env` file contains:
```
SUPABASE_URL=https://ttmdiobkwbxyhyasttke.supabase.co
SUPABASE_KEY=sb_publishable_6FWcaoaf5jdqVSB0ZBjWfA_mRwgVzt6
```

## Step 2: Deploy Database Schema to Supabase

### Option A: Using Supabase Dashboard (EASIEST)

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor**
4. Click **+ New Query**
5. Copy the contents from `database_schema.sql` file
6. Paste into the SQL editor
7. Click **Run**

### Option B: Using Node.js Script

Run this command to deploy the schema:
```bash
npm run deploy-db
```

This will automatically:
- Create the `students` table
- Insert test credentials
- Set up all other required tables

## Step 3: Start the Node.js Server

```bash
npm start
```

The server will:
- Listen on `http://localhost:3000`
- Connect to Supabase
- Provide the `/api/auth/login` endpoint for ASP.NET

**Terminal output should show:**
```
Server running on port 3000
Connected to Supabase
```

## Step 4: Test Login

Use these credentials to test:

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`

### Student Accounts
- **Username**: `student1` | **Password**: `pass1`
- **Username**: `student2` | **Password**: `pass2`

## Architecture

```
┌─────────────────────────────────────────┐
│     ASP.NET Web Forms (LogIn.aspx)      │
│   Sends username + password via HTTP    │
└────────────────┬────────────────────────┘
                 │
                 ↓ HTTP POST /api/auth/login
        
┌─────────────────────────────────────────┐
│    Node.js Express Server (port 3000)   │
│    - Validates credentials              │
│    - Creates session tokens             │
│    - Issues cookies                     │
└────────────────┬────────────────────────┘
                 │
                 ↓ SQL Query
                 
┌─────────────────────────────────────────┐
│    Supabase PostgreSQL Database         │
│    Table: students                      │
│    - username, password, role, email    │
└─────────────────────────────────────────┘
```

## Troubleshooting

### "Invalid credentials" Error

1. **Check Supabase data:**
   - Open Supabase dashboard
   - Go to SQL Editor
   - Run: `SELECT * FROM students;`
   - Verify test accounts exist

2. **Verify credentials:**
   ```sql
   SELECT username, password, role FROM students 
   WHERE username IN ('admin', 'student1', 'student2');
   ```

3. **Re-insert test data if missing:**
   ```sql
   INSERT INTO students (username, password, role, name, usn, email) 
   VALUES 
     ('admin', 'admin123', 'Admin', 'Administrator', 'ADMIN001', 'admin@agmr.edu'),
     ('student1', 'pass1', 'Student', 'Rahul Sharma', '1AG21CS001', 'student1@agmr.edu'),
     ('student2', 'pass2', 'Student', 'Priya Patel', '1AG21CS002', 'student2@agmr.edu')
   ON CONFLICT (username) DO NOTHING;
   ```

### "Server not responding" Error

1. Check if Node.js server is running:
   ```bash
   npm start
   ```

2. Verify port 3000 is accessible:
   ```bash
   netstat -an | findstr :3000
   ```

3. If port is in use, change in `server.js`:
   ```javascript
   const PORT = 4000; // or another available port
   ```

4. Update `LogIn.aspx.cs` if port changed:
   - Change `private string API_BASE_URL = "http://localhost:3000";`
   - To: `private string API_BASE_URL = "http://localhost:4000";`

### "Connection timeout" Error

1. Verify Supabase credentials in `.env`:
   - Check `SUPABASE_URL` is correct
   - Check `SUPABASE_KEY` is valid

2. Test Supabase connection:
   ```bash
   node -e "const { createClient } = require('@supabase/supabase-js'); const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY); client.from('students').select('*').then(r => console.log(r));"
   ```

## Files Modified/Used

- `LogIn.aspx.cs` - Updated to call Node.js API
- `server.js` - Provides `/api/auth/login` endpoint
- `database_schema.sql` - PostgreSQL schema for Supabase
- `.env` - Supabase configuration

## Next Steps

After successful login:
1. Admin users go to: `Menu.aspx`
2. Student users go to: `CreateOnlineTestStart.aspx`

Both pages should verify the session before allowing access.

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Express.js Docs: https://expressjs.com/
