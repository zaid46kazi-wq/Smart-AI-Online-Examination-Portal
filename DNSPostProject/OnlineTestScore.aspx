<%@ Page Language="C#" AutoEventWireup="true" CodeFile="OnlineTestScore.aspx.cs" Inherits="OnlineTestScore" %>

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
    <style type="text/css">
        .style1
        {
            font-size: 10px;
            color: #000000;
            font-family: Verdana;
            width: 96px;
        }
    </style>
</head>
<body onkeydown="return disableback()" oncontextmenu="return false" onselectstart="return false" 
    ondragstart="return false" onload="setClipBoardData();">
    <form id="form1" runat="server">
        <table align="center" width="60%">
            <tr align="left">
                <td class="style1">
                        <b class="Label">User Name&nbsp;</b>                        
                </td>
                <td class="TableEvenRow" align="left">
                    <b class="Label">:</b>
                </td>
                <td class="TableEvenRow">
                        <asp:Label ID="lblUserName" runat="server" ForeColor="black" Font-Bold="true"
                            CssClass="Label" />  
                </td>
            </tr>
            <tr align="left">
                <td class="style1" align="left">
                    <b class="Label">Total Marks&nbsp;</b>
                </td>
                <td class="TableEvenRow" align="left">
                    <b class="Label">:</b>
                </td>
                <td class="TableEvenRow">                        
                        <asp:Label ID="lblTotal" runat="server" ForeColor="black" Font-Bold="true"
                            CssClass="Label" />  
                </td>
            </tr>
            <tr align="left">
                <td class="style1" align="left">
                    <b class="Label">User Marks&nbsp;</b>
                </td>
                <td class="TableEvenRow" align="left">
                    <b class="Label">:</b>
                </td>
                <td class="TableEvenRow">
                        <asp:Label ID="lblUserMarks" runat="server" ForeColor="black" Font-Bold="true"
                            CssClass="Label" />  
                </td>
            </tr>
            <tr align="left">
                <td class="style1" align="left">
                    <b class="Label">Percentage&nbsp;</b>
                </td>
                <td class="TableEvenRow" align="left">
                    <b class="Label">:</b>
                </td>
                <td class="TableEvenRow">
                        <asp:Label ID="lblPercentage" runat="server" ForeColor="black" Font-Bold="true"
                            CssClass="Label" />  
                </td>
            </tr>
            <tr align="center">
                <td class="TableEvenRow" colspan="3">
                        <b class="Label">Result:&nbsp;</b>
                        <asp:Label ID="lblMessage" runat="server" ForeColor="red" Font-Bold="true"
                            CssClass="Label" />  
                </td>
            </tr>
        </table>
    </form>
</body>
</html>
