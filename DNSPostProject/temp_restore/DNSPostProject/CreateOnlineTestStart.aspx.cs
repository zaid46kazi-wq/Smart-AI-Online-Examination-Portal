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

public partial class CreateOnlineTestStart : System.Web.UI.Page
{
    string sCon = ConfigurationManager.ConnectionStrings["Con"].ToString();

    protected void Page_Load(object sender, EventArgs e)
    {

    }
    protected void btnStart_Click(object sender, EventArgs e)
    {
        DataSet oDs = SqlHelper.ExecuteDataset(sCon, "PS_Quiz_GetQuestionPapers", Session["LogInId"].ToString());
        int iSubCatCounter = 0;
        if (oDs.Tables.Count > 0)
        {
            if (oDs.Tables[0].Rows.Count > 0)
            {
                string sQuesId = "";
                //.....Test.....//
                int iSubCatQsnCnt = 1;
                int no;
                Random rnd = new Random();
                Stack s = new Stack();
                int cntQ = oDs.Tables[0].Rows.Count;
                if (oDs.Tables[0].Rows.Count > 1)
                {
                    for (int j = 0; j < oDs.Tables[0].Rows.Count; )
                    {
                        if (iSubCatCounter < iSubCatQsnCnt)
                        {
                            no = rnd.Next(0, cntQ);
                            bool exists = s.Contains(no);
                            if (exists != true)
                            {
                                sQuesId += oDs.Tables[0].Rows[no][0].ToString();
                                s.Push(no);
                                j++;
                                iSubCatCounter++;
                            }
                        }
                        else
                        {
                            break;
                        }
                    }
                    s.Clear();
                }
                else if (oDs.Tables[0].Rows.Count == 1)
                {
                    sQuesId = oDs.Tables[0].Rows[0][0].ToString();
                }
                Session["QuesPaper"] = sQuesId;
                DataTable oDtOpt = new DataTable();
                oDtOpt.Columns.Add(new DataColumn("QsnId"));
                oDtOpt.Columns.Add(new DataColumn("CorrectAns"));
                oDtOpt.Columns.Add(new DataColumn("Marks"));
                oDtOpt.Columns.Add(new DataColumn("UserAns"));
                oDtOpt.Columns.Add(new DataColumn("UserMarks"));
                Session["oDTOpt"] = oDtOpt;

                Server.Transfer("CreateOnlineTest.aspx");
            }
            else
            {
                Response.Write("<script language='javascript'>alert('Currently you cannot take the test.');</script>");
            }
        }
        else
        {
            Response.Write("<script language='javascript'>alert('Currently you cannot take the test.');</script>");
        }
    }
}
