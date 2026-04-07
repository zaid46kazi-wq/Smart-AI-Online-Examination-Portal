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

public partial class CreateQuestion : System.Web.UI.Page
{
    string sCon = ConfigurationManager.ConnectionStrings["Con"].ToString();
    static string sQuestionIdUpd;
    protected void Page_Load(object sender, EventArgs e)
    {
        btnSubmit.Attributes.Add("onclick", "return Validations();");
        
        txtMarks.Attributes.Add("onkeypress", "return EnableKeys(2)");
        
        if (!Page.IsPostBack)
        {
            trOptAns.Visible = false;

            lblMessage.Visible = false;
            BindQuestionsDetails();
        }
    }
    private void BindQuestionsDetails()
    {
        DataSet ds = SqlHelper.ExecuteDataset(sCon, "PS_Quiz_QsnCreation_Details");

        if (ds.Tables.Count > 0)
        {
            if (ds.Tables[0].Rows.Count > 0)
            {
                GrdQuestions.DataSource = ds.Tables[0];
                GrdQuestions.DataBind();
                GrdQuestions.Visible = true;
                lblMessage.Visible = false;
            }
            else
            {
                lblMessage.Visible = true;
                GrdQuestions.Visible = false;
            }
        }
        else
        {
            lblMessage.Visible = true;
            GrdQuestions.Visible = false;
        }
    }
    protected void btnReset_Click(object sender, EventArgs e)
    {
        Server.Transfer("CreateQuestion.aspx");
    }
    protected void btnCancel_Click(object sender, EventArgs e)
    {
        Server.Transfer("Blank.aspx");
    }
    protected void btnSubmit_Click(object sender, EventArgs e)
    {
        string sQsnDesc = "", sCorrectOptn = "", sOptns = "", stxtOption = "", sResult = "";

        sQsnDesc = txtQsnDesc.Text.ToString().Trim().Replace("\r\n", "<br>");

        if (btnSubmit.Text == "Submit")
        {
            sOptns = ddlOptions.SelectedValue.ToString().Trim();

            if (rbtnOpt1.Checked == true)
            {
                sCorrectOptn = "Option1";
            }
            else if (rbtnOpt2.Checked == true)
            {
                sCorrectOptn = "Option2";
            }
            else if (rbtnOpt3.Checked == true)
            {
                sCorrectOptn = "Option3";
            }
            else if (rbtnOpt4.Checked == true)
            {
                sCorrectOptn = "Option4";
            }
            else if (rbtnOpt5.Checked == true)
            {
                sCorrectOptn = "Option5";
            }

            sResult = SqlHelper.ExecuteNonQueryOutput(sCon, "PS_Quiz_QsnCreationMaster_Insert", sQsnDesc, sOptns, sCorrectOptn, txtMarks.Text, Session["LogInId"].ToString(), null);

            if ((sResult != "Error") && (sResult != "Duplicate"))
            {
                string[] sDResult = sResult.Split('~');

                if (sDResult[1].Equals("Inserted"))
                {
                    for (int i = 0; i < GrdOptions.Rows.Count; i++)
                    {
                        stxtOption = ((TextBox)GrdOptions.Rows[i].FindControl("txtText")).Text.ToString().Trim();
                        SqlHelper.ExecuteNonQuery(sCon, "PS_Quiz_QsnCreationDetail_Insert", sDResult[0].ToString(), (i + 1), stxtOption, "Admin");
                    }
                    ScriptManager.RegisterStartupScript(this, typeof(string), "Message", "alert('Question created successfully.');location.href='CreateQuestion.aspx';", true);
                }
            }
            else if (sResult == "Duplicate")
            {
                ScriptManager.RegisterStartupScript(this, typeof(string), "Message", "alert('Question already exists.');", true);
                return;
            }
            else if (sResult == "Error")
            {
                ScriptManager.RegisterStartupScript(this, typeof(string), "Message", "alert('Error while creating Question.');", true);
                return;
            }
        }
        else if (btnSubmit.Text.Equals("Update"))
        {
            if (rbtnOpt1.Checked == true)
            {
                sCorrectOptn = "Option1";
            }
            else if (rbtnOpt2.Checked == true)
            {
                sCorrectOptn = "Option2";
            }
            else if (rbtnOpt3.Checked == true)
            {
                sCorrectOptn = "Option3";
            }
            else if (rbtnOpt4.Checked == true)
            {
                sCorrectOptn = "Option4";
            }
            else if (rbtnOpt5.Checked == true)
            {
                sCorrectOptn = "Option5";
            }

            sResult = SqlHelper.ExecuteNonQueryOutput(sCon, "PS_Quiz_QsnCreationMaster_Update", sQuestionIdUpd, sQsnDesc, sCorrectOptn, txtMarks.Text, Session["LogInId"].ToString(), null);

            if (sResult.Equals("Inserted"))
            {
                for (int i = 0; i < GrdOptions.Rows.Count; i++)
                {
                    stxtOption = ((TextBox)GrdOptions.Rows[i].FindControl("txtText")).Text.ToString().Trim();

                    SqlHelper.ExecuteNonQuery(sCon, "PS_Quiz_QsnCreationDetailUpdate", sQuestionIdUpd, stxtOption, (i + 1));
                }

                ScriptManager.RegisterStartupScript(this, typeof(string), "Message", "alert('Question updated successfully.');location.href='CreateQuestion.aspx';", true);
            }
            else if (sResult == "Duplicate")
            {
                ScriptManager.RegisterStartupScript(this, typeof(string), "Message", "alert('Question already exists.');", true);
                return;
            }
            else if (sResult == "Error")
            {
                ScriptManager.RegisterStartupScript(this, typeof(string), "Message", "alert('Error while creating Question.');", true);
                return;
            }
        }
    }
    protected void ddlOptions_SelectedIndexChanged(object sender, EventArgs e)
    {
        DataTable dtTxt = new DataTable();
        DataRow dRow = null;

        dtTxt.Columns.Add("HeaderTt");

        int iCounter = 0;
        if (ddlOptions.SelectedIndex > 0)
        {
            iCounter = Convert.ToInt32(ddlOptions.SelectedValue);
        }

        for (int iTxt = 0; iTxt < iCounter; iTxt++)
        {
            dRow = dtTxt.NewRow();
            dRow[0] = (iTxt + 1).ToString();
            dtTxt.Rows.Add(dRow);
        }

        GrdOptions.DataSource = dtTxt;
        GrdOptions.DataBind();

        if (ddlOptions.SelectedIndex > 0)
        {
            trOptAns.Visible = true;
            if (ddlOptions.SelectedIndex == 2)
            {
                rbtnOpt3.Visible = true;
                rbtnOpt4.Visible = false;
                rbtnOpt5.Visible = false;
            }
            else if (ddlOptions.SelectedIndex == 3)
            {
                rbtnOpt3.Visible = true;
                rbtnOpt4.Visible = true;
                rbtnOpt5.Visible = false;
            }
            else if (ddlOptions.SelectedIndex == 4)
            {
                rbtnOpt3.Visible = true;
                rbtnOpt4.Visible = true;
                rbtnOpt5.Visible = true;
            }
            else
            {
                rbtnOpt3.Visible = false;
                rbtnOpt4.Visible = false;
                rbtnOpt5.Visible = false;
            }
        }
        else
        {
            trOptAns.Visible = false;
        }
    }
    protected void GrdQuestions_RowCommand(object sender, GridViewCommandEventArgs e)
    {
        if (e.CommandName.Equals("Edit"))
        {
            int iRowIndex = Convert.ToInt32(e.CommandArgument);

            GridViewRow gRow = GrdQuestions.Rows[iRowIndex];
            string sQuestionId = GrdQuestions.DataKeys[iRowIndex].Values["QuestionId"].ToString();
            sQuestionIdUpd = sQuestionId;
            string sResult = SqlHelper.ExecuteNonQueryOutput(sCon, "Ps_Quiz_CheckQsnStatus", sQuestionId, null);

            if (sResult == "DontUpdates")
            {
                Response.Write("<script language='javascript'>alert('Question that you are trying to update is already used.');</script>");
                return;
            }
            else
            {
                btnSubmit.Text = "Update";
                ddlOptions.Enabled = false;

                DataSet oDs = SqlHelper.ExecuteDataset(sCon, "PS_Quiz_GetQsnOptions", sQuestionId);

                if (oDs.Tables.Count > 0)
                {
                    if (oDs.Tables[0].Rows.Count > 0)
                    {
                        ddlOptions.SelectedValue = oDs.Tables[0].Rows[0][1].ToString();
                        txtQsnDesc.Text = oDs.Tables[0].Rows[0][0].ToString();
                        txtMarks.Text = oDs.Tables[0].Rows[0][3].ToString();

                        if (ddlOptions.SelectedIndex > 0)
                        {
                            trOptAns.Visible = true;
                            if (ddlOptions.SelectedIndex == 2)
                            {
                                rbtnOpt3.Visible = true;
                                rbtnOpt4.Visible = false;
                                rbtnOpt5.Visible = false;
                            }
                            else if (ddlOptions.SelectedIndex == 3)
                            {
                                rbtnOpt3.Visible = true;
                                rbtnOpt4.Visible = true;
                                rbtnOpt5.Visible = false;
                            }
                            else if (ddlOptions.SelectedIndex == 4)
                            {
                                rbtnOpt3.Visible = true;
                                rbtnOpt4.Visible = true;
                                rbtnOpt5.Visible = true;
                            }
                            else
                            {
                                rbtnOpt3.Visible = false;
                                rbtnOpt4.Visible = false;
                                rbtnOpt5.Visible = false;
                            }
                        }
                        else
                        {
                            trOptAns.Visible = false;
                        }

                        if (oDs.Tables[0].Rows[0][2].ToString() == "Option1")
                        { rbtnOpt1.Checked = true; }
                        else if (oDs.Tables[0].Rows[0][2].ToString() == "Option2")
                        { rbtnOpt2.Checked = true; }
                        else if (oDs.Tables[0].Rows[0][2].ToString() == "Option3")
                        { rbtnOpt3.Checked = true; }
                        else if (oDs.Tables[0].Rows[0][2].ToString() == "Option4")
                        { rbtnOpt4.Checked = true; }
                        else if (oDs.Tables[0].Rows[0][2].ToString() == "Option5")
                        { rbtnOpt5.Checked = true; }

                        DataTable dtTxt = new DataTable();
                        DataRow dRow = null;

                        dtTxt.Columns.Add("HeaderTt");


                        int iCounter = 0;
                        if (ddlOptions.SelectedIndex > 0)
                        {
                            iCounter = Convert.ToInt32(ddlOptions.SelectedValue);
                        }

                        for (int iTxt = 0; iTxt < iCounter; iTxt++)
                        {
                            dRow = dtTxt.NewRow();
                            dRow[0] = (iTxt + 1).ToString();
                            dtTxt.Rows.Add(dRow);
                        }

                        GrdOptions.DataSource = dtTxt;
                        GrdOptions.DataBind();

                        for (int i = 0; i < oDs.Tables[0].Rows.Count; i++)
                        {
                            for (int j = 0; j < GrdOptions.Rows.Count; j++)
                            {
                                if (i == j)
                                {
                                    GridViewRow GrRow = GrdOptions.Rows[j];
                                    TextBox txtStgDesc = (TextBox)GrRow.FindControl("txtText");

                                    txtStgDesc.Text = oDs.Tables[0].Rows[i][4].ToString();
                                    break;
                                }
                                else
                                {
                                    continue;
                                }
                            }
                        }
                    }
                }
            }
        }
        else if (e.CommandName == "Delete")
        {
            int iRowIndex = Convert.ToInt32(e.CommandArgument);

            GridViewRow gRow = GrdQuestions.Rows[iRowIndex];
            string sQuestionId = GrdQuestions.DataKeys[iRowIndex].Values["QuestionId"].ToString();

            string sResult = SqlHelper.ExecuteNonQueryOutput(sCon, "Ps_Quiz_CheckQsnStatus_Del", sQuestionId, null);

            if (sResult == "DontUpdates")
            {
                Response.Write("<script language='javascript'>alert('Question that you are trying to delete is already used.');</script>");
                return;
            }
            else
            {
                string sOutput = SqlHelper.ExecuteNonQueryOutput(sCon, "Ps_Quiz_DeleteQsn", sQuestionId, Session["LoginId"].ToString(), null);

                if (sOutput == "Success")
                {
                    Response.Write("<script language='javascript'>alert('Question has been successfully deleted.');location.href='wFM_Question.aspx';</script>");
                }
                else
                {
                    Response.Write("<script language='javascript'>alert('Error while deleting Question.');</script>");
                    return;
                }
            }
        }
        else if (e.CommandName == "Preview")
        {
            int iRowIndex = Convert.ToInt32(e.CommandArgument);

            GridViewRow gRow = GrdQuestions.Rows[iRowIndex];
            string sQuestionId = GrdQuestions.DataKeys[iRowIndex].Values["QuestionId"].ToString();

            Response.Write("<script language='javascript'>window.open('ViewQuestionPreview.aspx?QsnId=" + sQuestionId + "','Preview','width=600,height=300,top=100,left=100,scrollbars=yes');</script>");
        }
    }
    protected void GrdQuestions_RowDeleting(object sender, GridViewDeleteEventArgs e)
    {

    }
    protected void GrdQuestions_RowEditing(object sender, GridViewEditEventArgs e)
    {

    }
    protected void GrdQuestions_RowDataBound(object sender, GridViewRowEventArgs e)
    {
        e.Row.Cells[1].Attributes.Add("onclick", "return ChkDel()");
    }
}
