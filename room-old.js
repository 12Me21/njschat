var C = require("./c.js");

function Room(name, users){
	if (typeof name == "string"){
		this.name = name;
		this.users = users;
	} else {
		this.name = name.name;
		this.users = name.users;
	}
	this.box = this.constructor.makeBox(name);
	this.last = null; //last sender, if last message was normal
	this.lastUser = null; //last sender, always
	this.unread = false;
}

Room.list = [];

Room.makeBox = null;
Room.updateList = null;

Room.prototype.messageLabel = function(){
	return C("["+this.name+"]");
}

Room.prototype.tabLabel = function(){
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
	if (!Room.list[this.name]) {
		Room.list.push(this);
		Room.list[this.name]=this;
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
	Room.updateList();
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
			Room.updateList();
		}
		this.box.scrollbar.style.bg = "#00FF00";
	} else {
		this.box.scrollbar.style.bg = "#FF0000";
	}
	this.box.render();
}

Room.prototype.print = function(text) {
	var scroll = this.atBottom();
	this.last = null;
	this.lastUser = null;
	var pane = this.box;
	pane.pushLine(text);
	if (scroll)
		pane.setScrollPerc(100);
	this.updateScrollbar();
	this.box.render();
}

module.exports = Room;
