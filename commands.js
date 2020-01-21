//Carlos Sanchez - 2016
//randomouscrap98@aol.com
//extends chat to provide extra commands

var commandStart = "/";

//Attaches the command handler to the messagebox
onSubmitMessage.events.push(onMessageSubmit);

function checkCommands(input)
{
	for(var i = 0; i < commands.length; i++)
	{
		var regexString = "^\\s*" + commandStart + commands[i].command + "(\\s+.*)?$";
		var regex = new RegExp(regexString, 'gi');
		var matches = regex.exec(input.trim());

		if(matches)
		{
			var params = matches[1]; 

			if(!params)
				params = "";

			//console.log(commands[i]);
			try{
				var consumed = getOrDefault(commands[i].callback(params), true);
			}catch(e){
				warningMessage("Error during command: /"+commands[i].command+"\n"+e.stack);
				consumed = true;
			}
			//commandList.push(input);
			return consumed;
		}
	}

	return false;
}

function onMessageSubmit(messageBox)
{
	return checkCommands(messageBox.value);
	/*if(checkCommands(messageBox.value))
	  messageBox.value = "";*/
}
