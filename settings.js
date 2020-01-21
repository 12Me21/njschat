//these codes aren't output directly don't worry
// text escape/colorize function
// fg and bg are optional
function C(text,fg,bg){
	text = text.replace(/{/g,"{open}");
	text = text.replace(/\x1B/g,"");
	if (!fg && !bg)
		return text;
	if (!bg) {
		return "\x1B[38;2;"+fg[0]+";"+fg[1]+";"+fg[2]+"m"+text+"\x1B[m";
	}
	if (!fg)
		return "\x1B[48;2;"+bg[0]+";"+bg[1]+";"+bg[2]+"m"+text+"\x1B[m";
	return "\x1B[38;2;"+fg[0]+";"+fg[1]+";"+fg[2]+";48;2;"+bg[0]+";"+bg[1]+";"+bg[2]+"m"+text+"\x1B[m";
}

module.exports = {
	messagepane: {
		// Style based on tab name (offtopic etc.)
		style: function(name){
			return {
				bg: "#FFFFFF", // messagepane BG
				fg: "#000000", // messagepane text
			};
		},
		// Scrollbar colors
		// bottom is true when you are scrolled all the way down
		// (where autoscroll is enabled)
		// this is broken somehow
		scrollbar: function(name, bottom) {
			if (!bottom)
				return {
					fg: "#FF0000",
					bg: "#DDDDDD",
				};
			else
				return {
					fg: "#00FF00",
					bg: "#DDDDDD",
				};
		},
		//
	},
	input: {
		fg: "#000000",
		bg: "#EEEEFF",
	},
	divider: function(){
		return {
			fg: "#FFFFFF",
			bg: "#00C8B4",
		};
	},
	// Room list colors
	roomlist: {
		fg: "#C0C0C0",
		bg: "#000080",
	},
	userlist: {
		fg: "#FFFFFF",
		bg: "#000000",
	},
	room_name: function(name, current, unread){
		var n;
		if (current)
			n = C(name, [255,255,255]);
		else
			n = C(name, [160,160,160]);
		if (unread)
			n += C("!", [255,255,255], [255,0,192]);
		else
			n += C(" ");
		return n;
	},
	// names in userlist
	userlist_name: function(user){
		var color = [255,255,255];
		if (user.banned)
			color = [255,0,0];
		if (!user.active)
			color = [160,160,160];
		return C(user.username, color);
	},
	// username (as displayed on messages)
	username: function(user){
		return C(user.username, undefined, [208,208,208]);
	},
	keys: {
		exit: "C-c",
		room: ["left", "right"],
		scroll: ["up", "down"],
		scrollPage: ["pageup", "pagedown"],
		closeImage: ["C-a"],
	},
}
