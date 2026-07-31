/**
 * Subject Routes
 */
const express = require('express');
const subjectController = require('../controllers/subjectController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createSubjectSchema } = require('../utils/validators');

const router = express.Router();

router.get('/', requireAuth, subjectController.getAll);
router.post('/', requireAdmin, validate(createSubjectSchema), subjectController.create);
router.delete('/:id', requireAdmin, subjectController.delete);

module.exports = router;
