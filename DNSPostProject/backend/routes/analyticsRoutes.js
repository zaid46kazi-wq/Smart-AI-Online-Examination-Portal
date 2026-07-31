/**
 * Analytics Routes
 */
const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAdmin, analyticsController.getOverview);

module.exports = router;
