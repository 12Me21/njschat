/// Default chat commands
/// All files in the chatjs/ folder are executed
/// ,so don't add your own commands to this file

commands.push(new Command("tab",function(params){
	var name = params.trim();
	if (!setTabTag(name)) {
		warningMessage("Unknown room. Rooms: "+Object.keys(Graphics.messagepanes).join(" "),"any");
	}
},"Switch tabs"));

commands.push(new Command("exit",function(){
	process.exit(0);
},"Exit chat"));

commands.push(new Command("cls",function(params){
	Graphics.clearScreen();
	systemMessage("Window cleared");
},"Clear the chat window"));

commands.push(new Command("eval",function(params){
	try
	{
		var result = eval(params);
		localModuleMessage("You entered: " + params + "\nResult: " + result);
	}
	catch(ex)
	{
		warningMessage("Could not evaluate: " + ex);
	}
}, "Print the result of a javascript operation. Example: /eval 2+2"));

commands.push(new Command("help", function(params){
	params = params.trim();

	//If the user is just typing /help, only output the small note. if we
	//don't recognize the parameter, do absolutely nothing!
	if(!params)
	{
		localModuleMessage("Type /help local for help with local (javascript) commands");
		return false;
	}
	else if(params !== "local")
	{
		return false;
	}

	var output = "--Local Javascript Commands--\n";

	for(var i = 0; i < commands.length; i++)
	{
		output += "/" + commands[i].command + " => " + commands[i].description + "\n"; 
	}

	localModuleMessage(output);
}, "Get help for local commands"));
