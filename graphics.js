
var Graphics = exports

//var Avatar = require("./avatar.js");

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
	/*style: {
		bg: "#EEEEFF"
	}*/
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
		fg: "#C0C0C0",
		bg: "#000080",
	}
})

var userlist = blessed.box({
	parent: screen,
	top: roomlist.height,
	height: 1,
	tags: true,
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
		_: {
			last:null
		},
	})
}

var messagepanes = {};

allTags.forEach(name=>{
	messagepanes[name] = new_messagepane(name);
});
var unreads = {};
var messagepane = messagepanes.any;

exports.messagepanes = messagepanes;

exports.current_pane = function(){
	return messagepane.name;
}

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
	exports.update_room_list(allTags);
	screen.render();
	return true;
}

exports.update_room_list = function(rooms) {
	rooms = rooms || allTags;
	roomlist.setContent(" "+rooms.map(x => {
		var name = x;
		if (x == messagepane.name){
			name = "{#FFFFFF-fg}{bold}"+name+"{/bold}{/#FFFFFF-fg}";
		}
		return name+(unreads[x]?ansi([255,255,255],[255,0,192])+"!"+"\x1B[m":" ")
	}).join(" "));
	rooms.forEach(function(x){
		if (!messagepanes[x])
			messagepanes[x] = new_messagepane(x);
	});
	screen.render();
}

exports.switch_pane("console");

// Get color of name in user list
function userlistColor(user) {
	if (user.banned)
		return "#FF0000";
	if (!user.active)
		return "#808080";
	return "#FFFFFF";
}

function draw_userlist(users){
	var usernames=[];
	for (var user of users) {
		usernames.push(Graphics.colorize(user.username, userlistColor(user)));
	}
	userlist.setContent(usernames.join(" "));
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
function nextTag(offset){
	var i = allTags.indexOf(currentTag());
	if (i==-1)
		return 0;
	return (i+offset+allTags.length)%allTags.length;
}
input.key('left', function(ch, key) {
	setTabTag(allTags[nextTag(-1)]);
});
input.key('right', function(ch, key) {
	setTabTag(allTags[nextTag(1)]);
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
	var pane = messagepanes[tag] || messagepanes.console
	var scroll = exports.is_near_bottom();
	pane._.last = null;
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
			if (tag != "console")
				print("["+tag+"]"+text, "any");
		} else {
			for (name in messagepanes) {
				if (name != "console")
					print(text, name);
			}
		}
	} else {
		print(text, "console");
	}
	screen.render();
}

exports.console = {
	log: function(...a){
		a = a.join(" ");
		exports.print(blessed.escape(a),"console");
	},
	ln: Math.log,
	warn: function(...a){
		a = a.join(" ");
		exports.print(Graphics.colorize(a,"#008000"),"console");
	},
	error: function(...a){
		a = a.join(" ");
		exports.print(Graphics.colorize(a,"#FF0000"),"console");
	},
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
		if (name != "console")
			messagepanes[name].setText("");
	}
}

exports.setNotificationStateForTag = function(tag, state){
	unreads[tag] = state;
	exports.update_room_list();
}

function indent(message, indent){
	return indent+message.replace(/\n/g,"\n"+indent);
}

/*function insertAvatar(pane, y, data) {
	//console.log(data[0],data[1]);
	var x = pane.getLine(y);
	var text = ""
	for (var i=0;i<4;i++){
		text += ansi(data[i],data[i+4])+"▀";
	}
	text += "\x1B[m";
	pane.setLine(y,text+x.substr(4))
	text = ""
	x = pane.getLine(y+1);
	for (var i=8;i<12;i++){
		text += ansi(data[i],data[i+4])+"▀";
	}
	text += "\x1B[m";
	pane.setLine(y+1,text+x.substr(4))
	screen.render();
	}*/

function ansi(fg,bg){
	if (!bg)
		return "\x1B[38;2;"+fg[0]+";"+fg[1]+";"+fg[2]+"m";
	if (!fg)
		return "\x1B[48;2;"+bg[0]+";"+bg[1]+";"+bg[2]+"m";
	return "\x1B[38;2;"+fg[0]+";"+fg[1]+";"+fg[2]+";48;2;"+bg[0]+";"+bg[1]+";"+bg[2]+"m";
}


exports.printMessage = function(user, message, tab){
	var username = user.username;
	var pane = messagepanes[tab]
	var y = pane.getScrollHeight();
	if (pane._.last == username) {
		Graphics.print(indent(message,"   ","   "), tab);
	} else {
		Graphics.print("  \x1B[48;2;192;192;192m"+username+"\x1B[m:", tab);
		Graphics.print(indent(message,"   ","   "), tab);
		//Avatar.get3x2(user.avatar,function(data){
	//		insertAvatar(pane, y, data);
//		})
	}
	pane._.last = username;
}

//exports.printSystemMessage =f
