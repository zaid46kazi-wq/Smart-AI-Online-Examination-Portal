const { query } = require('./backend/config/db');

(async () => {
  try {
    const tables = await query(`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='online_exam_system' AND TABLE_NAME IN ('students','subjects','exams','questions','results','proctor_status','warnings','ai_settings') ORDER BY TABLE_NAME`);
    const counts = await query(`SELECT 'students' AS table_name, COUNT(*) AS count FROM students UNION ALL SELECT 'subjects', COUNT(*) FROM subjects UNION ALL SELECT 'exams', COUNT(*) FROM exams UNION ALL SELECT 'questions', COUNT(*) FROM questions UNION ALL SELECT 'results', COUNT(*) FROM results UNION ALL SELECT 'proctor_status', COUNT(*) FROM proctor_status UNION ALL SELECT 'warnings', COUNT(*) FROM warnings UNION ALL SELECT 'ai_settings', COUNT(*) FROM ai_settings`);
    console.log(JSON.stringify({
      tables: tables.map((row) => row.TABLE_NAME),
      counts: counts.map((row) => ({ table_name: row.table_name, count: Number(row.count) }))
    }, null, 2));
  } catch (error) {
    console.error(`DB_SMOKE_ERROR=${error.code || 'UNKNOWN'}: ${error.message}`);
    process.exitCode = 1;
  }
})();
