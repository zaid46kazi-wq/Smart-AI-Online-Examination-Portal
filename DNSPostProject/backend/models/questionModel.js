/**
 * Question Model — MySQL 8 Data Access Object
 */
const { query } = require('../config/db');

const questionModel = {
    findByExamId: async (examId) => {
        return query(`SELECT id, exam_id, question, option1, option2, option3, option4, correct_answer, marks FROM questions WHERE exam_id = ? ORDER BY id ASC`, [examId]);
    },

    // SECURITY: Student-facing query excludes correct_answer to prevent cheating via DevTools
    findByExamIdForStudent: async (examId) => {
        return query(`SELECT id, exam_id, question, option1, option2, option3, option4, marks FROM questions WHERE exam_id = ? ORDER BY id ASC`, [examId]);
    },

    createBatch: async (questions) => {
        if (!questions || questions.length === 0) return 0;
        const placeholders = questions.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const sql = `
            INSERT INTO questions (exam_id, question, option1, option2, option3, option4, correct_answer, marks) 
            VALUES ${placeholders}
        `;
        const params = [];
        questions.forEach(q => {
            params.push(q.exam_id, q.question, q.option1, q.option2, q.option3, q.option4, q.correct_answer, q.marks || 1);
        });
        const res = await query(sql, params);
        return res.affectedRows;
    },

    deleteByExamId: async (examId) => {
        return query(`DELETE FROM questions WHERE exam_id = ?`, [examId]);
    }
};

module.exports = questionModel;
