const Crypto = require("crypto");
const Fs = require("fs");
const Axios = require("axios");
const User = require("./user.js");

class SBSAuth {
	constructor(prompt, filename, host = "https://smilebasicsource.com") {
		this.host = host;
		this.prompt = prompt;
		this.sessionFile = filename;
	}
	
	// guaranteed to return a session
	// if `.staleSession` is set, the session was loaded from `.sessionFile`
	// and may be expired or invalid
	// pass `force` to always get a non-stale session
	async getSession(force = this.sessionInvalid) {
		// if session already exists (and is not stale if force flag is set)
		// return cached sessions
		if (this.session && !(force && this.staleSession))
			return this.session;
		
		// if force flag isn't set, try loading stale session from file
		if (!force)
			await this._loadSession();
		
		// get name/password from user
		// repeat until login successful
		while (!this.session) {
			var username = await this.prompt("Username:");
			var balls = Crypto.createHash("md5").update(await this.prompt("P\x61ssword:",true)).digest("hex");
			var response = await Axios.post(
				"query/submit/login?session=x&small=1",
				"username="+username+"&password="+balls,
				{
					baseURL: this.host,
					headers: {"Content-Type": "application/x-www-form-urlencoded"},
				},
			).catch(e=>{
				console.error("Failed to request session: "+e.message);
			});
			if (!response) {
				return null;
			}
			if (response.data.result) {
				this.session = response.data.result;
				this.staleSession = false;
				Fs.writeFile(this.sessionFile, this.session, ()=>{});
			} else {
				console.error("Login error: "+response.data.errors.join(", "));
				console.error("?Redo from start");
			}
		}
		
		return this.session;
	}

	// load session file
	async _loadSession() {
		return new Promise(callback=>{
			Fs.readFile(this.sessionFile, "utf8", (err, data)=>{
				if (data) {
					this.session = data;
					this.staleSession = true;
				}
				callback(this.session);
			});
		});
	}

	// Guaranteed to return valid auth
	// UNLESS the request fails (because you're not connected to the internet etc.)
	async logIn() {
		while (!this.chatauth) {
			await this.getSession();
			var response = await Axios.get("query/request/chatauth?session="+this.session, {baseURL: this.host}).catch(e=>{
				console.error("Failed to request chatauth: "+e.message);
			});
			if (!response) {
				return null;
			}
			if (response.data.result) {
				this.chatauth = response.data.result;
				this.user = new User(response.data.requester);
			} else if (response.data.queryok) { // session was bad
				console.log("Cached session was invalid!");
				this.session = null;
				this.sessionInvalid = true;
				// sessionInvalid is set when the file stored in session.txt
				// is expired/invalid
			}
		}
		return this;
	}
}

module.exports = SBSAuth;
