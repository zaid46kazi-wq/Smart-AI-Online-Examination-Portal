const { Client } = require('pg');
async function run() {
  const password = 'Zaid$7411310473';
  const encodedPassword = encodeURIComponent(password);
  const connectionString = `postgresql://postgres:${encodedPassword}@db.ttmdiobkwbxyhyasttke.supabase.co:5432/postgres`;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('ALTER TABLE warnings ADD CONSTRAINT warnings_user_id_fkey FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE;');
    console.log('Added user_id FK successfully');
  } catch(e) {
    console.log(e.message);
  }
  try {
    await client.query('ALTER TABLE warnings ADD CONSTRAINT warnings_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;');
    console.log('Added exam_id FK successfully');
  } catch(e) {
    console.log(e.message);
  }
  await client.end();
}
run();
