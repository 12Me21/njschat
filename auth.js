const Https = require("https");
const Crypto = require("crypto");
const Readline = require("readline");
const Fs = require("fs");
const Graphics = require("./graphics.js");

const SESSION_FILE = "session.txt"

function get(options, body, callback){
	var req = Https.request(options, function(result){
		var all="";
		result.on("data", function(data){
			all += data.toString('utf-8');
		});
		result.on("end", function(){
			callback(all);
		});
	});
	if (body !== null)
		req.write(body);
	req.end();
}

// username/password -> session token
async function login2session(username, passwordhash){
	return await new Promise(callback => {
		get(
			{
				hostname: "smilebasicsource.com",
				path: "/query/submit/login?session=x&small=1",
				method: "POST",
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			},
			"username="+username+"&password="+passwordhash,
			function(data){
				data=JSON.parse(data);
				if(data.result)
					callback(data.result);
				else
					callback(null, data.errors);
			},
		);
	});
}

// session token -> chat auth key
async function session2auth(session){
	return await new Promise(callback => {
		get(
			{
				hostname: "smilebasicsource.com",
				path: "/query/request/chatauth?session="+session,
				method: "GET",
			},
			null,
			function(data){
				data=JSON.parse(data);
				if(data.result)
					callback([data.result, data.requester.uid, data.requester.username]);
				else
					callback([null, null, null, data.errors]);
			},
		);
	});
}

async function get_login(){
	Graphics.render();
	var input = function(prompt, censor){
		return new Promise(resolve=>{
			Graphics.input.clearValue();
			Graphics.write_divider(prompt);
			Graphics.input.readInput();
			Graphics.input.censor = !!censor;
			function done(text){
				Graphics.input.removeListener("submit",done);
				Graphics.write_divider("");
				Graphics.input.clearValue();
				Graphics.input.censor = false;
				resolve(text);
			}
			Graphics.input.on("submit",done);
		})
	}
	var username = await input("Username:");
	var ligma = await input("P\x61ssword:",true);
	var balls = Crypto.createHash("md5").update(ligma).digest("hex");
	return [username, balls];
}

async function load_session(){
	return new Promise(callback=>{
		Fs.readFile(SESSION_FILE, (err, data)=>{
			callback(data);
		});
	});
}

function save_session(session){
	Fs.writeFile(SESSION_FILE, session, x=>x);
}

async function get_session(force){
	if (!force)
		session = await load_session();
	while (!session) {
		[username, passwordhash] = await get_login();
		session = await login2session(username, passwordhash);
		if (session)
			save_session(session);
		else
			Graphics.log("Failed to log in");
	}
	return session;
}

async function get_auth() {
	var auth;
	var session = await get_session();
	if (session) {
		[auth, uid, username] = await session2auth(session);
		if (auth)
			return [uid, auth, username, session];
	}
	session = await get_session(true); //something went wrong, ask user to log in again
	if (session) {
		[auth, uid, username] = await session2auth(session);
		if (auth)
			return [uid, auth, username, session];
	}
}

exports.getAuth = get_auth
//*/
