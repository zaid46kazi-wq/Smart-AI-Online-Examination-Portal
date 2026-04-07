<%@ Page Language="C#" AutoEventWireup="true" CodeFile="CreateQuestion.aspx.cs" Inherits="CreateQuestion" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>::Question Creation::</title>
    <link href="StyleSheets/Quiz.css" type="text/css" rel="stylesheet"/>
    <script language="javascript" src="JavaScriptFiles/Quiz_JS.js" type="text/javascript"></script>
    
    <script language="javascript" type="text/javascript">
        function Validations()
        { 
            var sQsnDesc = document.getElementById("txtQsnDesc").value.replace(/^\s+|\s+$/g,"");
            
            if(sQsnDesc == "")
            {
               alert('Please enter Question description.');
               document.getElementById("txtQsnDesc").focus();
               document.getElementById("txtQsnDesc").value = "";
               return false;        
            }
            if(document.getElementById("ddlOptions").selectedIndex == 0)
            {
               alert('Please select No. of Options.');
               document.getElementById("ddlOptions").focus();
               return false;
            }           
            bFlag = sValidate(document.forms[0]);												
	        if(bFlag)
	        {	
	            blFlag = sValidText(document.forms[0]);
	            if(!blFlag)
	            {
	                return false;
	            }	     
	        }
	        else if(!bFlag)
	        {
	            return false;
	        }
	        var delstart="false";
		    var elem=document.getElementById("form1").elements;
		    for(var i=0; i< elem.length;i++)
		    {
			    if(elem[i].type=="radio")
			    {
				    if(elem[i].status==true)
				    {
					    delstart="true";
				    }
			    }
		    }
    		if(delstart=="false")
		    {
			    alert('Select at least one option.');
			    return false;
		    }	
		    if(document.getElementById("txtMarks").value == "")
		    {
		        alert('Please enter the Marks.');
		        document.getElementById("txtMarks").focus();
		        return false;
		    }
		    if(parseInt(document.getElementById("txtMarks").value,10) == 0)
		    {
		        alert('Please enter the Valid Marks.');
		        document.getElementById("txtMarks").focus();
		        return false;
		    }
	        else 
            {
                return true;
            }
        } 
        
        function ChkDel()
        {
            vCnfrm = confirm('Are you sure want to delete the question.');
            if(vCnfrm)
            {
                return true;
            }
            else
            {
                return false;
            }
        }
        
        function sValidText(iFrm)
        {	
            var bFlg = '1';
            var myArray = new Array();
    
            for (i=0;i<iFrm.length;i++)
	        {			  
		        if ((iFrm.elements[i].type == "text"))
		        {
		            if(iFrm.elements[i].id.indexOf("_") != -1)
			        {
			            var vSpltId = iFrm.elements[i].id.split("_");
        			    if(vSpltId[0] == "GrdOptions")
			            {
			                if(myArray.length == 0)
			                {
			                    myArray.push(iFrm.elements[i].value);
			                }
			                else if(myArray.length>0)
			                {
			                    var vBlFlg = '0';
			                    for(j=0;j<myArray.length;j++)
			                    {
			                        if(myArray[j].toUpperCase() == iFrm.elements[i].value.toUpperCase())
			                        {
			                            vBlFlg = '1';
			                            bFlg = '0';
			                            break;
			                        }
			                    }
                	            if(vBlFlg == "0")
			                    {
			                        myArray.push(iFrm.elements[i].value);			            
			                    }
			                }
			            }
			        }
                }		
	        }      	 
	        if(bFlg == '0')
	        {
	            alert('Question options are similar. Kindly change it.');
	            return false;
	        }
	        else
	        {
	            return true;
	        }
        }

        function sValidate(iFrm)
        {
	        var bFlg	=	'1';
	        for (i=0;i<iFrm.length;i++)
	        {		
	            if ((iFrm.elements[i].type == "text"))
		        {
		            if(iFrm.elements[i].id.indexOf("_") != -1)
			        {
			            var vSpltId = iFrm.elements[i].id.split("_");        			        
		                if(vSpltId[0] == "GrdOptions")
		                {
	                        if (iFrm.elements[i].value.replace(/^\s+|\s+$/g,"") == "")
	                        {
		                        bFlg	=	'0';
		                        iFrm.elements[i].focus();
		                        break;
	                        }	
	                    }
		            } 		
		        }		
	        }
        	if(bFlg == '0')
	        {
	            alert('All Options Must be Filled with Text.');
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
        <table align="center" width="60%">
            <tr>
               <td>            
                     <fieldset  style="width:98%" class="MainFrmStyle">
                         <legend  class="LegendLabel">Create Question</legend>
                         
                            <table width="98%">
                                <tr class="TableEvenRow">
                                    <td align="left">Question Description:
                                    </td>
                                    <td align="left">
                                       <asp:TextBox id="txtQsnDesc" CssClass="Text" Width="317px" runat="server" 
                                           MaxLength="1000" TextMode="MultiLine" Height="47px"></asp:TextBox>
                                    </td>
                                </tr> 
                                <tr class="TableOddRow">
                                    <td align="left">No. Of Options:
                                    </td>
                                    <td align="left">
                                            <asp:DropDownList ID="ddlOptions" CssClass="Text" Width="90" runat="server" 
                                                AutoPostBack="True" onselectedindexchanged="ddlOptions_SelectedIndexChanged">                                              
                                                <asp:ListItem Selected="True">Select</asp:ListItem>
                                                <asp:ListItem>2</asp:ListItem>
                                                <asp:ListItem>3</asp:ListItem>
                                                <asp:ListItem>4</asp:ListItem>
                                                <asp:ListItem>5</asp:ListItem>
                                            </asp:DropDownList>
                                    </td>
                                </tr> 
                                <tr class="TableEvenRow">
                                        <td align="left">
                                        </td>
                                        <td  align="left">
                                            <asp:GridView ID="GrdOptions" runat="server" AutoGenerateColumns="False" Width="212px" >
                                            <RowStyle CssClass="GridRowStyle" />
                                            <AlternatingRowStyle CssClass="GridAlternateRowStyle" />
                                                <Columns>
                                                    <asp:BoundField DataField="HeaderTt" HeaderText="SNo" >
                                                        <HeaderStyle Font-Bold="False" />
                                                    </asp:BoundField>
                                                    <asp:TemplateField HeaderText="Option" HeaderStyle-HorizontalAlign="Center">
                                                        <ItemTemplate>
                                                            <asp:TextBox ID="txtText" runat="server" MaxLength="500" CssClass="Text" Width="250px"></asp:TextBox>
                                                        </ItemTemplate>
                                                        <HeaderStyle Font-Bold="False" />
                                                    </asp:TemplateField>
                                                 </Columns>
                                                <HeaderStyle Font-Bold="False" />
                                            </asp:GridView>                  
                                        </td>
                                    </tr>      
                                     <tr class="TableOddRow" id="trOptAns" runat="server">
                                        <td align="left">Choose the Correct Answer:
                                        </td>
                                        <td align="left">                                         
                                            <asp:RadioButton ID="rbtnOpt1" runat="server" CssClass="Label" Text="Option 1" GroupName="OptAns" />  
                                            <asp:RadioButton ID="rbtnOpt2" runat="server" CssClass="Label" Text="Option 2" GroupName="OptAns" />  
                                            <asp:RadioButton ID="rbtnOpt3" runat="server" CssClass="Label" Text="Option 3" GroupName="OptAns" />  
                                            <asp:RadioButton ID="rbtnOpt4" runat="server" CssClass="Label" Text="Option 4" GroupName="OptAns" />  
                                            <asp:RadioButton ID="rbtnOpt5" runat="server" CssClass="Label" Text="Option 5" GroupName="OptAns" />  
                                        </td>
                                    </tr>
                                    <tr class="TableEvenRow">
                                        <td align="left">Marks:
                                        </td>
                                        <td align="left">
                                            <asp:TextBox id="txtMarks" CssClass="Text" Width="50px" runat="server" 
                                                MaxLength="3"></asp:TextBox>
                                        </td>
                                    </tr> 
                                    <tr align="center">
                                        <td colspan="2">
                                            <asp:Button ID="btnSubmit" Text="Submit" Width="65px" CssClass="ButtonNew" 
                                                runat="server" onclick="btnSubmit_Click" /> &nbsp;
                                            <asp:Button ID="btnReset" Text="Reset" Width="65px" CssClass="ButtonNew" 
                                                runat="server" onclick="btnReset_Click" /> &nbsp;
                                            <asp:Button ID="btnCancel" Text="Cancel" Width="65px" CssClass="ButtonNew" 
                                                runat="server" onclick="btnCancel_Click" />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="2">
                                            <div align="center">
                                                <fieldset  style="width:98%" class="MainFrmStyle">
                                                    <legend  class="LegendLabel">Questions Details</legend>
                                                        <table width="100%">
                                                            <tr>
                                                                <td>
                                                                    <div id="DivReapetor" style="overflow: auto; width: 98%; height: 250px">
                                                                        <asp:GridView ID="GrdQuestions" AutoGenerateColumns="false" runat="server" 
                                                                                DataKeyNames="QuestionId"  Width="698px" 
                                                                                onrowcommand="GrdQuestions_RowCommand" onrowediting="GrdQuestions_RowEditing" 
                                                                                onrowdatabound="GrdQuestions_RowDataBound" onrowdeleting="GrdQuestions_RowDeleting">                                         
                                                                        <HeaderStyle HorizontalAlign="Left" CssClass="GridHeader"  /> 
                                                                        <RowStyle CssClass="GridRowStyle" HorizontalAlign="Left" />
                                                                        <AlternatingRowStyle CssClass="GridAlternateRowStyle" />
                                                                        <Columns>
                                                                          <asp:TemplateField HeaderText="Edit">
                                                                            <ItemStyle HorizontalAlign="Center" Width="50px"></ItemStyle>
                                                                               <ItemTemplate>                       
                                                                                  <asp:ImageButton ID="ImgBtnEdit" ImageUrl="~/Images/Edit.gif" CommandName="Edit" CommandArgument='<%# Container.DataItemIndex %>' runat="server"/>                        
                                                                                </ItemTemplate>
                                                                           </asp:TemplateField>   
                                                                           <asp:TemplateField HeaderText="Delete">
                                                                            <ItemStyle HorizontalAlign="Center" Width="50px"></ItemStyle>
                                                                               <ItemTemplate>                       
                                                                                  <asp:ImageButton ID="ImgBtnDelete" ImageUrl="~/Images/Delete.gif" CommandName="Delete" CommandArgument='<%# Container.DataItemIndex %>' runat="server"/>                        
                                                                                </ItemTemplate>
                                                                           </asp:TemplateField> 
                                                                           <asp:TemplateField HeaderText="Preview">
                                                                            <ItemStyle HorizontalAlign="Center" Width="50px"></ItemStyle>
                                                                               <ItemTemplate>                       
                                                                                  <asp:ImageButton ID="ImgBtnPreview" ImageUrl="~/Images/Preview.jpg" CommandName="Preview" CommandArgument='<%# Container.DataItemIndex %>' runat="server"/>                        
                                                                                </ItemTemplate>
                                                                           </asp:TemplateField>      
                                                                           <asp:BoundField DataField="QuestionId" HeaderText="QuestionId" Visible="false"/>
                                                                           <asp:BoundField DataField="QsnDesc" HeaderText="Question" />
                                                                           <asp:ButtonField DataTextField="NoOfOptions" HeaderText="Options" CommandName="Options" Visible="false" />
                                                                           <asp:BoundField DataField="CorrectOption" HeaderText="Correct Option" Visible="false"/>
                                                                           <asp:BoundField DataField="Marks" HeaderText="Marks" />
                                                                         </Columns>
                                                                        </asp:GridView>
                                                                        <asp:Label ID="lblMessage" runat="server" CssClass="Text" ForeColor="Red" Text="No Questions has been created."></asp:Label>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                </fieldset>
                                            </div>
                                        </td>
                                    </tr>                                    
                                 </table>   
                     </fieldset>
               </td>
            </tr>
        </table>
    </form>
</body>
</html>
