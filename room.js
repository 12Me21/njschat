const C = require("./c.js");

class Room {
	static drawList = null; // function to update list graphics
	static list = []; // list of all rooms
	static current; // current room
	makeBox(){}; // function to make new list element
	
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
	
	tabLabel() {
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
			this.box.scrollbar.style.bg = "#00FF00";
		} else {
			this.box.scrollbar.style.bg = "#FF0000";
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
