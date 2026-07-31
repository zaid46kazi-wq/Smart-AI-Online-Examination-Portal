/**
 * Subject Controller — CRUD Operations
 */
const subjectModel = require('../models/subjectModel');

const subjectController = {
    getAll: async (req, res, next) => {
        try {
            res.setHeader('Cache-Control', 'public, max-age=3600');
            const subjects = await subjectModel.findAll();
            return res.json(subjects);
        } catch (err) { next(err); }
    },

    create: async (req, res, next) => {
        try {
            const { subject_name, subject_code } = req.body;
            const existing = await subjectModel.findByName(subject_name);
            if (existing) {
                return res.status(400).json({ error: 'Subject already exists' });
            }
            const id = await subjectModel.create({ subject_name, subject_code: subject_code || '' });
            return res.status(201).json({ success: true, id });
        } catch (err) { next(err); }
    },

    delete: async (req, res, next) => {
        try {
            await subjectModel.delete(parseInt(req.params.id));
            return res.json({ success: true, message: 'Subject deleted successfully.' });
        } catch (err) { next(err); }
    }
};

module.exports = subjectController;
