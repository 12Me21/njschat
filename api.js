// these are functions that are used by a lot of things
//  added to the global scope

global.allTags = ["general", "offtopic", "admin", "debug", "any"];

const Graphics = require("./graphics.js");
const Fs = require("fs");

global.PolyChat = require("./polychat.js").PolyChat;
global.polyChat = new PolyChat(Graphics);

global.window = global; //maybe

function print_tmp(text, tag, color){
	text = text.replace(/\n*$/,"");
	text = Graphics.colorize(text, color);
	Graphics.print(text, tag);
}

global.auth = null;
global.useruid = null;
global.username = null;
global.pmRooms = {}; //new
global.lastUserList = [];

global.warningMessage = function(message) {
   var messageJSON = { "type" : "warning", "message" : message };
   displayMessage(messageJSON);
}

global.systemMessage = function(message) {
	var messageJSON = { "type" : "system", "message" : message };
	displayMessage(messageJSON);
}

function unescape_html(string){
	return string
		.replace(/&quot;/g,'"')
		.replace(/&gt;/g,">")
		.replace(/&lt;/g,"<")
		.replace(/&apos;/g,"'")
		.replace(/&amp;/g,"&");
}

var messageCallbacks = [];

global.addMessageEvent = function(func) { messageCallbacks.push(func); }

global.displayMessage = function(messageJSON){
	var message = getOrDefault(messageJSON.message, "");
	var type = getOrDefault(messageJSON.type, "");
	var tag = getOrDefault(messageJSON.tag, "any");
	var sender = getOrDefault(messageJSON.sender, {});
	var uid = getOrDefault(sender.uid, -1);
	var username = getOrDefault(sender.username, "");
	var module = getOrDefault(messageJSON.module, "");
	var messageID = getOrDefault(messageJSON.id, 0);
	var safe = getOrDefault(messageJSON.safe, "unknown");

	if(tag!=currentTag()) {
		Graphics.setNotificationStateForTag(tag,true);
	}
	
	if(type === "system") {
		print_tmp(unescape_html(message), tag, "gray");
	}else if(type ==="warning"){
		print_tmp(unescape_html(message), tag, "red");
	} else if(type === "module") {
		print_tmp(unescape_html(message), tag, "gray");
	} else if (type === "message") {
		if (messageJSON.encoding == "draw")
			message = "[drawing]";
		
		print_tmp(username + ": " + unescape_html(message), tag);
	} else {
		print_tmp("Tried to display an unknown message type: ");
		return;
	}
	for(i = 0; i < messageCallbacks.length; i++) {
		if(messageCallbacks[i])	{
			if(messageCallbacks[i](dispMessage)) {
				dispMessage = false;
			}
		}
	}
}

global.localModuleMessage = function(message)
{
	var messageJSON = 
		{ 
			"type" : "module", 
			"message" : message, 
			"tag" : currentTag(), 
			"uid" : useruid,
			"module" : "localcommand"
		};

	displayMessage(messageJSON);
}

global.getOrDefault = function(variable, defaultValue){
	return typeof variable==='undefined' ? getOrDefault(defaultValue,false) : variable;
}

global.sendMessage = function(message,addCommand){
	if(message.trim().length===0)
		return;
	var json={
		'type':'message','text':message,'key':auth,'tag':currentTag()
	};
	polyChat.sendMessage(JSON.stringify(json));
}

global.setTabTag = function(tag){
	Graphics.setNotificationStateForTag(tag, false);
	return Graphics.switch_pane(tag);
}

global.currentTag = function(){
	return Graphics.current_pane();
}

global.onSubmitMessage = function(message){
	//Forget the event! People just want the textbox.
	var handled = false;
	
	var eventParam = {value: message};
	
	for(var i = 0; i < onSubmitMessage.events.length; i++)
		if(onSubmitMessage.events[i](eventParam))
			handled = true;

	if (!handled)
		sendMessage(message);
	
	return false;
}

onSubmitMessage.events = [];

global.Command = function (command, callback, description)
{
	this.command = command;
	this.callback = callback;
	this.description = getOrDefault(description, "");
}

var Chatcommands = require("./commands.js");

global.commands = [];

global.quickParamParse = function(params)
{
	var paramSplit = params.split(/\s+/);

	paramSplit = paramSplit.filter(function(n){ return n; });

	return paramSplit;
}

// Load chatjs
var pathJoin = require("path").join;
var chatjsfolder = pathJoin(__dirname, "chatjs");
Fs.readdirSync(chatjsfolder).forEach(function(file){
	try {
		require(pathJoin(chatjsfolder, file));
	} catch (e) {
		warningMessage("Error while loading chatjs script '"+file+"':"+"\n"+e.stack);
	}
});
