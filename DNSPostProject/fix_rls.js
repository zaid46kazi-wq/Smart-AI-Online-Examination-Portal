const { Client } = require('pg');
async function run() {
  const password = 'Zaid$7411310473';
  const encodedPassword = encodeURIComponent(password);
  const connectionString = `postgresql://postgres:${encodedPassword}@db.ttmdiobkwbxyhyasttke.supabase.co:5432/postgres`;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    // Enable RLS
    await client.query('ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;');
    
    // Drop old policies if any to avoid duplicates
    await client.query('DROP POLICY IF EXISTS "Allow all access to warnings" ON warnings;');
    await client.query('DROP POLICY IF EXISTS "Public Select" ON warnings;');
    await client.query('DROP POLICY IF EXISTS "Users can insert" ON warnings;');
    
    // Create new full-access policies
    await client.query('CREATE POLICY "Allow all access to warnings" ON warnings FOR ALL USING (true) WITH CHECK (true);');
    
    console.log('--- DB REPAIR SUCCESS ---');
    console.log('1. RLS Enabled for warnings table');
    console.log('2. Full access policy created.');
    
    // Also check storage bucket policies
    // This part is better done via the Supabase Dashboard, but let's try via SQL first if possible
    // Supabase stores storage metadata in `storage.objects` and `storage.buckets`
    
    await client.query(`
       -- Update storage policy for 'warnings' bucket
       INSERT INTO storage.buckets (id, name, public) VALUES ('warnings', 'warnings', true) ON CONFLICT (id) DO UPDATE SET public = true;
    `);
    console.log('3. Storage bucket set to public in DB.');
    
  } catch(e) { console.error('Repair error:', e.message); }
  await client.end();
}
run();
