/*------*\
| Manual |
\*------*/
var reference;
commands.push(new Command("manual", function(param) {
	var params = quickParamParse(param);
	var page = 1;
	if (params.length === 2) {
		page = params[1];
	}
	else if (params.length !== 1) {
		warningMessage("Need an instruction name.");
		return;
	}
	var command=params[0];
	if (reference === undefined) {
		loadXMLDoc("//scratch.smilebasicsource.com/reference.json", function(output) {
			reference = JSON.parse(output);
			lookupCommand(command,page);
			return;
		});
	} else {
		lookupCommand(command,page);
	}
	function lookupCommand(command,page){
		var title = command + " (" + page + ")";
		if(page == 1 && !reference[title]){
			title = command;
		}
		if(reference[title]){
			sendMessage("/md `" + reference[title].parameters + "`\n" + reference[title].description.replace(/^([^]+)\n\t\t([^]+)$/, "**$1**\n$2"));
		} else {
			warningMessage("Could not find: " + title);
		}
	}
}, "Look up SmileBASIC Command help"));
