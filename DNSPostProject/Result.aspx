<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Result.aspx.cs" Inherits="Result" %>
<!DOCTYPE html>
<html>
<head>
    <title>Exam Result — AGMR College</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
    <!-- jsPDF for client-side PDF generation (no server install needed) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <style>
        .result-card { border-radius: 15px; max-width: 550px; }
        .score-display { font-size: 4rem; font-weight: 800; }
        .pass { color: #198754; }
        .fail { color: #dc3545; }
    </style>

    <script type="text/javascript">
        function downloadResultPDF() {
            var { jsPDF } = window.jspdf;
            var doc = new jsPDF();

            var username = '<%= Session["Username"] != null ? Session["Username"].ToString() : "Student" %>';
            var score = '<%= Session["LastScore"] != null ? Session["LastScore"].ToString() : "0" %>';
            var total = '10';
            var pct = (parseInt(score) / parseInt(total) * 100).toFixed(2);
            var status = parseFloat(pct) >= 40 ? 'PASS' : 'FAIL';
            var today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

            // Header
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(47, 86, 200);
            doc.text('AGMR College of Engineering', 105, 25, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text('(Affiliated to VTU, Approved by AICTE)', 105, 32, { align: 'center' });

            // Line
            doc.setDrawColor(47, 86, 200);
            doc.setLineWidth(0.5);
            doc.line(20, 37, 190, 37);

            // Title
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(47, 86, 200);
            doc.text('EXAMINATION RESULT CERTIFICATE', 105, 50, { align: 'center' });

            // Details
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            var y = 70;
            var details = [
                ['Student Name', username],
                ['Exam Name', 'Online Examination'],
                ['Score', score + ' / ' + total],
                ['Percentage', pct + '%'],
                ['Status', status],
                ['Date', today]
            ];

            details.forEach(function (row) {
                doc.setFont('helvetica', 'bold');
                doc.text(row[0] + ':', 40, y);
                doc.setFont('helvetica', 'normal');
                doc.text(row[1], 100, y);
                y += 12;
            });

            // Footer line
            doc.setDrawColor(200, 200, 200);
            doc.line(20, y + 10, 190, y + 10);

            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text('Computer-generated document. No signature required.', 105, y + 20, { align: 'center' });
            doc.text('Generated: ' + new Date().toLocaleString('en-IN'), 105, y + 26, { align: 'center' });
            doc.text('Developer: Sayed Zaid Kazi', 105, y + 32, { align: 'center' });

            doc.save('ExamResult_' + username + '.pdf');
        }
    </script>
</head>
<body class="bg-light d-flex align-items-center justify-content-center" style="min-height: 100vh;">
    <form id="form1" runat="server">
        <div class="card shadow text-center p-5 result-card mx-auto">
            <h4 class="text-muted mb-0">AGMR College of Engineering</h4>
            <p class="text-muted small">Online Examination System</p>
            <hr />

            <h5 class="fw-bold mb-3">Examination Result</h5>

            <div class="score-display">
                <asp:Label ID="lblScore" runat="server"></asp:Label>
            </div>

            <asp:Label ID="lblPercentage" runat="server" CssClass="fs-4 fw-bold d-block mt-2"></asp:Label>
            <asp:Label ID="lblStatus" runat="server" CssClass="badge fs-6 mt-2 px-4 py-2"></asp:Label>

            <p class="text-muted mt-3">Your score has been saved to the leaderboard.</p>

            <div class="d-flex flex-column gap-2 mt-3">
                <button type="button" onclick="downloadResultPDF();" class="btn btn-success fw-bold py-2">
                    📄 Download Result PDF
                </button>
                <asp:Button ID="btnBack" runat="server" Text="← Back to Dashboard"
                    CssClass="btn btn-primary py-2 fw-bold" OnClick="btnBack_Click" />
            </div>

            <p class="text-muted small mt-4 mb-0">Developer: Sayed Zaid Kazi</p>
        </div>
    </form>
</body>
</html>