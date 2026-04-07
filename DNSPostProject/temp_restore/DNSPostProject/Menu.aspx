<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Menu.aspx.cs" Inherits="Menu" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>::Menu Page::</title>
    <link href="StyleSheets/Quiz.css" type="text/css" rel="stylesheet"/>
</head>
<body>
    <form id="form1" runat="server">
        <table align="center" width="100%" cellpadding="0" cellspacing="0">
             <tr>
                <td align="left">
                       <asp:Menu ID="MenuTab" runat="server" Orientation="horizontal" BackColor="#6D6D49" 
                            CssClass="MenuBar" Width="100%" ForeColor="White">
                        <StaticSelectedStyle ForeColor="Orange" />
                        <DynamicSelectedStyle ForeColor="Orange" />
                        <StaticHoverStyle BackColor="Gray" />
                        
                        <Items>
                               <asp:MenuItem ImageUrl="~/Images/OrDot.gif" Selectable="false"></asp:MenuItem>
                               <asp:MenuItem Text="Create Question" Value="0" ToolTip="Create Question" NavigateUrl="~/CreateQuestion.aspx" Target="iFrmLinks"></asp:MenuItem>         
                               <asp:MenuItem ImageUrl="~/Images/OrDot.gif" Selectable="false"></asp:MenuItem>     
                               <asp:MenuItem Text="Create Question Paper" ToolTip="Create Question Paper" NavigateUrl="~/CreateQuestionPaper.aspx" Target="iFrmLinks" Value="1"></asp:MenuItem>                                
                      </Items>
                     </asp:Menu> 
                </td>
             </tr> 
             <tr>
                <td>
                    <iframe id="iFrmLinks" name="iFrmLinks" style="TABLE-LAYOUT: auto; WIDTH: 100%; 
                        BORDER-COLLAPSE: collapse; HEIGHT: 482px"
	                    src="Blank.aspx" frameBorder="0" runat="server"></iframe>        
                </td>
            </tr>                                     
        </table>
    </form>
</body>
</html>
