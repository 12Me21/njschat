const G = exports;
var Blessed = require("blessed");
var C = require("./c.js");
const Room = require("./room.js");
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

exports.loadConfig = loadConfig;

function loadConfig(){
	console.log("reloading config file ...");// WHY THE FUCK DOESN"T THIS PRINT AAA
	delete require.cache[require.resolve("./config.js")];
	S = require("./config.js");
	Room.prototype.tabLabel = S.roomTabLabel;
	Room.prototype.style = S.roomStyle;
	Room.scrollbarStyle = S.scrollbarStyle;
	Room.updateStyles();
	input.style = S.inputStyle;
	divider.style = S.dividerStyle;
	roomlist.style = S.roomlistStyle;
	userlist.style = S.userlistStyle;
	screen.render();
	console.log("ok");
}

Room.drawList = function(text) {
	roomlist.setContent(text);
	screen.render();
}

loadConfig(); //do this pretty soon

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
			if (!bypassConsole && Room.current == Room.list.console) {
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

exports.onLoad = function(I, state){
	G.updateUserlist(state.users);
	Room.updateList(state.rooms);
}

G.Room = Room;

exports.onUnload = function(){
	screen.leave();
	screen.destroy();
}

var lastUserlist = [];
exports.updateUserlist = function(newUserlist = lastUserlist){
	lastUserlist = newUserlist;
	userlist.setContent(lastUserlist.map(S.formatUsername).join(" "));
	screen.render();
}

// print text to pane
// text should be already formatted. there's no going back at this point
function print(text, roomName, fuck) {
	text = text.replace(/\n+$/,""); //trim trailing newlines
	var room = Room.list[roomName];
	if (roomName=="any"){
		Room.list.forEach(room=>{
			if (room.name != "console")
				room.print(text);
		});
	} else if (room) { //should always happen then
		room.print(text);
		if (room !== Room.current) {
			room.unread = true;
			Room.updateList();
		}
		if (roomName != "console") {
			Room.list.any.print(indent(text, room.messageLabel()));
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
	print(a.join(" "), "console");
}

function indent(message, indent){
	return indent+message.replace(/\n/g,"\n"+indent);
}

exports.message = function(text, roomName, {username: username = null} = {}){
	var room = Room.list[roomName];
	if (room && room.last != username) {
		if (room.lastUser != username)
			print("", roomName);
		print("  "+S.formatMessageUsername(username), roomName);
	}
	print(C(indent(text,"   ")), roomName)
	room.last = username;
	room.lastUser = username;
}

exports.systemMessage = function (text, room) {
	print("", room);
	print(C(text,[64,64,64]), room);
}

exports.warningMessage = function (text, room) {
	print("", room);
	print(C(text,[192,64,64]), room);
}

exports.moduleMessage = function (text, roomName, {username: username = null} = {}) {
	var room = Room.list[roomName];
	if (room.lastUser != username)
		print("", roomName);
	// highlight names in /me messages
	if (username && text.substr(0,username.length+1) == username+" ") {
		print(S.formatModuleUsername(username)+C(text.substr(username.length),[64,64,64]), roomName);
	} else {
		print(C(text,[64,64,64]), roomName);
	}
	room.lastUser = username;
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
