const proctorModel = require('../models/proctorModel');
const PDFDocument = require('pdfkit');

const DEFAULT_AI_SETTINGS = {
    max_warnings: 3,
    auto_submit_enabled: 1,
    face_timeout_seconds: 5,
    head_yaw_left_deg: 22,
    head_yaw_right_deg: 22,
    head_pitch_up_deg: 18,
    head_pitch_down_deg: 18,
    head_pose_hold_time_sec: 1.5,
    head_yaw_threshold_deg: 22,
    head_pitch_threshold_deg: 18,
    eye_gaze_max_duration_sec: 3.0,
    eye_gaze_side_glance_limit: 3,
    eye_gaze_confidence_threshold: 0.80,
    eye_blink_duration_thresh_sec: 3.0,
    eye_tracking_sensitivity: 'medium',
    eye_gaze_threshold: 0.12,
    phone_confidence_threshold: 0.50,
    phone_detection_interval_ms: 600,
    phone_repeat_limit: 2,
    max_allowed_faces: 1,
    multiple_faces_duration_sec: 1.0,
    allowed_tab_switches: 1,
    max_fullscreen_exits: 2,
    enable_ctrl_c: 1,
    enable_ctrl_v: 1,
    enable_ctrl_a: 1,
    enable_ctrl_p: 1,
    enable_ctrl_s: 1,
    enable_ctrl_shift_i: 1,
    enable_ctrl_shift_j: 1,
    enable_ctrl_u: 1,
    enable_f12: 1,
    enable_right_click: 1,
    screenshot_quality: 0.70,
    risk_weights: {
        LOOKING_AWAY: 10,
        RAPID_SIDE_GLANCES: 15,
        EYES_CLOSED_LONG: 20,
        HEAD_YAW: 10,
        HEAD_PITCH: 10,
        FACE_MISSING: 20,
        MULTIPLE_FACES: 40,
        PHONE_DETECTED: 30,
        TAB_SWITCH: 15,
        FULLSCREEN_EXIT: 10,
        KEYBOARD_SHORTCUT: 5,
        RIGHT_CLICK: 5
    }
};

const proctorController = {
    updateStatus: async (req, res, next) => {
        try {
            const { exam_id, status, warnings, live_risk_score } = req.body;
            await proctorModel.updateStatus({
                student_id: req.userId,
                exam_id: parseInt(exam_id),
                status: status || 'active',
                violations_count: warnings || 0,
                live_risk_score: live_risk_score || 0
            });
            if (req.app.get('io')) {
                req.app.get('io').emit('proctor-update', {
                    studentId: req.userId,
                    studentName: req.userFullName,
                    examId: exam_id,
                    status: status || 'active',
                    warnings: warnings || 0,
                    liveRiskScore: live_risk_score || 0
                });
            }
            return res.json({ success: true });
        } catch (err) { next(err); }
    },

    getAllStatus: async (req, res, next) => {
        try {
            const data = await proctorModel.getAllStatus();
            return res.json(data);
        } catch (err) { next(err); }
    },

    verifyIdentity: async (req, res, next) => {
        try {
            const { exam_id, image_data } = req.body;
            const examId = parseInt(exam_id);
            if (!examId) return res.status(400).json({ error: 'Exam ID required' });
            if (!image_data) return res.status(400).json({ error: 'Identity image required' });

            await proctorModel.saveReferenceImage(req.userId, examId, image_data);
            return res.json({ success: true, verified: true, timestamp: new Date().toISOString() });
        } catch (err) { next(err); }
    },

    flagViolation: async (req, res, next) => {
        try {
            const { exam_id, violation_type, details, image_data, confidence, risk_score } = req.body;
            const examId = parseInt(exam_id);
            if (isNaN(examId)) return res.status(400).json({ error: 'Invalid exam ID' });

            const currentStatus = await proctorModel.getStatus(req.userId, examId);
            if (currentStatus && currentStatus.status === 'submitted') {
                return res.status(403).json({ error: 'Cannot flag violation after exam submission' });
            }

            const incidentId = await proctorModel.logIncident({
                exam_id: examId,
                user_id: req.userId,
                type: violation_type,
                confidence: parseFloat(confidence || 1.0),
                risk_score: parseInt(risk_score || 0),
                details: details || {},
                image_url: image_data || null
            });

            const updatedStatus = await proctorModel.getStatus(req.userId, examId);
            const warningCount = (updatedStatus?.violations_count || 0) + 1;
            const addedScore = req.body.risk_score !== undefined && !isNaN(parseInt(req.body.risk_score)) ? parseInt(req.body.risk_score) : 10;
            const currentScore = updatedStatus?.live_risk_score ? parseInt(updatedStatus.live_risk_score) : 0;
            const newRiskScore = Math.min(100, currentScore + addedScore);

            await proctorModel.updateStatus({
                student_id: req.userId,
                exam_id: examId,
                status: 'flagged',
                violations_count: warningCount,
                violation_type,
                live_risk_score: newRiskScore
            });

            if (req.app.get('io')) {
                req.app.get('io').emit('violation-flagged', {
                    studentId: req.userId,
                    studentName: req.userFullName,
                    examId,
                    violationType: violation_type,
                    confidence: confidence || 1.0,
                    riskScore: newRiskScore,
                    details,
                    timestamp: new Date().toISOString()
                });
            }

            return res.json({
                success: true,
                incidentId,
                warningCount,
                liveRiskScore: newRiskScore,
                timestamp: new Date().toISOString()
            });
        } catch (err) { next(err); }
    },

    getSecurityStatus: async (req, res, next) => {
        try {
            const examId = parseInt(req.query.exam_id);
            const status = await proctorModel.getStatus(req.userId, examId);
            return res.json({
                active: !!status,
                warnings: status?.violations_count || 0,
                flagged: status?.status === 'flagged',
                status: status?.status || 'inactive',
                violation_type: status?.violation_type || null,
                live_risk_score: status?.live_risk_score || 0,
                identity_verified: !!status?.identity_verified,
                last_update: status?.last_violation_time || null,
                timestamp: new Date().toISOString()
            });
        } catch (err) { next(err); }
    },

    getIncidents: async (req, res, next) => {
        try {
            const incidents = await proctorModel.getIncidentsByExam(parseInt(req.params.exam_id));
            return res.json(incidents);
        } catch (err) { next(err); }
    },

    getSettings: async (req, res, next) => {
        try {
            const rawSettings = await proctorModel.getSettings().catch(() => ({}));
            const merged = {
                ...DEFAULT_AI_SETTINGS,
                ...(rawSettings || {}),
                risk_weights: {
                    ...DEFAULT_AI_SETTINGS.risk_weights,
                    ...((rawSettings && rawSettings.risk_weights && typeof rawSettings.risk_weights === 'object') ? rawSettings.risk_weights : {})
                }
            };
            return res.json(merged);
        } catch (err) {
            console.error('[proctorController.getSettings Warning]:', err.message);
            return res.json(DEFAULT_AI_SETTINGS);
        }
    },

    updateSettings: async (req, res, next) => {
        try {
            const settingsObj = req.body;
            if (!settingsObj || typeof settingsObj !== 'object') {
                return res.status(400).json({ error: 'Invalid settings payload' });
            }

            // Server-side Input Validation
            const errors = [];
            if (settingsObj.max_warnings !== undefined && (parseInt(settingsObj.max_warnings) < 1 || parseInt(settingsObj.max_warnings) > 20)) {
                errors.push('Max warnings must be between 1 and 20');
            }
            if (settingsObj.face_timeout_seconds !== undefined && parseFloat(settingsObj.face_timeout_seconds) <= 0) {
                errors.push('Face timeout must be greater than 0 seconds');
            }
            if (settingsObj.eye_gaze_max_duration_sec !== undefined && parseFloat(settingsObj.eye_gaze_max_duration_sec) <= 0) {
                errors.push('Maximum gaze-away duration must be greater than 0 seconds');
            }
            if (settingsObj.eye_blink_duration_thresh_sec !== undefined && parseFloat(settingsObj.eye_blink_duration_thresh_sec) <= 0) {
                errors.push('Eye blink/closure duration threshold must be greater than 0 seconds');
            }
            if (settingsObj.head_yaw_threshold_deg !== undefined && (parseFloat(settingsObj.head_yaw_threshold_deg) < 5 || parseFloat(settingsObj.head_yaw_threshold_deg) > 90)) {
                errors.push('Head yaw angle threshold must be between 5° and 90°');
            }
            if (settingsObj.head_pitch_threshold_deg !== undefined && (parseFloat(settingsObj.head_pitch_threshold_deg) < 5 || parseFloat(settingsObj.head_pitch_threshold_deg) > 90)) {
                errors.push('Head pitch angle threshold must be between 5° and 90°');
            }
            if (settingsObj.phone_confidence_threshold !== undefined) {
                let conf = parseFloat(settingsObj.phone_confidence_threshold);
                if (conf > 1.0) conf = conf / 100; // Normalize percentage inputs e.g. 80 -> 0.80
                if (conf < 0.05 || conf > 1.0) {
                    errors.push('Phone confidence threshold must be between 5% and 100% (0.05 to 1.0)');
                } else {
                    settingsObj.phone_confidence_threshold = conf;
                }
            }

            if (errors.length > 0) {
                return res.status(400).json({ error: errors.join('; '), validationErrors: errors });
            }

            // Attach Metadata
            settingsObj.updated_at = new Date().toISOString();
            settingsObj.updated_by = req.userFullName || req.username || 'Admin';

            await proctorModel.updateSettings(settingsObj);
            const latest = await proctorModel.getSettings();
            return res.json({
                success: true,
                message: 'AI Proctoring Configuration saved successfully and active!',
                settings: latest
            });
        } catch (err) { next(err); }
    },

    getReportData: async (req, res, next) => {
        try {
            const resultId = parseInt(req.params.result_id);
            const report = await proctorModel.getProctoringReportData(resultId);
            if (!report) return res.status(404).json({ error: 'Report not found' });
            return res.json(report);
        } catch (err) { next(err); }
    },

    generateReportPDF: async (req, res, next) => {
        try {
            const resultId = parseInt(req.params.result_id);
            const reportData = await proctorModel.getProctoringReportData(resultId);
            if (!reportData) return res.status(404).json({ error: 'Report data not found' });

            const { result, incidents, proctorStatus } = reportData;
            const riskScore = proctorStatus.live_risk_score || 0;

            let riskCategory = 'LOW';
            let categoryColor = '#10B981';
            let recommendation = 'PASS - High Examination Integrity';

            if (riskScore >= 76) {
                riskCategory = 'CRITICAL'; categoryColor = '#EF4444';
                recommendation = 'DISQUALIFIED - Critical Security Violations Detected';
            } else if (riskScore >= 51) {
                riskCategory = 'HIGH'; categoryColor = '#F97316';
                recommendation = 'FLAGGED FOR MANUAL REVIEW - High Violation Activity';
            } else if (riskScore >= 26) {
                riskCategory = 'MODERATE'; categoryColor = '#F59E0B';
                recommendation = 'PASS WITH WARNINGS - Moderate Incident Activity';
            }

            const doc = new PDFDocument({ margin: 40, size: 'A4' });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="AI_Proctor_Report_${result.usn || result.username}_${resultId}.pdf"`);

            doc.pipe(res);

            // Document Header
            doc.rect(0, 0, doc.page.width, 80).fill('#0F172A');
            doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold').text('AGMR COLLEGE OF ENGINEERING', 40, 20);
            doc.fontSize(10).font('Helvetica').text('AI Proctoring & Examination Integrity Audit Report', 40, 45);
            doc.fontSize(9).fillColor('#94A3B8').text(`Report ID: PR-${resultId}-${Date.now().toString().slice(-6)}`, doc.page.width - 200, 45, { align: 'right' });

            doc.moveDown(4);

            // Summary Card Box
            doc.rect(40, 100, doc.page.width - 80, 100).fillAndStroke('#F8FAFC', '#E2E8F0');
            doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('EXAMINATION & CANDIDATE DETAILS', 55, 112);

            doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569');
            doc.text('Student Name:', 55, 135); doc.font('Helvetica').fillColor('#0F172A').text(result.student_name || result.username, 140, 135);
            doc.font('Helvetica-Bold').fillColor('#475569').text('USN:', 55, 153); doc.font('Helvetica').fillColor('#0F172A').text(result.usn || 'N/A', 140, 153);
            doc.font('Helvetica-Bold').fillColor('#475569').text('Exam Title:', 55, 171); doc.font('Helvetica').fillColor('#0F172A').text(result.exam_name, 140, 171);

            doc.font('Helvetica-Bold').fillColor('#475569').text('Subject:', 320, 135); doc.font('Helvetica').fillColor('#0F172A').text(result.subject_name || 'General', 390, 135);
            doc.font('Helvetica-Bold').fillColor('#475569').text('Score:', 320, 153); doc.font('Helvetica').fillColor('#0F172A').text(`${result.score} / ${result.exam_total_marks}`, 390, 153);
            doc.font('Helvetica-Bold').fillColor('#475569').text('Date:', 320, 171); doc.font('Helvetica').fillColor('#0F172A').text(new Date(result.completed_at).toLocaleString(), 390, 171);

            // Risk Score Dial & Status
            doc.rect(40, 215, doc.page.width - 80, 60).fillAndStroke('#0F172A', '#1E293B');
            doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text('AI INTEGRITY AUDIT SCORE:', 55, 230);
            doc.fontSize(18).fillColor(categoryColor).text(`${riskScore} / 100 (${riskCategory})`, 240, 226);

            doc.fontSize(10).font('Helvetica-Bold').fillColor('#94A3B8').text('RECOMMENDATION:', 55, 252);
            doc.fontSize(10).font('Helvetica-Bold').fillColor(categoryColor).text(recommendation, 180, 252);

            // Incidents Timeline Header
            doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text(`INCIDENT TIMELINE (${incidents.length} EVENTS LOGGED)`, 40, 295);

            let y = 320;
            if (incidents.length === 0) {
                doc.fontSize(10).font('Helvetica').fillColor('#10B981').text('✓ Zero security violations or suspicious behavior detected during examination.', 40, y);
                y += 30;
            } else {
                // Table Header
                doc.rect(40, y, doc.page.width - 80, 20).fill('#E2E8F0');
                doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold');
                doc.text('TIME', 48, y + 5);
                doc.text('VIOLATION TYPE', 140, y + 5);
                doc.text('CONFIDENCE', 300, y + 5);
                doc.text('RISK IMPACT', 420, y + 5);
                y += 24;

                incidents.forEach((inc, idx) => {
                    if (y > 700) {
                        doc.addPage();
                        y = 40;
                    }
                    doc.rect(40, y, doc.page.width - 80, 22).fillAndStroke(idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC', '#CBD5E1');
                    doc.fontSize(8).font('Helvetica').fillColor('#475569');
                    doc.text(new Date(inc.timestamp).toLocaleTimeString(), 48, y + 6);
                    doc.font('Helvetica-Bold').fillColor('#0F172A').text(inc.type, 140, y + 6);
                    doc.font('Helvetica').fillColor('#475569').text(`${Math.round((inc.confidence || 1.0) * 100)}%`, 300, y + 6);
                    doc.font('Helvetica-Bold').fillColor('#EF4444').text(`+${inc.risk_score || 10} pts`, 420, y + 6);
                    y += 24;
                });
            }

            // Embedded Evidence Screenshots Section
            const screenshotIncidents = incidents.filter(i => i.image_url && i.image_url.startsWith('data:image'));
            if (screenshotIncidents.length > 0) {
                doc.addPage();
                doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('EVIDENCE SNAPSHOTS CAPTURED', 40, 40);

                let imgY = 65;
                screenshotIncidents.slice(0, 4).forEach((inc, idx) => {
                    try {
                        const base64Data = inc.image_url.replace(/^data:image\/\w+;base64,/, '');
                        const imgBuffer = Buffer.from(base64Data, 'base64');

                        const col = idx % 2;
                        const row = Math.floor(idx / 2);
                        const imgX = 40 + col * 260;
                        const currY = imgY + row * 220;

                        doc.rect(imgX, currY, 240, 190).fillAndStroke('#F8FAFC', '#CBD5E1');
                        doc.image(imgBuffer, imgX + 10, currY + 10, { width: 220, height: 140 });
                        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0F172A').text(`Incident: ${inc.type}`, imgX + 10, currY + 158);
                        doc.fontSize(8).font('Helvetica').fillColor('#64748B').text(`Time: ${new Date(inc.timestamp).toLocaleTimeString()} | Conf: ${Math.round((inc.confidence || 1) * 100)}%`, imgX + 10, currY + 172);
                    } catch (_) {}
                });
            }

            // Footer Signatures
            doc.fontSize(8).font('Helvetica').fillColor('#94A3B8').text('Official AI Proctoring Integrity Audit — AGMR College Examination Authority', 40, doc.page.height - 30, { align: 'center' });

            doc.end();
        } catch (err) { next(err); }
    }
};

module.exports = proctorController;
