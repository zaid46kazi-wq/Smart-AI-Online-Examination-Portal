/**
 * Subject Model — MySQL 8 Data Access Object with Fail-Safe Arrays
 */
const { query, queryOne } = require('../config/db');

const subjectModel = {
    findAll: async () => {
        try {
            const rows = await query(`SELECT * FROM subjects ORDER BY id ASC`);
            if (Array.isArray(rows)) return rows;
            return [];
        } catch (err) {
            console.error('[subjectModel.findAll Error]:', err.message);
            throw err;
        }
    },

    findById: async (id) => {
        try {
            return await queryOne(`SELECT * FROM subjects WHERE id = ?`, [id]);
        } catch (err) {
            console.error('[subjectModel.findById Error]:', err.message);
            throw err;
        }
    },

    findByName: async (name) => {
        try {
            return await queryOne(`SELECT * FROM subjects WHERE subject_name = ?`, [name]);
        } catch (err) {
            console.error('[subjectModel.findByName Error]:', err.message);
            throw err;
        }
    },

    create: async ({ subject_name, subject_code = '' }) => {
        try {
            const sql = `INSERT INTO subjects (subject_name, subject_code) VALUES (?, ?)`;
            const res = await query(sql, [subject_name, subject_code]);
            return res.insertId;
        } catch (err) {
            console.error('[subjectModel.create Error]:', err.message);
            throw err;
        }
    },

    delete: async (id) => {
        try {
            return await query(`DELETE FROM subjects WHERE id = ?`, [id]);
        } catch (err) {
            console.error('[subjectModel.delete Error]:', err.message);
            throw err;
        }
    }
};

module.exports = subjectModel;
