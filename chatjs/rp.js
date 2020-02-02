const API = require("../api.js");

API.addCommand("nick", "set your nickname", function(params) {
	// The nickname protocol is a bit weird, because of backwards compatibility etc.
	API.submitMessage("[rpl29nick] "+API.User.me.username+"'s name is now "+params);
	// the nickname system uses a weird protocol uhhhh
	// yeah can't wait for rp30 lol
	function write_persistent(name, value) {
		
		function escape_name(name) {
			// why does this even exist lol I don't remember
			// wait I think it was for like
			// utf8?
			var out = ""
			for(var i=0; i<name.length; i++){
				var chr = name.charAt(i);
				if(chr=="\0" || chr>="\x7F" || chr=="%")
					out += escape(chr);
				else
					out += chr;
			}
			return out;
		}
		function encodeBase64(string) {
			return Buffer.from(String(string), "binary").toString("base64");
		}
		API.Axios.get(
			"https://smilebasicsource.com/query/submit/varstore"+
				"?nameb64="+encodeBase64(name)+
				"&valueb64="+encodeBase64(escape_name(value))+
				"&session="+API.polyChat.session
		);
	}
	write_persistent("nickname_tcf", params || "\r\n");
});

API.messageEvents.push(function(msg){
	if (msg.type=="message" && msg.encoding=="text") {
		var match = msg.text.match(/^\[rpl[23]\dnick] (.*?)'s name is now (.*)/);
		if (match) {
			msg.sender.nickname = match[2] || false;
		}
	}
});

API.setNicknameHandler(function(callback){
	var gotNickname = (success)=>{
		if (success)
			this.nicknameCallbacks.forEach(x=>{
				if (x)
					x(this);
			});
		this.requestedNickname = false;
		this.nicknameCallbacks = [];
	}
	// limit an action to once every `interval` milliseconds
	var last = 0;
	function limit(interval, callback) {
		var now = Date.now();
		var ok = last + interval;
		if (now >= ok){
			last = now;
			callback();
		} else {
			last = ok;
			setTimeout(callback, ok-now);
		}
	}
	if (this.nickname === undefined) {
		this.nicknameCallbacks.push(callback);
		if (!this.requestedNickname) {
			this.requestedNickname = true;
			limit(100, ()=>{
				if (this.nickname !== undefined) {
					// got nickname while waiting
					gotNickname(true);
				} else {
					console.log("requesting nickname for "+this.username);
					API.Axios.get("http://smilebasicsource.com/query/tinycomputerprograms?username="+this.username+"&program=nickname").then(response=>{
						var nickname = unescape(response.data).replace(/\x1B/g,"");
						if (nickname >= " " && nickname != "\r\n") {
							this.nickname = nickname;
							gotNickname(true);
						} else {
							this.nickname = false;
							gotNickname(false);
							// wait should this still activate the callbacks...
						}
					}).catch(error=>{
						console.error("Nickname request failed");
						console.error(error);
						this.nickname = false;
						gotNickname(false);
					});
				}
			});
		}
		return null;
	} else if (this.nickname === false) {
		// user doesn't have a nickname set
		return this.username;
	} else {
		return this.nickname;
	}
});
