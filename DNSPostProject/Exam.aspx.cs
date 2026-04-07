using System;
using System.Data;
using System.Data.SqlClient;
using System.Configuration;
using System.Web.UI.WebControls;
using System.Collections.Generic;

public partial class Exam : System.Web.UI.Page
{
    string connStr = ConfigurationManager.ConnectionStrings["ExamDB"].ConnectionString;

    protected void Page_Load(object sender, EventArgs e)
    {
        if (Session["Role"] == null || Session["Role"].ToString() != "Student" || Session["Username"] == null)
        {
            Response.Redirect("Default.aspx", false);
            Context.ApplicationInstance.CompleteRequest();
            return;
        }

        // --- ATTEMPT LIMIT CHECK ---
        try
        {
            string examIdStr = Request.QueryString["id"];
            using (SqlConnection con = new SqlConnection(connStr))
            {
                string uname = Session["Username"].ToString();
                // Check if they have a result for THIS SPECIFIC exam in legacy DB
                string qry = "SELECT COUNT(*) FROM Results WHERE Username = @u";
                if (!string.IsNullOrEmpty(examIdStr)) {
                    qry += " AND ExamID = @eid";
                }
                
                using (SqlCommand cmd = new SqlCommand(qry, con))
                {
                    cmd.Parameters.AddWithValue("@u", uname);
                    if (!string.IsNullOrEmpty(examIdStr)) {
                        cmd.Parameters.AddWithValue("@eid", examIdStr);
                    }
                    con.Open();
                    int count = (int)cmd.ExecuteScalar();
                    if (count > 0)
                    {
                        // Already attempted - block access
                        Response.Write("<script>alert('You have already attempted this exam. Only one attempt is allowed.'); window.location.href='StudentDashboard.aspx';</script>");
                        Response.CompleteRequest();
                        return;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine("Attempt check error: " + ex.Message);
        }

        if (!IsPostBack)
        {
            LoadExamQuestions();
        }
    }

    private void LoadExamQuestions()
    {
        try
        {
            using (SqlConnection con = new SqlConnection(connStr))
            {
                SqlDataAdapter da = new SqlDataAdapter("SELECT TOP 10 * FROM Questions ORDER BY NEWID()", con);
                DataTable dt = new DataTable();
                da.Fill(dt);
                rptQuestions.DataSource = dt;
                rptQuestions.DataBind();
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine(ex.Message);
        }
    }

    protected void btnSubmit_Click(object sender, EventArgs e)
    {
        int score = 0;
        
        try
        {
            Dictionary<int, string> correctAnswers = new Dictionary<int, string>();
            using (SqlConnection con = new SqlConnection(connStr))
            {
                SqlCommand cmd = new SqlCommand("SELECT Id, CorrectOption FROM Questions", con);
                con.Open();
                SqlDataReader dr = cmd.ExecuteReader();
                while (dr.Read())
                {
                    correctAnswers.Add(Convert.ToInt32(dr["Id"]), dr["CorrectOption"].ToString());
                }
            }

            foreach (RepeaterItem item in rptQuestions.Items)
            {
                if (item.ItemType == ListItemType.Item || item.ItemType == ListItemType.AlternatingItem)
                {
                    HiddenField hf = (HiddenField)item.FindControl("hfQuestionId");
                    RadioButtonList rbl = (RadioButtonList)item.FindControl("rblOptions");

                    if (hf != null && rbl != null)
                    {
                        int qId = int.Parse(hf.Value);
                        string selected = rbl.SelectedValue;

                        if (correctAnswers.ContainsKey(qId) && correctAnswers[qId] == selected)
                        {
                            score++;
                        }
                    }
                }
            }

            using (SqlConnection con = new SqlConnection(connStr))
            {
                string qry = "INSERT INTO Results (Username, Score) VALUES (@u, @s)";
                using (SqlCommand cmd = new SqlCommand(qry, con))
                {
                    cmd.Parameters.AddWithValue("@u", Session["Username"].ToString());
                    cmd.Parameters.AddWithValue("@s", score);
                    con.Open();
                    cmd.ExecuteNonQuery();
                }
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine(ex.Message);
        }

        Session["LastScore"] = score;
        Response.Redirect("Result.aspx", false);
        Context.ApplicationInstance.CompleteRequest();
    }
}
