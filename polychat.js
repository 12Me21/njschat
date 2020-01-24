/// Nodejs compatibility

const WebSocket = require("isomorphic-ws");

//const FormData = require("form-data");
// Problems with FormData:
// - isn't supported by nodejs XMLHttpRequest library
// - form.submit(url) also doesn't seem to work
// luckily FormData isn't required by polychat, but it would be nicer
const window = global;

const Base64 = {
	encode: function(string) {
		if (string !== null)
			return Buffer.from(String(string), "binary").toString("base64");
	},
	decode: function(base64) {
		if (string !== null)
			return Buffer.from(base64, "base64").toString("binary");
	}
}
const Requester = {
	respondToJSON: function(myCallback, myError){
		return function(response){
			if(myCallback && response){
				var parsedJSON=false;
				try{
					parsedJSON=JSON.parse(response);
				}catch(ex){
					if(myError){
						myError("Could not parse json in Requester.respondToJSON! Exception: "+ex+", Response: "+response);
					}
				}
				if(parsedJSON)
					myCallback(parsedJSON);
			}
		};
	}
}

/// Original Polychat

//Make sure there's at least SOMETHING there. It won't log, but it won't throw
//errors either (I think).
LogSystem = {}
LogSystem.TraceLevel = 10;
LogSystem.DebugLevel = 20;
LogSystem.InfoLevel = 30;
LogSystem.WarningLevel = 40;
LogSystem.ErrorLevel = 50;
LogSystem.CriticalLevel = 60;

//An object that allows easy interaction with the SBS chat. It will select the
//best connection method based on your browser. Alternatively, you can force
//the connection.
function PolyChat(logger)
{
	var log = function(message, level) 
	{ 
		if(logger && logger.log && level>=LogSystem.DebugLevel)
			logger.log(message); 
	};
	
	log("Creating PolyChat", LogSystem.TraceLevel);
	
	//autogenerated public stuff
	this.retrieveInterval = 3000;
	this.proxyID = Math.random();
	this.proxyURL = PolyChat.DefaultProxyURL;
	this.webSocketURL = PolyChat.DefaultWebSocketURL;

	//Possible sending systems
	this.requester = false; 
	this.xhr = false;
	this.webSocket = false;

	//User handles these events.
	this.onMessage = false;
	this.onError = false;
	this.onClose = false;
	this.onOpen = false; //added

	this.seenIDs = [];

	//private stuff
	var myself = this;
	var started = false;
	var connected = false;
	var lastretrieve = 0;
	//var totalIncomingBandwidth = 0;

	var doOnMessage = function(json)
	{
		log("Attempting PolyChat onMessage: " + json.type, LogSystem.TraceLevel);

		if(json.type === "messageList")
		{
			var newMessages = [];

			for(var i = 0; i < json.messages.length; i++)
			{
				if(myself.seenIDs.indexOf(json.messages[i].id) >= 0)
				{
					log("Skipping duplicate message: " + json.messages[i].id, LogSystem.TraceLevel);
				}
				else
				{
					myself.seenIDs.push(json.messages[i].id);
					newMessages.push(json.messages[i]);
				}
			}

			json.messages = newMessages;

			if(json.messages.length === 0)
			{
				log("Skipping entire messagelist: " + json.id, LogSystem.DebugLevel);
				return;
			}
		}

		if(myself.onMessage)
			myself.onMessage(json);
	};
	var doOnError = function(error)
	{
		log("PolyChat error: " + error, LogSystem.ErrorLevel);

		if(myself.onError)// && connected)
			myself.onError(error);
	};
	var doOnClose = function(reason)
	{
		log("PolyChat closing: " + reason, LogSystem.InfoLevel);

		if(myself.onClose && connected)
			myself.onClose(reason);

		connected = false;
	};

	this.close = function(reason)
	{
		if(myself.webSocket)
			myself.webSocket.close(); //This will eventually call doOnClose anyway
		else
			doOnClose(reason);
	};

	this.start = function(uid, chatauth, force)
	{
		var i;
		var connectMessage = {'type': 'bind','uid': Number(uid),'key': chatauth};
		log("Starting PolyChat with uid: " + uid + ", chatauth: " + chatauth, LogSystem.InfoLevel);

		if (!force) { /// this block changed
			/// todo: maybe check if websockets are being blocked, and switch to xhr then
			force = PolyChat.ForceWebsockets;
		}
		
		if(force == PolyChat.ForceWebsockets)
		{
			log("PolyChat will use websockets", LogSystem.DebugLevel);
			myself.webSocket = new WebSocket(myself.webSocketURL);
			myself.webSocket.onopen = function(event) 
			{
				if (myself.onOpen)
					myself.onOpen();
				log("Websockets opened! Attempting bind", LogSystem.DebugLevel);
				connected = true;
				myself.sendMessage(JSON.stringify(connectMessage)); 
			};
			myself.webSocket.onclose = function(event) 
			{ 
				if(!connected)
					doOnClose("The server appears to be down.");
				else
					doOnClose("Websocket closed");

				log("Polychat websocket close event: ");
				connected = false;
			};
			myself.webSocket.onerror = function(error)
			{
				doOnError("Websocket error");// + JSON.stringify(error));
				log("Polychat websocket error event: ", LogSystem.ErrorLevel);
			};
			myself.webSocket.onmessage = function(event) 
			{
				doOnMessage(JSON.parse(event.data));
			};
		}
		else if(force === PolyChat.ForceXHR)
		{
			log("PolyChat will use XHR", LogSystem.DebugLevel);

			if (!myself.session) {
				throw "XHR Polychat requires session token";
			}
			
			myself.xhr = function(jsonMessage, callback)
			{
				var xhr = new XMLHttpRequest();
				xhr.onreadystatechange = function()
				{
					if(xhr.readyState === 4)
						Requester.respondToJSON(callback, doOnError)(xhr.responseText);
				};

				//Formdata is better because we don't have to base64 encode it in
				//the URL (which limits the size of messages)
				if(window.FormData)
				{
					log("formdata exists :)")
					xhr.open("POST", myself.proxyURL + "?session=" + myself.session);
					var data = new FormData();
					data.append("data", jsonMessage);
					xhr.send(data);
				}
				else
				{
					xhr.open("GET", myself.proxyURL + "?session=" + myself.session + "&b64Data=" + Base64.encode(jsonMessage));
					xhr.send();
				}
			};
		}

		if(force !== PolyChat.ForceWebsockets)
		{
			log("Starting proxy. URL: " + this.proxyURL + ", ID: " + this.proxyID, LogSystem.DebugLevel);
			sendProxyMessage("proxyStart", null, function(json)
							 {
								 if(json.result !== -1)
								 {
									 if (myself.onOpen)
										 myself.onOpen();
									 log("Proxy started successfully", LogSystem.DebugLevel);
								 }
								 else
								 {
									 log("Proxy ID already in use. Sharing session: " + myself.proxyID, LogSystem.InfoLevel);
									 myself.requestUserList();
									 myself.requestMessageList();
								 }
								 
								 connected = true;
								 sendProxyMessage("proxySend", JSON.stringify(connectMessage));
								 setTimeout(retrieveProxyMessages, myself.retrieveInterval / 2);
								 burstRetrieveProxyMessages(200,1);
							 });
		}
	};

	//What is exposed to the outside for sending STRING messages.
	this.sendMessage = function(message)
	{
		if(myself.webSocket)
		{
			myself.webSocket.send(message);
		}
		else
		{
			sendProxyMessage("proxySend", message);

			//Make it LOOK like we're going faaast
			var json = JSON.parse(message);
			if(json && json.type === "message") burstRetrieveProxyMessages(100,5);
		}
	};

	this.requestUserList = function()
	{
		myself.sendMessage(JSON.stringify({type:"request",request:"userList"}));
	};

	this.requestMessageList = function()
	{
		myself.sendMessage(JSON.stringify({type:"request",request:"messageList"}));
	};

	var sendProxyMessage = function(type, parts, callback)
	{
		if(!parts)
			parts = { data : null };
		else if(!parts.data)
			parts = { data : parts };

		//Now we just add all the REAL stuff.
		parts.proxyID = myself.proxyID;
		parts.type = type;

		var jsonMessage = JSON.stringify(parts);

		log("Sending ChatProxy message: " + jsonMessage, LogSystem.TraceLevel);

		//Send messages in different ways based on what we have.
		if(myself.webSockets)
		{
			log("Trying to send proxy message when no proxy set up!", LogSystem.WarningLevel);
		}
		else if(myself.xhr)
		{
			//Encode it as base64 for maximum compatibility. Note that IF the 
			//system doesn't support FormData, this method will double encode the
			//data as base64. This is highly inefficient, and should be changed later
			parts.data = Base64.encode(parts.data);
			parts.encoding = "base64";
			jsonMessage = JSON.stringify(parts);
			myself.xhr(jsonMessage, callback);
		}
		else
		{
			var jsonCompletion = Requester.respondToJSON(callback, doOnError);
			myself.requester.sendGet(myself.proxyURL + "?session=" + myself.session + "&b64Data=" + Base64.encode(jsonMessage), jsonCompletion);
		}
	};

	var retrieveProxyMessages = function(singleRun)
	{
		sendProxyMessage("proxyReceive", {data: null, lastretrieve: lastretrieve}, function(json)
							  {
								  var i;

								  if(json.result === false)
								  {
									  var allErrors = "";
									  for(i = 0; i < json.errors.length; i++)
										  allErrors += json.errors[i] + (i < json.errors.length - 1 ? " /" : "");

									  doOnError("Proxy received errors: " + allErrors);
									  myself.close("received proxy errors");
								  }

								  log("Received ChatProxy message with " + json.result.length + " queued messages", LogSystem.TraceLevel);
								  lastRetrieve = json.result.lastretrieve;

								  for(i = 0; i < json.result.length; i++)
									  doOnMessage(JSON.parse(json.result[i]));

								  if(connected)
								  {
									  if(!singleRun) setTimeout(retrieveProxyMessages, myself.retrieveInterval);
								  }
								  else
								  {
									  log("ChatProxy will stop retrieving messages; it's no longer connected", LogSystem.WarningLevel);
								  }
							  });
	};

	var burstRetrieveProxyMessages = function(interval, times)
	{
		var burstRetrieveFunction = function() { retrieveProxyMessages(true); };

		for(var i = 0; i < times; i++)
			setTimeout(burstRetrieveFunction, interval * i);
	};
}

PolyChat.ForceWebsockets = 1;
PolyChat.ForceXHR = 2;
PolyChat.DefaultWebSocketURL = "ws://chat.smilebasicsource.com:45695/chatserver";
PolyChat.DebugWebSocketURL = "ws://chat.smilebasicsource.com:45697/chatserver";
PolyChat.DefaultProxyURL = "https://smilebasicsource.com/query/submit/chatproxy"; /// changed url

/// More nodejs

module.exports = PolyChat;
