/**
 * Student Routes
 */
const express = require('express');
const studentController = require('../controllers/studentController');
const { requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createStudentSchema } = require('../utils/validators');

const router = express.Router();

router.get('/', requireAdmin, studentController.getAll);
router.post('/', requireAdmin, validate(createStudentSchema), studentController.create);
router.post('/import', requireAdmin, studentController.importExcel);
router.delete('/:id', requireAdmin, studentController.delete);

module.exports = router;
