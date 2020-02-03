'use strict';
// user!

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
	
	getNickname(callback) {
		return this.username;
	}

	// request a user by name (also have uid option?)
	getUser(name, callback) {
		
	}
}

User.all = {}; //list of all users
User.byName = {}; //all, by name
User.me = null; //yourself

module.exports = User;
