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

function session2auth(session, callback){
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
				callback(data.result, data.requester.uid, session);
			else
				callback(null, null, session, data.errors);
		},
	);
}

async function get_login(){
	Graphics.render();
	var input = function(prompt, censor){
		return new Promise(resolve=>{
			Graphics.input.clearValue();
			Graphics.write_divider(prompt);
			Graphics.input.censor = !!censor;
			Graphics.input.readInput();
			function done(text){
				Graphics.input.removeListener("submit",done);
				Graphics.write_divider("");
				Graphics.input.clearValue();
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

function load_session(callback){
	Fs.readFile(SESSION_FILE, (err, data)=>{
		callback(data);
	});
}

function save_session(session){
	Fs.writeFile(SESSION_FILE, session, x=>x);
}

async function get_session(force, callback){
	async function after_load(session) {
		while (!session) {
			[username, passwordhash] = await get_login();
			session = await login2session(username, passwordhash);
			if (session)
				save_session(session);
			else
				Graphics.log("Failed to log in");
		}
		callback(session);
	}
	if (force)
		after_load(null);
	else
		load_session(after_load);
}

function get_auth(callback) {
	function try_auth(force, callback, callback2){
		get_session(force, function(session){
			if (session)
				session2auth(session, callback);
			else
				callback2();
		});
	}
	try_auth(false,callback,function(){
		try_auth(true,callback,function(){
			//failed to get session
		});
	})
}

exports.Auth = get_auth
//*/
