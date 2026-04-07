<%@ Page Language="C#" AutoEventWireup="true" CodeFile="CreateOnlineTestStart.aspx.cs" Inherits="CreateOnlineTestStart" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>::Online Test Instructions::</title>
    
    <link href="StyleSheets/Quiz.css" type="text/css" rel="stylesheet"/>
    <script language="javascript" type="text/javascript"> 
        var vSec = 0;  
        function RunTimer()		
        {			 
		    window.setTimeout("RunTimer()",1000);
		
		    document.getElementById("lblTimer").innerText = parseInt(document.getElementById("lblTimer").innerText,10) + 1;							
		    document.getElementById("hid_Ticker").value=document.getElementById("lblTimer").innerText;
		    
		    vSec = parseInt(vSec, 10) + 1;
		    
		    if(vSec == 0)
		    {
			    document.getElementById("lblTimer").innerText = "00:00:00";
		    }
		    else
		    {
			    var vActSec = parseInt(vSec, 10) % 60;			
			    var vActMin = (parseInt(vSec, 10) - parseInt(vActSec, 10)) / 60;
    			
			    if(parseInt(vActSec, 10) < 10)
			    {  
				    vActSec = "0"+vActSec;
			    }
    			
			    var vActMins = parseInt(vActMin, 10) % 60;
			    if(parseInt(vActMins, 10) < 10)
			    {
				    vActMins = "0"+vActMins;
			    }
    			
			    var vActHrs = parseInt(vActMin, 10) - parseInt(vActMins, 10);
			    vActHrs = parseInt(vActHrs, 10) / 60;

			    if(parseInt(vActHrs, 10) < 10)
			    {
				    vActHrs = "0"+vActHrs;
			    }

			    document.getElementById("lblTimer").innerText = vActHrs + ":" + vActMins + ":" + vActSec;
		    }
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
       
       <script language="javascript" type="text/javascript">
        function disableCtrlKeyCombination(e)
        {
            var forbiddenKeys = new Array('a', 'n', 'c', 'x', 'v', 'j');
            var key;
            var isCtrl;
            if(window.event)
            {
                key = window.event.keyCode;     //IE
                if(window.event.ctrlKey)
                     isCtrl = true;
                else
                     isCtrl = false;
            }
            else
            {
                key = e.which;     //firefox
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
                    case 116 : // 'F5'
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
</head>
<body onload="RunTimer();"  topmargin="0" leftmargin="2px" righmargin="0" oncontextmenu="return false;" onselectstart="return false" 
    ondragstart="return false">
    <form id="form1" runat="server">
    <table id="Table11" align="center" borderColor="#ff9900" cellSpacing="1" cellPadding="1" border="1" >
           <tr align="center">
			 <td align="center" colspan="2">
				<table id="main1" runat="server" style="WIDTH: 652px; HEIGHT: 284px" border="0">
					<tr>
						<td valign="top" align="left" class="Label">
							<p align="center"><U><b><font size="3">Instructions </font></b></U></p>
						    
						    <font color='black' size='1' face='Verdana'>You are about to begin the Online Test. Answer each question carefully, since you will not be able to review/change.</font>
	<br><br>
	<font color='black' size='1' face='Verdana'>In this assessment you will encounter question of type:</font> 
	<font face='Verdana' color='#FF9900' size='1'><b>Multiple Choice</b></font><font color='black' size='2' face='Verdana'>.</font>
	<br><br>
	<font color='black' size='1' face='Verdana'><b>You need to complete each online test in the defined time period you will not be allowed to add or change answer to a question once you have exceeded the time limit. </b> </font>
	<br><br>
	<font color='black' size='1' face='Verdana'>Please do not use the back button on your browser during the test, since you cannot change your response once you have submitted them.</font>
	<br><br>
	<font face='Verdana' color='#FF9900' size='1'><b><u>Click on the button below to start</u> </b> </font>
	<br><br>
	<font color='black' size='1' face='Verdana'><b>NOTE:</b> You should not browse other websites while attempting the online test since it will be tracked through your system </font>
	<br><br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
	&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
	&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
	<font color='black' size='1' face='Verdana'>************** ALL THE BEST *************</font>
						</td>
					  </tr>
				 </table>
			   <br>
			</td>
		 </tr>
		 <tr align="center">
		    <td>
				<asp:Button id="btnStart" runat="server" Width="134px" Height="18px" Font-Size="X-Small"
				  Text="Start Test"	BorderWidth="1px" CssClass="ButtonNew" onclick="btnStart_Click">
				</asp:Button>
			</td>
			<td>
			    <asp:HiddenField ID="hid_Ticker" runat="server" Value="0" />
                <asp:Label ID="lblTimer" CssClass="Label" runat="server" Text="0" ForeColor="Red" Font-Bold="true"></asp:Label>
                <b class="Label"><font color="red"></font></b>
                <br />
			</td>
		 </tr>				
	 </table>
    </form>
</body>
</html>
