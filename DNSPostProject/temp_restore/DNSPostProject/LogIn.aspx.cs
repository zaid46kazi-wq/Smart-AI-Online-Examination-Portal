using System;
using System.Collections;
using System.Configuration;
using System.Data;
using System.Linq;
using System.Web;
using System.Web.Security;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;
using System.Web.UI.WebControls.WebParts;
using System.Xml.Linq;

public partial class LogIn : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {

    }
    protected void btnSignin_Click(object sender, EventArgs e)
    {
        if ((txtUsername.Text.ToLower() == "admin") && (txtPassword.Text.ToLower() == "admin"))
        {
            Session["LogInId"] = txtUsername.Text;
            Server.Transfer("Menu.aspx");
        }
        else if ((txtUsername.Text.ToLower() == "user") && (txtPassword.Text.ToLower() == "user"))
        {
            Session["LogInId"] = txtUsername.Text;
            Server.Transfer("CreateOnlineTestStart.aspx");            
        }
        else
        {
            lblError.Visible = true;
            lblError.Text = "Please check your login credentials.";
        }
    }
}
