require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function setup() {
  console.log('Creating proctor_incidents table...');
  const { error } = await supabase.rpc('execute_sql', {
    query_text: `
      CREATE TABLE IF NOT EXISTS proctor_incidents (
        id SERIAL PRIMARY KEY,
        exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        violation_type VARCHAR(50),
        details TEXT,
        image_data TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });

  if (error) {
    if (error.message.includes('function execute_sql does not exist')) {
       console.log('Skipping standard SQL execution, creating via dummy insert fallback or manual GUI is needed if SQL rpc is missing.');
       console.log('For this environment, we will add the table via Supabase dashboard or deploy-db.');
    } else {
       console.error('Error:', error.message);
    }
  } else {
    console.log('proctor_incidents table ready!');
  }
}

setup();
