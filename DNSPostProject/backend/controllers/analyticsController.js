/**
 * Analytics Controller — Instructor Dashboard Statistics
 */
const { query, queryOne } = require('../config/db');

const analyticsController = {
    getOverview: async (req, res, next) => {
        try {
            const studentCountRes = await queryOne(`SELECT COUNT(*) AS totalStudents FROM students WHERE role = 'Student'`);
            const examCountRes = await queryOne(`SELECT COUNT(*) AS totalExams FROM exams`);
            const resultsRes = await query(`SELECT score, total_marks FROM results`);
            const warningCountRes = await queryOne(`SELECT COUNT(*) AS totalWarnings FROM warnings`);

            const scores = resultsRes.map(r => r.score);
            const percentages = resultsRes.map(r => r.total_marks > 0 ? Math.round((r.score / r.total_marks) * 100) : 0);

            const distribution = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
            percentages.forEach(p => {
                if (p <= 20) distribution['0-20']++;
                else if (p <= 40) distribution['21-40']++;
                else if (p <= 60) distribution['41-60']++;
                else if (p <= 80) distribution['61-80']++;
                else distribution['81-100']++;
            });

            const passCount = percentages.filter(p => p >= 40).length;

            return res.json({
                totalStudents: studentCountRes?.totalStudents || 0,
                totalExams: examCountRes?.totalExams || 0,
                avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
                highestScore: scores.length > 0 ? Math.max(...scores) : 0,
                lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
                totalResults: scores.length,
                passPercentage: scores.length > 0 ? Math.round((passCount / scores.length) * 100) : 0,
                totalWarnings: warningCountRes?.totalWarnings || 0,
                distribution
            });
        } catch (err) { next(err); }
    }
};

module.exports = analyticsController;
