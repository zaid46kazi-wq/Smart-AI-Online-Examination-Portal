<%@ Page Language="C#" AutoEventWireup="true" CodeFile="LogIn.aspx.cs" Inherits="LogIn" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>::LogIn Page::</title>
    <link href="StyleSheets/Quiz.css" type="text/css" rel="stylesheet"/>
    <script language="javascript" type="text/javascript">
      function Validations()
      {
            if(document.getElementById("txtUsername").value == "")
            {
               alert('Please enter User name');
               document.getElementById("txtUsername").focus();
               return false;
            }
            if(document.getElementById("txtPassword").value == "")
            {
               alert('Please enter Pass word');
               document.getElementById("txtPassword").focus();
               return false;
            }
            else
            {
                return true;
            }
       }
    </script>
</head>
<body>
    <form id="form1" runat="server">
        <table width="70%" align="center" class="MainFrmStyle" cellpadding="1" cellspacing="1">
          <tr>
             <td align="center" valign="middle">
                <table>
                  <tr>
                     <td class="TableOddRow">Username</td>
                     <td class="TableOddRow">
                       <asp:TextBox ID="txtUsername" runat="server" CssClass="Text"></asp:TextBox>
                     </td>
                  </tr>
                  <tr>
                     <td class="TableOddRow">Password</td>
                     <td class="TableOddRow">
                       <asp:TextBox ID="txtPassword" runat="server" CssClass="Text" 
                            TextMode="Password"></asp:TextBox>
                     </td>
                  </tr>
                  <tr>
                     <td colspan="2" class="TableOddRow">
                           <asp:Button ID="btnSignin" runat="server" Text="Sign in" CssClass="ButtonNew" 
                                    onclick="btnSignin_Click"/>                        
                     </td>                    
                  </tr>
                  <tr>
                     <td align="center" class="TableOddRow" colspan="2">
                        <asp:Label ID="lblError" runat="server" Font-Bold="True" Font-Names="Verdana" Font-Size="X-Small"
                               ForeColor="Red" Visible="False"></asp:Label>
                     </td>
                  </tr>
                </table>
              </td>   
            </tr>        
         </table>   
    </form>
</body>
</html>
