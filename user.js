const Http = require("http");

// todo: make our own requests library
// node request library is fucking HUGE and has 50 dependancies :(
// use URL to parse and then http/https
// see: xhr.js

function get(options, callback){
	var req = Http.request(options, function(result){
		var all="";
		result.on("data", function(data){
			all += data.toString('utf-8');
		});
		result.on("end", function(){
			console.log("Request finished")
			callback(all);
		});
		result.on("error", function(e){
			console.error("http request error");
			console.error(e);
			callback(null);
		});
	});
	req.end();
}

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
						get({
							hostname: "smilebasicsource.com",
							path: "/query/tinycomputerprograms?username="+this.username+"&program=nickname",
							method: "GET",
						}, (body)=>{
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

User.all = {}; //list of all users
User.byName = {}; //all, by name
User.lastNameRequest = 0;


module.exports = User;
