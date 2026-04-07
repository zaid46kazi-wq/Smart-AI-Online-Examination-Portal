const { Client } = require('pg');
async function run() {
  const password = 'Zaid$7411310473';
  const encodedPassword = encodeURIComponent(password);
  const connectionString = `postgresql://postgres:${encodedPassword}@db.ttmdiobkwbxyhyasttke.supabase.co:5432/postgres`;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('ALTER TABLE proctor_status ADD COLUMN IF NOT EXISTS last_violation_time TIMESTAMPTZ;');
    console.log('Added last_violation_time column successfully');
  } catch(e) {
    console.log('Error adding last_violation_time:', e.message);
  }
  
  // Also check violations_count column while we are at it
  try {
    await client.query('ALTER TABLE proctor_status ADD COLUMN IF NOT EXISTS violations_count INT DEFAULT 0;');
    console.log('Added violations_count column successfully');
  } catch(e) {
    console.log('Error adding violations_count:', e.message);
  }

  try {
    await client.query('ALTER TABLE proctor_status ADD COLUMN IF NOT EXISTS violation_type VARCHAR(255);');
    console.log('Added violation_type column successfully');
  } catch(e) {
    console.log('Error adding violation_type:', e.message);
  }
  
  await client.end();
}
run();
