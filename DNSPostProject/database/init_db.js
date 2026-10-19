/**
 * Automated MySQL Setup & Seeder Script
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function run() {
    const host = process.env.DB_HOST || '127.0.0.1';
    const port = parseInt(process.env.DB_PORT || '3306', 10);
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME || 'online_exam_system';

    console.log(`\n🐬 Initializing MySQL Database: ${dbName}...`);
    console.log(`📡 Connecting to MySQL Server at ${host}:${port} as user '${user}'...`);

    let conn;
    try {
        conn = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
        console.log(`✅ Success! Connected to MySQL at ${host}:${port}!`);

        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        console.log(`✅ Database '${dbName}' created/verified!`);

        await conn.query(`USE \`${dbName}\`;`);

        const sqlPath = path.join(__dirname, 'database.sql');
        const sqlScript = fs.readFileSync(sqlPath, 'utf8');
        console.log(`📄 Importing schema & seed records...`);
        await conn.query(sqlScript);

        console.log(`🔄 Running schema migration for proctoring columns...`);
        const alterQueries = [
            `ALTER TABLE proctor_status ADD COLUMN live_risk_score INT DEFAULT 0;`,
            `ALTER TABLE proctor_status ADD COLUMN identity_verified TINYINT(1) DEFAULT 0;`,
            `ALTER TABLE proctor_status ADD COLUMN reference_image LONGTEXT DEFAULT NULL;`,
            `ALTER TABLE warnings ADD COLUMN confidence FLOAT DEFAULT 1.0;`,
            `ALTER TABLE warnings ADD COLUMN risk_score INT DEFAULT 0;`,
            `ALTER TABLE warnings ADD COLUMN details JSON DEFAULT NULL;`
        ];
        for (const q of alterQueries) {
            await conn.query(q).catch(() => {}); // Safely ignore if column already exists
        }

        const evalMigrationPath = path.join(__dirname, 'evaluation_migration.sql');
        if (fs.existsSync(evalMigrationPath)) {
            console.log(`📄 Running evaluation migration...`);
            const evalSql = fs.readFileSync(evalMigrationPath, 'utf8');
            await conn.query(evalSql);
            console.log(`✅ Evaluation tables migrated!`);
        }

        console.log('\n🎉 SUCCESS: All MySQL tables and seed data initialized successfully!');
        console.log('─────────────────────────────────────────────────────────────\n');
        return true;
    } catch (err) {
        console.error(`\n❌ Access Denied / Connection Failed: ${err.message}`);
        console.log(`\n💡 To Fix:`);
        console.log(`1. Open file: DNSPostProject\\.env`);
        console.log(`2. Update line 8: DB_PASSWORD=your_mysql_password`);
        console.log(`3. Re-run: npm run init-db\n`);
        return false;
    } finally {
        if (conn) await conn.end().catch(() => {});
    }
}

run();
