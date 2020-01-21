global.window = global; //maybe
window.TERMINAL = true;
// these are functions that are used by a lot of things
//  added to the global scope

global.firstMessageListReceived = false;

global.btoa = function(string){
	return Buffer.from(String(string), "binary").toString("base64");
}

global.startChatConnection = function(){};

global.XMLHttpRequest = require("./xhr.js").XMLHttpRequest("https://smilebasicsource.com");

global.genericXHRSimple = function(page, callback){
	var xhr = new XMLHttpRequest();
	xhr.open("POST", page);
	xhr.onload = function(event){
		try{
			callback(xhr.responseText);
		}catch(e){
			console.log("Oops, XHR callback didn't work. Dumping exception");
			console.log(e);
		}
	};
	xhr.onerror = function(){
		console.log("XHR FAILED");
	}
	xhr.send();
}

global.StorageUtilities = {
	GetPHPSession: function(){
		return polyChat.session; //bad
	},
}

global.loadXMLDoc = function(theURL, callback, post){
	post = typeof post !== 'undefined' ? post : false;
	var xmlhttp = new XMLHttpRequest();

	xmlhttp.onreadystatechange=function(){
		if (xmlhttp.readyState==4 && xmlhttp.status==200){
			callback(xmlhttp.responseText);
		}
	};
	if(post){
		//First, make sure the URL is even post worthy. If it's not,
		//simply call our function again as get.
		var parts = theURL.split("?");
		if (parts.length != 2)
			return loadXMLDoc(theURL, callback);
		var params = parts[1];
		xmlhttp.open("POST", parts[0], true);
		xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xmlhttp.send(params);
	}else{
		xmlhttp.open("GET", theURL, true);
		xmlhttp.send();
	}
}

global.allTags = ["general", "offtopic", "admin", "console", "any"];
const Graphics = require("./graphics.js");
console = Graphics.console;
const Fs = require("fs");

global.PolyChat = require("./polychat.js").PolyChat;
global.polyChat = new PolyChat(console);


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

function stripHTML(string){
	return string
		.replace(/<.*?>/g,"")
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

	// make a fake html thing
	var figcaption = {firstChild:{textContent:username}};
	var messagePart = {textContent:message};
	var dispMessage = {
		dataset: {
			safe: safe,
			id: messageID,
			subtype: messageJSON.subtype,
			user: uid,
		},
		id: "message_"+messageID,
		innerHTML: "",
		querySelector: function(query){
			if (query=="figcaption")
				return figcaption;
			if (query=="message-part")
				return messagePart;
		},
	};

	if(tag != currentTag() && firstMessageListReceived) {
		Graphics.setNotificationStateForTag(tag,true);
	}

	if(type === "system") {
		dispMessage.innerHTML = message;
		Graphics.printSystemMessage(stripHTML(message), tag);
	}else if(type ==="warning"){
		Graphics.printWarningMessage(stripHTML(message), tag);
	} else if(type === "module") {
		dispMessage.innerHTML = message;
		Graphics.printModuleMessage(sender, stripHTML(message), tag);
	} else if (type === "message") {
		if (messageJSON.encoding == "draw")
			message = "[drawing]";
		Graphics.printMessage(sender, stripHTML(message), tag);
	} else {
		console.log("Tried to display an unknown message type: ");
		return;
	}
	
	for(i = 0; i < messageCallbacks.length; i++) {
		if(messageCallbacks[i]){
			if(messageCallbacks[i](dispMessage)) {
				dispMessage = false;
			}
		}
	}
}

global.isIgnored = ()=>false;

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
	
	for(var i = 0; i < onSubmitMessage.events.length; i++){
		try{
			if(onSubmitMessage.events[i](eventParam))
				handled = true;
		}catch(e){
			warningMessage("Error in onsubmitmessage event");
		}
	}

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
