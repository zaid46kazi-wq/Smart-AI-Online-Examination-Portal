<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Admin.aspx.cs" Inherits="Admin" %>
<!DOCTYPE html>
<html>
<head>
    <title>Admin Dashboard — AGMR College</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
</head>
<body class="bg-light">
    <form id="form1" runat="server">
        <nav class="navbar navbar-dark bg-dark mb-4 shadow-sm">
            <div class="container">
                <span class="navbar-brand fw-bold">Admin Workspace — AGMR College</span>
                <asp:Button ID="btnLogout" runat="server" Text="Logout" CssClass="btn btn-danger btn-sm" OnClick="btnLogout_Click" />
            </div>
        </nav>
        <div class="container pb-5">
            <asp:Label ID="lblMsg" runat="server" CssClass="text-success fw-bold d-block mb-3 fs-5"></asp:Label>
            
            <div class="row">
                <div class="col-md-4">
                    <!-- Add Question Card -->
                    <div class="card mb-4 shadow-sm">
                        <div class="card-header bg-primary text-white fw-bold">Add Question</div>
                        <div class="card-body">
                            <asp:TextBox ID="txtQuestion" runat="server" CssClass="form-control mb-2" placeholder="Question Text" TextMode="MultiLine" required="required"></asp:TextBox>
                            <asp:TextBox ID="txtOpA" runat="server" CssClass="form-control mb-2" placeholder="Option A" required="required"></asp:TextBox>
                            <asp:TextBox ID="txtOpB" runat="server" CssClass="form-control mb-2" placeholder="Option B" required="required"></asp:TextBox>
                            <asp:TextBox ID="txtOpC" runat="server" CssClass="form-control mb-2" placeholder="Option C" required="required"></asp:TextBox>
                            <asp:TextBox ID="txtOpD" runat="server" CssClass="form-control mb-3" placeholder="Option D" required="required"></asp:TextBox>
                            <label class="form-label text-muted small">Correct Option</label>
                            <asp:DropDownList ID="ddlCorrect" runat="server" CssClass="form-select mb-3">
                                <asp:ListItem Value="A">Option A</asp:ListItem>
                                <asp:ListItem Value="B">Option B</asp:ListItem>
                                <asp:ListItem Value="C">Option C</asp:ListItem>
                                <asp:ListItem Value="D">Option D</asp:ListItem>
                            </asp:DropDownList>
                            <asp:Button ID="btnAdd" runat="server" Text="Save Question" CssClass="btn btn-primary w-100 fw-bold" OnClick="btnAdd_Click" />
                        </div>
                    </div>

                    <!-- Add Subject Card (FEATURE 4: Text Input) -->
                    <div class="card mb-4 shadow-sm">
                        <div class="card-header bg-info text-white fw-bold">Add Subject</div>
                        <div class="card-body">
                            <asp:TextBox ID="txtSubjectName" runat="server" CssClass="form-control mb-2" placeholder="Type subject name (e.g., Cloud Computing)" required="required"></asp:TextBox>
                            <asp:TextBox ID="txtSubjectCode" runat="server" CssClass="form-control mb-3" placeholder="Subject Code (e.g., 18CS71)"></asp:TextBox>
                            <asp:Button ID="btnAddSubject" runat="server" Text="Save Subject" CssClass="btn btn-info w-100 fw-bold text-white" OnClick="btnAddSubject_Click" />
                        </div>
                    </div>
                </div>
                <div class="col-md-8">
                    <!-- Questions Grid -->
                    <div class="card mb-4 shadow-sm">
                        <div class="card-header bg-secondary text-white fw-bold">Manage All Questions</div>
                        <div class="card-body p-0" style="max-height: 400px; overflow-y: auto;">
                            <asp:GridView ID="gvQuestions" runat="server" CssClass="table table-striped table-hover mb-0" AutoGenerateColumns="False" DataKeyNames="Id" OnRowDeleting="gvQuestions_RowDeleting" GridLines="None">
                                <Columns>
                                    <asp:BoundField DataField="Id" HeaderText="ID" ItemStyle-Width="5%" />
                                    <asp:BoundField DataField="QuestionText" HeaderText="Question" />
                                    <asp:BoundField DataField="CorrectOption" HeaderText="Answer" ItemStyle-Width="10%" />
                                    <asp:CommandField ShowDeleteButton="True" ControlStyle-CssClass="btn btn-sm btn-danger" />
                                </Columns>
                            </asp:GridView>
                        </div>
                    </div>

                    <!-- Subjects Grid -->
                    <div class="card mb-4 shadow-sm">
                        <div class="card-header bg-info text-white fw-bold">All Subjects</div>
                        <div class="card-body p-0">
                            <asp:GridView ID="gvSubjects" runat="server" CssClass="table table-striped mb-0" AutoGenerateColumns="False" GridLines="None" EmptyDataText="No subjects added yet.">
                                <Columns>
                                    <asp:BoundField DataField="Id" HeaderText="ID" ItemStyle-Width="10%" />
                                    <asp:BoundField DataField="SubjectName" HeaderText="Subject Name" />
                                    <asp:BoundField DataField="SubjectCode" HeaderText="Code" ItemStyle-Width="20%" />
                                </Columns>
                            </asp:GridView>
                        </div>
                    </div>

                    <!-- Results Grid -->
                    <div class="card shadow-sm">
                        <div class="card-header bg-success text-white fw-bold">Student Exam Results</div>
                        <div class="card-body p-0">
                            <asp:GridView ID="gvResults" runat="server" CssClass="table table-striped mb-0" AutoGenerateColumns="False" GridLines="None">
                                <Columns>
                                    <asp:BoundField DataField="Username" HeaderText="Student" />
                                    <asp:BoundField DataField="Score" HeaderText="Score" />
                                    <asp:BoundField DataField="ExamDate" HeaderText="Completed At" DataFormatString="{0:g}" />
                                </Columns>
                            </asp:GridView>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </form>
</body>
</html>
