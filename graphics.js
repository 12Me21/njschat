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

var messagepane = blessed.box({
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
			bg: "red"
		}
	}
});

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

input.key('up', function(ch, key) {
	messagepane.scroll(-1);
	screen.render();
});

input.key('down', function(ch, key) {
	messagepane.scroll(1);
	screen.render();
});

input.key('pageup', function(ch, key) {
	messagepane.scroll(-(messagepane.height-2));
	screen.render();
});

input.key('pagedown', function(ch, key) {
	messagepane.scroll(messagepane.height-2);
	screen.render();
});

input.focus();
input.readInput();

exports.messagepane = messagepane;
exports.input = input;
exports.render = function(){
	screen.render();
}
exports.draw_userlist = draw_userlist;
exports.separator = divider; //oops
