//nnnnn
// so right now, when a Room is created, it's immediately added to Room.list (which is then displayed)
// maybe it would be better to not do this, because rooms are created in PolyChat, so
// I mean, have a separate list for displaying, and update that manually, or something?

require("./patch.js");

var Console = require("console").Console;
var Stream = require("stream");

class StreamToString extends Stream.Writable {
	constructor(x, callback){
		super(x);
		this.callback = callback;
		this.dat = "";
	}
	set callback(callback){
		this._callback = callback;
		this.tryCallback();
	}
	_write(chunk, enc, next){
		if (!process.stderr.isTTY)
			process.stderr.write(chunk);
		this.dat += chunk.toString();
		this.tryCallback();
		next();
	}
	tryCallback() {
		if (this._callback) {
			// flush on newlines
			var i = this.dat.lastIndexOf("\n");
			if (i!=-1){
				this._callback(this.dat.substr(0,i+1))
				this.dat = this.dat.substr(i+1);
			}
		}
	}
}

// set up error handling/console as soon as possible
var fakeStdout = new StreamToString();
global.console = new Console(fakeStdout, fakeStdout);

process.on("uncaughtException", (e)=>{ //UNLIMITED POWER
	console.error(C("UNCAUGHT EXCEPTION!",[255,255,255],[255,0,0]));
	console.error(e);
});
process.on("unhandledRejection", (e, p) => {
	console.error(C("UNHANDLED REJECTION!",[255,255,255],[255,0,0]));
	console.error(e);
	console.error(p);
});

var User = require("./user.js");
var Room = require("./room.js");
const URL = require("./url.js"); //replicates URL library for compatibility with old nodejs
const C = require("./c.js");
var PolyChat = require("./polychat2.js");
var Auth = require("./auth.js");
var G = require("./screen.js");

function displayMessage(messageData){

	function stripHTML(string){
		return string
			.replace(/<\/?\w+.*?>/g,"")
			.replace(/&quot;/g,'"').replace(/&apos;/g,"'")
			.replace(/&gt;/g,">").replace(/&lt;/g,"<")
			.replace(/&amp;/g,"&");
	}
	
	var {
		module: module,
		spamvalue: spamvalue,
		tag: tag = new Room("any"),
		encoding: encoding,
		safe: safe = "unknown",
		sender: sender = {},
		sendtype: sendtype,
		recipients: recipients = [],
		type: type = "",
		id: id = 0,
		message: message,
		time: time,
	} = messageData;
	
	var text = stripHTML(message);
	
	switch(type){
	case "system":
		G.systemMessage(text+" ("+sendtype+")", tag, sender);
		break;
	case "warning":
		G.warningMessage(text, tag);
		break;
	case "module":
		G.moduleMessage(text, tag, sender);
		break;
	case "message":
		var encoding = messageData.encoding;
		// so these encodings are "special"
		if (encoding == "image")
			G.imageMessage(text, tag, sender);
		else if (encoding == "draw")
			G.drawingMessage(text, tag, sender);
		// everything else is mostly normal text
		else
			G.message(text, tag, sender);
		break;
	default:
		console.error("unknown message type: "+type);
	}
}
displayMessage.warning = function(text){
	displayMessage({type:"warning",message:text});
}
displayMessage.system = function(text){
	displayMessage({type:"system",message:text});
}
displayMessage.module = function(text){
	displayMessage({type:"module",message:text});
}

fakeStdout.callback = G.log;

var polyChat;

var defaultRooms = [
	new Room("console"),
	new Room("general"),
	new Room("offtopic"),
	new Room("admin"),
	new Room("any"),
];

function submitMessage(text, roomName){
	polyChat.sendMessage({
		type: "message",
		text: text,
		tag: roomName,
	});
}

console.log("starting");

Auth(G.prompt, "session.txt").then(function([user, auth, session, errors]){
	if (!user){
		console.warn("Failed to log in");
		console.warn(errors.join("\n"));
		return;
	}

	var {uid: useruid, username: username} = user;
	
	G.setInputHandler(submitMessage);

	// ws url override argument
	var override = null;
	if (process.argv[2] && new URL(process.argv[2])) {
		override = process.argv[2];
	} else {
		override = require("./config.js").websocketUrl;
	}
	
	polyChat = new PolyChat(useruid, auth, session, process.argv[2]=='-p')
	
	if (override) {
		polyChat.webSocketURL = override;
		console.log("Using custom websocket url: "+polyChat.webSocketURL);
	}
	
	if (!polyChat.forceXHR)
		console.log("if chat is using websockets and fails to connect, try -p flag to use https proxy");
	
	var firstMessageList = false;
	
	polyChat.onMessage = function(message){
		if (!firstMessageList) {
			firstMessageList = true;
			console.log("Got first message list :D");
		}
		displayMessage(message);
	};
	
	polyChat.onList = function(msg) {
		G.updateUserlist(msg.users);
		Room.updateList(defaultRooms.concat(msg.rooms)); //probably does nothing
	};

	polyChat.onResponse = function(msg) {
		//honestly this could probably be done by polychat too uwu
		if (msg.from=="bind"){
			if(!msg.result){
				polyChat.close("You could not be authenticated");
				console.warn("Reason: " + msg.errors.join("\n"));
			} else {
				// normal chat gets a list of modules here, for whatever reason
				polyChat.sendMessage({type:"request", request:"messageList"});
				// BIND DONE!
			}
		} else {
			if (!msg.result) {
				msg.errors.forEach(error=>{
					displayMessage.warning("Received error response from chat: " + error);
				});
			}
		}
	};
	
	polyChat.start();
})
