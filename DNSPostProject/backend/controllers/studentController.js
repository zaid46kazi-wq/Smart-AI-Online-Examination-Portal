/**
 * Student Controller — CRUD & Excel Import Operations
 */
const fs = require('fs');
const XLSX = require('xlsx');
const userModel = require('../models/userModel');

const studentController = {
    getAll: async (req, res, next) => {
        try {
            const students = await userModel.findAllStudents();
            return res.json(students);
        } catch (err) { next(err); }
    },

    create: async (req, res, next) => {
        try {
            const { username, password, name, usn, email } = req.body;
            const existing = await userModel.findByUsernameOrEmail(username, 'Student');
            if (existing) {
                return res.status(400).json({ error: `Student with username '${username}' already exists.` });
            }
            const hashedPassword = await userModel.hashPassword(password || 'pass123');
            const id = await userModel.createStudent({
                username, password: hashedPassword, name, usn, email
            });
            return res.json({ success: true, id });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Username or USN already registered in database.' });
            }
            next(err);
        }
    },

    importExcel: async (req, res, next) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'No Excel file uploaded' });
            const filePath = req.file.path;
            const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            if (rows.length === 0) return res.status(400).json({ error: 'File is empty' });

            let inserted = 0;
            for (const row of rows) {
                const username = String(row.username || row.Username || row.usn || row.USN || '').trim();
                if (!username) continue;
                const rawPassword = String(row.password || row.Password || 'pass123').trim();
                const hashedPassword = await userModel.hashPassword(rawPassword);
                try {
                    await userModel.createStudent({
                        username,
                        password: hashedPassword,
                        name: String(row.name || row.Name || ''),
                        usn: String(row.usn || row.USN || ''),
                        email: String(row.email || row.Email || '')
                    });
                    inserted++;
                } catch (_) { /* Skip duplicate usernames */ }
            }

            if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});
            return res.json({ success: true, total: rows.length, inserted });
        } catch (err) {
            if (req.file?.path && fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => {});
            next(err);
        }
    },

    delete: async (req, res, next) => {
        try {
            await userModel.deleteStudent(parseInt(req.params.id));
            return res.json({ success: true, message: 'Student deleted successfully.' });
        } catch (err) { next(err); }
    }
};

module.exports = studentController;
