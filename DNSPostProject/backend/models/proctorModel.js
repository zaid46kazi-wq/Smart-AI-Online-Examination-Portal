/**
 * Proctor & Incidents Model — MySQL 8 Data Access Object with Fail-Safe Arrays
 */
const { query, queryOne } = require('../config/db');

const proctorModel = {
    getStatus: async (studentId, examId) => {
        try {
            return await queryOne(`SELECT * FROM proctor_status WHERE student_id = ? AND exam_id = ? LIMIT 1`, [studentId, examId]);
        } catch (err) {
            console.error('[proctorModel.getStatus Error]:', err.message);
            throw err;
        }
    },

    saveReferenceImage: async (studentId, examId, imageData) => {
        try {
            const sql = `
                INSERT INTO proctor_status (student_id, exam_id, status, identity_verified, reference_image, last_violation_time)
                VALUES (?, ?, 'active', 1, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                    identity_verified = 1,
                    reference_image = VALUES(reference_image),
                    last_violation_time = NOW()
            `;
            return await query(sql, [studentId, examId, imageData]);
        } catch (err) {
            console.error('[proctorModel.saveReferenceImage Error]:', err.message);
            throw err;
        }
    },

    updateStatus: async ({ student_id, exam_id, status = 'active', violations_count = 0, violation_type = null, live_risk_score = 0 }) => {
        try {
            const sql = `
                INSERT INTO proctor_status (student_id, exam_id, status, violations_count, violation_type, live_risk_score, last_violation_time)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                    status = VALUES(status), 
                    violations_count = VALUES(violations_count),
                    violation_type = VALUES(violation_type),
                    live_risk_score = VALUES(live_risk_score),
                    last_violation_time = NOW()
            `;
            return await query(sql, [student_id, exam_id, status, violations_count, violation_type, live_risk_score]);
        } catch (err) {
            console.error('[proctorModel.updateStatus Error]:', err.message);
            throw err;
        }
    },

    logIncident: async ({ exam_id, user_id, type, confidence = 1.0, risk_score = 0, details = null, image_url = null }) => {
        try {
            const detailsJson = typeof details === 'object' ? JSON.stringify(details) : details;
            const sql = `INSERT INTO warnings (exam_id, user_id, type, confidence, risk_score, details, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            const res = await query(sql, [exam_id, user_id, type, confidence, risk_score, detailsJson, image_url]);
            return res.insertId;
        } catch (err) {
            console.error('[proctorModel.logIncident Error]:', err.message);
            throw err;
        }
    },

    getIncidentsByExam: async (examId) => {
        try {
            const sql = `
                SELECT w.*, s.name, s.usn, s.username
                FROM warnings w
                JOIN students s ON w.user_id = s.id
                WHERE w.exam_id = ?
                ORDER BY w.timestamp DESC
            `;
            const rows = await query(sql, [examId]);
            if (Array.isArray(rows)) {
                return rows.map(w => ({
                    ...w,
                    students: { name: w.name, usn: w.usn, username: w.username }
                }));
            }
            return [];
        } catch (err) {
            console.error('[proctorModel.getIncidentsByExam Error]:', err.message);
            throw err;
        }
    },

    getAllStatus: async () => {
        try {
            const sql = `
                SELECT ps.*, s.name, s.username, s.usn
                FROM proctor_status ps
                JOIN students s ON ps.student_id = s.id
                ORDER BY ps.last_violation_time DESC
            `;
            const rows = await query(sql);
            if (Array.isArray(rows)) {
                return rows.map(ps => ({
                    ...ps,
                    students: { name: ps.name, username: ps.username, usn: ps.usn }
                }));
            }
            return [];
        } catch (err) {
            console.error('[proctorModel.getAllStatus Error]:', err.message);
            throw err;
        }
    },

    getSettings: async () => {
        try {
            const rows = await query(`SELECT setting_key, setting_value FROM ai_settings`);
            const settings = {};
            if (Array.isArray(rows)) {
                rows.forEach(r => {
                    try { settings[r.setting_key] = JSON.parse(r.setting_value); }
                    catch (_) { settings[r.setting_key] = r.setting_value; }
                });
            }
            return settings;
        } catch (err) {
            console.error('[proctorModel.getSettings Error]:', err.message);
            return {};
        }
    },

    updateSettings: async (settingsObj) => {
        try {
            for (const [key, val] of Object.entries(settingsObj)) {
                const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
                await query(
                    `INSERT INTO ai_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
                    [key, strVal]
                );
            }
            return true;
        } catch (err) {
            console.error('[proctorModel.updateSettings Error]:', err.message);
            throw err;
        }
    },

    getProctoringReportData: async (resultId) => {
        try {
            const result = await queryOne(`
                SELECT r.*, e.name as exam_name, e.total_marks as exam_total_marks, e.time_limit,
                       s.name as student_name, s.usn, s.email, s.username, sub.subject_name
                FROM results r
                JOIN exams e ON r.exam_id = e.id
                JOIN students s ON r.student_id = s.id
                JOIN subjects sub ON e.subject_id = sub.id
                WHERE r.id = ? LIMIT 1
            `, [resultId]);

            if (!result) return null;

            const incidents = await query(`
                SELECT * FROM warnings 
                WHERE exam_id = ? AND user_id = ?
                ORDER BY timestamp ASC
            `, [result.exam_id, result.student_id]);

            const proctorStatus = await queryOne(`
                SELECT * FROM proctor_status 
                WHERE exam_id = ? AND student_id = ? LIMIT 1
            `, [result.exam_id, result.student_id]);

            return {
                result,
                incidents: Array.isArray(incidents) ? incidents : [],
                proctorStatus: proctorStatus || {}
            };
        } catch (err) {
            console.error('[proctorModel.getProctoringReportData Error]:', err.message);
            throw err;
        }
    }
};

module.exports = proctorModel;
