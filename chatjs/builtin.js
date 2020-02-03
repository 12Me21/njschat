const API = require("../api.js");

var last;

API.messageEvents.push(function(msg) {
	if (msg.type == "module" && msg.module == "pm")
		if (msg.sender !== API.User.me)
			last = msg.sender;
});

API.addCommand("reply", "Reply to last /pm received", function(params) {
	if (last)
		API.sendMessage("/pm #"+last.uid+" "+params);
	else
		API.display.warning("There was nothing to reply to.");
});
