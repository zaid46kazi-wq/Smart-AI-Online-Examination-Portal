using System;
using System.Data;
using System.Data.SqlClient;
using System.Configuration;

public partial class Student : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Session["Role"] == null || Session["Role"].ToString() != "Student")
        {
            Response.Redirect("Default.aspx", false);
            Context.ApplicationInstance.CompleteRequest();
            return;
        }

        if (!IsPostBack)
        {
            LoadLeaderboard();
        }
    }

    private void LoadLeaderboard()
    {
        string connStr = ConfigurationManager.ConnectionStrings["ExamDB"].ConnectionString;
        try
        {
            using (SqlConnection con = new SqlConnection(connStr))
            {
                SqlDataAdapter da = new SqlDataAdapter(@"
                    SELECT TOP 5 Username, MAX(Score) as Score 
                    FROM Results 
                    GROUP BY Username 
                    ORDER BY MAX(Score) DESC", con);
                    
                DataTable dt = new DataTable();
                da.Fill(dt);
                gvLeaderboard.DataSource = dt;
                gvLeaderboard.DataBind();
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine(ex.Message);
        }
    }

    protected void btnStartExam_Click(object sender, EventArgs e)
    {
        Response.Redirect("Exam.aspx", false);
        Context.ApplicationInstance.CompleteRequest();
    }

    protected void btnLogout_Click(object sender, EventArgs e)
    {
        Session.Clear();
        Response.Redirect("Default.aspx", false);
        Context.ApplicationInstance.CompleteRequest();
    }
}
