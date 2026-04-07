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

public partial class ViewQuestionPreview : System.Web.UI.Page
{
    int iRbTCounter = 0;
    int iTableCounter = 0;
    int iRowCounter = 0;
    int iCellCounter = 0;

    string sCon = ConfigurationManager.ConnectionStrings["Con"].ToString();

    protected void Page_Load(object sender, EventArgs e)
    {
        if (!Page.IsPostBack)
        {
            if (Request.QueryString["QsnId"] != null)
            {
                BindQuestion("'" + Request.QueryString["QsnId"].ToString() + "'");
            }
        }
    }
    private void BindQuestion(string sQuestions)
    {
        DataSet ds = SqlHelper.ExecuteDataset(sCon, "Ps_Quiz_QuestionsWithOptions_Get", sQuestions);

        if (ds.Tables.Count > 0)
        {
            if (ds.Tables[0].Rows.Count > 0)
            {
                int iCnt = 0;
                for (int i = 0; i < ds.Tables[0].Rows.Count; i++)
                {
                    Table tblQsn = new Table();

                    //.....Begin Text Qsn Creation.....//
                    tblQsn.Width = 500;

                    TableRow trQsn = new TableRow();
                    iRowCounter++;
                    trQsn.ID = "Row_" + iRowCounter.ToString();


                    TableCell tcQsn = new TableCell();
                    TableCell tcQsnSNo = new TableCell();

                    tcQsn.CssClass = "Label";
                    tcQsn.BackColor = System.Drawing.Color.Gainsboro;
                    tcQsn.Font.Bold = true;
                    tcQsn.Text = "<b>" + ds.Tables[0].Rows[i][1].ToString() + "</b>";
                    tcQsn.Width = Unit.Percentage(99.5);
                    iCellCounter++;
                    tcQsn.ID = "Cell_" + iCellCounter.ToString();

                    tcQsnSNo.CssClass = "Label";
                    tcQsnSNo.Attributes.Add("valign", "top");
                    tcQsnSNo.BackColor = System.Drawing.Color.Gainsboro;
                    tcQsnSNo.Font.Bold = true;
                    tcQsnSNo.Width = Unit.Percentage(0.5);
                    iCellCounter++;
                    tcQsnSNo.ID = "Cell_" + iCellCounter.ToString();
                    iCnt++;
                    tcQsnSNo.Text = iCnt.ToString() + ".";

                    trQsn.Cells.Add(tcQsnSNo);
                    trQsn.Cells.Add(tcQsn);
                    tblQsn.Rows.Add(trQsn);
                    
                    int rcnt = i;
                    int iOptCnt = 0;
                    string sStatus = "N";
                    while ((rcnt >= 0) && (rcnt < ds.Tables[0].Rows.Count))
                    {
                        if (ds.Tables[0].Rows[rcnt][2].ToString() == ds.Tables[0].Rows[i][2].ToString())
                        {
                            if (sStatus == "N")
                            {
                                sStatus = "Y";
                            }

                            TableRow trQsnOpt = new TableRow();
                            iRowCounter++;
                            trQsnOpt.ID = "Row_" + iRowCounter.ToString();
                            TableCell tcQsnOpt = new TableCell();
                            tcQsnOpt.CssClass = "Label";
                            iCellCounter++;
                            tcQsnOpt.ID = "Cell_" + iCellCounter.ToString();
                            tcQsnOpt.Attributes.Add("valign", "top");
                            tcQsnOpt.VerticalAlign = VerticalAlign.Middle;
                            TableCell tcQsnOptSNo = new TableCell();
                            tcQsnOptSNo.CssClass = "Label";
                            iCellCounter++;
                            tcQsnOptSNo.ID = "Cell_" + iCellCounter.ToString();

                            iOptCnt++;
                            RadioButton oRbOptions = new RadioButton();
                            oRbOptions.GroupName = ds.Tables[0].Rows[rcnt][2].ToString() + "_Group";
                            oRbOptions.Text = ds.Tables[0].Rows[rcnt][3].ToString().Trim();
                            iRbTCounter++;
                            oRbOptions.ID = ds.Tables[0].Rows[i][0].ToString() + "_" + ds.Tables[0].Rows[rcnt][2].ToString() + "_" + "Option" + iOptCnt.ToString() + "_" + iRbTCounter.ToString();
                            oRbOptions.Enabled = false;

                            if (ds.Tables[0].Rows[i][2].ToString() == "Option" + iRbTCounter.ToString())
                            {
                                oRbOptions.Checked = true;
                            }

                            oRbOptions.CssClass = "Label";
                            tcQsnOpt.Controls.Add(oRbOptions);
                            tcQsnOptSNo.Text = iOptCnt.ToString() + ".";
                            trQsnOpt.Cells.Add(tcQsnOptSNo);
                            trQsnOpt.Cells.Add(tcQsnOpt);
                            rcnt++;
                            //.....Add Option Image.....//
                            tblQsn.Rows.Add(trQsnOpt);
                        }
                        else
                            break;
                    }
                    i = rcnt - 1;
                    PlPreview.Controls.Add(tblQsn);
                }
            }
        }
    }
    protected void btnClose_Click(object sender, EventArgs e)
    {
        Response.Write("<script language='javascript'>window.close();</script>");
    }
}
