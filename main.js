'use strict';

//nnnnn
// so right now, when a Room is created, it's immediately added to Room.list (which is then displayed)
// maybe it would be better to not do this, because rooms are created in PolyChat, so
// I mean, have a separate list for displaying, and update that manually, or something?

class StreamToString extends require('stream').Writable {
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
var Console = global.console.Console;
delete global.console;
global.console = Console(fakeStdout, fakeStdout);

const C = require('./c.js');
process.on('uncaughtException', (e)=>{ //UNLIMITED POWER
	console.error(C("UNCAUGHT EXCEPTION!",[255,255,255],[255,0,0]));
	console.error(e);
});
process.on('unhandledRejection', (e, p) => {
	console.error(C("UNHANDLED REJECTION!",[255,255,255],[255,0,0]));
	//console.error(e);
	console.error(p);
});

require('./patch.js');
const User = require('./user.js');
const Room = require('./room.js');
const PolyChat = require('./polychat2.js');
const SBSAuth = require('./auth2.js');
const G = require('./screen.js');
const Axios = require('axios');



//process.on("SIGCONT", G.onResume);

const API = require('./api.js');

API.display = displayMessage;

function displayMessage(messageData){
	function stripHTML(string){
		return string
			.replace(/\x1B/g,"")
			.replace(/<\/?\w+.*?>/g,"")
			.replace(/&quot;/g,'"').replace(/&apos;/g,"'")
			.replace(/&gt;/g,">").replace(/&lt;/g,"<")
			.replace(/&amp;/g,"&");
	}
	
	var {
		tag: tag = new Room('any'),
		sender: sender,
		type: type,
		message: message,
		//time: time,
	} = messageData;
	var text = messageData.text = stripHTML(message);
	// todo: try/catch
	API.messageEvents.forEach(x => x(messageData));
	
	switch(type){
	case 'system':
		G.systemMessage(text+" ("+messageData.sendtype+")", tag, sender);
		break;
	case 'warning':
		G.warningMessage(text, tag);
		break;
	case 'module':
		var module = messageData.module;
		G.moduleMessage(text, tag, sender);
		break;
	case 'message':
		var encoding = messageData.encoding;
		// so these encodings are "special"
		if (encoding == 'image')
			G.imageMessage(text, tag, sender);
		else if (encoding == 'draw')
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
	displayMessage({type:'warning',message:text});
}
displayMessage.system = function(text){
	displayMessage({type:'system',message:text});
}
displayMessage.module = function(text){
	displayMessage({type:'module',message:text});
}

var polyChat = new PolyChat();
API.polyChat = polyChat;

var defaultRooms = [
	new Room('console'),
	new Room('general'),
	new Room('offtopic'),
	new Room('admin'),
	new Room('any'),
];

fakeStdout.callback = function(a){
	new Room('console').print(a);
};

var QueryString = require('querystring');
API.writePersistent = function(name, value, callback) {
	Axios.post(
		"https://smilebasicsource.com/query/submit/varstore",
		QueryString.stringify({name: name, value: value, psession: polyChat.session}),
		{headers: {'Content-Type': 'application/x-www-form-urlencoded'}}
	).then(callback); //maybe have a catch or something
};

// todo:
// print important error messages (connection error, etc.) as
// warnings

// also temporary

// wait what if this was a method on Room... (nnnn)
function submitMessage(text, roomName = Room.current.name){
	// idea: handle console input here instead of in screen.js
	// ah except, we don't want console input to depend on the inputhandler
	// being set to this function (it should be available always)

	//I feel like this should be able to modify room name
	text = API.onSubmit(text, roomName);
	
	if (text)
		polyChat.sendMessage({
			type: 'message',
			text: text,
			tag: roomName,
		});
}

API.sendMessage = submitMessage;


var sessionFile = "session.txt";
var x = process.argv.indexOf("-s");
if (x!=-1) {
	sessionFile = process.argv[x+1];
	console.log("-s Using session file: "+sessionFile);
}

var host = "https://smilebasicsource.com";
if (process.argv.includes("-d")) {
	console.log("-d Using development site");
	host = "https://randomouscrap98.smilebasicsource.com";
	polyChat.webSocketURL = "ws://chat.smilebasicsource.com:45697/chatserver";
	polyChat.proxyURL = "https://randomouscrap98.smilebasicsource.com/query/submit/chatproxy";
	sessionFile = "dev-"+sessionFile;
	console.log("-s Using session file: "+sessionFile);
}

var useProxy = process.argv.includes("-p");
if (useProxy) {
	console.log("-p Using https proxy");
}

var override;
var x = process.argv.indexOf("-w");
if (x!=-1) {
	override = process.argv[x+1];
	console.log("-w Using custom websocket url: "+override);
}

new SBSAuth(G.prompt, sessionFile, host).logIn().then((auth)=>{
	if (!auth) {
		console.warn("Authentication failed. not connecting to chat");
		return;
	}
	User.me = auth.user; //not complete, will be updated by userlist + messages later
	G.setInputHandler(submitMessage, false);
	
	// otherwise, try loading override from config.js
	if (!override) {
		override = require('./config.js').websocketUrl;
	}
	
	if (override) {
		polyChat.webSocketURL = override;
	}
	
	API.onLoad();
	polyChat.start(auth.user.uid, auth.chatauth, auth.session, useProxy);

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
		// maybe this can take the msg.list, because that indicates
		// which rooms still exist (since rooms can die)
		Room.updateList();
	};

	polyChat.onResponse = function(msg) {
		//honestly this could probably be done by polychat too uwu
		if (msg.from=="bind"){
			if(!msg.result){
				polyChat.close("You could not be authenticated");
				console.warn("Reason: " + msg.errors.join("\n"));
			} else {
				// normal chat gets a list of modules here, for whatever reason
				polyChat.requestMessageList();
				// BIND DONE!
			}
		} else {
			if (!msg.result) {
				msg.errors.forEach(error=>{
					displayMessage.warning("[Server] " + error);
				});
			}
		}
	};
});
