<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Default.aspx.cs" Inherits="_Default" %>
<!DOCTYPE html>
<html>
<head>
    <title>Online Exam - Login</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
</head>
<body class="bg-secondary d-flex align-items-center justify-content-center" style="height: 100vh;">
    <form id="form1" runat="server">
        <div class="card shadow p-4" style="width: 25rem; border-radius: 12px;">
            <h3 class="text-center fw-bold mb-4 text-primary">Login Platform</h3>
            <asp:Label ID="lblMsg" runat="server" CssClass="text-danger fw-bold d-block mb-2"></asp:Label>
            
            <div class="mb-3">
                <label class="form-label">Username</label>
                <asp:TextBox ID="txtUsername" runat="server" CssClass="form-control" required="required"></asp:TextBox>
            </div>
            <div class="mb-3">
                <label class="form-label">Password</label>
                <asp:TextBox ID="txtPassword" runat="server" CssClass="form-control" TextMode="Password" required="required"></asp:TextBox>
            </div>
            <div class="mb-4">
                <label class="form-label">Select Role</label>
                <asp:DropDownList ID="ddlRole" runat="server" CssClass="form-select">
                    <asp:ListItem Value="Student">Student</asp:ListItem>
                    <asp:ListItem Value="Admin">Admin</asp:ListItem>
                </asp:DropDownList>
            </div>
            <asp:Button ID="btnLogin" runat="server" Text="Login" CssClass="btn btn-primary w-100 py-2 fw-bold" OnClick="btnLogin_Click" />
            
            <div class="mt-4 p-2 bg-light border rounded text-center text-muted small">
                <strong>Admin Default:</strong> admin / admin123<br />
                <strong>Student Default:</strong> student1 / pass1
            </div>
        </div>
    </form>
</body>
</html>
