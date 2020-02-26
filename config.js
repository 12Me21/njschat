const C = require("./c.js");

//exports.websocketUrl = "ws://127.0.0.1:8765";

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
	bg: [0,150,136],
};

exports.roomlistStyle = {
	bg: "#4090E0",
};

exports.userlistStyle = {
	bg: "#000000",
	fg: "#FFFFFF",
};

// this = user object
exports.formatUsername = function(){
	//var c = userColor(this);
	var c = this.getColors();
	if (this.banned)
		c[0] = [255,0,0];
	if (!this.active)
		c[0] = [64,64,64];
	return C("["+this.username+"]", ...c);
}

// this = user object
exports.formatMessageUsername = function(){
	return C(this.displayName(), ...this.getColors())+":";
}

exports.formatModuleUsername = function(user){
	return C(user.username, ...user.getColors());
}

function md5(text){
	return require("crypto").createHash("md5").update(text).digest();
}
// this will be assigned to User.prototype.getColors()
// don't call this directly from config.js, just use user.getColors()
exports.userColors = function(){
	var x = md5(this.username);
	var c = [x[11],x[13],x[12]];
	if (c[0]+c[1]+c[2] > 100*3)
		return [[0, 0, 0], c];
	return [[255, 255, 255], c];
}
