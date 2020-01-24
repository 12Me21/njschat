require("./auth.js");
var PolyChat = require("./polychat.js");
var Auth = require("./auth.js");
var I;

var polyChat = new PolyChat();

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
		I.onLoad(state, submitMessage);
		console.log(require.cache);
	} else {
		I = require("./interfce.js");
		I.onLoad(state, submitMessage);
	}
}

reload();

Auth(I.prompt, "session.txt").then(function([user, auth, session, errors]){
	if (!user){
		I.log("Failed to log in");
		I.log(errors.join("\n"));
		return;
	}
	var {uid: useruid, username: username} = user;
	_auth = auth;
	polyChat.session = session;
	polyChat.start(useruid, auth);
	polyChat.onMessage = function(msg){
		switch(msg.type){
		case "userList":
			state.rooms = defaultRooms.concat(msg.rooms);
			state.users = msg.users;
			I.updateUserlist(state.users);
			I.updateRoomlist(state.rooms);
			break;
		case "messageList":
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
