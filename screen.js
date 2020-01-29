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
			if (!bypassConsole && Room.current.name == "console") {
				input.clearValue();
				screen.render();
				G.log("<< " + text);
				try{
					console.log(">> ", eval(text));
				} catch(e) {
					console.error(e);
				}
			} else {
				if (inputHandler) {
					input.clearValue();
					screen.render();
					inputHandler(text, Room.current.name);
				}
			}
			input.readInput();
		});
		setOn = true;
	}
}

G.Room = Room;

exports.onUnload = function(){
	screen.leave();
	screen.destroy();
}

// print text to pane
// text should be already formatted. there's no going back at this point
function print(text, room, replaceThisLine) {
	text = text.replace(/\n+$/,""); //trim trailing newlines
	if (room.name == "any") {
		Room.list.forEach(room=>{
			if (room.name != "console")
				room.print(text, replaceThisLine);
		});
	} else if (room) { //should always happen then
		room.print(text, replaceThisLine);
		if (room !== Room.current) {
			room.unread = true;
			Room.updateList();
		}
		if (room.name != "console") {
			Room.list.any.print(text, replaceThisLine, room.messageLabel());
		}
	}
}

exports.scrollCurrent = function(amount, page) {
	if (page)
		amount *= Room.current.box.height-2;
	Room.current.box.scroll(amount);
	//divider.setText(""+Room.current.box.childBase+" "+Room.current.box.childOffset+" "+Room.current.box.getScrollHeight()+" "+Room.current.box.getScroll());
	Room.current.updateScrollbar();
	screen.render();
}

exports.log = function(...a) {
	print(a.join(" "), new Room("console"));
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

var namelines = [];

exports.message = function(text, room, user){
	var username = user ? user.username : null;
	// alright all this needs to be handled better
	// a nice thing would be like
	// to handle most of this in Room
  // too tire dto expliang/..

  // this is very broken because of the any tab
  // messages will merge in ANY if they should've merged in the main tab
  // need to move this into Room.print somehow
	if (room && !(username && room.last == username)) {
		if (room.lastUser != username)
			print("", room);
		var lines = room.box.lineCount();
		var later;
		if (user.nickname === undefined)
			later = function(callback){
				user.getNickname(callback);
			};
		print("  "+user.formatMessageUsername(), room, later);
	}
	print(indent(format(text),"   "), room);
	room.last = username;
	room.lastUser = username;
}

exports.drawingMessage = function(text, room, user){
	//definitely at least like, show the color pallete or something
	exports.message("[drawing]", room, user);
}

exports.imageMessage = function(text, room, user){
	exports.message(text, room, user);
}

exports.systemMessage = function (text, room) {
	print("", room);
	print(C(text,[64,64,64]), room);
}

exports.warningMessage = function (text, room) {
	print("", room);
	print(C(text,[192,64,64]), room);
}

exports.systemMessage = exports.moduleMessage = function (text, room, user) {
	// So sometimes this randomly fails when
	// a message is posted before room exists
	var username = user ? user.username : null;
	if (username && room.lastUser != username)
		print("", room);
	// highlight names in /me messages
	if (username && text.substr(0,username.length+1) == username+" ") {
		print(S.formatModuleUsername(user)+C(text.substr(username.length),[64,64,64]), room);
	} else {
		print(C(text,[64,64,64]), room);
	}
	room.lastUser = username;
	//alright so it's very unlikely, but...
	// technically someone could post a message, then have their name changed
	// and then another person's name could be changed to their old name,
	// and then if that person posts a message next, it'll be merged when it
	// shouldn't...
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
