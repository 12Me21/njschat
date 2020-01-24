const C = require("./c.js");

exports.stack = [ //unused currently
	["roomlist", 1],
	["userlist", 1],
	["messagepane"],
	["divider", 1],
	["input", 2],
];

exports.roomTabLabel = function() {
	var n;
	if (this === this.constructor.current)
		n = C(" "+this.name, [0,0,0], [255,255,255]);
	else
		n = C(" "+this.name, [0,0,0]);
	
	if (this.unread)
		n += C("!", [255,255,255], [255,0,192]);
	else {
		if (this === this.constructor.current)
			n += C(" ", [0,0,0], [255,255,255]);
		else
			n += C(" ", [0,0,0]);
	}
	return n;
};

exports.roomStyle = function() {
	// this
	return {
		bg: "#FFFFFF",
		fg: "#000000",
	};
};

exports.scrollbarStyle = [
	{bg: "#C0C0C0", fg: "#FF0000"}, //normal
	{bg: "#C0C0C0", fg: "#00FF00"}, //scrolled to bottom
];

exports.inputStyle = {
	fg: "#000000",
	bg: "#EEEEEE",
};

exports.dividerStyle = {
	fg: "#FFFFFF",
	bg: "#00C8B4",
};

exports.roomlistStyle = {
	bg: "#4090E0",
};

exports.userlistStyle = {
	bg: "#000000",
	fg: "#FFFFFF",
};

exports.formatUsername = function(user){
	var color = [255,255,255];
	if (user.banned)
		color = [255,0,0];
	if (!user.active)
		color = [160,160,255];
	return C(user.username, color);
}

//this takes username now but I'll change it later I guess
exports.formatMessageUsername = function(username){
	return C(username,undefined,[192,129,192]);
}

exports.formatModuleUsername = function(username){
	return C(username,undefined,[255,200,255]);
}
