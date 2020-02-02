// This is the file you should include in your chat scripts
// var API = require("./api.js");
// (or whatever name you want)
// See documentation (I'll probably forget to write this, so remind me if I haven't done it yet lol)
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
API.tryCommands = function(text) {
	var match = text.match(/^\/(\w+)(?: (.*))?$/);
	if (match && API.commands[match[1]]) {
		API.commands[match[1]](match[2]||"");
		return true;
	}
	return false;
}

API.onSubmit = function(text, roomName) {
	API.submitEvents.forEach(event=>{
		var temp = event(text);
		if (typeof temp == "string")
			text = temp;
	})
	
	if (API.tryCommands(text))
		return;
	return text;
}

API.User = User; //this isn't very nice, but
API.Room = Room; // for now...
API.Axios = Axios;
API.polyChat = null;
API.submitMessage = null;

// nickname function
// This is a function that can output either sync or async
// if the nickname of a user is known immediately, you can
// return it as a string right away
// otherwise, call arg 0 and pass the string when the name is retrieved
API.setNicknameHandler = function(func){
	User.prototype.getNickname = func;
};

////////// TEMP CHATJS SCRIPTS //////////
// todo: maybe define nickname getter as a sort of plug-in to Users
// rather than it being hardcoded

API.addCommand("nick", "set your nickname", function(params) {
	// The nickname protocol is a bit weird, because of backwards compatibility etc.
	API.submitMessage("[rpl29nick] "+API.User.me.username+"'s name is now "+params);
	// the nickname system uses a weird protocol uhhhh
	// yeah can't wait for rp30 lol
	function write_persistent(name, value) {
		
		function escape_name(name) {
			// why does this even exist lol I don't remember
			// wait I think it was for like
			// utf8?
			var out = ""
			for(var i=0; i<name.length; i++){
				var chr = name.charAt(i);
				if(chr=="\0" || chr>="\x7F" || chr=="%")
					out += escape(chr);
				else
					out += chr;
			}
			return out;
		}
		function encodeBase64(string) {
			return Buffer.from(String(string), "binary").toString("base64");
		}
		API.Axios.get(
			"https://smilebasicsource.com/query/submit/varstore"+
				"?nameb64="+encodeBase64(name)+
				"&valueb64="+encodeBase64(escape_name(value))+
				"&session="+API.polyChat.session
		);
	}
	write_persistent("nickname_tcf", params || "\r\n");
});

API.messageEvents.push(function(msg){
	if (msg.type=="message" && msg.encoding=="text") {
		var match = msg.text.match(/^\[rpl[23]\dnick] (.*?)'s name is now (.*)/);
		if (match) {
			msg.sender.nickname = match[2] || false;
		}
	}
});

API.setNicknameHandler(function(callback){
	var gotNickname = (success)=>{
		if (success)
			this.nicknameCallbacks.forEach(x=>{
				if (x)
					x(this);
			});
		this.requestedNickname = false;
		this.nicknameCallbacks = [];
	}
	// limit an action to once every `interval` milliseconds
	var last = 0;
	function limit(interval, callback) {
		var now = Date.now();
		var ok = last + interval;
		if (now >= ok){
			last = now;
			callback();
		} else {
			last = ok;
			setTimeout(callback, ok-now);
		}
	}
	if (this.nickname === undefined) {
		this.nicknameCallbacks.push(callback);
		if (!this.requestedNickname) {
			this.requestedNickname = true;
			limit(100, ()=>{
				if (this.nickname !== undefined) {
					// got nickname while waiting
					gotNickname(true);
				} else {
					console.log("requesting nickname for "+this.username);
					API.Axios.get("http://smilebasicsource.com/query/tinycomputerprograms?username="+this.username+"&program=nickname").then(response=>{
						var nickname = unescape(response.data).replace(/\x1B/g,"");
						if (nickname >= " " && nickname != "\r\n") {
							this.nickname = nickname;
							gotNickname(true);
						} else {
							this.nickname = false;
							gotNickname(false);
							// wait should this still activate the callbacks...
						}
					}).catch(error=>{
						console.error("Nickname request failed");
						console.error(error);
						this.nickname = false;
						gotNickname(false);
					});
				}
			});
		}
		return null;
	} else if (this.nickname === false) {
		// user doesn't have a nickname set
		return this.username;
	} else {
		return this.nickname;
	}
});
