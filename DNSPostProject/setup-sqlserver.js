// Database Setup Script for SQL Server
// This script creates the OnlineExam database and populates test data
// Usage: node setup-sqlserver.js

const sql = require('mssql');

const config = {
    servers: [
        { server: '(localdb)\\MSSQLLocalDB', database: 'master' },
        { server: '.\\SQLEXPRESS', database: 'master' },
        { server: '.', database: 'master' }
    ]
};

const createDbSQL = `
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'OnlineExam')
BEGIN
    CREATE DATABASE OnlineExam;
    PRINT 'Database created';
END
`;

const createTableSQL = `
USE OnlineExam;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(100) UNIQUE NOT NULL,
        Password NVARCHAR(100) NOT NULL,
        Role NVARCHAR(50) NOT NULL DEFAULT 'Student'
    );
    PRINT 'Users table created';
END
`;

const insertDataSQL = `
USE OnlineExam;

IF NOT EXISTS (SELECT * FROM Users WHERE Username = 'admin')
BEGIN
    INSERT INTO Users (Username, Password, Role) 
    VALUES ('admin', 'admin123', 'Admin'),
           ('student1', 'pass1', 'Student');
    PRINT 'Test data inserted';
END
`;

async function setupDatabase() {
    console.log('Starting SQL Server Database Setup...\n');

    for (const serverConfig of config.servers) {
        try {
            console.log(`Attempting: ${serverConfig.server}...`);
            
            let pool = new sql.ConnectionPool({
                server: serverConfig.server,
                database: serverConfig.database,
                authentication: {
                    type: 'default',
                    options: {
                        userName: undefined,
                        password: undefined
                    }
                },
                options: {
                    encrypt: false,
                    trustServerCertificate: true,
                    enableArithAbort: true
                }
            });

            await pool.connect();
            console.log('[CONNECTED]\n');

            // Create database
            console.log('Creating database...');
            let request = pool.request();
            await request.query(createDbSQL);
            console.log('[OK] Database created or already exists');

            // Create table
            console.log('Creating Users table...');
            request = pool.request();
            await request.query(createTableSQL);
            console.log('[OK] Users table created or already exists');

            // Insert test data
            console.log('Inserting test credentials...');
            request = pool.request();
            await request.query(insertDataSQL);
            console.log('[OK] Test credentials inserted or already exist');

            await pool.close();

            console.log('\n========================================');
            console.log('Setup Complete!');
            console.log('========================================');
            console.log('\nLogin with:');
            console.log('  Admin:   username: admin    password: admin123');
            console.log('  Student: username: student1 password: pass1');
            console.log('\nDatabase: OnlineExam');
            console.log(`Server: ${serverConfig.server}`);
            console.log('========================================');

            process.exit(0);
        } catch (err) {
            console.log(`[FAILED] ${err.message}\n`);
        }
    }

    console.error('\nERROR: Could not connect to any SQL Server instance.');
    console.error('Please install SQL Server from: https://www.microsoft.com/en-us/sql-server/sql-server-downloads');
    process.exit(1);
}

setupDatabase();
