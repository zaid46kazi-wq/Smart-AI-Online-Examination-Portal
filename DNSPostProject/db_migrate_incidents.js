const { Client } = require('pg');

async function migrate() {
    const password = 'Zaid$7411310473';
    const encodedPassword = encodeURIComponent(password);
    const connectionString = `postgresql://postgres:${encodedPassword}@db.ttmdiobkwbxyhyasttke.supabase.co:5432/postgres`;

    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS proctor_incidents (
                id SERIAL PRIMARY KEY,
                exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
                student_id INT REFERENCES students(id) ON DELETE CASCADE,
                violation_type VARCHAR(50),
                details TEXT,
                image_data TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log("Migration successful: proctor_incidents table created.");
    } catch (e) {
        console.error("Migration error:", e.message);
    } finally {
        await client.end();
    }
}
migrate();
