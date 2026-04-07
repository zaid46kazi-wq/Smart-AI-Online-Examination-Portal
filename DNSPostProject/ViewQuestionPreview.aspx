<%@ Page Language="C#" AutoEventWireup="true" CodeFile="ViewQuestionPreview.aspx.cs" Inherits="ViewQuestionPreview" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>::Preview Question::</title>
    <link href="StyleSheets/Quiz.css" type="text/css" rel="stylesheet"/>
</head>
<body>
    <form id="form1" runat="server">
        <table id="Table1" runat="server" width="100%" border="1" class="BorderTable">
            <tr>
                <td class="GridHeader">
                    Question
                </td>
            </tr>
            <tr>
                <td align="right" class="TableOddRow">
                    <asp:Button ID="btnClose" runat="server" CssClass="ButtonNew" OnClick="btnClose_Click"
                        Text="Close" Width="65px" />
                </td>
            </tr>
            <tr>
                <td class="TableOddRow">
                    <asp:PlaceHolder ID="PlPreview" runat="server"></asp:PlaceHolder>
                </td>
            </tr>
        </table>
    </form>
</body>
</html>
