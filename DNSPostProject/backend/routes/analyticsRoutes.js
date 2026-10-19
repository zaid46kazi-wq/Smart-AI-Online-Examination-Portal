/**
 * Analytics Routes
 */
const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { requireAdmin, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAdmin, analyticsController.getOverview);
router.post('/ai-chat', requireAuth, analyticsController.chatAssistant);

module.exports = router;
