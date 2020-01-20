/// Default chat commands

/// All files in the chatjs/ folder are executed
/// ,so don't add your own commands to this file

commands.push(new Command("tab",function(params){
	var name = params.trim();
	if (allTags.indexOf(name) == -1) {
		warningMessage("Unknown room. Rooms: "+allTags.join(" "),"any");
	} else {
		setTabTag(name);
	}
},"Switch tabs"));

commands.push(new Command("room",function(params){
	var name = params.trim() || currentTag();
	localModuleMessage("Users in "+name+":");
	if (pmRooms[name]){
		localModuleMessage(pmRooms[name].users.map(x=>x.username).join(" "));
	}
},"Get room info"));

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

var pmSender = null;
addMessageEvent(function(messageElement) {
	if(messageElement.dataset.module == "pm") {
		var uid = messageElement.dataset.user;
		if(uid != useruid && !isIgnored(uid)) {
			pmSender = uid;
		}
	}
});
commands.push(new Command("reply", function(params){
	if(pmSender!==null) {
		sendMessage("/pm #"+pmSender+params);
	} else {
		warningMessage("There was nothing to reply to.");
	}
	return true;
}),"Reply to last pm");

function getAvatarFile(name, callback){
	var user = lastUserList.find(x=>x.username==name);
	if (user)
		callback(user.avatar.match(/\/t(.*)?$/)[1]);
	else {
		genericXHRSimple("/query/request/user?username="+name,function(output){
			output = JSON.parse(output);
			if (output.result)
				callback(output.result.rawavatar);
			else
				callback(null);
		});
	}
}

commands.push(new Command("avatar",function(params){
	getAvatarFile(params.trim(), function(filename){
		if (filename) {
			localModuleMessage(params.trim()+" has avatar https://smilebasicsource.com/user_uploads/avatars/"+filename)
		} else {
			warningMessage("User not found");
		}
	});
},"Get user avatar"));
