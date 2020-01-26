require("./patch.js");
var G = require("./screen.js");
var I = exports;
var User = require("./user.js");

exports.onUnload = function(){
	G.onUnload();
}

exports.setInputHandler = G.setInputHandler;

exports.onLoad = function(state, submit, fakeStdout){
	G.onLoad(I, state);
	fakeStdout.callback = G.log;
	//G.setInputHandler();
	console.error("hello!");
}

exports.updateUserlist = G.updateUserlist;
exports.updateRoomlist = require("./room.js").updateList;
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
	if (sender)
		sender = new User(sender);
	text = stripHTML(message);
	switch(type){
	case "system":
		G.systemMessage(text, tag, sender);
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
