/**
 * Auth Routes
 */
const express = require('express');
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { loginSchema } = require('../utils/validators');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;
