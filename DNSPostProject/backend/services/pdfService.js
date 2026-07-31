/**
 * PDF Service — PDFKit document generation for result certificates and hall tickets
 */
const PDFDocument = require('pdfkit');

const { getGrade } = require('../utils/grade');

function generateResultPDF(data, res) {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="result_${data.id}.pdf"`);
    doc.pipe(res);

    const sName = data.students?.name || data.students?.username || 'Student';
    const pct = data.total_marks > 0 ? Math.round((data.score / data.total_marks) * 100) : 0;
    const grade = getGrade(pct).grade;

    doc.fontSize(22).font('Helvetica-Bold').text('AGMR College of Engineering', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('(Affiliated to VTU, Approved by AICTE)', { align: 'center' });
    doc.moveDown(0.5); doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke('#4F46E5');
    doc.moveDown(1);
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#4F46E5').text('EXAMINATION RESULT CERTIFICATE', { align: 'center' });
    doc.moveDown(1.5); doc.fillColor('#000');

    const details = [
        ['Student Name', sName], ['USN', data.students?.usn || 'N/A'],
        ['Exam Name', data.exams?.name || 'N/A'], ['Subject', data.exams?.subjects?.subject_name || 'General'],
        ['Score', `${data.score} / ${data.total_marks}`], ['Percentage', `${pct}%`],
        ['Grade', grade], ['Status', pct >= 40 ? 'PASS' : 'FAIL'],
        ['Date', new Date(data.exam_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })]
    ];
    let y = doc.y;
    details.forEach(([label, value]) => {
        doc.fontSize(12).font('Helvetica-Bold').text(label + ':', 80, y, { width: 150 });
        doc.fontSize(12).font('Helvetica').text(String(value), 250, y); y += 28;
    });
    doc.moveDown(3); doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke('#ccc');
    doc.moveDown(1);
    doc.fontSize(9).fillColor('#666').text('Computer-generated document. No signature required.', { align: 'center' });
    doc.fontSize(9).text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
    doc.end();
}

function generateHallTicketPDF(exam, student, res) {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="hallticket_${exam.id}.pdf"`);
    doc.pipe(res);

    doc.fontSize(22).font('Helvetica-Bold').text('AGMR College of Engineering', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('(Affiliated to VTU, Approved by AICTE)', { align: 'center' });
    doc.moveDown(0.5); doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke('#4F46E5');
    doc.moveDown(1);
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#4F46E5').text('HALL TICKET', { align: 'center' });
    doc.moveDown(1.5); doc.fillColor('#000');

    const subject = exam.subjects?.subject_code ? `${exam.subjects.subject_code} - ${exam.subjects.subject_name}` : (exam.subjects?.subject_name || 'General');
    const details = [
        ['Student Name', student.name || student.username], ['USN', student.usn || 'N/A'],
        ['Subject', subject], ['Exam Name', exam.name || 'Exam'],
        ['Exam Date', exam.exam_date || 'TBA'],
        ['Time', `${exam.start_time || '00:00'} - ${exam.end_time || '23:59'}`],
        ['Duration', `${exam.time_limit} Minutes`]
    ];
    let y = doc.y;
    details.forEach(([label, value]) => {
        doc.fontSize(12).font('Helvetica-Bold').text(label + ':', 80, y, { width: 150 });
        doc.fontSize(12).font('Helvetica').text(String(value), 260, y); y += 28;
    });
    doc.moveDown(4);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#4F46E5').text('Instructions:', 80);
    doc.fillColor('#000').fontSize(10).font('Helvetica');
    ['1. Carry this hall ticket.', '2. Webcam & Mic must be enabled.', '3. Tab switching triggers security warnings.',
        '4. Max 3 warnings before auto-submit.', '5. No external resources allowed.'].forEach(i => { doc.text(i, 90); doc.moveDown(0.3); });
    doc.moveDown(2); doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke('#ccc');
    doc.moveDown(1);
    doc.fontSize(9).fillColor('#666').text('Computer-generated hall ticket.', { align: 'center' });
    doc.end();
}

module.exports = { generateResultPDF, generateHallTicketPDF };
