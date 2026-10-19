const { query } = require('./backend/config/db');

(async () => {
  try {
    const exams = await query(`SELECT e.id, e.name, e.subject_id, e.time_limit, COUNT(q.id) AS question_count FROM exams e LEFT JOIN questions q ON q.exam_id=e.id GROUP BY e.id, e.name, e.subject_id, e.time_limit ORDER BY e.id`);
    const examId = exams.find((row) => Number(row.question_count) > 0)?.id;
    const response = await fetch('http://127.0.0.1:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'student1', password: 'pass1', role: 'Student' })
    });
    const login = await response.json();
    const examResponse = examId && login.token
      ? await fetch(`http://127.0.0.1:5000/api/exam-questions/${examId}`, {
          headers: { Authorization: `Bearer ${login.token}` }
        })
      : null;
    const examBody = examResponse ? await examResponse.json() : {};
    console.log(JSON.stringify({
      exams: exams.map((row) => ({ id: Number(row.id), question_count: Number(row.question_count) })),
      selectedExamId: examId ? Number(examId) : null,
      examStatus: examResponse?.status,
      examError: examBody.error,
      questionCount: Array.isArray(examBody.questions) ? examBody.questions.length : undefined,
      totalQuestions: examBody.total_questions,
      timeLimit: examBody.time_limit
    }, null, 2));
  } catch (error) {
    console.error(`EXAM_SMOKE_ERROR=${error.code || 'UNKNOWN'}: ${error.message}`);
    process.exitCode = 1;
  }
})();
