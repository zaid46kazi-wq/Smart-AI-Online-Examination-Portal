const { Client } = require('pg');
async function run() {
  const password = 'Zaid$7411310473';
  const encodedPassword = encodeURIComponent(password);
  const connectionString = `postgresql://postgres:${encodedPassword}@db.ttmdiobkwbxyhyasttke.supabase.co:5432/postgres`;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    // Add public SELECT policy for storage objects in 'warnings' bucket
    await client.query(`DROP POLICY IF EXISTS "Public Access to Snapshots" ON storage.objects;`);
    await client.query(`CREATE POLICY "Public Access to Snapshots" ON storage.objects FOR SELECT USING (bucket_id = 'warnings');`);
    console.log('Public storage policy added (SELECT).');

    // Add public INSERT policy for storage objects in 'warnings' bucket (allow uploading)
    await client.query(`DROP POLICY IF EXISTS "Public Snapshot Upload" ON storage.objects;`);
    await client.query(`CREATE POLICY "Public Snapshot Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'warnings');`);
    console.log('Public upload policy added (INSERT).');

    // Also update storage.buckets just in case
    await client.query(`UPDATE storage.buckets SET public = true WHERE id = 'warnings';`);
    console.log('Storage bucket set to public.');

  } catch (e) { console.error('Storage repair error:', e.message); }
  await client.end();
}
run();
