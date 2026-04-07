const { Client } = require('pg');

async function run() {
    const password = 'Zaid$7411310473';
    const encodedPassword = encodeURIComponent(password);
    const connectionString = `postgresql://postgres:${encodedPassword}@db.ttmdiobkwbxyhyasttke.supabase.co:5432/postgres`;

    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase.\n");

        // ── STEP 1: Diagnose current results table ──
        console.log("═══ STEP 1: DIAGNOSING 'results' TABLE ═══");
        const { rows: resultsCols } = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'results' AND table_schema = 'public'
            ORDER BY ordinal_position;
        `);
        console.log("Current columns:", resultsCols.map(r => r.column_name).join(', '));

        // ── STEP 2: Add missing columns to results if needed ──
        console.log("\n═══ STEP 2: ADDING MISSING COLUMNS TO 'results' ═══");
        const neededCols = [
            { name: 'completed_at', sql: "ALTER TABLE results ADD COLUMN completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;" },
            { name: 'auto_submit', sql: "ALTER TABLE results ADD COLUMN auto_submit BOOLEAN DEFAULT FALSE;" },
            { name: 'submit_reason', sql: "ALTER TABLE results ADD COLUMN submit_reason TEXT DEFAULT 'NORMAL';" },
        ];
        for (const col of neededCols) {
            const exists = resultsCols.some(r => r.column_name === col.name);
            if (exists) {
                console.log(`  ✓ Column '${col.name}' already exists.`);
            } else {
                await client.query(col.sql);
                console.log(`  ✅ ADDED column '${col.name}'.`);
            }
        }

        // ── STEP 3: Ensure UNIQUE constraint on results (student_id, exam_id) ──
        console.log("\n═══ STEP 3: ENSURING UNIQUE CONSTRAINT ON 'results' ═══");
        const { rows: constraints } = await client.query(`
            SELECT conname FROM pg_constraint 
            WHERE conrelid = 'results'::regclass AND contype = 'u';
        `);
        const hasUnique = constraints.some(c => c.conname === 'unique_student_exam_result');
        if (hasUnique) {
            console.log("  ✓ UNIQUE(student_id, exam_id) constraint exists.");
        } else {
            try {
                await client.query("ALTER TABLE results ADD CONSTRAINT unique_student_exam_result UNIQUE (student_id, exam_id);");
                console.log("  ✅ ADDED UNIQUE constraint.");
            } catch (e) {
                console.log("  ⚠️ Constraint add failed (may have duplicates):", e.message);
                // Clean up duplicates first, keeping the latest
                console.log("  🔧 Cleaning duplicate results...");
                await client.query(`
                    DELETE FROM results a USING results b
                    WHERE a.id < b.id AND a.student_id = b.student_id AND a.exam_id = b.exam_id;
                `);
                try {
                    await client.query("ALTER TABLE results ADD CONSTRAINT unique_student_exam_result UNIQUE (student_id, exam_id);");
                    console.log("  ✅ ADDED UNIQUE constraint after cleanup.");
                } catch (e2) {
                    console.log("  ❌ Still failed:", e2.message);
                }
            }
        }

        // ── STEP 4: Ensure proctor_status has UNIQUE constraint ──
        console.log("\n═══ STEP 4: ENSURING UNIQUE CONSTRAINT ON 'proctor_status' ═══");
        const { rows: pConstraints } = await client.query(`
            SELECT conname FROM pg_constraint 
            WHERE conrelid = 'proctor_status'::regclass AND contype = 'u';
        `);
        const hasPUnique = pConstraints.some(c => c.conname === 'unique_student_exam_session');
        if (hasPUnique) {
            console.log("  ✓ UNIQUE(student_id, exam_id) constraint exists.");
        } else {
            try {
                await client.query(`
                    DELETE FROM proctor_status a USING proctor_status b
                    WHERE a.id < b.id AND a.student_id = b.student_id AND a.exam_id = b.exam_id;
                `);
                await client.query("ALTER TABLE proctor_status ADD CONSTRAINT unique_student_exam_session UNIQUE (student_id, exam_id);");
                console.log("  ✅ ADDED UNIQUE constraint.");
            } catch (e) {
                console.log("  ⚠️ Constraint:", e.message);
            }
        }

        // ── STEP 5: Check proctor_status columns ──
        console.log("\n═══ STEP 5: CHECKING 'proctor_status' TABLE ═══");
        const { rows: pCols } = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'proctor_status' AND table_schema = 'public'
            ORDER BY ordinal_position;
        `);
        console.log("Current columns:", pCols.map(r => r.column_name).join(', '));

        // ── STEP 6: Show existing results (how many students have results) ──
        console.log("\n═══ STEP 6: CURRENT DATA SNAPSHOT ═══");
        const { rows: resultCount } = await client.query("SELECT COUNT(*) as cnt FROM results;");
        console.log("  Total results rows:", resultCount[0].cnt);
        
        const { rows: proctorCount } = await client.query("SELECT COUNT(*) as cnt FROM proctor_status;");
        console.log("  Total proctor_status rows:", proctorCount[0].cnt);

        const { rows: duplicates } = await client.query(`
            SELECT student_id, exam_id, COUNT(*) as attempts 
            FROM results GROUP BY student_id, exam_id HAVING COUNT(*) > 1;
        `);
        if (duplicates.length > 0) {
            console.log("  ⚠️ DUPLICATE RESULTS FOUND:", duplicates);
        } else {
            console.log("  ✓ No duplicate results found.");
        }

        // ── STEP 7: Grant permissions ──
        console.log("\n═══ STEP 7: GRANTING PERMISSIONS ═══");
        await client.query("GRANT ALL ON TABLE results TO anon, authenticated;");
        await client.query("GRANT ALL ON TABLE proctor_status TO anon, authenticated;");
        await client.query("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;");
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log("  ✅ Permissions granted and schema cache reloaded.");

        console.log("\n════════════════════════════════════════");
        console.log("  DATABASE FIX COMPLETE ✅");
        console.log("════════════════════════════════════════\n");

    } catch (err) {
        console.error("❌ FATAL:", err.message);
        if (err.detail) console.error("Detail:", err.detail);
    } finally {
        await client.end();
    }
}

run();
