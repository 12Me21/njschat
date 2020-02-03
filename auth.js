const Crypto = require("crypto");
const Fs = require("fs");
const Axios = require("axios");

// username/password -> session token
async function login2session(username, passwordhash){
	var response = await Axios.post(
		"https://smilebasicsource.com/query/submit/login?session=x&small=1",
		"username="+username+"&password="+passwordhash,
		{headers: {"Content-Type":"application/x-www-form-urlencoded"}},
	)
	var data = response.data;
	return data.result;
}

// session token -> chat auth key
async function session2auth(session){
	var response = await Axios.get("https://smilebasicsource.com/query/request/chatauth?session="+session);
	var data = response.data;
	if (data.result)
		return [data.result, data.requester];
	else
		return [null, null, data.errors];
}

async function get_login(prompt){
	console.log("getting username/password");
	var username = await prompt("Username:");
	var ligma = await prompt("P\x61ssword:",true);
	var balls = Crypto.createHash("md5").update(ligma).digest("hex");
	return [username, balls];
}

async function load_session(filename){
	return new Promise(callback=>{
		Fs.readFile(filename, "utf8", (err, data)=>{
			callback(data);
		});
	});
}

function save_session(session, filename){
	Fs.writeFile(filename, session, ()=>{});
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
