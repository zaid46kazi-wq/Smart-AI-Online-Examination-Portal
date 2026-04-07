<%@ Page Language="C#" AutoEventWireup="true" CodeFile="CreateQuestionPaper.aspx.cs" Inherits="CreateQuestionPaper" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>::Question Paper::</title>
    <link href="StyleSheets/Quiz.css" type="text/css" rel="stylesheet"/>
    <script language="javascript" type="text/javascript">
     function Validations()
     {
        var sQnsName = document.getElementById("txtQuestionnaireName").value.replace(/^\s+|\s+$/g,"")
        if(sQnsName == "")        
        {
           alert('Please enter Question Paper Name.');
           document.getElementById("txtQuestionnaireName").value = "";
           document.getElementById("txtQuestionnaireName").focus();
           return false;
        }
        if(document.getElementById("ddlMin").selectedIndex == 0)        
        {
           alert('Please select duration of the test.');
           document.getElementById("ddlMin").focus();
           return false;
        }
         var delstart="false";
		 var elem=document.getElementById("form1").elements;
			   
		 for(var i=0; i< elem.length;i++)
		 {
			if(elem[i].type=="checkbox")
			{
				if(elem[i].status==true)
				{
				    delstart="true";
				}
			}
		 }			
		 if(delstart=="false")
		 {
			alert('Select at least one question.');
			return false;
		 }			
        else 
            return true;
     }
    </script>
</head>
<body>
    <form id="form1" runat="server">
        <table align="center">
            <tr class="TableEvenRow">
                <td align="left">Questionnaire Name:
                </td>
                <td align="left">
                    <asp:TextBox ID="txtQuestionnaireName" runat="server" CssClass="Text" 
                        MaxLength="150" Width="164px"></asp:TextBox>
                </td>
            </tr>
            <tr class="TableEvenRow">
                <td align="left">Duration of test:
                </td>
                <td align="left">
                    <asp:DropDownList ID="ddlMin" runat="server" CssClass="Text">
                    </asp:DropDownList>
                </td>
            </tr>
            <tr id="trManual" runat="server" class="TableEvenRow"> 
                <td  align="left" colspan="2">
                    <asp:GridView ID="GrdQsns" runat="server" AutoGenerateColumns="false" 
                        Width="593px" DataKeyNames="QuestionId">                     
                        <HeaderStyle HorizontalAlign="Left" CssClass="GridHeader"  /> 
                        <RowStyle CssClass="GridRowStyle" />
                        <AlternatingRowStyle CssClass="GridAlternateRowStyle" />
                        <Columns>
                            <asp:TemplateField HeaderText="Select">
                                <ItemTemplate>
                                    <asp:CheckBox ID="chk" runat="server" />
                                </ItemTemplate>
                            </asp:TemplateField>
                            <asp:BoundField DataField="QuestionId" HeaderText="QuestionId" Visible="false"/>
                            <asp:BoundField DataField="QsnDesc" HeaderText="Question" />
                            <asp:BoundField DataField="Marks" HeaderText="Marks" />
                        </Columns>
                    </asp:GridView>
                </td>
            </tr> 
            <tr class="TableEvenRow">
                <td colspan="2" align="center">
                    <asp:Button ID="btnSubmit" runat="server" Text="Submit" CssClass="ButtonNew" 
                        onclick="btnSubmit_Click"/>
                    &nbsp;<asp:Button ID="btnReset" runat="server" Text="Reset" 
                        CssClass="ButtonNew" onclick="btnReset_Click"/>
                    &nbsp;<asp:Button ID="btnCancel" runat="server" Text="Cancel" 
                        CssClass="ButtonNew" onclick="btnCancel_Click"/>
                </td>
            </tr>
        </table> 
    </form>
</body>
</html>
