const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
    // Support environment variable for DATABASE_URL (Render/production)
    const connectionString = process.env.DATABASE_URL || (() => {
        const password = 'Zaid$7411310473';
        const encodedPassword = encodeURIComponent(password);
        return `postgresql://postgres:${encodedPassword}@db.ttmdiobkwbxyhyasttke.supabase.co:5432/postgres`;
    })();

    console.log("Connecting securely to Supabase deployment...");
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to Supabase PostgreSQL.");

        const schemaPath = path.join(__dirname, 'database_schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(sql);
        console.log("SUCCESS! Automated database DDL mapping applied completely.");
    } catch (err) {
        console.error("========================================");
        console.error("DATABASE DEPLOYMENT FAILED!");
        console.error("Error Name:", err.name);
        console.error("Error Message:", err.message);
        if (err.detail) console.error("Detail:", err.detail);
        if (err.hint) console.error("Hint:", err.hint);
        if (err.where) console.error("Context:", err.where);
        console.error("========================================");
    } finally {
        await client.end();
    }
}

run();
