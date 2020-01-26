var Request = require("request");

// user!

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
	static all = {}; //list of all users
	static byName = {}; //all, by name
	static lastNameRequest = 0;

	requestedNickname = false;
	nicknameCallbacks = [];
	
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
						this.nicknameCallbacks.forEach(x=>{
							if (x)
								x(this);
						});
					} else {
						console.log("requesting nickname for "+this.username);
						Request("http://smilebasicsource.com/query/tinycomputerprograms?username="+this.username+"&program=nickname", (error, response, body)=>{
							if (response && response.statusCode == 200) {
								var nickname = unescape(body);
								if (nickname >= " " && nickname != "\r\n") {
									this.nickname = nickname;
									this.nicknameCallbacks.forEach(x=>{
										if (x)
											x(this);
									});
								} else {
									this.nickname = false;
								}
							}
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
	
}

module.exports = User;
