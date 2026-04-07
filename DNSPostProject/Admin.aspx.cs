using System;
using System.Data;
using System.Data.SqlClient;
using System.Configuration;
using System.Web.UI.WebControls;

public partial class Admin : System.Web.UI.Page
{
    string connStr = ConfigurationManager.ConnectionStrings["ExamDB"].ConnectionString;

    protected void Page_Load(object sender, EventArgs e)
    {
        if (Session["Role"] == null || Session["Role"].ToString() != "Admin")
        {
            Response.Redirect("Default.aspx", false);
            Context.ApplicationInstance.CompleteRequest();
            return;
        }

        if (!IsPostBack)
        {
            LoadQuestions();
            LoadResults();
            LoadSubjects();
        }
    }

    // =============================================
    // LOAD QUESTIONS
    // =============================================
    private void LoadQuestions()
    {
        try
        {
            using (SqlConnection con = new SqlConnection(connStr))
            {
                SqlDataAdapter da = new SqlDataAdapter("SELECT Id, QuestionText, CorrectOption FROM Questions", con);
                DataTable dt = new DataTable();
                da.Fill(dt);
                gvQuestions.DataSource = dt;
                gvQuestions.DataBind();
            }
        }
        catch (Exception ex)
        {
            lblMsg.Text = "Error loading questions: " + ex.Message;
        }
    }

    // =============================================
    // LOAD RESULTS
    // =============================================
    private void LoadResults()
    {
        try
        {
            using (SqlConnection con = new SqlConnection(connStr))
            {
                SqlDataAdapter da = new SqlDataAdapter("SELECT Username, Score, ExamDate FROM Results ORDER BY Score DESC, ExamDate DESC", con);
                DataTable dt = new DataTable();
                da.Fill(dt);
                gvResults.DataSource = dt;
                gvResults.DataBind();
            }
        }
        catch (Exception ex)
        {
            lblMsg.Text += "<br/>Error loading results: " + ex.Message;
        }
    }

    // =============================================
    // LOAD SUBJECTS
    // =============================================
    private void LoadSubjects()
    {
        try
        {
            using (SqlConnection con = new SqlConnection(connStr))
            {
                // Try loading subjects; table may not exist yet
                SqlDataAdapter da = new SqlDataAdapter("SELECT Id, SubjectName, SubjectCode FROM Subjects ORDER BY Id DESC", con);
                DataTable dt = new DataTable();
                da.Fill(dt);
                gvSubjects.DataSource = dt;
                gvSubjects.DataBind();
            }
        }
        catch (Exception ex)
        {
            // If table doesn't exist, create it
            if (ex.Message.Contains("Invalid object name") || ex.Message.Contains("Subjects"))
            {
                CreateSubjectsTable();
            }
            else
            {
                System.Diagnostics.Debug.WriteLine("LoadSubjects error: " + ex.Message);
            }
        }
    }

    // =============================================
    // CREATE SUBJECTS TABLE (Auto-Create if Missing)
    // =============================================
    private void CreateSubjectsTable()
    {
        try
        {
            using (SqlConnection con = new SqlConnection(connStr))
            {
                string createTable = @"
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Subjects')
                    BEGIN
                        CREATE TABLE Subjects (
                            Id INT IDENTITY(1,1) PRIMARY KEY,
                            SubjectName NVARCHAR(200) NOT NULL,
                            SubjectCode NVARCHAR(50) NULL,
                            CreatedAt DATETIME DEFAULT GETDATE()
                        )
                    END";
                using (SqlCommand cmd = new SqlCommand(createTable, con))
                {
                    con.Open();
                    cmd.ExecuteNonQuery();
                }
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine("Create Subjects table error: " + ex.Message);
        }
    }

    // =============================================
    // ADD QUESTION
    // =============================================
    protected void btnAdd_Click(object sender, EventArgs e)
    {
        try
        {
            using (SqlConnection con = new SqlConnection(connStr))
            {
                string qry = "INSERT INTO Questions (QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption) VALUES (@q, @a, @b, @c, @d, @corr)";
                using (SqlCommand cmd = new SqlCommand(qry, con))
                {
                    cmd.Parameters.AddWithValue("@q", txtQuestion.Text.Trim());
                    cmd.Parameters.AddWithValue("@a", txtOpA.Text.Trim());
                    cmd.Parameters.AddWithValue("@b", txtOpB.Text.Trim());
                    cmd.Parameters.AddWithValue("@c", txtOpC.Text.Trim());
                    cmd.Parameters.AddWithValue("@d", txtOpD.Text.Trim());
                    cmd.Parameters.AddWithValue("@corr", ddlCorrect.SelectedValue);
                    con.Open();
                    cmd.ExecuteNonQuery();
                }
            }
            lblMsg.Text = "✅ Question added successfully!";
            lblMsg.CssClass = "text-success fw-bold d-block mb-3 fs-5";
            LoadQuestions();
            txtQuestion.Text = txtOpA.Text = txtOpB.Text = txtOpC.Text = txtOpD.Text = string.Empty;
        }
        catch (Exception ex)
        {
            lblMsg.Text = "Error adding question: " + ex.Message;
            lblMsg.CssClass = "text-danger fw-bold d-block mb-3 fs-5";
        }
    }

    // =============================================
    // ADD SUBJECT (FEATURE 4: Text Input)
    // =============================================
    protected void btnAddSubject_Click(object sender, EventArgs e)
    {
        try
        {
            string subjectName = txtSubjectName.Text.Trim();
            string subjectCode = txtSubjectCode.Text.Trim();

            if (string.IsNullOrEmpty(subjectName))
            {
                lblMsg.Text = "⚠️ Please type a subject name.";
                lblMsg.CssClass = "text-warning fw-bold d-block mb-3 fs-5";
                return;
            }

            // Auto-create table if it doesn't exist
            CreateSubjectsTable();

            using (SqlConnection con = new SqlConnection(connStr))
            {
                string qry = "INSERT INTO Subjects (SubjectName, SubjectCode) VALUES (@name, @code)";
                using (SqlCommand cmd = new SqlCommand(qry, con))
                {
                    cmd.Parameters.AddWithValue("@name", subjectName);
                    cmd.Parameters.AddWithValue("@code", string.IsNullOrEmpty(subjectCode) ? (object)DBNull.Value : subjectCode);
                    con.Open();
                    cmd.ExecuteNonQuery();
                }
            }
            lblMsg.Text = "✅ Subject '" + subjectName + "' added successfully!";
            lblMsg.CssClass = "text-success fw-bold d-block mb-3 fs-5";
            LoadSubjects();
            txtSubjectName.Text = string.Empty;
            txtSubjectCode.Text = string.Empty;
        }
        catch (Exception ex)
        {
            lblMsg.Text = "Error adding subject: " + ex.Message;
            lblMsg.CssClass = "text-danger fw-bold d-block mb-3 fs-5";
        }
    }

    // =============================================
    // DELETE QUESTION
    // =============================================
    protected void gvQuestions_RowDeleting(object sender, GridViewDeleteEventArgs e)
    {
        int id = Convert.ToInt32(gvQuestions.DataKeys[e.RowIndex].Value);
        try
        {
            using (SqlConnection con = new SqlConnection(connStr))
            {
                using (SqlCommand cmd = new SqlCommand("DELETE FROM Questions WHERE Id=@id", con))
                {
                    cmd.Parameters.AddWithValue("@id", id);
                    con.Open();
                    cmd.ExecuteNonQuery();
                }
            }
            lblMsg.Text = "✅ Question deleted successfully!";
            LoadQuestions();
        }
        catch (Exception ex)
        {
            lblMsg.Text = "Error deleting question: " + ex.Message;
        }
    }

    // =============================================
    // LOGOUT
    // =============================================
    protected void btnLogout_Click(object sender, EventArgs e)
    {
        Session.Clear();
        Response.Redirect("Default.aspx", false);
        Context.ApplicationInstance.CompleteRequest();
    }
}
