<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Exam.aspx.cs" Inherits="Exam" %>
<!DOCTYPE html>
<html>
<head>
    <title>Active Examination — AGMR College</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
    <script type="text/javascript">
        // =============================================
        // ANTI-CHEAT: Prevent Back Button
        // =============================================
        window.history.pushState(null, "", window.location.href);
        window.onpopstate = function () {
            window.history.pushState(null, "", window.location.href);
        };

        // =============================================
        // TIMER
        // =============================================
        let timeLeft = 60;
        let timerId;
        let isSafeExit = false;

        function startTimer() {
            timerId = setInterval(function () {
                timeLeft--;
                let mins = Math.floor(timeLeft / 60);
                let secs = timeLeft % 60;
                document.getElementById('timerDisplay').innerText =
                    "Time Remaining: " + (mins > 0 ? mins + "m " : "") + secs + "s";

                if (timeLeft <= 10) {
                    document.getElementById('timerDisplay').className = "text-warning fw-bold fs-4 animate-pulse";
                }

                if (timeLeft <= 0) {
                    clearInterval(timerId);
                    isSafeExit = true;
                    alert("⏰ Time is up! Your exam will be submitted automatically.");
                    document.getElementById('<%= btnSubmit.ClientID %>').click();
                }
            }, 1000);
        }

        function onExplicitSubmit() {
            isSafeExit = true;
        }

        // =============================================
        // PROCTORING: Tab Switching Detection
        // =============================================
        let warningCount = 0;
        const MAX_WARNINGS = 3;

        document.addEventListener('visibilitychange', function () {
            if (document.hidden && !isSafeExit) {
                warningCount++;
                let remaining = MAX_WARNINGS - warningCount;

                if (warningCount >= MAX_WARNINGS) {
                    alert("🚫 VIOLATION: You switched tabs " + MAX_WARNINGS + " times.\nYour exam is being auto-submitted!");
                    isSafeExit = true;
                    document.getElementById('<%= btnSubmit.ClientID %>').click();
                } else {
                    alert("⚠️ WARNING " + warningCount + "/" + MAX_WARNINGS +
                        ": Tab switching detected!\n" + remaining + " warning(s) remaining before auto-submit.");
                }

                updateWarningBar();
            }
        });

        function updateWarningBar() {
            let bar = document.getElementById('warningBar');
            if (bar) {
                bar.style.display = 'block';
                bar.innerText = "⚠️ Warnings: " + warningCount + " / " + MAX_WARNINGS;
                if (warningCount >= 2) {
                    bar.className = "alert alert-danger text-center fw-bold mb-0 py-1";
                }
            }
        }

        // =============================================
        // PROCTORING: Disable Right Click
        // =============================================
        document.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            alert("🚫 Right-click is disabled during the examination.");
            return false;
        });

        // =============================================
        // PROCTORING: Disable Copy / Paste / Cut
        // =============================================
        document.addEventListener('copy', function (e) { e.preventDefault(); });
        document.addEventListener('paste', function (e) { e.preventDefault(); });
        document.addEventListener('cut', function (e) { e.preventDefault(); });

        // =============================================
        // PROCTORING: Disable Keyboard Shortcuts
        // =============================================
        document.addEventListener('keydown', function (e) {
            // Block Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+U (view source), Ctrl+S, Ctrl+P
            if (e.ctrlKey && ['c', 'v', 'a', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
                e.preventDefault();
                return false;
            }
            // Block F12 (DevTools)
            if (e.key === 'F12') {
                e.preventDefault();
                return false;
            }
            // Block Ctrl+Shift+I (DevTools)
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                return false;
            }
            // Block PrintScreen
            if (e.key === 'PrintScreen') {
                e.preventDefault();
                return false;
            }
        });

        // =============================================
        // PROCTORING: Disable Drag
        // =============================================
        document.addEventListener('dragstart', function (e) { e.preventDefault(); });

        // =============================================
        // ANTI-CHEAT: Warn on page unload
        // =============================================
        window.addEventListener('beforeunload', function (e) {
            if (!isSafeExit && timeLeft > 0) {
                e.preventDefault();
                e.returnValue = 'You are in an active exam. Leaving will cancel your progress!';
            }
        });

        window.onload = startTimer;
    </script>
    <style>
        .styled-options input[type="radio"] { margin-right: 8px; transform: scale(1.2); }
        .styled-options label { cursor: pointer; display: inline-block; padding: 4px 0; }
        .animate-pulse { animation: pulse 1s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        body { user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; }
    </style>
</head>
<body class="bg-light">
    <form id="form1" runat="server">
        <nav class="navbar navbar-dark bg-danger sticky-top shadow-sm px-4">
            <span class="navbar-brand fw-bold">🔒 Live Examination — AGMR College</span>
            <span id="timerDisplay" class="text-white fw-bold fs-4">Time Remaining: 60s</span>
        </nav>

        <!-- Warning Bar -->
        <div id="warningBar" class="alert alert-warning text-center fw-bold mb-0 py-1" style="display:none;"></div>

        <div class="container mt-4 pb-5" style="max-width: 800px;">
            <div class="alert alert-info py-2 text-center small">
                <strong>Proctoring Active:</strong> Tab switching, copy/paste, and right-click are monitored. 
                <strong>Max warnings: 3</strong> — after which your exam will be auto-submitted.
            </div>

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
