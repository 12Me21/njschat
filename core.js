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
		if (!process.stderr.isTTY)
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

var PolyChat = require("./polychat.js");
var Auth = require("./auth.js");
var I;

var polyChat = new PolyChat(console);

var defaultRooms = [
	{name: "console"},
	{name: "general"},
	{name: "offtopic"},
	{name: "admin"},
	{name: "any"},
];

var _auth;
function submitMessage(msg){
	msg.key = _auth;
	polyChat.sendMessage(JSON.stringify(msg));
}

var state = {
	user: {
		uid: null,
		name: null,
	},
	rooms: defaultRooms.slice(),
	users: [],
};

global.reload =function(){
	if (I) {
		I.onUnload();
		require.cache = {}; //bad...
		I = require("./interfce.js");
		I.onLoad(state, submitMessage, fakeStdout);
		console.log(require.cache);
	} else {
		I = require("./interfce.js");
		I.onLoad(state, submitMessage, fakeStdout);
	}
}

reload();

console.log("starting");

Auth(I.prompt, "session.txt").then(function([user, auth, session, errors]){
	if (!user){
		I.log("Failed to log in");
		I.log(errors.join("\n"));
		return;
	}
	I.setInputHandler(function(text, room){
		submitMessage({
			type: "message",
			text: text,
			tag: room,
		});
	});
	var {uid: useruid, username: username} = user;
	_auth = auth;
	polyChat.session = session;
	if (process.argv[2]) {
		try {
			var url = new URL(process.argv[2]); // throws if invalid
			polyChat.webSocketURL = process.argv[2];
			console.log("Using custom websocket url: "+polyChat.webSocketURL);
		} catch(e) {
			
		}
	}
	polyChat.start(useruid, auth, process.argv[2]=='-p'?PolyChat.ForceXHR:PolyChat.ForceWebsockets);
	if (polyChat.webSocket)
		console.log("if chat is using websockets and fails to connect, try -p flag to use https proxy");
	var firstMessageList = false;
	polyChat.onMessage = function(msg){
		switch(msg.type){
		case "userList":
			state.rooms = defaultRooms.concat(msg.rooms);
			state.users = msg.users;
			I.updateUserlist(state.users);
			I.updateRoomlist(state.rooms);
			break;
		case "messageList":
			if (!firstMessageList) {
				firstMessageList = true;
				console.log("Got first message list :D");
			}
			msg.messages.forEach(I.displayMessage);
			break;
		case "response":
			if (msg.from=="bind"){
				if(!msg.result){
					polyChat.close("You could not be authenticated");
					I.log("Reason:" + errors.join("\n"));
				} else {
					// normal chat gets a list of modules here, for whatever reason
					polyChat.sendMessage(JSON.stringify({
						type:"request", request:"messageList"
					}));
					I.onBind();
				}
			} else {
				if (!msg.result) {
					msg.errors.forEach(error=>{
						I.displayMessage.warning("Received error response from chat: " + error);
					});
				}
			}
			break;
		default:
			I.log("RECEIVED UNKNOWN TYPE: " + msg.type);
		}
	};
	I.onConnect();
})
