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

public partial class CreateOnlineTest : System.Web.UI.Page
{
    string sCon = ConfigurationManager.ConnectionStrings["Con"].ToString();
    public static string sQuestionPaper = "", sActualTimeLimit = "";
    
    int iRbTCounter = 0;
    int iTableCounter = 0;
    int iRowCounter = 0;
    int iCellCounter = 0;
    
    ArrayList ArrControls = new ArrayList();
    ArrayList HtQsnIds = new ArrayList();

    protected void Page_Load(object sender, EventArgs e)
    {
        if (!Page.IsPostBack)
        {
            if (Session["QuesPaper"] != null)
            {
                Session["PlaceHolder"] = null;
            }
        }
        if (Session["PlaceHolder"] == null)
        {
            lblCuurent.Text = lblCuurent.Text = "Page " + "1" + "/" + "1";
            btnNext.Text = "Finish";

            Session["PlaceHolder"] = BindQuestionsWithOptions(PlQuizQsn, Session["QuesPaper"].ToString());
        }
        else if (Session["PlaceHolder"] != null)
        {
            Session["PlaceHolder"] = BindQuestionsWithOptions(PlQuizQsn, Session["QuesPaper"].ToString());
        }
    }

    private PlaceHolder BindQuestionsWithOptions(PlaceHolder PlQuiz, string sQuesPaperId)
    {
        Hashtable HtSubCat = new Hashtable();

        DataSet oDs = SqlHelper.ExecuteDataset(sCon, "Ps_Quiz_OnlineTest_QuestionsWithOptions_Get", sQuesPaperId);

        if (oDs.Tables.Count > 0)
        {
            if (oDs.Tables[0].Rows.Count > 0)
            {
                int iCnt = 0;
                for (int i = 0; i < oDs.Tables[0].Rows.Count; i++)
                {
                    Table tblQsn = new Table();

                    if (HtSubCat[oDs.Tables[0].Rows[i][0].ToString()] == null)
                    {
                        HtSubCat.Add(oDs.Tables[0].Rows[i][0].ToString(), oDs.Tables[0].Rows[i][0].ToString());

                        //.....Begin Text Qsn Creation.....//
                        sQuestionPaper = oDs.Tables[0].Rows[i][5].ToString();
                        
                        lblDurHead.Text = "Duration : ";
                        lblActual.Text = Convert.ToString(Convert.ToInt32(oDs.Tables[0].Rows[i][6].ToString()) * 60);
                        lblSec1.Text = " Sec";

                        lblTRHead.Text = "Time Remaining : ";
                        lblSec2.Text = " Sec";

                        tblQsn.Width = 826;

                        TableRow trQsn = new TableRow();
                        iRowCounter++;
                        trQsn.ID = "Row_" + iRowCounter.ToString();
                        

                        TableCell tcQsn = new TableCell();
                        TableCell tcQsnSNo = new TableCell();

                        tcQsn.CssClass = "Label";
                        tcQsn.BackColor = System.Drawing.Color.Gainsboro;
                        tcQsn.Font.Bold = true;
                        tcQsn.Text = "<b>" + oDs.Tables[0].Rows[i][1].ToString() + "</b>";
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
                        while ((rcnt >= 0) && (rcnt < oDs.Tables[0].Rows.Count))
                        {
                            if (oDs.Tables[0].Rows[rcnt][0].ToString() == oDs.Tables[0].Rows[i][0].ToString())
                            {
                                if (sStatus == "N")
                                {
                                    AddQsn(oDs.Tables[0].Rows[i][0].ToString(), oDs.Tables[0].Rows[i][2].ToString(), oDs.Tables[0].Rows[i][4].ToString());
                                    HtQsnIds.Add(oDs.Tables[0].Rows[i][0].ToString());
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
                                oRbOptions.GroupName = oDs.Tables[0].Rows[rcnt][0].ToString() + "_Group";
                                oRbOptions.Text = oDs.Tables[0].Rows[rcnt][3].ToString().Trim();
                                iRbTCounter++;
                                oRbOptions.ID = oDs.Tables[0].Rows[i][0].ToString() + "_" + oDs.Tables[0].Rows[rcnt][2].ToString() + "_" + "Option" + iOptCnt.ToString() + "_" + oDs.Tables[0].Rows[rcnt][4].ToString() + "_" + iRbTCounter.ToString();
                                oRbOptions.CssClass = "Label";
                                tcQsnOpt.Controls.Add(oRbOptions);
                                ArrControls.Add(oRbOptions.ID);
                                                                
                                tcQsnOptSNo.Text = iOptCnt.ToString() + ".";
                                trQsnOpt.Cells.Add(tcQsnOptSNo);
                                trQsnOpt.Cells.Add(tcQsnOpt);
                                                                
                                rcnt++;                                
                                tblQsn.Rows.Add(trQsnOpt);
                            }
                            else
                                break;
                        }
                        i = rcnt - 1;

                        PlQuiz.Controls.Add(tblQsn);                        
                    }
                }
            }
        }
        ViewState["VwHtQsnIds"] = HtQsnIds;
        return PlQuiz;
    }
    private void AddQsn(string sQsnId, string sCorrectAns, string sMarks)
    {        
        DataTable oDtOpt = (DataTable)(Session["oDTOpt"]);
        DataView oDv = new DataView(oDtOpt);
        oDv.RowFilter = "QsnId='" + sQsnId + "'";
        if (oDv.Count == 0)
        {
            DataRow oDr;
            oDr = oDtOpt.NewRow();
            oDr["QsnId"] = sQsnId;
            oDr["CorrectAns"] = sCorrectAns;
            oDr["Marks"] = sMarks;
            oDr["UserAns"] = "";
            oDr["UserMarks"] = "";
            oDtOpt.Rows.Add(oDr);

            Session["oDTOpt"] = oDtOpt;
        }
    }
    protected void btnNext_Click(object sender, EventArgs e)
    {
        GetResult();
        Response.Write("<script language='javascript'>location.href='OnlineTestScore.aspx';</script>");
    }
    protected void btnInvisible_Click(object sender, EventArgs e)
    {
        GetResult();
        Response.Write("<script language='javascript'>location.href='OnlineTestScore.aspx';</script>");
    }

    private void GetResult()
    {
        ArrayList VwHTQsns = (ArrayList)ViewState["VwHtQsnIds"];

        ArrayList HtCalc = new ArrayList();

        for (int i = 0; i < VwHTQsns.Count; i++) // Distinct Question Ids
        {
            ArrayList ArrIndQsn = new ArrayList();

            for (int h = 0; h < ArrControls.Count; h++)
            {
                string[] sQsn = ArrControls[h].ToString().Split('_');

                if (sQsn[0].ToString() == VwHTQsns[i].ToString())
                {
                    ArrIndQsn.Add(ArrControls[h].ToString());
                }
            }

            if (ArrIndQsn.Count > 0)
            {
                string sQsnStatus = "Y";

                for (int j = 0; j < ArrIndQsn.Count; j++)
                {
                    string sQsnOptId = ArrIndQsn[j].ToString();

                    if (PlQuizQsn.FindControl(sQsnOptId.ToString()).GetType().ToString() == "System.Web.UI.WebControls.RadioButton")
                    {
                        RadioButton rbt = (RadioButton)(PlQuizQsn.FindControl(sQsnOptId));
                        string[] sOptId = null;
                        if (rbt.Checked)
                        {
                            sQsnStatus = "N";
                            sOptId = ArrIndQsn[j].ToString().Split('_');
                            string sMarks = "";
                            if (sOptId[1] == sOptId[2])
                            {
                                sMarks = sOptId[4];
                            }
                            else
                            {
                                sMarks = "0";
                            }
                            DataTable oDtOpt = (DataTable)(Session["oDTOpt"]);
                            for (int k = 0; k < oDtOpt.Rows.Count; k++)
                            {
                                if (oDtOpt.Rows[k][0].ToString() == sOptId[0].ToString())
                                {
                                    oDtOpt.Rows[k][3] = sOptId[2];
                                    oDtOpt.Rows[k][4] = sMarks;
                                    break;
                                }
                            }
                            Session["oDTOpt"] = oDtOpt;
                            HtCalc.Add(ArrIndQsn[j].ToString() + "~" + "A");
                            break;
                        }
                        if (j == (ArrIndQsn.Count - 1))
                        {
                            if (sQsnStatus == "Y")
                            {
                                HtCalc.Add(ArrIndQsn[j].ToString() + "~" + "NA");
                            }
                        }
                    }
                }
            }
        }

        int iUMark = 0;
        int iTMarks = 0;

        for (int p = 0; p < HtCalc.Count; p++)
        {
            string[] sSpAns = HtCalc[p].ToString().Split('~');

            if (sSpAns[1].Equals("A"))
            {
                string[] sOpt = sSpAns[0].ToString().Split('_');

                if (sOpt[1] == sOpt[2])
                {
                    iUMark += Convert.ToInt32(sOpt[3]);
                    iTMarks += Convert.ToInt32(sOpt[3]);
                }
                else
                {
                    iTMarks += Convert.ToInt32(sOpt[3]);
                }
            }
            else
            {
                string[] sOpt = sSpAns[0].ToString().Split('_');
                iTMarks += Convert.ToInt32(sOpt[3]);
            }
        }
        Session["PlaceHolder"] = null;
        Session["Score"] = iUMark.ToString() + "&" + iTMarks.ToString() + "&" + txtHUserSec.Value + "&" + lblActual.Text;
        //Response.Write("<script language='javascript'>alert('Total Marks :" + iTMarks.ToString() + ", User Marks :=" + iUMark.ToString() + "')</script>");
    }
}
