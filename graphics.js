var blessed = require("blessed");

var screen = blessed.screen({
	smartCSR: true,
	//useBCE: false,
	background: "#FFFFFF",
	title: "SBS Chat",
});

var input = blessed.textbox({
	parent: screen,
	bottom: 0,
	left: 0,
	height: 2,
	//inputOnFocus: true,
	keys: true,//["C-c"],
	style: {
		bg: "#EEEEFF"
	}
})

var divider = blessed.box({
	parent: screen,
	bottom: input.height,
	height: 1,
	style: {
		fg: "#FFFFFF",
		bg: "#00C8B4",
	}
})

var roomlist = blessed.box({
	parent:screen,
	top: 0,
	height: 1,
	tags: true,
	style: {
		fg: "#FFFFFF",
		bg: "#000080",
	}
})

var userlist = blessed.box({
	parent: screen,
	top: roomlist.height,
	height: 1,
	style: {
		fg: "#FFFFFF",
		bg: "#000000",
	}
})

function new_messagepane(name){
	return blessed.box({
		parent: screen,
		top: userlist.height+roomlist.height,
		left: 0,
		width: screen.width,
		height: screen.height-input.height-divider.height-userlist.height-roomlist.height,
		keys: true,
		alwaysScroll: true,
		scrollable: true,
		scrollbar: {
			style: {
				bg: "#FF0000"
			},
			track: {
				bg: "#DDD"
			}
		},
		tags: true,
		hidden: true,
		name: name,
	})
}

var messagepanes = {
	offtopic: new_messagepane("offtopic"),
	general: new_messagepane("general"),
	admin: new_messagepane("admin"),
	any: new_messagepane("any"),
	debug: new_messagepane("debug")
};

var unreads = {};

var messagepane = messagepanes.any;

exports.messagepanes = messagepanes;

exports.current_pane = function(){
	return messagepane.name;
}

exports.separator = divider; //oops
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
	exports.write_divider("Tab: "+name+"  (don't worry this is temporary)");
	exports.update_room_list(allTags);
	screen.render();
	return true;
}

exports.update_room_list = function(rooms) {
	roomlist.setContent(" "+rooms.map(x => {
		var name = x;
		if (x == messagepane.name){
			name = "{bold}"+name+"{/bold}";
		}
		return name+(unreads[x]?"{#FF0000-fg}(!){/#FF0000-fg}":"   ")
	}).join("| "));
	rooms.forEach(function(x){
		if (!messagepanes[x])
			messagepanes[x] = new_messagepane(x);
	});
	screen.render();
}

exports.switch_pane("debug");

function draw_userlist(users){
	var usernames=[];
	users.forEach(function(user){
		usernames.push(user.username);
	});
	userlist.setText(usernames.join(" | "));
	screen.render();
}

input.key('C-c', function(ch, key) {
	return process.exit(0);
});
screen.key('C-c', function(ch, key) {
	return process.exit(0);
});

//input.key('C-z', function(ch, key) {
//	return process.kill(process.pid, "SIGSTOP");
//});

function updatescrollbar(pane){
	if (!pane || pane == messagepane) {
		if (messagepane.getScrollPerc()==100) {
			messagepane.scrollbar.style.bg = "#0F0";
			messagepane.scrollbar.track.bg = "#AAFFAA"
		} else {
			messagepane.scrollbar.style.bg = "#F00";
			messagepane.scrollbar.track.bg = "#FAA";
		}
	}
}

input.key('up', function(ch, key) {
	messagepane.scroll(-1);
	updatescrollbar();
	screen.render();
});
input.key('down', function(ch, key) {
	messagepane.scroll(1);
	updatescrollbar();
	screen.render();
});
input.key('pageup', function(ch, key) {
	messagepane.scroll(-(messagepane.height-2));
	updatescrollbar();
	screen.render();
});
input.key('pagedown', function(ch, key) {
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

function print(text, tag){
	var pane = messagepanes[tag] || messagepanes.debug;
	var scroll = exports.is_near_bottom();
	pane.pushLine(text);
	if (scroll)
		pane.scrollTo(pane.getScrollHeight());
	updatescrollbar(pane);
}

exports.print = function(text, tag){
	//text=text.replace(/\n/g,"$\n");
	//text=text.replace(/\n*$/,"");
	if (tag) {
		if (!messagepanes[tag]){
			messagepanes[tag] = new_messagepane(tag);
		}
		
		if (tag != "any"){
			print(text, tag);	
			if (tag != "debug")
				print("["+tag+"]"+text, "any");
		} else {
			for (name in messagepanes) {
				if (name != "debug")
					print(text, name);
			}
		}
	} else {
		print(text, "debug");
	}
	screen.render();
}

exports.log = function(a){
	exports.print("{red-fg}"+blessed.escape(a)+"{/red-fg}","debug");
}

//colorize + strip trailing newlines
exports.colorize = function(text, color) {
	if (color)
		text = text.replace(/^([^]*?)\n*$/, "{"+color+"-fg}$1{/"+color+"-fg}");
	return text;
}

exports.escape = blessed.escape //don't do this :(

exports.clearScreen = function(){
	for (name in messagepanes) {
		if (name != "debug")
			messagepanes[name].setText("");
	}
}

exports.setNotificationStateForTag = function(tag, state){
	unreads[tag] = state;
}
