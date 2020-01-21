//TODO: resize events

var S = require("./settings.js");

var Graphics = exports

//var Avatar = require("./avatar.js");

var blessed = require("blessed");

var screen = blessed.screen({
	smartCSR: true,
	//useBCE: false,
	title: "SBS Chat",
});

var chatpane = blessed.box({
	parent: screen,
});

var minDim = Math.min(screen.width, screen.height*2);

var imageViewer = blessed.box({
	parent: screen,
	width: minDim,
	height: minDim/2,
	right: 0,
	hidden: true,
	tags: true,
});

var input = blessed.textbox({
	parent: chatpane,
	bottom: 0,
	left: 0,
	height: 2,
	keys: true,
	style: S.input,
})

var divider = blessed.box({
	parent: chatpane,
	bottom: input.height,
	height: 1,
	style: S.divider(),
})

var roomlist = blessed.box({
	parent:chatpane,
	top: 0,
	height: 1,
	tags: true,
	style: S.roomlist,
})

var userlist = blessed.box({
	parent: chatpane,
	top: roomlist.height,
	height: 1,
	tags: true,
	style: S.userlist,
})

function new_messagepane(name){
	var scrollbarColors = S.messagepane.scrollbar(name, false);
	return blessed.box({
		parent: chatpane,
		top: userlist.height+roomlist.height,
		left: 0,
		//width: screen.width,
		height: chatpane.height-input.height-divider.height-userlist.height-roomlist.height,
		keys: true,
		alwaysScroll: true,
		scrollable: true,
		scrollbar: {
			style: {bg: scrollbarColors.fg},
			track: {bg: scrollbarColors.bg},
		},
		style: S.messagepane.style(),
		tags: true,
		hidden: true,
		name: name,
		_: { // user data
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
		return S.room_name(x, messagepane.name==x, unreads[x] && x!="any");
	}).join(" "));
	rooms.forEach(function(x){
		if (!messagepanes[x])
			messagepanes[x] = new_messagepane(x);
	});
	// we never remove old messagepanes ( closed pm rooms)
	// maybe it should do something ...
	screen.render();
}

exports.switch_pane("console");

function draw_userlist(users){
	var usernames=[];
	for (var user of users) {
		usernames.push(S.userlist_name(user));
	}
	userlist.setContent(usernames.join(" "));
	screen.render();
}

input.key(S.keys.exit, function(ch, key) {
	return process.exit(0);
});
screen.key(S.keys.exit, function(ch, key) {
	return process.exit(0);
});

//input.key('C-z', function(ch, key) {
//	return process.kill(process.pid, "SIGSTOP");
//});

function updatescrollbar(pane){
	if (!pane || pane == messagepane) {
		var s = S.messagepane.scrollbar(messagepane.name, messagepane.getScrollPerc()==100)
		messagepane.scrollbar.style.bg = s.fg;
		messagepane.scrollbar.track.bg = s.bg;
	}
}
	
input.key(S.keys.closeImage, function(ch, key) {
	imageViewer.hide();
	chatpane.width = screen.width;
	screen.render();
});
input.key(S.keys.scroll[0], function(ch, key) {
	messagepane.scroll(-1);
	updatescrollbar();
	screen.render();
});
input.key(S.keys.scroll[1], function(ch, key) {
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
input.key(S.keys.room[0], function(ch, key) {
	setTabTag(allTags[nextTag(-1)]);
});
input.key(S.keys.room[1], function(ch, key) {
	setTabTag(allTags[nextTag(1)]);
});

input.key(S.keys.scrollPage[0], function(ch, key) {
	messagepane.scroll(-(messagepane.height-2));
	updatescrollbar();
	screen.render();
});

input.key(S.keys.scrollPage[1], function(ch, key) {
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
	screen.render();
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

exports.printMessage = function(user, message, tab){
	var username = user.username;
	var pane = messagepanes[tab]
	var y = pane.getScrollHeight();
	if (pane._.last == username) {
		Graphics.print(indent(message,"   ","   "), tab);
	} else {
		
		Graphics.print("  "+S.username(user), tab);
		Graphics.print(indent(message,"   ","   "), tab);
		//Avatar.get3x2(user.avatar,function(data){
	//		insertAvatar(pane, y, data);
//		})
	}
	pane._.last = username;
}

//exports.printSystemMessage =f

function ansi(fg,bg){
	return "\x1B[38;2;"+fg[0]+";"+fg[1]+";"+fg[2]+";48;2;"+bg[0]+";"+bg[1]+";"+bg[2]+"m";
}
var Avatar = require("./avatar.js");
function displayImage(url) {
	Avatar.getImage(url, minDim, minDim, function(data, width, height){
		var str="";
		var n=0;
		for (var j=0;j<height;j+=2){
			if (j)
				str+="\n";
			for (var i=0;i<width;i++){
				str+=ansi(data[n],data[n+width])+"▀";
				n++;
			}
			n+=width;
			str +="\x1B[m";
		}
		imageViewer.setContent(str);
		imageViewer.show();
		chatpane.width = screen.width-imageViewer.width;
		imageViewer.setIndex(100);
		screen.render();
	});
}

global.di = displayImage;
