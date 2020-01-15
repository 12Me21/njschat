var blessed = require("blessed");

var screen = blessed.screen({smartCSR: true});

screen.title = "SmileBASIC Source Chat";

var input = blessed.textbox({
	parent: screen,
	name: "ligma",
	bottom: 0,
	left: 0,
	width: screen.width,
	height: 2,
	//inputOnFocus: true,
	keys: ["C-c"],
	style: {
		bg: "#EEEEEE"
	}
})

var messagepane = blessed.box({
	parent: screen,
	top: 0,
	left: 0,
	width: screen.width,
	height: screen.height-input.height,
	keys: true,
	alwaysScroll: true,
	scrollable: true,
	scrollbar: {
		style: {
			bg: "red"
		}
	}
});

input.key('C-c', function(ch, key) {
	return process.exit(0);
});
screen.key('C-c', function(ch, key) {
	return process.exit(0);
});

input.focus();
input.readInput();

exports.messagepane = messagepane;
exports.input = input;
exports.render = function(){
	screen.render();
}
