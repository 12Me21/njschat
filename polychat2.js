const WebSocket = require('ws');
const Axios = require('axios');
var User = require('./user.js');
var Room = require('./room.js');

//var QueryString = require("querystring");
// https://www.w3.org/TR/html401/interact/forms.html#didx-multipartform-data
/*function simpleFormdata(name, data) {
	var boundary = "421"; //TODO: make sure this doesn't appear in data
	return [
		"--"+boundary+'\r\nContent-Disposition: form-data; name="'+name+'"\r\n\r\n'+
			data+"\r\n--"+boundary+"--",
		{headers: {"Content-Type": "multipart/form-data; boundary="+boundary}},
	];
}*/

class PolyChat {
	//User handles these events.
	onMessage() {}
	onList() {}
	onResponse() {}
	onError() {}
	onOpen() {}
	onClose() {}
	
	constructor() {
		//autogenerated public stuff
		this.retrieveInterval = 3000;
		this.proxyID = (Math.random()*10000 | 0);
		this.proxyURL = PolyChat.DefaultProxyURL;
		this.webSocketURL = PolyChat.DefaultWebSocketURL;
		
		//Possible sending systems
		this.webSocket = false;
		
		this.seenIDs = {};
		
		this._connected = false;
		this._lastretrieve = 0;
	}
	
	_doOnMessage(json) {
		switch (json.type) {
		case 'userList':
			json.rooms = json.rooms.map(room=>new Room(room));
			json.users = json.users.map(user=>new User(user));
			this.onList(json);
			break;
		case 'messageList':
			json.messages.forEach(message=>{
				if (!this.seenIDs[message.id]){
					this.seenIDs[message.id] = true;
					// It's a good idea to use new Room/Sender to convert name to object
					// because that way it can return a reference to an item in the
					// internal user/room list, and there won't ever be multiple objects
					// referring to the same user/room
					// and, new Room can create the room if it doesn't exist
					if (message.tag)
						message.tag = new Room(message.tag);
					if (message.sender)
						message.sender = new User(message.sender);
					this.onMessage(message);
				}
			});
			break;
		case 'response':
			/*maybe if (json.from=="bind"){
				if(!json.result){
					polyChat.close("You could not be authenticated");
					console.warn("Reason: " + json.errors.join("\n"));
				} else {
					// normal chat gets a list of modules here, for whatever reason
					polyChat.sendMessage({type:"request", request:"messageList"});
					// BIND DONE!
				}
			}*/
			this.onResponse(json);
			break;
		default:
			console.error("RECEIVED UNKNOWN TYPE: " + json.type);
		}
	}

	_doOnError(error) {
		console.error("PolyChat error:");
		console.error(error);
		if(this.onError)// && connected)
			this.onError(error);
	}

	_doOnClose(reason) {
		console.info("PolyChat closing: " + reason);
		if(this.onClose && this._connected)
			this.onClose(reason);
		this._connected = false;
	}

	close(reason) {
		if (this.webSocket)
			this.webSocket.close(); //This will eventually call doOnClose anyway
		else { //xhr
			this._sendProxyMessage('proxyEnd', {}, ()=>{
				this._doOnClose(reason);
			});
		}
	}

	start(uid, chatauth, session, forceXHR) {
		this.chatauth = chatauth;
		this.session = session;
		this.uid = uid;
		this.forceXHR = forceXHR;

		console.info("Starting PolyChat with uid: " + this.uid);
		var connectMessage = {type: 'bind', uid: this.uid};
		
		if (!this.forceXHR) {
			console.info("PolyChat will use websockets");
			this.webSocket = new WebSocket(this.webSocketURL);
			this.webSocket.onopen = (event)=>{
				if (this.onOpen)
					this.onOpen();
				console.info("Websockets opened! Attempting bind");
				this._connected = true;
				this.sendMessage(connectMessage);
				//this.requestMessageList(); //evil
			};
			this.webSocket.onclose = (event)=>{
				this._doOnClose("Websocket closed");
			};
			this.webSocket.onerror = (error)=>{
				this._doOnError("Websocket error");
				console.error("Polychat websocket error event:");
				console.error(error);
			};
			this.webSocket.onmessage = (event)=>{
				this._doOnMessage(JSON.parse(event.data));
			};
		} else {
			console.info("PolyChat will use XHR");
			if (!this.session)
				throw "XHR Polychat requires session token";

			console.info("Starting proxy. URL: "+this.proxyURL+", ID: "+this.proxyID);
			this._sendProxyMessage('proxyStart', {}, (json)=>{
				if(json.result !== -1) {
					if (this.onOpen)
						this.onOpen();
					console.info("Proxy started successfully");
					// I think when the PROXY connects to chat, it requests user/message lists automatically
				} else {
					console.info("Proxy ID already in use. Sharing session: " + this.proxyID);
					this.requestUserList();
					this.requestMessageList();
				}
				this._connected = true;
				this.sendMessage(connectMessage)
				setTimeout(this._retrieveProxyMessages.bind(this), this.retrieveInterval/2);
				this._burstRetrieveProxyMessages(200, 5);
			});
		}
	}
	
	//What is exposed to the outside for sending messages.
	sendMessage(message) {
		message.key = this.chatauth;
		if (this.webSocket) {
			this.webSocket.send(JSON.stringify(message));
		} else {
			this._sendProxyMessage('proxySend', {data:JSON.stringify(message)});
			
			//Make it LOOK like we're going faaast
			if(message && message.type === 'message')
				this._burstRetrieveProxyMessages(100, 5);
		}
	};
	
	requestUserList() {
		this.sendMessage({type:'request', request:'userList'});
	};
	
	requestMessageList() {
		this.sendMessage({type:'request', request:'messageList'});
	};
	
	_sendProxyMessage(type, data, callback) {
		data.proxyID = this.proxyID;
		data.type = type;
		//console.log(type);
		//var x = QueryString.stringify({data:JSON.stringify(data)});
		//var x = "data="+JSON.stringify(data).replace(/%/g,"%25").replace(/&/g,"%26");
		//var y = simpleFormdata('data', JSON.stringify(data))[0];
		//console.log("URL:", x.length, x);
		//console.log("FORM", y.length);
		// Ok this is really evil and might break at some point
		// you're supposed to escape a lot more than just & and %, but who cares
		Axios.post(
			this.proxyURL + "?session=" + this.session,
			//...simpleFormdata('data', JSON.stringify(data))
			"data="+JSON.stringify(data).replace(/%/g,"%25").replace(/&/g,"%26").replace(/\+/g,"%2B"),
			{headers: {"Content-Type":"application/x-www-form-urlencoded"}},
		).then(response=>{
			if (callback)
				callback(response.data);
		});
	};

	_retrieveProxyMessages(singleRun) {
		// note:
		// if you send lastretrieve, it changes the response format
		// the messages list will be in result.messages instead of result
		// and it includes a new field: result.lastretrieve
		this._sendProxyMessage('proxyReceive', {lastretrieve: this._lastretrieve}, (json)=>{
			if (json.result === false) {
				var allErrors = json.errors.join(" /");
				this._doOnError("Proxy received errors: " + allErrors);
				this.close("received proxy errors");
			} else {
				this._lastRetrieve = json.result.lastretrieve;

				json.result.messages.forEach((message)=>{
					this._doOnMessage(JSON.parse(message));
				});
			}
				
			if (this._connected) {
				if(!singleRun)
					setTimeout(this._retrieveProxyMessages.bind(this), this.retrieveInterval);
			} else {
				console.warn("ChatProxy will stop retrieving messages; it's no longer connected");
			}
		});
	}

	// bind this to like a keyboard shortcut or something lol
	retrieveProxyMessages() {
		this._retrieveProxyMessages(true);
	}
	
	_burstRetrieveProxyMessages(interval, times) {
		for(var i=0; i<times; i++)
			setTimeout(this._retrieveProxyMessages.bind(this, true), interval*i);
	}
}

PolyChat.DefaultWebSocketURL = "ws://chat.smilebasicsource.com:45695/chatserver";
PolyChat.DebugWebSocketURL = "ws://chat.smilebasicsource.com:45697/chatserver";
PolyChat.DefaultProxyURL = "https://smilebasicsource.com/query/submit/chatproxy";

module.exports = PolyChat;
