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
        }
    }

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
            lblMsg.Text = "Question added successfully!";
            LoadQuestions();
            txtQuestion.Text = txtOpA.Text = txtOpB.Text = txtOpC.Text = txtOpD.Text = string.Empty;
        }
        catch (Exception ex)
        {
            lblMsg.Text = "Error adding question: " + ex.Message;
        }
    }

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
            lblMsg.Text = "Question deleted successfully!";
            LoadQuestions();
        }
        catch (Exception ex)
        {
            lblMsg.Text = "Error deleting question: " + ex.Message;
        }
    }

    protected void btnLogout_Click(object sender, EventArgs e)
    {
        Session.Clear();
        Response.Redirect("Default.aspx", false);
        Context.ApplicationInstance.CompleteRequest();
    }
}
