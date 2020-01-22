//TODO: resize events
var S = require("./settings.js");
var Graphics = exports
var blessed = require("blessed");

var screen = blessed.screen({
	smartCSR: true,
	//useBCE: false,
	title: "SBS Chat",
});

var chatpane = blessed.box({
	parent: screen,
});

var minDim = Math.min(screen.width, screen.height*2);

var input = blessed.textbox({
	parent: chatpane,
	bottom: 0,
	left: 0,
	height: 2,
	keys: true,
	style: S.input,
})

var divider = blessed.box({
	parent: chatpane,
	bottom: input.height,
	height: 1,
	style: S.divider(),
})

var roomlist = blessed.box({
	parent:chatpane,
	top: 0,
	height: 1,
	//tags: true,
	style: S.roomlist,
})

var userlist = blessed.box({
	parent: chatpane,
	top: roomlist.height,
	height: 1,
	//tags: true,
	style: S.userlist,
})

function new_messagepane(name, noscroll){
	var scrollbarColors = S.messagepane.scrollbar(name, false);
	return blessed.box({
		parent: chatpane,
		top: userlist.height+roomlist.height,
		left: 0,
		height: chatpane.height-input.height-divider.height-userlist.height-roomlist.height,
		keys: true,
		alwaysScroll: !noscroll,
		scrollable: !noscroll,
		scrollbar: {
			style: {bg: scrollbarColors.fg},
			track: {bg: scrollbarColors.bg},
		},
		style: S.messagepane.style(),
		hidden: true,
		name: name,
		_: { // user data
			last:null
		},
	})
}

var messagepanes = {};

allTags.forEach(name=>{
	messagepanes[name] = new_messagepane(name);
});
var unreads = {};
var messagepane = messagepanes.any;

exports.messagepanes = messagepanes;

exports.current_pane = function(){
	return messagepane.name;
}

exports.write_divider = function(text){
	divider.setText(text);
	screen.render();
}

exports.switch_pane = function(name){
	if (!messagepanes[name])
		return false
	messagepane.hide();
	messagepane = messagepanes[name];
	messagepane.show();
	updatescrollbar();
	exports.update_room_list(allTags);
	screen.render();
	return true;
}

exports.update_room_list = function(rooms) {
	rooms = rooms || allTags;
	roomlist.setContent(" "+rooms.map(x => {
		return S.room_name(x, messagepane.name==x, unreads[x] && x!="any");
	}).join(" "));
	rooms.forEach(function(x){
		if (!messagepanes[x])
			messagepanes[x] = new_messagepane(x);
	});
	// we never remove old messagepanes ( closed pm rooms)
	// maybe it should do something ...
	screen.render();
}

exports.switch_pane("console");

function draw_userlist(users){
	var usernames=[];
	for (var user of users) {
		usernames.push(S.userlist_name(user));
	}
	userlist.setContent(usernames.join(" "));
	screen.render();
}

input.key(S.keys.exit, function(ch, key) {
	return process.exit(0);
});
input.key(S.keys.exit, function(ch, key) {
	return process.exit(0);
});
screen.key(S.keys.exit, function(ch, key) {
	return process.exit(0);
});

function updatescrollbar(pane){
	if (!pane || pane == messagepane) {
		var s = S.messagepane.scrollbar(messagepane.name, messagepane.getScrollPerc()==100)
		messagepane.scrollbar.style.bg = s.fg;
		messagepane.scrollbar.track.bg = s.bg;
	}
}
	
input.key(S.keys.scroll[0], function(ch, key) {
	messagepane.scroll(-1);
	updatescrollbar();
	screen.render();
});
input.key(S.keys.scroll[1], function(ch, key) {
	messagepane.scroll(1);
	updatescrollbar();
	screen.render();
});

function nextTag(offset){
	var i = allTags.indexOf(currentTag());
	if (i==-1)
		return 0;
	return (i+offset+allTags.length)%allTags.length;
}
input.key(S.keys.room[0], function(ch, key) {
	setTabTag(allTags[nextTag(-1)]);
});
input.key(S.keys.room[1], function(ch, key) {
	setTabTag(allTags[nextTag(1)]);
});

input.key(S.keys.scrollPage[0], function(ch, key) {
	messagepane.scroll(-(messagepane.height-2));
	updatescrollbar();
	screen.render();
});

input.key(S.keys.scrollPage[1], function(ch, key) {
	messagepane.scroll(messagepane.height-2);
	updatescrollbar();
	screen.render();
});

input.focus();

exports.input = input;
exports.render = function(){
	screen.render();
}
exports.draw_userlist = draw_userlist;

exports.is_near_bottom = function(){
	return messagepane.getScroll() > messagepane.getScrollHeight() - messagepane.height - 5;
}

exports.prompt = function(prompt, censor){
	return new Promise(resolve=>{
		Graphics.input.clearValue();
		Graphics.write_divider(prompt);
		Graphics.input.readInput();
		Graphics.input.censor = !!censor;
		function done(text){
			Graphics.input.removeListener("submit",done);
			Graphics.write_divider("");
			Graphics.input.clearValue();
			Graphics.input.censor = false;
			resolve(text);
		}
		Graphics.input.on("submit",done);
	});
}

function print(text, tag){
	var pane = messagepanes[tag] || messagepanes.console
	var scroll = exports.is_near_bottom();
	pane._.last = null;
	pane.pushLine(text);
	if (scroll)
		pane.scrollTo(pane.getScrollHeight());
	updatescrollbar(pane);
}

exports.print = function(text, tag){
	if (tag) {
		if (!messagepanes[tag]){
			messagepanes[tag] = new_messagepane(tag);
		}
		
		if (tag != "any"){
			print(text, tag);	
			if (tag != "console")
				print(S.messageLabel(tag)+text, "any");
		} else {
			for (name in messagepanes) {
				if (name != "console")
					print(text, name);
			}
		}
	} else {
		print(text, "console");
	}
	screen.render();
}

function C(text,fg,bg){
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

exports.console = {
	log: function(...a){
		a = a.join(" ");
		exports.print(C(a),"console");
	},
	ln: Math.log,
	warn: function(...a){
		a = a.join(" ");
		exports.print(C(a,[128,128,0]),"console");
	},
	error: function(...a){
		a = a.join(" ");
		exports.print(C(a,[255,0,0]),"console");
	},
}

exports.clearScreen = function(){
	for (name in messagepanes) {
		if (name != "console")
			messagepanes[name].setText("");
	}
	screen.render();
}

exports.setNotificationStateForTag = function(tag, state){
	unreads[tag] = state;
	exports.update_room_list();
}

function indent(message, indent){
	return indent+message.replace(/\n/g,"\n"+indent);
}

// Display normal message
exports.printMessage = function(user, message, tab){
	var username = user.username;
	var pane = messagepanes[tab]
	var y = pane.getScrollHeight();
	if (pane._.last == username) {
		Graphics.print(indent(message,"   ","   "), tab);
	} else {
		Graphics.print("  "+S.username(user), tab);
		Graphics.print(indent(message,"   ","   "), tab);
	}
	pane._.last = username;
}
exports.printModuleMessage = function(user, message, tab){
	Graphics.print(S.moduleMessage(message), tab);
}

exports.printSystemMessage = function(message, tab){
	Graphics.print(S.systemMessage(message), tab);
}
exports.printWarningMessage = function(message, tab){
	Graphics.print(S.warningMessage(message), tab);
}
