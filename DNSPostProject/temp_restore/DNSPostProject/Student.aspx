<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Student.aspx.cs" Inherits="Student" %>
<!DOCTYPE html>
<html>
<head>
    <title>Student Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
</head>
<body class="bg-light">
    <form id="form1" runat="server">
        <nav class="navbar navbar-dark bg-primary mb-4 shadow-sm">
            <div class="container d-flex justify-content-between">
                <span class="navbar-brand fw-bold">Student Portal</span>
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
                    <p class="text-muted mt-3">You will be given exactly <strong>60 seconds</strong> to finish. Anti-cheat measures are active (Back button disabled, auto-submit on exit).</p>
                    <asp:Button ID="btnStartExam" runat="server" Text="Begin Examination" CssClass="btn btn-success btn-lg w-100 mt-3 shadow" OnClick="btnStartExam_Click" />
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
