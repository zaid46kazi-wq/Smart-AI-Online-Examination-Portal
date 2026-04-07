<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Result.aspx.cs" Inherits="Result" %>
    <!DOCTYPE html>
    <html>

    <head>
        <title>Exam Result</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
    </head>

    <body class="bg-light d-flex align-items-center justify-content-center" style="height: 100vh;">
        <form id="form1" runat="server">
            <div class="card shadow text-center p-5" style="border-radius: 15px;">
                <h1 class="display-1 text-success fw-bold">
                    <asp:Label ID="lblScore" runat="server"></asp:Label>
                </h1>
                <h3 class="mt-3">Exam Submitted Successfully!</h3>
                <p class="text-muted">Your score has been saved to the leaderboard.</p>
                <asp:Button ID="btnBack" runat="server" Text="Back to Dashboard"
                    CssClass="btn btn-primary mt-4 py-2 px-4 shadow-sm fw-bold" OnClick="btnBack_Click" />
            </div>
        </form>
    </body>

    </html>