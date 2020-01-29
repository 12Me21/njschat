// user!

const Axios = require("axios");

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

class User {
	constructor(user) {
		var t = this;
		// we only want one object to exist per user
		// when trying to create a duplicate user,
		// update the stored object and return it
		if (User.all[user.uid]) {
			t = User.all[user.uid]
			delete User.byName[t.username];
			User.byName[user.username] = t;
		} else {
			User.all[user.uid] = t;
			User.byName[user.username] = t;
		}
		t.username = user.username;
		t.stars = user.stars;
		t.level = user.level;
		t.uid = user.uid;
		t.joined = user.joined;
		t.avatar = user.avatar;
		t.active = user.active;
		t.banned = user.banned;
		this.nicknameCallbacks = [];
		t.getNickname();
		return t;
	}
	
	formatMessageUsername() {};
	formatUsername() {};

	// This will always either be the username, or nickname
	// if nickname hasn't been recieved yet, it will default to username
	// when using this, you should use the getNickname callback to
	// update the message name later,
	displayName(){
		if (this.nickname === false)
			return this.username;
		if (this.nickname === undefined)
			return this.username; // bad
		return this.nickname;
	}
	
	getColors() {};
	
	gotNickname(success) {
		if (success)
			this.nicknameCallbacks.forEach(x=>{
				if (x)
					x(this);
			});
		this.requestedNickname = false;
		this.nicknameCallbacks = [];
	}
	
	// if nickname is currently known, this will return immediately
	// otherwise, it will call `callback` after requesting the name
	getNickname(callback) {
		if (this.nickname === undefined) {
			this.nicknameCallbacks.push(callback);
			if (!this.requestedNickname) {
				this.requestedNickname = true;
				limit(100, ()=>{
					if (this.nickname !== undefined) {
						// got nickname while waiting
						this.gotNickname(true);
					} else {
						console.log("requesting nickname for "+this.username);
						Axios.get("http://smilebasicsource.com/query/tinycomputerprograms?username="+this.username+"&program=nickname").then(response=>{
							var nickname = unescape(response.data);
							if (nickname >= " " && nickname != "\r\n") {
								this.nickname = nickname;
								this.gotNickname(true);
							} else {
								this.nickname = false;
								this.gotNickname(false);
								// wait should this still activate the callbacks...
							}
						}).catch(error=>{
							console.error("Nickname request failed");
							console.error(error);
							this.nickname = false;
							this.gotNickname(false);
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
	}

	// request a user by name (also have uid option?)
	getUser(name, callback) {
		
	}
}

User.all = {}; //list of all users
User.byName = {}; //all, by name
User.me = null; //yourself

module.exports = User;
