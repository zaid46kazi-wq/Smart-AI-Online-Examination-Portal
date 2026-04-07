const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function migrate() {
    const password = 'Zaid$7411310473';
    const encodedPassword = encodeURIComponent(password);
    const connectionString = `postgresql://postgres:${encodedPassword}@db.ttmdiobkwbxyhyasttke.supabase.co:5432/postgres`;

    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS warnings (
                id SERIAL PRIMARY KEY,
                user_id INT,
                exam_id INT,
                type VARCHAR(50),
                image_url TEXT,
                timestamp TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log("Migration successful: warnings table created.");
    } catch (e) {
        console.error("Migration error:", e.message);
    } finally {
        await client.end();
    }

    // Set up bucket using Supabase JS client
    try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        // Ensure bucket exists
        const { data: buckets, error: getBucketsErr } = await supabase.storage.listBuckets();
        const hasBucket = buckets && buckets.some(b => b.name === 'warnings');
        
        if (!hasBucket) {
            const { data, error } = await supabase.storage.createBucket('warnings', {
                public: true,
                allowedMimeTypes: ['image/png', 'image/jpeg'],
                fileSizeLimit: 1048576 * 5 // 5MB
            });
            if (error) {
                console.error("Bucket creation error:", error.message);
                if (!error.message.includes('already exists')) {
                   console.log("Could not create bucket automatically via client key; creating it requires admin role."); 
                }
            } else {
                console.log("Storage Bucket 'warnings' created or verified.");
            }
        } else {
            console.log("Storage Bucket 'warnings' already exists.");
        }
    } catch(err) {
        console.error("Error setting up Supabase bucket:", err.message);
    }
}
migrate();
