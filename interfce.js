var Console = require("console").Console;

var Stream = require("stream");
class StreamToString extends Stream.Writable {
	#dat = ""
	constructor(x, callback){
		super(x);
		this.callback = callback;
	}
	#callback
	set callback(callback){
		this.#callback = callback;
		this.tryCallback();
	}
	_write(chunk, enc, next){
		process.stderr.write(chunk);
		this.#dat += chunk.toString();
		this.tryCallback();
		next();
	}
	tryCallback() {
		if (this.#callback) {
			var i = this.#dat.lastIndexOf("\n");
			if (i!=-1){
				this.#callback(this.#dat.substr(0,i+1))
				this.#dat = this.#dat.substr(i+1);
			}
		}
	}
}

var fakeStdout = new StreamToString();
global.console = Console({
	stdout: fakeStdout,
	stderr: fakeStdout,
	colorMode: true,
});

require("./patch.js");
var G = require("./screen.js");
var I = exports;

fakeStdout.callback = G.log;

exports.onUnload = function(){
	G.onUnload();
}

exports.onLoad = function(state, submit){
	G.onLoad(I, state);
	G.setInputHandler(function(text, room){
		submit({
			type: "message",
			text: text,
			tag: room,
		});
	});
	console.error("hello!");
	
}

exports.updateUserlist = G.updateUserlist;
exports.updateRoomlist = G.updateRoomlist;
exports.prompt = G.prompt;

function stripHTML(string){
	return string
		.replace(/<\/?\w+.*?>/g,"")
		.replace(/&quot;/g,'"')
		.replace(/&gt;/g,">")
		.replace(/&lt;/g,"<")
		.replace(/&apos;/g,"'")
		.replace(/&amp;/g,"&");
}

exports.displayMessage = function({
		message: message = "",
		type: type = "",
		tag: tag = "any",
		sender: sender = {},
		uid: uid = -1,
		username: username = "",
		module: module = "",
		messageID: id = 0,
		safe: safe = "unknown",
}){
	text = stripHTML(message);
	switch(type){
	case "system":
		G.systemMessage(text, tag);
		break;
	case "warning":
		G.warningMessage(text, tag);
		break;
	case "module":
		G.moduleMessage(text, tag, sender);
		break;
	case "message":
		G.message(text, tag, sender);
		break;
	default:
		I.log("unknown message type: "+type);
	}
}

exports.displayMessage.warning = function(text){
	exports.displayMessage({type:"warning",message:text});
}

exports.displayMessage.system = function(text){
	exports.displayMessage({type:"system",message:text});
}

exports.displayMessage.module = function(text){
	exports.displayMessage({type:"module",message:text});
}

exports.onBind = function(){}

exports.onConnect = x=>x;

I.log = G.log;
