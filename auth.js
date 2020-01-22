const Https = require("https");
const Crypto = require("crypto");
const Fs = require("fs");
const Graphics = require("./graphics.js");

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
	var username = await Graphics.prompt("Username:");
	var ligma = await Graphics.prompt("P\x61ssword:",true);
	var balls = Crypto.createHash("md5").update(ligma).digest("hex");
	return [username, balls];
}

async function load_session(filename){
	return new Promise(callback=>{
		Fs.readFile(filename, (err, data)=>{
			callback(data);
		});
	});
}

function save_session(session, filename){
	Fs.writeFile(filename, session, x=>x);
}

async function get_session(filename, force){
	if (!force)
		session = await load_session(filename);
	while (!session) {
		[username, passwordhash] = await get_login();
		session = await login2session(username, passwordhash);
		if (session)
			save_session(session, filename);
		else
			console.error("Failed to log in, try again");
	}
	return session;
}

module.exports = async function(filename) {
	var auth;
	var session = await get_session(filename);
	if (session) {
		[auth, uid, username] = await session2auth(session);
		if (auth)
			return [uid, auth, username, session];
	}
	session = await get_session(filename, true); //something went wrong, ask user to log in again
	if (session) {
		[auth, uid, username] = await session2auth(session);
		if (auth)
			return [uid, auth, username, session];
	}
}
