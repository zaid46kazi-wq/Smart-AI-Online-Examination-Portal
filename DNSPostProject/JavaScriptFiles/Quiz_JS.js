		
		function DisableKeysCtrl(k)
			{ 
				if(event.keyCode == 72  ||event.keyCode==78 )
				{ 
					if(event.ctrlKey)
					{ 
					    event.returnValue = false;
					
					}			  	    
				}
		  } 
		if(document.layers)
		window.captureEvent(event.KeyPress);
          window.document.layers = DisableKeysCtrl;
		
		document.onkeydown=DisableKeysCtrl;
		
		
	

		
		function fnEmailCheck(EmailID) 
			{ 
				emailValue=EmailID; 
				
				
				if (emailValue.match(/^[a-zA-Z0-9_\.]+@([a-zA-Z0-9\-]+\.)+[a-zA-Z\-]{2,}$/)==null)  
				{  
						alert('Please enter valid Email Id format.'); 						
						return false; 
				} 
				if (emailValue.match(/\.@|\.\./)!=null)  
				{
						alert('Please enter valid Email Id format.'); 					
						return false; 
				} 
				return true;
			}
			
			function trimString(sString)
			{
				while (sString.substring(0,1) == ' ')
				{
					sString = sString.substring(1, sString.length);
				}
				while(sString.substring(sString.length-1, sString.length) == ' ')
				{
						sString = sString.substring(0,sString.length-1);
				}
				return sString;
			}
			function EnableKeys(keyType)
			{
				var keyCode = event.keyCode;
				//Enable Only alphabets and spaces
				if(keyType==0)
				{
					if((keyCode>=65 && keyCode<=90) || (keyCode>=97 && keyCode<=122) || (keyCode==32))
					{
						event.returnValue = true;
					}
					else
					{
						event.returnValue = false;
					}   
				}
				
				//Enable Only alpha numeric values
				if(keyType==1)
				{
					if((keyCode>=65 && keyCode<=90) || (keyCode>=97 && keyCode<=122) || (keyCode>=48 && keyCode<=57) || (keyCode==32))
					{
						event.returnValue = true;
					}
					else
					{
						event.returnValue = false;
					}   
				}
		  
				//Enable Only integer values
				if(keyType==2)
					{
					
					if(keyCode>=48 && keyCode<=57)
					{			
						event.returnValue = true;
					}
					else
					{
						event.returnValue = false;
					}   
				}
				
				//Enable Only float values
				if(keyType==3)
				{
					if((keyCode >= 48 && keyCode <= 57) || (keyCode == 46 ))
					{
						event.returnValue = true;
					}
					else
					{
						event.returnValue = false;
					}
				}
		  
				//Disable chars which should not allowed to entered
				if(keyType==4)
				{
					if(keyCode==64 || keyCode==35 || keyCode==37 || keyCode==38 || keyCode==43 || keyCode==47 || keyCode==58 || keyCode==63)
					{
						event.returnValue = false;
					}
					else
					{
						event.returnValue = true;
					}   
				}
				
				//Enable Only alpha numeric values with Comma, Dash, Dot, Space, @ and semi colon allowed
				if(keyType==5)
				{
					//if((keyCode>=65 && keyCode<=90) || (keyCode>=97 && keyCode<=122) || (keyCode>=48 && keyCode<=57) || (keyCode==44) || (keyCode==45) || (keyCode==46) || (keyCode==32) || (keyCode==64) || (keyCode==59))
					if((keyCode>=65 && keyCode<=90) || (keyCode>=97 && keyCode<=122) || (keyCode>=48 && keyCode<=57) || (keyCode>=32 && keyCode<=33) || (keyCode>=35 && keyCode<=37) || (keyCode>=40 && keyCode<=46) || (keyCode>=58 && keyCode<=59) || (keyCode==64) || (keyCode==91) || (keyCode==93) || (keyCode==95) || (keyCode==123) || (keyCode==125))
					{
						event.returnValue = true;
					}
					else
					{
						event.returnValue = false;
					}   
				}
				if(keyType==6)
				{
					//Enable Only integer values with backslash
					if((keyCode>=48 && keyCode<=57)|| (keyCode == 47) )
					{
						event.returnValue = true;
					}
					else
					{
						event.returnValue = false;
					}   
				}
				//Enable Only alphabets with space and dot
				if(keyType==7)
				{
					if((keyCode>=65 && keyCode<=90) || (keyCode>=97 && keyCode<=122) || (keyCode==32) || (keyCode==46))
					{
						event.returnValue = true;
					}
					else
					{
						event.returnValue = false;
					}   
				}
				//Enable Only alphanumeric values with space , backslash , comma , dash , dot
				if(keyType==8)
				{
					if((keyCode>=65 && keyCode<=90) || (keyCode>=97 && keyCode<=122) || (keyCode>=48 && keyCode<=57)|| (keyCode==32) || (keyCode>=44 && keyCode <= 47) || (keyCode==35))
					{
						event.returnValue = true;
					}
					else
					{
						event.returnValue = false;
					}   
				}
				//All keyboard entries disallowed
				if(keyType==9)
				{
					event.returnValue = false;
				}
				//Enable Only alphanumeric values with space , backslash , comma , dash , dot, (, ), #, $, %, &, *, +, :, =, ?
				if(keyType==11)
				{
					if((keyCode>=65 && keyCode<=90) || (keyCode>=97 && keyCode<=122) || (keyCode>=48 && keyCode<=58)|| (keyCode==32 ||keyCode==64 || keyCode==61 || keyCode==63 ) || (keyCode>=40 && keyCode <= 47) || (keyCode==35) || (keyCode>=35 && keyCode <= 38) )
					{
						event.returnValue = true;
					}
					else
					{
						event.returnValue = false;
					}   
				}
				//Enable Only alphabets with hyphen
				if(keyType==13)
				{
					//if((keyCode>=65 && keyCode<=90) || (keyCode>=97 && keyCode<=122) || (keyCode>=48 && keyCode<=57) || (keyCode==44) || (keyCode==45) || (keyCode==46) || (keyCode==32) || (keyCode==64) || (keyCode==59))
					if((keyCode>=65 && keyCode<=90) || (keyCode>=97 && keyCode<=122) || (keyCode==45))
					{
						event.returnValue = true;
					}
					else
					{
						event.returnValue = false;
					}   
				}
				//Enable Only alpha numeric values with hyphen
				if(keyType==14)
				{
					//if((keyCode>=65 && keyCode<=90) || (keyCode>=97 && keyCode<=122) || (keyCode>=48 && keyCode<=57) || (keyCode==44) || (keyCode==45) || (keyCode==46) || (keyCode==32) || (keyCode==64) || (keyCode==59))
					if((keyCode>=65 && keyCode<=90) || (keyCode>=97 && keyCode<=122) || (keyCode==45)  || (keyCode>=48 && keyCode<=57))
					{
						event.returnValue = true;
					}
					else
					{
						event.returnValue = false;
					}   
				}
				if(keyType==15)
				{
				    // alpha numeric and integers and hyphen
					//if((keyCode>=65 && keyCode<=90) || (keyCode>=97 && keyCode<=122) || (keyCode>=48 && keyCode<=57) || (keyCode==44) || (keyCode==45) || (keyCode==46) || (keyCode==32) || (keyCode==64) || (keyCode==59))
					if((keyCode>=65 && keyCode<=90) || (keyCode>=97 && keyCode<=122) || (keyCode==45) || (keyCode>=48 && keyCode<=57))
					{
						event.returnValue = true;
					}
					else
					{
						event.returnValue = false;
					}   
				}
				
				if(keyType==16)
				{
					if((keyCode>=65 && keyCode<=90) || (keyCode>=97 && keyCode<=122) || (keyCode>=48 && keyCode<=57)|| (keyCode==32) || (keyCode>=44 && keyCode <= 47) || (keyCode==35) || (keyCode==58))
					{
						event.returnValue = true;
					}
					else
					{
						event.returnValue = false;
					}   
				}
				
			}
			function DisableKeys(keyType)
			{
				var keyCode = event.keyCode;
				//All keyboard entries disallowed except 35 - End 36 - Home 37 - Left Arrow 39 - Right Arrow
				if(keyType==1)
				{
					if((keyCode==35) || (keyCode==36) || (keyCode==37)|| (keyCode==39))
					{
						event.returnValue = true;
					}
					else
					{
						event.returnValue = false;
					}
				}
			}
			function abc(keyType)
			{
			 if(keyType==12)
			 {
			 if(event.ctrlKey)
			 if((event.keyCode == 65) || (event.keyCode == 67) || (event.keyCode == 97) || (event.keyCode == 99))
			 {
			  event.returnValue = false;
			 }
			 }
			}
			