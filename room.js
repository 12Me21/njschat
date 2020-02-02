const C = require("./c.js");


function indent(message, indent){
	return indent+message.replace(/\n/g,"\n"+indent);
}

class Room {
	makeBox() {}; // function to make new list element
	tabLabel() {}; // format room name for tab label
	//style() {};

	constructor(name, users) {
		if (typeof name != "string") {
			users = name.users;
			name = name.name;
		}
		if (name == "none")
			name = "any";
		var t = this;
		
		if (Room.list[name]) {
			t = Room.list[name];
		} else { //new room
			t.name = name;
			t.box = t.makeBox();
			Room.list.push(t);
			Room.list[name] = t;
			if (!Room.current)
				t.show();
			t.lastSender = null;
			t.lastNormal = false;
			// maybe this should update the room list
		}
		if (users)
			t.users = users;
		return t;
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

	replaceName(line, user, realRoom) {
		//var oldUser = this.nameLines[line]
		//if (!oldUser) {//uh oh
	//		console.warn("failed to replace name"); //todo: more info
	//		return;
		//	}
		var text = user.formatMessageUsername(); //hardcoded indent :(
		//if (prefix)
		//	text += " "+prefix;
		this.box.setLine(line, text);
		this.box.render();
	}

	static updateList(newRooms) {
		// maybe have a function take a list of rooms
		// from roomlist, and add the default rooms, and store this
		// as "current rooms"
		// separate from the full list, for purposes of interning and
		// etc.
		Room.drawList(Room.list.map(room=>room.tabLabel()).join(""));
	};

	messageLabel() {
		return C("["+this.name+"]",[128,128,128]);
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
	
	print(text, sender, normal, realRoom) {
		
		var scroll = this.atBottom();
		var pane = this.box;
		
		if ((!sender || sender != this.lastSender || this.lastRealRoom != realRoom) && this.name != "console") {
			pane.pushLine("");
		}
		// normal message, needs name labelll
		if (normal && sender && (!this.lastNormal || this.lastSender != sender || this.lastRealRoom != realRoom)) {
			var line = pane.lineCount();
			pane.pushLine(sender.formatMessageUsername());
			sender.getNickname(user=>{
				this.replaceName(line, user, realRoom);
			});
		}
		this.lastNormal = normal;
		this.lastSender = sender;
		this.lastRealRoom = realRoom;
		
		pane.pushLine(text);
		
		if (scroll)
			pane.setScrollPerc(100);
		this.updateScrollbar();
		this.box.render();
	};
}

Room.drawList = null; // function to update list graphics
Room.list = []; // list of all rooms
Room.current; // current room
Room.scrollbarStyle = null;
Room.formatName = null;

/*new Room("console");
new Room("general");
new Room("offtopic");
new Room("admin");
new Room("any");*/
// can't create the rooms here, because graphics/config aren't ready yet
// This is kind of a problem, uh
// just be careful about creating rooms, I guess

module.exports = Room;
