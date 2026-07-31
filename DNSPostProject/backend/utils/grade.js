/**
 * Shared Grading Utility
 */
function getGrade(pct) {
    const percentage = Math.max(0, Math.min(100, Math.round(pct)));
    if (percentage >= 90) return { grade: 'A+', color: '#059669', label: 'Outstanding' };
    if (percentage >= 80) return { grade: 'A', color: '#059669', label: 'Excellent' };
    if (percentage >= 70) return { grade: 'B+', color: '#2563EB', label: 'Very Good' };
    if (percentage >= 60) return { grade: 'B', color: '#2563EB', label: 'Good' };
    if (percentage >= 50) return { grade: 'C', color: '#D97706', label: 'Satisfactory' };
    if (percentage >= 40) return { grade: 'D', color: '#EA580C', label: 'Pass' };
    return { grade: 'F', color: '#DC2626', label: 'Fail' };
}

module.exports = { getGrade };
