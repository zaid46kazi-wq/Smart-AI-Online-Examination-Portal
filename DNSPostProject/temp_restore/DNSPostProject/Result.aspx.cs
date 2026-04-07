using System;

public partial class Result : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Session["Role"] == null || Session["LastScore"] == null)
            Response.Redirect("Default.aspx");

        if (!IsPostBack)
        {
            lblScore.Text = Session["LastScore"].ToString() + " / 10";
        }
    }

    protected void btnBack_Click(object sender, EventArgs e)
    {
        Session.Remove("LastScore");
        Response.Redirect("Student.aspx", false);
        Context.ApplicationInstance.CompleteRequest();
    }
}
