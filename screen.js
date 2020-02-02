'use strict';
const G = exports;
var Blessed = require("blessed");
var Fs = require("fs");
var C = require("./c.js");
const Room = require("./room.js");
const User = require("./user.js");
var S;

var screen = Blessed.screen({
	smartCSR: true,
	title: "SBS Chat",
});

var input = Blessed.textbox({
	parent: screen,
	bottom: 0,
	height: 2,
	keys: true,
});

require("./shortcut.js")(G, input);

var divider = Blessed.box({
	parent: screen,
	bottom: input.height,
	height: 1,
});

var roomlist = Blessed.box({
	parent: screen,
	top: 0,
	height: 1,
});

var userlist = Blessed.box({
	parent: screen,
	top: roomlist.height,
	height: 1,
});

Room.prototype.makeBox = function(){
	return Blessed.scrollablebox({
		parent: screen,
		top: userlist.height+roomlist.height,
		bottom: input.height+divider.height,
		keys: true,
		alwaysScroll: true,
		hidden: true,
		style: this.style(),
		scrollbar: {
			style:{bg: "#FF0000"}, //placeholder
			track:{bg: "#C0C0C0"},
		},
	});
};

// maybe put this in User
var lastUserlist = [];
exports.updateUserlist = function(newUserlist = lastUserlist){
	lastUserlist = newUserlist;
	userlist.setContent(lastUserlist.map(user=>user.formatUsername()).join(" "));
	screen.render();
}

exports.loadConfig = loadConfig;

function loadConfig(){
	// todo: validate functions in config so they don't
	// crash chat if they throw errors or return invalid data
	console.log("reloading config file ...");
	try {
		delete require.cache[require.resolve("./config.js")];
		var s = require("./config.js");
		S = s;
	} catch(e) {
		console.error("error loading config file:");
		console.error(e);
		return;
	}
	Room.prototype.tabLabel = S.roomTabLabel;
	Room.prototype.style = S.roomStyle;
	User.prototype.formatMessageUsername = S.formatMessageUsername;
	User.prototype.formatUsername = S.formatUsername;
	User.prototype.getColors = S.userColors;
	Room.scrollbarStyle = S.scrollbarStyle;
	Room.updateStyles();
	input.style = S.inputStyle;
	divider.style = S.dividerStyle;
	roomlist.style = S.roomlistStyle;
	userlist.style = S.userlistStyle;
	G.updateUserlist();
	screen.render();
	console.log("ok");
}

Room.drawList = function(text) {
	roomlist.setContent(text);
	screen.render();
}

loadConfig(); //do this pretty soon
Fs.watch("./config.js", function(){
	loadConfig()
})

exports.switchRoom = function(d) {
	var i = Room.list.findIndex(x=>x===Room.current);
	return Room.list[(i+d+Room.list.length)%Room.list.length].show();
}

var inputHandler = null;
var setOn = false;

exports.setInputHandler = function(func, bypassConsole) {
	input.readInput();
	inputHandler = func;
	if (!setOn) {
		input.on("submit", function(text) {
			input.clearValue();
			screen.render();
			if (!bypassConsole && Room.current.name == "console") {
				Room.list.console.print("<< "+C(text, undefined, [255,255,192]));
				try {
					console.log(">>", eval(text));
				} catch(e) {
					console.error(e);
				}
			} else if (inputHandler) {
					inputHandler(text, Room.current.name);
			}
			input.readInput();
		});
		setOn = true;
	}
}

// print text to pane
// text should be already formatted. there's no going back at this point
function print(text, room, sender, normal) {
	text = text.replace(/\n+$/, ""); //trim trailing newlines
	if (room.name == "any") {
		Room.list.forEach(room=>{
			if (room.name != "console")
				room.print(text, sender, normal);
		});
	} else if (room) { //should always happen then
		room.print(text, sender, normal);
		if (room !== Room.current) {
			room.unread = true;
			Room.updateList();
		}
		if (room.name != "console") {
			Room.list.any.print(text, sender, normal, room);
		}
	}
}

exports.onSuspend = function() {
	screen.leave();
}
// I can't get this to work :(
exports.onResume = function() {
	screen.enter();
	screen.postEnter();
	screen.program.put.keypad_xmit();
	screen.program.input.setRawMode(true);
	screen.render();	
}

exports.scrollCurrent = function(amount, page) {
	if (page)
		amount *= Room.current.box.height-2;
	Room.current.box.scroll(amount);
	//divider.setText(""+Room.current.box.childBase+" "+Room.current.box.childOffset+" "+Room.current.box.getScrollHeight()+" "+Room.current.box.getScroll());
	Room.current.updateScrollbar();
	screen.render();
}

function indent(message, indent){
	return indent+message.replace(/\n/g,"\n"+indent);
}

// do > formatting and whatever
function format(message){
	if (message[0]==">") { //n
		return C(message, [0,192,0]);
	}
	return C(message);
}

// print a gap before message when:
// - no sender
// - sender is different than prev

// print username when:
// - normal message, and prev message was not a normal msg w/ same sender

exports.message = function(text, room, user){
	print(text, room, user, true);
}

exports.drawingMessage = function(text, room, user){
	//definitely at least like, show the color pallete or something
	exports.message("[drawing]", room, user);
}

exports.imageMessage = function(text, room, user){
	exports.message(text, room, user);
}

exports.systemMessage = function (text, room) {
	print(text, room);
}

exports.warningMessage = function (text, room) {
	print(text, room);
}

exports.log = function(a) {
	print(a, Room.list.console);
}

exports.moduleMessage = function (text, room, user) {
	var username = user ? user.username : null;
	// highlight names in /me messages
	if (username && text.substr(0, username.length+1) == username+" ") {
		print(S.formatModuleUsername(user)+C(text.substr(username.length),[64,64,64]), room, user, false);
	} else {
		print(C(text,[64,64,64]), room, user, false);
	}
}

/*screen.key("C-c", function(ch, key) {
	return process.exit(0);
});*/

// prompt input from input box
// awaitma balls
exports.prompt = function(prompt, censor) {
	return new Promise(resolve=>{
		input.clearValue();
		divider.setText(prompt);
		input.censor = !!censor;
		G.setInputHandler(done, true);
		function done(text){
			G.setInputHandler(null, false);
			divider.setText("");
			input.clearValue();
			input.censor = false;
			screen.render();
			resolve(text);
		}
		screen.render();
	});
}
