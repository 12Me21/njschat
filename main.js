require("./api.js");

(async function(){
	require("./patch.js");
	var Graphics = require("./graphics.js");
	const Auth = require("./auth.js");
	
	polyChat.onMessage = onMessage;

	require("./commands.js");

	var onBind = false;
	var firstBind = true;
	
	function print_tmp(text, tag, color){
		text = Graphics.colorize(text, color);
		Graphics.print(text, tag);
	}

	function onMessage(msg) {
		var text = '', i = 0, user = "";

		switch (msg.type) {
		case 'userList':
			//Now reformat the user list
			//refreshUserList(msg.users);
			//refreshRoomList(msg.rooms, msg.users);
			pmRooms = {};
			for (i of msg.rooms)
				pmRooms[i.name] = i;
			allTags = ["general", "offtopic", "admin", "console", "any"].concat(msg.rooms.map(x=>x.name));
			Graphics.update_room_list(allTags);
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
			//if(!firstMessageListReceived)
				//Graphics.markAsRead();
				//autoScroll(true);
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
					setTabTag("offtopic");
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

	process.on('SIGINT', function() {
		polyChat.close();
		process.exit();
	});


	[useruid, auth, username] = await Auth.getAuth();
	
	polyChat.session = session;
	polyChat.start(useruid, auth, process.argv.length==3 ? PolyChat.ForceXHR : undefined);

	startChatConnection();
	
	Graphics.input.readInput();
	Graphics.input.on("submit",function(text){
		if (currentTag()=="console") {
			console.log("<<< " + text);
			try {
				var result = eval(text);
				console.log(">>> " + result);
			} catch (e) {
				console.error(e.stack.match(/^.*/)[0]);
			}
		} else
			onSubmitMessage(text);
		Graphics.input.readInput();
		Graphics.input.clearValue();
		Graphics.render();
	});

})();
