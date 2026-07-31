/**
 * Result Model — MySQL 8 Data Access Object with Fail-Safe Arrays
 */
const { query, queryOne } = require('../config/db');

const resultModel = {
    findAll: async () => {
        try {
            const sql = `
                SELECT r.*, s.username, s.name, s.usn, s.email, e.name AS exam_name
                FROM results r
                LEFT JOIN students s ON r.student_id = s.id
                LEFT JOIN exams e ON r.exam_id = e.id
                ORDER BY r.exam_date DESC
            `;
            const rows = await query(sql);
            if (Array.isArray(rows)) {
                return rows.map(r => ({
                    ...r,
                    students: { username: r.username, name: r.name, usn: r.usn, email: r.email },
                    exams: { name: r.exam_name }
                }));
            }
            return [];
        } catch (err) {
            console.error('[resultModel.findAll Error]:', err.message);
            throw err;
        }
    },

    findByStudentId: async (studentId) => {
        try {
            const sql = `
                SELECT r.*, e.name AS exam_name, sub.subject_name
                FROM results r
                LEFT JOIN exams e ON r.exam_id = e.id
                LEFT JOIN subjects sub ON e.subject_id = sub.id
                WHERE r.student_id = ?
                ORDER BY r.exam_date DESC
            `;
            const rows = await query(sql, [studentId]);
            if (Array.isArray(rows)) {
                return rows.map(r => ({
                    ...r,
                    exams: {
                        name: r.exam_name,
                        exam_name: r.exam_name,
                        subjects: { subject_name: r.subject_name }
                    }
                }));
            }
            return [];
        } catch (err) {
            console.error('[resultModel.findByStudentId Error]:', err.message);
            throw err;
        }
    },

    findByStudentAndExam: async (studentId, examId) => {
        try {
            return await queryOne(`SELECT * FROM results WHERE student_id = ? AND exam_id = ? LIMIT 1`, [studentId, examId]);
        } catch (err) {
            console.error('[resultModel.findByStudentAndExam Error]:', err.message);
            throw err;
        }
    },

    findById: async (id) => {
        try {
            const sql = `
                SELECT r.*, s.username, s.name, s.usn, s.email, e.name AS exam_name, sub.subject_name
                FROM results r
                LEFT JOIN students s ON r.student_id = s.id
                LEFT JOIN exams e ON r.exam_id = e.id
                LEFT JOIN subjects sub ON e.subject_id = sub.id
                WHERE r.id = ?
            `;
            const r = await queryOne(sql, [id]);
            if (!r) return null;
            return {
                ...r,
                students: { username: r.username, name: r.name, usn: r.usn, email: r.email },
                exams: { name: r.exam_name, subjects: { subject_name: r.subject_name } }
            };
        } catch (err) {
            console.error('[resultModel.findById Error]:', err.message);
            throw err;
        }
    },

    create: async ({ student_id, exam_id, score, total_marks, completed_at, auto_submit = false, submit_reason = 'NORMAL' }) => {
        try {
            const sql = `
                INSERT INTO results (student_id, exam_id, score, total_marks, completed_at, auto_submit, submit_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            const dateVal = completed_at || new Date().toISOString().slice(0, 19).replace('T', ' ');
            const res = await query(sql, [student_id, exam_id, score, total_marks, dateVal, auto_submit ? 1 : 0, submit_reason]);
            return res.insertId;
        } catch (err) {
            console.error('[resultModel.create Error]:', err.message);
            throw err;
        }
    },

    findRankListByExam: async (examId) => {
        try {
            const sql = `
                SELECT r.score, r.total_marks, s.username, s.name, s.usn
                FROM results r
                JOIN students s ON r.student_id = s.id
                WHERE r.exam_id = ?
                ORDER BY r.score DESC
            `;
            const rows = await query(sql, [examId]);
            if (Array.isArray(rows)) {
                return rows.map(r => ({
                    score: r.score,
                    total_marks: r.total_marks,
                    students: { username: r.username, name: r.name, usn: r.usn }
                }));
            }
            return [];
        } catch (err) {
            console.error('[resultModel.findRankListByExam Error]:', err.message);
            throw err;
        }
    },

    findLeaderboard: async (limit = 10) => {
        try {
            const sql = `
                SELECT s.name, s.username, MAX(r.score) AS best_score
                FROM results r
                JOIN students s ON r.student_id = s.id
                GROUP BY r.student_id, s.name, s.username
                ORDER BY best_score DESC
                LIMIT ?
            `;
            const rows = await query(sql, [limit]);
            if (Array.isArray(rows)) {
                return rows.map(r => ({
                    Username: r.name || r.username,
                    Score: r.best_score
                }));
            }
            return [];
        } catch (err) {
            console.error('[resultModel.findLeaderboard Error]:', err.message);
            throw err;
        }
    }
};

module.exports = resultModel;
