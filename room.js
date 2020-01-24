const C = require("./c.js");

class Room {
	static drawList = null; // function to update list graphics
	static list = []; // list of all rooms
	static current; // current room
	static scrollbarStyle = null;
	
	makeBox() {}; // function to make new list element
	tabLabel() {}; // format room name for tab label
	//style() {};

	last = null; // last sender, if last message was normal
	lastUser = null; // last sender, always
	unread = false;
	users = null; // list of users, for pm rooms
	
	constructor(name, users) {
		if (typeof name != "string") {
			users = name.users;
			name = name.name;
		}
		this.name = name;
		this.users = users;
		this.box = this.makeBox();
	};
	
	static updateStyles() { //can this be a setter on style?
		Room.list.forEach(room=>{
			//console.log(room.box.style);
			var s = room.style();
			room.box.style.fg = s.fg;
			room.box.style.bg = s.bg;
			//console.log(room.box.style);
			room.updateScrollbar();
		});
		//this.box.render();
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
		return C("["+this.name+"]");
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
	
	print(text) {
		var scroll = this.atBottom();
		this.last = null;
		this.lastUser = null;
		var pane = this.box;
		pane.pushLine(text);
		if (scroll)
			pane.setScrollPerc(100);
		this.updateScrollbar();
		this.box.render();
	};
}

module.exports = Room;
