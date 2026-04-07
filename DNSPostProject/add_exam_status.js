const { Client } = require('pg');

async function run() {
    const password = 'Zaid$7411310473';
    const encodedPassword = encodeURIComponent(password);
    const connectionString = `postgresql://postgres:${encodedPassword}@db.ttmdiobkwbxyhyasttke.supabase.co:5432/postgres`;
    
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        await client.query("ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_status TEXT DEFAULT 'draft'");
        console.log("Column added or already exists.");
        
        // Optionally update old exams to published so they don't disappear from students
        await client.query("UPDATE exams SET exam_status = 'published' WHERE exam_status IS NULL OR exam_status = 'draft'");
        console.log("Old exams published.");

        // Also add logic to questions table? No, user only asked for exams table.
        // Wait, did they ask for any other field? No.
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

run();
