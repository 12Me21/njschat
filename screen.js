console.log("S?");

var Blessed = require("blessed");
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
const G = exports;

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
	style: {
		fg: "#FFFFFF",
		bg: "#00C8B4",
	},
});

var roomlist = Blessed.box({
	parent: screen,
	top: 0,
	height: 1,
	style: {
		bg: "#4090E0",
	}
});

var userlist = Blessed.box({
	parent: screen,
	top: roomlist.height,
	height: 1,
	style: {
		bg: "#000000",
		fg: "#FFFFFF",
	}
});

var rooms = [];

function Room(name, users){
	if (typeof name == "string"){
		this.name = name;
		this.users = users;
	} else {
		this.name = name.name;
		this.users = name.users;
	}
	this.box = Blessed.scrollablebox({
		parent: screen,
		top: userlist.height+roomlist.height,
		left: 0,
		bottom: input.height+divider.height,
		keys: true,
		alwaysScroll: true,
		hidden: true,
		scrollbar: {
			style:{
				bg: "#FF0000",
			},
			track:{
				bg: "#C0C0C0",
			},
		},
	});
	//getscroll is broken somehow
	//this.box.getScroll = function(){return this.childBase;};
	this.last = null;
	this.unread = false;
}

Room.prototype.label = function(){
	var n;
	if (this === Room.current)
		n = C(" "+this.name, [0,0,0], [255,255,255]);
	else
		n = C(" "+this.name, [0,0,0]);
	
	if (this.unread)
		n += C("!", [255,255,255], [255,0,192]);
	else {
		if (this === Room.current)
			n += C(" ", [0,0,0], [255,255,255]);
		else
			n += C(" ", [0,0,0]);
	}
	return n;
}

Room.current = null;

Room.prototype.add = function(){
	if (!rooms[this.name]) {
		rooms.push(this);
		rooms[this.name]=this;
		if (!Room.current)
			this.show();
	}
}

Room.prototype.show = function(){
	if (Room.current)
		Room.current.box.hide();
	Room.current = this;
	Room.current.box.show();
	if (Room.current.atBottom())
		Room.current.unread = false;
	G.updateRoomlist();
	screen.render();
}

Room.prototype.atBottom = function(){
	//return this.box.getScrollHeight()<=this.box.height || this.box.getScrollPerc()==100;
	// getScroll is broken fuck
	return this.box.getScroll() >= this.box.getScrollHeight()-this.box.height;
}

Room.prototype.updateScrollbar = function(){
	if (this.atBottom()){
		if (this===Room.current) {
			this.unread = false;
			G.updateRoomlist();
		}
		this.box.scrollbar.style.bg = "#00FF00";
	} else {
		this.box.scrollbar.style.bg = "#FF0000";
	}
	screen.render();
}

// rooms
// each item has
// name: name of room
// box: element
// users: list of users in room (for pm rooms)
// unread: if there are unread messages
// this is both a dict and an array
// rooms[0] exists and rooms.general exists eeeeeee

exports.switchRoom = function(d) {
	var i = rooms.findIndex(x=>x===Room.current);
	return rooms[(i+d+rooms.length)%rooms.length].show();
}

var inputHandler = null;

exports.setInputHandler = function(func){
	input.readInput();
	inputHandler = func;
	input.on("submit", function(text){
		if (Room.current = rooms.console) {
			G.log("<< " + text);
			try{
				console.log(">> ", eval(text));
			} catch(e) {
				console.error(e);
			}
		} else {
			inputHandler(text, Room.current.name);
		}
		input.clearValue();
		input.readInput();
		screen.render();
	});
}

exports.onLoad = function(I, state){
	G.updateUserlist(state.users);
	G.updateRoomlist(state.rooms);
}

G.Room = Room;

exports.onUnload = function(){
	screen.leave();
	screen.destroy();
}

function formatUsername(user){
	var color = [255,255,255];
	if (user.banned)
		color = [255,0,0];
	if (!user.active)
		color = [160,160,160];
	return C(user.username, color);
}

var lastUserlist = [];
exports.updateUserlist = function(newUserlist = lastUserlist){
	lastUserlist = newUserlist;
	userlist.setContent(lastUserlist.map(formatUsername).join(" "));
	screen.render();
}

exports.updateRoomlist = function(newRooms){
	// add new rooms to list
	if (newRooms)
		newRooms.forEach(room=>{
			new Room(room).add();
		});
	// redraw roomlist
	roomlist.setContent(rooms.map(room=>room.label()).join(""));
	// if this is the first update
	screen.render();
}

// this does the actual printing
function print2(text, room, fuck) {
	var pane = room.box;
	var scroll = room.atBottom();
	room.last = null;
	pane.pushLine(text);
	if (scroll) {
		pane.setScrollPerc(100);
	}
	room.updateScrollbar();
	screen.render();
}

function messageLabel(room){
		return C("["+room.name+"]");
}

// print text to pane
// text should be already formatted. there's no going back at this point
function print(text, roomName, fuck) {
	if (!rooms[roomName])
		return; //bad
	if (roomName=="any"){
		rooms.forEach(room=>{
			if (room.name != "console")
				print2(text, room, fuck);
		});
	} else {
		print2(text, rooms[roomName], fuck);
		if (rooms[roomName]!==Room.current) {
			rooms[roomName].unread = true;
			G.updateRoomlist();
		}
		if (roomName != "console") {
			print2(messageLabel(rooms[roomName])+text, rooms.any, fuck);
		}
	}
}



exports.scrollCurrent = function(amount) {
	Room.current.box.scroll(amount);
	divider.setText(""+Room.current.box.childBase+" "+Room.current.box.childOffset+" "+Room.current.box.getScrollHeight()+" "+Room.current.box.getScroll());
	Room.current.updateScrollbar();
	screen.render();
}

exports.log = function(...a) {
	print(a.join(" "), "console", true);
}

function indent(message, indent){
	return indent+message.replace(/\n/g,"\n"+indent);
}

exports.message = function(text, roomName, {username: username = null} = {}){
	var room = rooms[roomName];
	if (room && room.last != username) {
		print("  "+C(username,undefined,[192,129,192]), roomName);
	}
	print(C(indent(text,"   ")), roomName)
	room.last = username;
}

exports.moduleMessage = exports.warningMessage = exports.systemMessage = function (text, room) {
	print(C(text,[64,64,64]), room);
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
		input.readInput();
		input.censor = !!censor;
		function done(text){
			input.removeListener("submit", done);
			divider.setText("");
			input.clearValue();
			input.censor = false;
			screen.render();
			resolve(text);
		}
		input.on("submit", done);
		screen.render();
	});
}
