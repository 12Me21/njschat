var blessed = require("blessed");

var screen = blessed.screen({
	smartCSR: true,
	//useBCE: false,
	background: "#FFFFFF",
});

screen.title = "SmileBASIC Source Chat";

var input = blessed.textbox({
	parent: screen,
	bottom: 0,
	left: 0,
	height: 2,
	//inputOnFocus: true,
	keys: ["C-c"],
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

var userlist = blessed.box({
	parent: screen,
	top: 0,
	height: 1,
	style: {
		fg: "#FFFFFF",
		bg: "#000000",
	}
})

function new_messagepane(name){
	return blessed.box({
		parent: screen,
		top: userlist.height,
		left: 0,
		width: screen.width,
		height: screen.height-input.height-divider.height-userlist.height,
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
	messagepane.hide();
	messagepane = messagepanes[name];
	messagepane.show();
	updatescrollbar();
	exports.write_divider("Tab: "+name+"  (don't worry this is temporary)");
	screen.render();
}

exports.update_room_list = function(rooms) {
	rooms.forEach(function(x){
		if (!messagepanes[x.name])
			messagepanes[x.name] = new_messagepane(x.name);
	});
}

exports.switch_pane("any");

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
input.readInput();

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
	if (tag) {
		if (!messagepanes[tag]){
			messagepanes[tag] = new_messagepane(tag);
		}
		
		if (tag != "any"){
			print(text, tag);	
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
	exports.print("{red-fg}"+blessed.escape(a)+"{/red-fg}");
}
