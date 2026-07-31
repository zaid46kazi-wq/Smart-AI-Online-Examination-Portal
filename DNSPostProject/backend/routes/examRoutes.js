/**
 * Exam Routes
 */
const express = require('express');
const examController = require('../controllers/examController');
const { requireAuth, requireAdmin, requireStudent } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createExamSchema } = require('../utils/validators');

const router = express.Router();

router.get('/', requireAuth, examController.getAll);
router.post('/', requireAdmin, validate(createExamSchema), examController.create);
router.delete('/:id', requireAdmin, examController.delete);
router.get('/questions/:exam_id', requireStudent, examController.getQuestions);
router.get('/status/:exam_id', requireStudent, examController.getStatus);
router.post('/upload/:exam_id', requireAdmin, examController.uploadQuestionsExcel);
router.post('/generate-ai', requireAdmin, examController.generateAIQuestions);
router.post('/factory-reset', requireAdmin, examController.factoryReset);

module.exports = router;
