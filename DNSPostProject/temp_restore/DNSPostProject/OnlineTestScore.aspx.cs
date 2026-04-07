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

public partial class OnlineTestScore : System.Web.UI.Page
{
    string sCon = ConfigurationManager.ConnectionStrings["Con"].ToString();

    protected void Page_Load(object sender, EventArgs e)
    {
        if (!Page.IsPostBack)
        {
            lblMessage.Text = "Congrats.....!  you have successfully taken Online Test.";
            lblMessage.ForeColor = System.Drawing.Color.Green;

            string sQues = Session["QuesPaper"].ToString();

            string[] sScore = Session["Score"].ToString().Split('&');

            string sTotScore = sScore[1].ToString();
            string sUserScore = sScore[0].ToString();

            string sTotTime = sScore[3].ToString();
            string sUserTime = sScore[2].ToString();

            double dPerc = ((Convert.ToDouble(sUserScore) / Convert.ToDouble(sTotScore)) * (100.0));

            lblUserName.Text = Session["LogInId"].ToString();
            lblTotal.Text = sTotScore;
            lblUserMarks.Text = sUserScore;
            lblPercentage.Text = dPerc.ToString("00.00");            

            string sOutput = SqlHelper.ExecuteNonQueryOutput(sCon, "Ps_Quiz_OnlineTest_Master_Insert", sQues, sTotTime, sUserTime, sTotScore, sUserScore, dPerc.ToString("00.00"), Session["LogInId"].ToString(), null);

            if ((sOutput != "Error"))
            {
                string[] sDResult = sOutput.Split('~');

                if (sDResult[0].Equals("Success"))
                {
                    DataTable oDt = (DataTable)Session["oDTOpt"];

                    for (int i = 0; i < oDt.Rows.Count; i++)
                    {
                        SqlHelper.ExecuteNonQueryOutput(sCon, "Ps_Quiz_OnlineTest_Detail_Insert", sDResult[1].ToString(), oDt.Rows[i][0].ToString(), oDt.Rows[i][1].ToString(), oDt.Rows[i][3].ToString(), oDt.Rows[i][2].ToString(), oDt.Rows[i][4].ToString(), Session["LogInId"].ToString());
                    }
                }
            }
            Session["PlaceHolder"] = null;
            Session["oDTOpt"] = null;
        }
    }
}
