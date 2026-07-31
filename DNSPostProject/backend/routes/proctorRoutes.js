/**
 * Proctor Routes
 */
const express = require('express');
const proctorController = require('../controllers/proctorController');
const { requireAuth, requireAdmin, requireStudent } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { flagViolationSchema } = require('../utils/validators');

const router = express.Router();

router.post('/status', requireStudent, proctorController.updateStatus);
router.get('/status', requireAdmin, proctorController.getAllStatus);
router.post('/verify-identity', requireStudent, proctorController.verifyIdentity);
router.post('/flag-violation', requireStudent, validate(flagViolationSchema), proctorController.flagViolation);
router.get('/security-status', requireStudent, proctorController.getSecurityStatus);
router.get('/incidents/:exam_id', requireAdmin, proctorController.getIncidents);
router.get('/settings', requireAuth, proctorController.getSettings);
router.post('/settings', requireAdmin, proctorController.updateSettings);
router.get('/report/:result_id', requireAuth, proctorController.getReportData);
router.get('/report-pdf/:result_id', requireAuth, proctorController.generateReportPDF);

module.exports = router;
