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

public partial class CreateQuestionPaper : System.Web.UI.Page
{
    string sCon = ConfigurationManager.ConnectionStrings["Con"].ToString();

    protected void Page_Load(object sender, EventArgs e)
    {
        btnSubmit.Attributes.Add("onclick", "return Validations();");

        if (!Page.IsPostBack)
        {
            BindQuestions();

            ICollection IColTimeLimit = GetValues(0, 100, "Select");
            ddlMin.DataSource = IColTimeLimit;
            ddlMin.DataBind();
        }
    }
    private ICollection GetValues(int nStart, int nEnd, string startString)
    {
        ListItemCollection objCol = new ListItemCollection();
        objCol.Add(new ListItem(startString, startString));

        for (int i = nStart; i <= nEnd; )
        {
            objCol.Add(new ListItem(i.ToString(), i.ToString()));
            i = i + 5;
        }
        return objCol;
    }
    private void BindQuestions()
    {
        DataSet oDs = SqlHelper.ExecuteDataset(sCon, "Ps_Quiz_GetQsns");

        if (oDs.Tables.Count > 0)
        {
            if (oDs.Tables[0].Rows.Count > 0)
            {
                GrdQsns.DataSource = oDs.Tables[0];
                GrdQsns.DataBind();

                btnSubmit.Enabled = true;
            }
            else
            {
                btnSubmit.Enabled = false;
            }
        }
        else
        {
            btnSubmit.Enabled = false;
        }
    }

    protected void btnCancel_Click(object sender, EventArgs e)
    {
        Server.Transfer("Blank.aspx");
    }
    protected void btnReset_Click(object sender, EventArgs e)
    {
        Server.Transfer("CreateQuestionPaper.aspx");
    }
    protected void btnSubmit_Click(object sender, EventArgs e)
    {
        string sOutput = SqlHelper.ExecuteNonQueryOutput(sCon, "PS_Quiz_QsnLimitMaster_Insert", txtQuestionnaireName.Text.ToString().Trim(), ddlMin.SelectedValue.ToString(), Session["LogInId"].ToString(), null);
        if ((sOutput != "Duplicate") && (sOutput != "Error"))
        {
            string[] sData = sOutput.ToString().Split('~');
            string sQsns = "";
            string sQsnsQuot = "";
            for (int i = 0; i < GrdQsns.Rows.Count; i++)
            {
                string sQsnId = GrdQsns.DataKeys[i].Values["QuestionId"].ToString();
                CheckBox chkQsn = (CheckBox)GrdQsns.Rows[i].FindControl("chk");
                if (chkQsn.Checked == true)
                {
                    //sQsns += "'" + sQsnId + "',";
                    sQsnsQuot += "" + sQsnId + ",";
                }
            }
            if (sQsnsQuot != "")
            {
                //sQsns = sQsns.Substring(0, sQsns.Length - 1);
                sQsnsQuot = sQsnsQuot.Substring(0, sQsnsQuot.Length - 1);
                SqlHelper.ExecuteNonQuery(sCon, "PS_Quiz_QsnsLimitDetail_Insert", sData[1].ToString().Trim(), sQsnsQuot, "Admin");
            }
            ScriptManager.RegisterStartupScript(this, typeof(string), "Message", "alert('Questionnaire has been created successfully.');location.href='CreateQuestionPaper.aspx';", true);
        }
        else if (sOutput.Equals("Error"))
        {
            ScriptManager.RegisterStartupScript(this, typeof(string), "Message", "alert('Error while creating Questionnaire.');", true);
            return;
        }
        else if (sOutput.Equals("Duplicate"))
        {
            ScriptManager.RegisterStartupScript(this, typeof(string), "Message", "alert('Questionnaire Name already exists.');", true);
            return;
        }
    }
}
