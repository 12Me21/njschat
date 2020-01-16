require("./patch.js");

var Graphics = require("./graphics.js");

var PolyChat = require("./polychat.js").PolyChat;
const Auth = require("./auth.js").Auth;
var polyChat = new PolyChat(Graphics);
polyChat.onMessage = onMessage;

var auth;

var messageCallbacks = [];
var onBind = false;
var firstMessageListReceived = false, firstBind = true;
function getOrDefault(variable, defaultValue){
	return typeof variable==='undefined' ? getOrDefault(defaultValue,false) : variable;
}

function unescape_html(string){
	return string
		.replace(/&quot;/g,'"')
		.replace(/&gt;/g,">")
		.replace(/&lt;/g,"<")
		.replace(/&apos;/g,"'")
		.replace(/&amp;/g,"&");
}

function print_tmp(text, tag, color){
	if (color){
		text = "{"+color+"-fg}"+text+"{/"+color+"-fg}";
	}
	Graphics.print(text, tag);
}

function displayMessage(messageJSON){
	var message = getOrDefault(messageJSON.message, "");
	var type = getOrDefault(messageJSON.type, "");
	var tag = getOrDefault(messageJSON.tag, "any");
	var sender = getOrDefault(messageJSON.sender, {});
	var uid = getOrDefault(sender.uid, -1);
	var username = getOrDefault(sender.username, "");
	var module = getOrDefault(messageJSON.module, "");
	var messageID = getOrDefault(messageJSON.id, 0);
	var safe = getOrDefault(messageJSON.safe, "unknown");

	if(type === "system" || type === "warning") {
		print_tmp(unescape_html(message), tag);
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

function systemMessage(message) {
   var messageJSON = { "type" : "system", "message" : message };
   displayMessage(messageJSON);
}

function warningMessage(message) {
   var messageJSON = { "type" : "warning", "message" : message };
   displayMessage(messageJSON);
}

function onMessage(msg) {
	var text = '', i = 0, user = "";

	switch (msg.type) {
   case 'userList':
      //Now reformat the user list
      //refreshUserList(msg.users);
      //refreshRoomList(msg.rooms, msg.users);
		Graphics.update_room_list(msg.rooms);
		var x=Graphics.draw_userlist(msg.users);
      lastUserList = msg.users;
      break;
   case 'messageList':
      //logger.log("Got messageList with " + msg.messages.length + " message(s)", LogSystem.TraceLevel);
      //Print messages
      for(i = 0; i < msg.messages.length; i++){
         var msgobject = msg.messages[i];
         displayMessage(msgobject);
      }
		if(!firstMessageListReceived)
			;//autoScroll(true);
      firstMessageListReceived = true;
      break;
   case "response":
      if(msg.from === "bind"){
         if(msg.result !== true){
				//console.log(msg);
				polyChat.close("You could not be authenticated");
				for(i = 0; i < msg.errors.length; i++)
					systemMessage("Reason: " + msg.errors[i]);
         } else {
				try {
					availableModules = msg.extras.modules;
					//writePersistent("chatCache_AvailableModules", availableModules);
					//quietlog("Available modules: " + availableModules);
				} catch(ex)	{
					//console.log("Could not retrieve the module list from the bind response!");
				}
				if(onBind)
					onBind(firstBind, availableModules);
				var request = { "type" : "request", "request" : "messageList" }; 
				polyChat.sendMessage(JSON.stringify(request));
				firstBind = false;
         }
      } else {
         if(msg.result === false) {
				for(var error in msg.errors)
					if(msg.errors.hasOwnProperty(error))
						warningMessage("Received error response from chat: " + msg.errors[error]);
         }
      }
      break;
   default:
      console.log('RECEIVED UNKNOWN:' + JSON.stringify(msg));
      break;
	}
}

function sendMessage(message,addCommand){
	if (message.substr(0,5)=="/tab "){
		var name = message.substr(5).trim().toLowerCase();
		if (Graphics.messagepanes[name]) {
			Graphics.switch_pane(name);
		} else {
			print_tmp("Unknown room. Rooms: "+Object.keys(Graphics.messagepanes).join(" "),"any");
		}
		return;
	}
	if(message.trim().length===0)
		return;
	var json={
		'type':'message','text':message,'key':auth,'tag':Graphics.current_pane()
	};
	polyChat.sendMessage(JSON.stringify(json));
}

process.on('SIGINT', function() {
	polyChat.close();
	process.exit();
});

Auth(function(_auth, uid, session){
	auth=_auth;
	polyChat.proxyURL += "?session="+session;
	polyChat.start(uid, auth, process.argv.length==3 ? PolyChat.ForceXHR : 0);
	Graphics.input.on("submit",function(text){
		//print_tmp(text);
		sendMessage(text);
		Graphics.input.readInput();
		Graphics.input.clearValue();
		Graphics.render();
	})
});
