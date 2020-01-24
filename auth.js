const Https = require("https");
const Crypto = require("crypto");
const Fs = require("fs");

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
					callback([data.result, data.requester]);
				else
					callback([null, null, data.errors]);
			},
		);
	});
}

async function get_login(prompt){
	var username = await prompt("Username:");
	var ligma = await prompt("P\x61ssword:",true);
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

// get session, either from session file or by logging in again
// always returns a valid session if `force` is true
async function get_session(prompt, filename, force){
	if (!force)
		session = await load_session(filename);
	while (!session) {
		[username, passwordhash] = await get_login(prompt);
		session = await login2session(username, passwordhash);
		if (session)
			save_session(session, filename);
		else
			console.error("Failed to log in, try again");
	}
	return session;
}

module.exports = async function(prompt, filename) {
	var session = await get_session(prompt, filename);
	var [auth, user, errors] = await session2auth(session);
	if (auth)
		return [user, auth, session];
	// something went wrong, ask user to log in again
	// (most likely caused by the saved session expiring)
	var session = await get_session(prompt, filename, true);
	var [auth, user, errors] = await session2auth(session);
	if (auth)
		return [user, auth, session];
	// failed again
	console.error("Failed to get auth key.");
	return [null, null, null, errors];
}
