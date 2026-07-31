/**
 * Result Routes
 */
const express = require('express');
const resultController = require('../controllers/resultController');
const { requireAuth, requireAdmin, requireStudent } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { submitExamSchema } = require('../utils/validators');

const router = express.Router();

router.get('/', requireAdmin, resultController.getAll);
router.get('/my', requireStudent, resultController.getMyResults);
router.get('/rank-list/:exam_id', requireAuth, resultController.getRankList);
router.get('/leaderboard', requireAuth, resultController.getLeaderboard);
router.post('/submit', requireStudent, validate(submitExamSchema), resultController.submit);
router.get('/pdf/:result_id', requireAuth, resultController.downloadPDF);
router.get('/hall-ticket/:exam_id', requireStudent, resultController.downloadHallTicket);

module.exports = router;
