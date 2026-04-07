const { Client } = require('pg');
const password = encodeURIComponent('Zaid$7411310473');
const client = new Client({ connectionString: `postgresql://postgres:${password}@db.ttmdiobkwbxyhyasttke.supabase.co:5432/postgres` });

async function run() {
  try {
    await client.connect();
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('Schema cache reloaded!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
