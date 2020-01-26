const C = require("./c.js");

function indent(message, indent){
	return indent+message.replace(/\n/g,"\n"+indent);
}

class Room {
	static drawList = null; // function to update list graphics
	static list = []; // list of all rooms
	static current; // current room
	static scrollbarStyle = null;
	static formatName = null;
	
	makeBox() {}; // function to make new list element
	tabLabel() {}; // format room name for tab label
	//style() {};

	last = null; // last sender, if last message was normal
	lastUser = null; // last sender, always
	unread = false;
	users = null; // list of users, for pm rooms
	nameLines = {}; //list of lines with names on them
	
	constructor(name, users) {
		if (typeof name != "string") {
			users = name.users;
			name = name.name;
		}
		this.name = name;
		this.users = users;
		this.box = this.makeBox();
	};
	
	static updateStyles() {
		Room.list.forEach(room=>{
			//console.log(room.box.style);
			var s = room.style();
			room.box.style.fg = s.fg;
			room.box.style.bg = s.bg;
			//console.log(room.box.style);
			room.updateScrollbar();
		});
	}

	replaceName(line, user, prefix) {
		//var oldUser = this.nameLines[line]
		//if (!oldUser) {//uh oh
	//		console.warn("failed to replace name"); //todo: more info
	//		return;
		//	}
		var text = "  "+user.formatMessageUsername(); //hardcoded indent :(
		if (prefix)
			text += " "+prefix;
		this.box.setLine(line, text);
		this.box.render();
	}

	static updateList(newRooms) {
		// add new rooms to list
		if (newRooms)
			newRooms.forEach(room=>{
				new Room(room).add();
			});
		Room.drawList(Room.list.map(room=>room.tabLabel()).join(""));
	};

	messageLabel() {
		return C("["+this.name+"]",[128,128,128]);
	};

	add() {
		if (!Room.list[this.name]) {
			Room.list.push(this);
			Room.list[this.name]=this;
			if (!Room.current)
				this.show();
		}
	};
	
	show() {
		if (Room.current)
			Room.current.box.hide();
		Room.current = this;
		Room.current.box.show();
		if (Room.current.atBottom())
			Room.current.unread = false;
		Room.updateList();
	};
	
	atBottom() {
		return this.box.getScroll() >= this.box.getScrollHeight()-this.box.height;
	};
	
	updateScrollbar() {
		if (this.atBottom()){
			if (this===Room.current) {
				this.unread = false;
				Room.updateList();
			}
			this.box.scrollbar.style.bg = Room.scrollbarStyle[1].fg
			this.box.scrollbar.track.bg = Room.scrollbarStyle[1].bg
		} else {
			this.box.scrollbar.style.bg = Room.scrollbarStyle[0].fg
			this.box.scrollbar.track.bg = Room.scrollbarStyle[0].bg
		}
		this.box.render();
	};
	
	print(text, replaceLater, prefix) {
		var scroll = this.atBottom();
		this.last = null;
		this.lastUser = null;
		var pane = this.box;
		var line = pane.lineCount();
		pane.pushLine(text);
		if (scroll)
			pane.setScrollPerc(100);
		this.updateScrollbar();
		this.box.render();
		if (prefix)
			text = indent(text, prefix);
		if (replaceLater) {
			//this.nameLines[line] = user;
			replaceLater((user)=>{
				this.replaceName(line, user, prefix);
			});
		}
	};
}

module.exports = Room;
