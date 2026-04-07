<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Exam.aspx.cs" Inherits="Exam" %>
<!DOCTYPE html>
<html>
<head>
    <title>Active Examination</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
    <script type="text/javascript">
        // ANTI-CHEAT: Prevent Back Button
        window.history.pushState(null, "", window.location.href);
        window.onpopstate = function () {
            window.history.pushState(null, "", window.location.href);
        };

        let timeLeft = 60; // Global Timer Setting
        let timerId;
        let isSafeExit = false;

        function startTimer() {
            timerId = setInterval(function () {
                timeLeft--;
                document.getElementById('timerDisplay').innerText = "Time Remaining: " + timeLeft + "s";
                
                if(timeLeft <= 10) document.getElementById('timerDisplay').className = "text-warning fw-bold fs-4";
                
                if (timeLeft <= 0) {
                    clearInterval(timerId);
                    isSafeExit = true;
                    document.getElementById('<%= btnSubmit.ClientID %>').click();
                }
            }, 1000);
        }

        // Allow graceful submission on click
        function onExplicitSubmit() {
            isSafeExit = true;
        }

        // ANTI-CHEAT: Warn & Prevent immediate refresh/closing
        window.addEventListener('beforeunload', function (e) {
            if (!isSafeExit && timeLeft > 0) {
                e.preventDefault();
                e.returnValue = 'You are in an active exam. Reloading will cancel your progress!';
            }
        });

        window.onload = startTimer;
    </script>
    <style>
        .styled-options input[type="radio"] { margin-right: 8px; transform: scale(1.2); }
        .styled-options label { cursor: pointer; display: inline-block; padding: 4px 0; }
    </style>
</head>
<body class="bg-light user-select-none"> <!-- Prevent text copying -->
    <form id="form1" runat="server">
        <nav class="navbar navbar-dark bg-danger sticky-top shadow-sm px-4">
            <span class="navbar-brand fw-bold">Live Examination</span>
            <span id="timerDisplay" class="text-white fw-bold fs-4">Time Remaining: 60s</span>
        </nav>

        <div class="container mt-4 pb-5" style="max-width: 800px;">
            <asp:Repeater ID="rptQuestions" runat="server">
                <ItemTemplate>
                    <div class="card mb-3 shadow-sm border-0">
                        <div class="card-header bg-white fs-5 fw-bold border-bottom-0 pt-4 px-4">
                            <%# Container.ItemIndex + 1 %>. <%# Eval("QuestionText") %>
                            <asp:HiddenField ID="hfQuestionId" runat="server" Value='<%# Eval("Id") %>' />
                        </div>
                        <div class="card-body px-4 pb-4">
                            <asp:RadioButtonList ID="rblOptions" runat="server" CssClass="styled-options">
                                <asp:ListItem Value="A" Text='<%# Eval("OptionA") %>'></asp:ListItem>
                                <asp:ListItem Value="B" Text='<%# Eval("OptionB") %>'></asp:ListItem>
                                <asp:ListItem Value="C" Text='<%# Eval("OptionC") %>'></asp:ListItem>
                                <asp:ListItem Value="D" Text='<%# Eval("OptionD") %>'></asp:ListItem>
                            </asp:RadioButtonList>
                        </div>
                    </div>
                </ItemTemplate>
            </asp:Repeater>
            
            <div class="text-center mt-5">
                <asp:Button ID="btnSubmit" runat="server" Text="Submit and Finish" CssClass="btn btn-primary btn-lg px-5 shadow fw-bold" OnClientClick="onExplicitSubmit();" OnClick="btnSubmit_Click" />
            </div>
        </div>
    </form>
</body>
</html>
