// This is the file you should include in your chat scripts
// var API = require("../api.js");
// (or whatever name you want)
// See documentation (I'll probably forget to write this, so remind me if I haven't done it yet lol)

/// ALSO this will probably change a lot lol so don't rely on it too much gosh

var User = require("./user.js");
var Room = require("./room.js");
var Axios = require("axios");
var API = exports;
// array.push(event) - low priority event
// array.unshift(event) - high priority event

// <copied from old location>
// I wonder if this is good enough (having to check .type and whatever)
// I think I'll release this and maybe layer add a nicer system like
// <message unfinished>
API.messageEvents = []; // called before displaying a message
API.submitEvents = []; // called when input is submitted

// maybe don't modify this directly
API.commands = {}; // commands (key is command name without prefix)
API.addCommand = function(name, desc, func) {
	if (typeof name != "string")
		throw "Invalid command name (expected String)";
	if (name[0] == "/")
		name = name.substr(1);
	if (func === undefined) { // no description
		func = desc;
		desc = undefined;
	} else {
		if (typeof desc != "string")
			throw "Invalid command description (expected String)";
	}
	if (!(func instanceof Function))
		throw "Invalid command function (expected Function)";
	if (API.commands[name]) {
		console.warning("Command '"+name+"' is being overridden");
	}
	func.description = desc;
	func.name = name;
	API.commands[name] = func;
};
// todo: maybe some nice arg split function?
API.tryCommands = function(text, room = Room.current) {
	var match = text.match(/^\/(\w+)(?: (.*))?$/);
	if (match && API.commands[match[1]]) {
		return !API.commands[match[1]](match[2]||"", room);
	}
	return false;
}

API.onSubmit = function(text, room) {
	API.submitEvents.forEach(event=>{
		var temp = event(text);
		if (typeof temp == "string")
			text = temp;
	})
	
	if (API.tryCommands(text, room))
		return;
	return text;
}

API.User = User; //this isn't very nice, but
API.Room = Room; // for now...
API.Axios = Axios;
//API.polyChat = null;
API.send = null;

// nickname function
// This is a function that can output either sync or async
// if the nickname of a user is known immediately, you can
// return it as a string right away
// otherwise, call arg 0 and pass the string when the name is retrieved
API.setNicknameHandler = function(func){
	User.prototype.getNickname = func;
};

// todo: maybe wait to load chatjs until
// for example, User.me is set, etc.

// this gets called once all the important API functions have been initialized
// (after the user has logged in)
API.onLoad = function() {
	// Load chatjs
	var pathJoin = require("path").join;
	var chatjsfolder = pathJoin(__dirname, "chatjs");
	var Fs = require("fs");
	Fs.readdirSync(chatjsfolder).forEach(function(file){
		if (/\.js$/.test(file)) {
			try {
				require(pathJoin(chatjsfolder, file));
			} catch (e) {
				console.error("Error while loading chatjs script '"+file+"':"+"\n"+e.stack);
				//API.displayMessage.warning("Error while loading chatjs script '"+file+"':"+"\n"+e.stack);
			}
		}
	});

	API.addCommand("help", "Get help for local commands", function(params){
		if (params==="local") {
			var message = "--Local Javascript Commands--\n";
			for (command in API.commands) {
				message += "/"+command+" => "+API.commands[command].description+"\n"
			}
			API.display.module(message.slice(0,-1));
		} else {
			API.display.module("Type /help local for help with local commands");
			return true;
		}
	});
}
