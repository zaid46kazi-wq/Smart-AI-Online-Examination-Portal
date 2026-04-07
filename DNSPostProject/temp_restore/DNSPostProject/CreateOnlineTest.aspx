<%@ Page Language="C#" AutoEventWireup="true" CodeFile="CreateOnlineTest.aspx.cs" Inherits="CreateOnlineTest" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>::Online Test::</title>
    <link href="StyleSheets/Quiz.css" type="text/css" rel="stylesheet"/>
    <script language="javascript" type="text/javascript">
    function disableback()
	{   
	    if(event.keyCode==8 ||event.keyCode==37 ) // 8 -> BackSpace ; 37 -> Left Arrow
		{
			return false;
		}
		else
		{
			return true;
		}
	}
	function disableRefresh()
	{
       if(event.keyCode == 116)
		{
			return  false;
		}
		else
		{
		   return true;
		}
	}
	function RunTimer()		
    {			 
		window.setTimeout("RunTimer()",1000);
		
		if(document.getElementById("lblActual").innerText != "")
		{
		    document.getElementById("lblUser").innerText = parseInt(document.getElementById("lblUser").innerText,10) + 1;
		    document.getElementById("txtHUserSec").value = document.getElementById("lblUser").innerText;
    		if((document.getElementById("lblUser").innerText) == (document.getElementById("lblActual").innerText)) //"60")
		    {
		        document.getElementById("btnInvisible").click();								      
		    }
		    var vDiffSec = parseInt(document.getElementById("lblActual").innerText, 10) - parseInt(document.getElementById("lblUser").innerText, 10);
		    if(parseInt(vDiffSec, 10) <= 60)
		    {
		       if((parseInt(vDiffSec, 10) % 2) == 0)
		       {
		            document.getElementById("lblAlert").innerText = "Your are running short of time, "+vDiffSec+" sec";
		       }
		       else
		       {
		            document.getElementById("lblAlert").innerHTML = "<b>Your are running short of time, "+vDiffSec+" sec</b>";
		       }
		    }
		    else
		    {
		        document.getElementById("lblAlert").innerText = "";
		    }
        }        
	}		
	
    function disableCtrlKeyCombination(e)
    {
        var forbiddenKeys = new Array('a', 'n', 'c', 'x', 'v', 'j');
        var key;
        var isCtrl;
        if(window.event)
        {
            key = window.event.keyCode;
            if(window.event.ctrlKey)
                 isCtrl = true;
            else
                 isCtrl = false;
        }
        else
        {
            key = e.which; 
            if(e.ctrlKey)
                 isCtrl = true;
            else
                 isCtrl = false;
        }
        if(isCtrl)
        {
          for(i=0; i<forbiddenKeys.length; i++)
          {
            if(forbiddenKeys[i].toLowerCase() == String.fromCharCode(key).toLowerCase())
            {
                alert('Key combination CTRL + '+String.fromCharCode(key)+' has been disabled.');
                return false;
            }
          }
        }
        return true;
    }
    </script>
    
    <script language="javascript" type="text/javascript">
        window.history.forward(1);
        document.attachEvent("onkeydown", my_onkeydown_handler);
        function my_onkeydown_handler()
        {
            switch (event.keyCode)
            {
                case 116 :
                event.returnValue = false;
                event.keyCode = 0;
                window.status = "We have disabled F5";
                break;
            }
        }
        document.onmousedown=disableclick;
        status="Right Click is not allowed";
        function disableclick(e)
        {
          if(event.button==2)
           {
                alert(status);
                return false;	         
           }
        }
      </script>  
       <script language="javascript" type="text/javascript">
        window.history.forward(1);
        document.attachEvent("onkeydown", setClipBoardData);
        function setClipBoardData()
        {
            setInterval("window.clipboardData.setData('text','')",20);
        }
        function blockError()
        {
            window.location.reload(true);
            return true;
        }
        window.onerror = blockError;
      </script>   
</head>
<body onload="RunTimer();setClipBoardData();" onkeydown="return disableback();" oncontextmenu="return false" onselectstart="return false" 
    ondragstart="return false">
    <form id="form1" runat="server">
        <table align="center" width="75%" >
             <tr class="TdMainFrmStyle" align="right">
                <td class="TdMainFrmStyle" colspan="3"> <asp:Label ID="lblCuurent" runat="server" Font-Bold="true" ForeColor="Blue"></asp:Label>
                </td>
              </tr>
             <tr class="TdMainFrmStyle">
                <td class="TdMainFrmStyle" ><b>Question Paper : <%= sQuestionPaper %></b></td>                
                  <td class="TdMainFrmStyle">
                    <asp:Label ID="lblDurHead" runat="server" Font-Bold="true" ForeColor="Red"></asp:Label>
                    <asp:Label ID="lblActual" runat="server" Font-Bold="true" ForeColor="Red"></asp:Label>
                    <asp:Label ID="lblSec1" runat="server" Font-Bold="true" ForeColor="Red"></asp:Label>
                  </td>
                  <td class="TdMainFrmStyle">
                    <asp:Label ID="lblTRHead" runat="server" Font-Bold="true" ForeColor="Red"></asp:Label>
                    <asp:Label ID="lblUser" runat="server" Font-Bold="true" ForeColor="Red" Text="0"></asp:Label>
                    <asp:Label ID="lblSec2" runat="server" Font-Bold="true" ForeColor="Red"></asp:Label>
                  </td>
              </tr>
             <tr>
               <td colspan="3" class="TableEvenRow">
		<div id="DivReapetor" align="left" style="overflow: auto; width: 100%; height: 400px">                  

                       <table class="MainFrmStyle" cellSpacing="1" cellPadding="1">
                          <tr>
                            <td class="TableEvenRow">
                                <asp:placeholder id="PlQuizQsn" runat="server"></asp:placeholder>                               
                            </td>
                          </tr>
                       </table>
                 </div>
               </td>
             </tr>
             <tr align="center">
               <td colspan="3" class="TableEvenRow">
                    <asp:Button ID="btnNext" runat="server" Text="Next" CssClass="ButtonNew" 
                        onclick="btnNext_Click" />  
               </td>
             </tr>
             <tr align="center">
               <td colspan="3" class="TableEvenRow">
                    <asp:Label ID="lblMessage" runat="server" ForeColor="Red"
                    
                        Text="Please ensure that you have answered all the questions, before you click on Next button." 
                        CssClass="Label" />  
               </td>
             </tr>  
             <tr align="center">
               <td colspan="3" class="TableEvenRow">
                    <asp:Label ID="lblAlert" runat="server" ForeColor="Red" CssClass="Label"></asp:Label>
               </td>
             </tr>                            
          </table>       
    </div>    
    <p>
        <input id="txtHUserSec" runat="server" type="hidden" />
        <ASP:Button ID="btnInvisible"  runat="server" 
                onclick="btnInvisible_Click"  style="DISPLAY: none"/>
        <asp:HiddenField ID="txtHStatus" runat="server" Value="1" />
    </p>
    </form>
</body>
</html>
