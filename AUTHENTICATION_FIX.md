# Authentication Fix - SQL Server Setup Guide

## Problem Identified
The login system was using hardcoded test credentials that didn't match the database schema:
- **Old hardcoded credentials**: `admin/admin` and `user/user`
- **Correct credentials**: `admin/admin123` and `student1/pass1`

## Solution Applied
Updated [LogIn.aspx.cs](LogIn.aspx.cs) to:
1. Query the SQL Server database instead of checking hardcoded values
2. Support role-based redirects (Admin → Menu.aspx, Student → CreateOnlineTestStart.aspx)
3. Provide better error messages

## Database Setup Required

### Option 1: Using SQL Server Management Studio (RECOMMENDED)
1. Open **SQL Server Management Studio**
2. Connect to your local SQL Server instance
3. Open the query editor
4. Copy and paste the contents of [setup_sqlserver.sql](setup_sqlserver.sql)
5. Click **Execute** (or press F5)
6. Verify that both tables are created successfully

### Option 2: Using Command Line (sqlcmd)
```bash
sqlcmd -S . -i setup_sqlserver.sql -E
```

### Option 3: Manual SQL Commands
If you don't have SQL Server installed yet:
1. Download and install SQL Server Express: https://www.microsoft.com/en-us/sql-server/sql-server-downloads  
   OR LocalDB (lighter version): https://docs.microsoft.com/en-us/sql/express-localdb/sql-server-express-localdb
2. After installation, open SQL Server Management Studio
3. Follow **Option 1** above

## Default Test Credentials
Once the database is set up, you can log in with:

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Admin

### Student Account
- **Username**: `student1`
- **Password**: `pass1`
- **Role**: Student

## Verification
To verify the setup is correct:
```sql
SELECT Id, Username, Role FROM Users;
```

You should see 2 rows:
- admin | Admin
- student1 | Student

## Connection String
The application uses the connection string defined in [web.config](web.config):
```xml
<add name="ExamDB" connectionString="Data Source=.;Initial Catalog=OnlineExam;Integrated Security=True" providerName="System.Data.SqlClient" />
```

This connects to:
- **Server**: Local Server (.)
- **Database**: OnlineExam
- **Authentication**: Windows Integrated Security

## Troubleshooting

### "Invalid credentials" error persists
- Verify the Users table has data: `SELECT * FROM Users;`
- Check that credentials match exactly (case-sensitive is OFF in SQL Server)
- Restart the application and clear browser cache

### Cannot connect to SQL Server
- Ensure SQL Server is installed and running
- In Windows Services, verify `SQL Server` or `SQL Server Express` service is running
- Check the Server name in web.config matches your installation

### Database doesn't exist
- Run the setup_sqlserver.sql script again
- Check error messages in SQL Server Management Studio

## Files Modified
- [LogIn.aspx.cs](LogIn.aspx.cs) - Updated authentication logic to query database

## Additional Info
The application supports multiple database backends:
- **SQL Server** (for ASP.NET forms) - Current primary for login
- **Supabase PostgreSQL** (for Node.js backend)
- **SQLite** (fallback for PHP API)

Only SQL Server is used for the current login interface.
