using System;
using System.Data.SqlClient;
using System.Configuration;

public partial class _Default : System.Web.UI.Page
{
    protected void btnLogin_Click(object sender, EventArgs e)
    {
        string connStr = ConfigurationManager.ConnectionStrings["ExamDB"].ConnectionString;

        try
        {
            using (SqlConnection con = new SqlConnection(connStr))
            {
                string query = "SELECT Role FROM Users WHERE Username=@u AND Password=@p AND Role=@r";
                using (SqlCommand cmd = new SqlCommand(query, con))
                {
                    cmd.Parameters.AddWithValue("@u", txtUsername.Text.Trim());
                    cmd.Parameters.AddWithValue("@p", txtPassword.Text.Trim());
                    cmd.Parameters.AddWithValue("@r", ddlRole.SelectedValue);
                    
                    con.Open();
                    object roleObj = cmd.ExecuteScalar();
                    
                    if (roleObj != null)
                    {
                        Session["Username"] = txtUsername.Text.Trim();
                        Session["Role"] = roleObj.ToString();
                        
                        if (roleObj.ToString() == "Admin") 
                            Response.Redirect("Admin.aspx", false);
                        else 
                            Response.Redirect("Student.aspx", false);
                        
                        Context.ApplicationInstance.CompleteRequest();
                    }
                    else
                    {
                        lblMsg.Text = "Invalid Username, Password, or Role.";
                    }
                }
            }
        }
        catch (Exception ex)
        {
            lblMsg.Text = "Database Error: " + ex.Message;
        }
    }
}
