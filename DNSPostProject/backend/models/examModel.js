/**
 * Exam Model — MySQL 8 Data Access Object with Fail-Safe Arrays
 */
const { query, queryOne } = require('../config/db');

const examModel = {
    findAll: async () => {
        try {
            const sql = `
                SELECT e.*, s.subject_name, s.subject_code 
                FROM exams e 
                LEFT JOIN subjects s ON e.subject_id = s.id 
                ORDER BY e.id DESC
            `;
            const rows = await query(sql);
            if (Array.isArray(rows)) {
                return rows.map(e => ({
                    ...e,
                    exam_name: e.name,
                    subjects: { subject_name: e.subject_name, subject_code: e.subject_code }
                }));
            }
            return [];
        } catch (err) {
            console.error('[examModel.findAll Error]:', err.message);
            throw err;
        }
    },

    findAllForStudent: async (studentId) => {
        try {
            const sql = `
                SELECT e.*, s.subject_name, s.subject_code,
                       (SELECT COUNT(*) FROM results r WHERE r.student_id = ? AND r.exam_id = e.id) AS attempt_count
                FROM exams e 
                LEFT JOIN subjects s ON e.subject_id = s.id 
                WHERE e.exam_status = 'published'
                ORDER BY e.id DESC
            `;
            const rows = await query(sql, [studentId]);
            if (Array.isArray(rows)) {
                return rows.map(e => ({
                    ...e,
                    exam_name: e.name,
                    already_attempted: e.attempt_count > 0,
                    subjects: { subject_name: e.subject_name, subject_code: e.subject_code }
                }));
            }
            return [];
        } catch (err) {
            console.error('[examModel.findAllForStudent Error]:', err.message);
            throw err;
        }
    },

    findById: async (id) => {
        try {
            const sql = `
                SELECT e.*, s.subject_name, s.subject_code 
                FROM exams e 
                LEFT JOIN subjects s ON e.subject_id = s.id 
                WHERE e.id = ?
            `;
            const e = await queryOne(sql, [id]);
            if (!e) return null;
            return {
                ...e,
                exam_name: e.name,
                subjects: { subject_name: e.subject_name, subject_code: e.subject_code }
            };
        } catch (err) {
            console.error('[examModel.findById Error]:', err.message);
            throw err;
        }
    },

    create: async ({ name, subject_id, total_questions = 0, total_marks = 0, time_limit = 30, exam_date, start_time, end_time, exam_status }) => {
        try {
            const sql = `
                INSERT INTO exams (name, subject_id, total_questions, total_marks, time_limit, exam_date, start_time, end_time, exam_status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const now = new Date();
            const dateVal = exam_date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const sTime = start_time || '00:00';
            const eTime = end_time || '23:59';
            const statusVal = exam_status || 'published';
            const res = await query(sql, [
                name || 'Untitled Exam',
                parseInt(subject_id) || 1,
                parseInt(total_questions) || 0,
                parseInt(total_marks) || 0,
                parseInt(time_limit) || 30,
                dateVal,
                sTime,
                eTime,
                statusVal
            ]);
            return res.insertId;
        } catch (err) {
            console.error('[examModel.create Error]:', err.message);
            throw err;
        }
    },

    updateCounters: async (id, totalQuestions, totalMarks) => {
        try {
            return await query(`UPDATE exams SET total_questions = ?, total_marks = ? WHERE id = ?`, [totalQuestions, totalMarks, id]);
        } catch (err) {
            console.error('[examModel.updateCounters Error]:', err.message);
            throw err;
        }
    },

    delete: async (id) => {
        try {
            return await query(`DELETE FROM exams WHERE id = ?`, [id]);
        } catch (err) {
            console.error('[examModel.delete Error]:', err.message);
            throw err;
        }
    }
};

module.exports = examModel;
