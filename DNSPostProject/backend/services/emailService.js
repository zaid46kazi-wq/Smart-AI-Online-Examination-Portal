/**
 * Email Service — Nodemailer transporter
 */
const nodemailer = require('nodemailer');

let transporter = null;

try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        console.log('[EMAIL] Transporter initialized');
    }
} catch (e) {
    console.warn('[EMAIL] Setup warning:', e.message);
}

async function sendResultEmail(to, examName, score, totalMarks) {
    if (!transporter || !to) return;
    const percentage = Math.round((score / totalMarks) * 100);
    try {
        await transporter.sendMail({
            from: '"AGMR Exam System" <noreply@agmr.edu>',
            to,
            subject: `Exam Result: ${examName}`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #E2E8F0;border-radius:12px;">
                    <h2 style="color:#4F46E5;">AGMR College Examination System</h2>
                    <p><strong>Exam:</strong> ${examName}</p>
                    <p><strong>Score:</strong> ${score} / ${totalMarks} (${percentage}%)</p>
                    <p><strong>Status:</strong> ${percentage >= 40 ? '✅ PASS' : '❌ FAIL'}</p>
                </div>
            `
        });
    } catch (err) {
        console.error('[EMAIL] Failed to send email:', err.message);
    }
}

module.exports = { transporter, sendResultEmail };
