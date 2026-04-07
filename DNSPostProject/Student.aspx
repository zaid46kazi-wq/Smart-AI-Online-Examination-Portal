<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Student.aspx.cs" Inherits="Student" %>
<!DOCTYPE html>
<html>
<head>
    <title>Student Dashboard — AGMR College</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
    <!-- jsPDF for client-side PDF generation (no server install needed) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

    <script type="text/javascript">
        function downloadHallTicket() {
            var { jsPDF } = window.jspdf;
            var doc = new jsPDF();

            var username = '<%= Session["Username"] != null ? Session["Username"].ToString() : "Student" %>';
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
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(47, 86, 200);
            doc.text('HALL TICKET', 105, 50, { align: 'center' });

            // Details
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            var y = 70;
            var details = [
                ['Student Name', username],
                ['Exam Name', 'Online Examination'],
                ['Subject', 'General Studies'],
                ['Date', today],
                ['Time', 'As Scheduled'],
                ['Duration', '60 Seconds (Timed Test)']
            ];

            details.forEach(function (row) {
                doc.setFont('helvetica', 'bold');
                doc.text(row[0] + ':', 40, y);
                doc.setFont('helvetica', 'normal');
                doc.text(row[1], 110, y);
                y += 12;
            });

            // Instructions
            y += 10;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(47, 86, 200);
            doc.text('Instructions:', 40, y);
            y += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            var instructions = [
                '1. Carry this hall ticket during the examination.',
                '2. Tab switching is monitored — max 3 warnings before auto-submit.',
                '3. Right-click and copy/paste are disabled.',
                '4. No external resources are permitted.',
                '5. Ensure a stable internet connection.'
            ];
            instructions.forEach(function (inst) {
                doc.text(inst, 45, y);
                y += 7;
            });

            // Footer line
            doc.setDrawColor(200, 200, 200);
            doc.line(20, y + 10, 190, y + 10);

            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text('Computer-generated hall ticket. Developer: Sayed Zaid Kazi', 105, y + 18, { align: 'center' });

            doc.save('HallTicket_' + username + '.pdf');
        }
    </script>
</head>
<body class="bg-light">
    <form id="form1" runat="server">
        <nav class="navbar navbar-dark bg-primary mb-4 shadow-sm">
            <div class="container d-flex justify-content-between">
                <span class="navbar-brand fw-bold">Student Portal — AGMR College</span>
                <div>
                     <span class="text-white me-3 fw-bold">Welcome, <%= Session["Username"] %></span>
                     <asp:Button ID="btnLogout" runat="server" Text="Logout" CssClass="btn btn-outline-light btn-sm" OnClick="btnLogout_Click" />
                </div>
            </div>
        </nav>
        <div class="container text-center">
            
            <div class="card mx-auto shadow-sm border-0 mb-4" style="max-width: 500px;">
                <div class="card-body p-5">
                    <h4 class="card-title fw-bold">Start Your Test</h4>
                    <p class="text-muted mt-3">You will be given exactly <strong>60 seconds</strong> to finish. Anti-cheat measures are active (tab switching detection, auto-submit on violation).</p>
                    <asp:Button ID="btnStartExam" runat="server" Text="▶ Begin Examination" CssClass="btn btn-success btn-lg w-100 mt-3 shadow" OnClick="btnStartExam_Click" />
                    <button type="button" onclick="downloadHallTicket();" class="btn btn-outline-primary w-100 mt-2">
                        📄 Download Hall Ticket
                    </button>
                </div>
            </div>

            <!-- Leaderboard -->
            <div class="card mx-auto shadow-sm border-0" style="max-width: 500px;">
                <div class="card-header bg-dark text-white fw-bold">🏆 Global Leaderboard (Top 5)</div>
                <div class="card-body p-0">
                    <asp:GridView ID="gvLeaderboard" runat="server" CssClass="table table-striped mb-0 text-center" AutoGenerateColumns="False" GridLines="None">
                        <Columns>
                            <asp:BoundField DataField="Username" HeaderText="Student" />
                            <asp:BoundField DataField="Score" HeaderText="Best Score" />
                        </Columns>
                    </asp:GridView>
                </div>
            </div>
        </div>
    </form>
</body>
</html>
