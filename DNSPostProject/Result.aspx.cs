using System;

public partial class Result : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Session["Role"] == null || Session["LastScore"] == null)
        {
            Response.Redirect("Default.aspx", false);
            Context.ApplicationInstance.CompleteRequest();
            return;
        }

        if (!IsPostBack)
        {
            int score = Convert.ToInt32(Session["LastScore"]);
            int totalQuestions = 10;
            double percentage = (score * 100.0) / totalQuestions;
            bool passed = percentage >= 40;

            lblScore.Text = score + " / " + totalQuestions;
            lblPercentage.Text = percentage.ToString("0.00") + "%";

            if (passed)
            {
                lblScore.CssClass = "pass";
                lblStatus.Text = "✅ PASS";
                lblStatus.CssClass = "badge bg-success fs-6 mt-2 px-4 py-2";
            }
            else
            {
                lblScore.CssClass = "fail";
                lblStatus.Text = "❌ FAIL";
                lblStatus.CssClass = "badge bg-danger fs-6 mt-2 px-4 py-2";
            }
        }
    }

    protected void btnBack_Click(object sender, EventArgs e)
    {
        Session.Remove("LastScore");
        Response.Redirect("Student.aspx", false);
        Context.ApplicationInstance.CompleteRequest();
    }
}
