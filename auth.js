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

function login2session(username, passwordhash, callback){
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

function get_login(callback){
		Graphics.render();
		var username;
		Graphics.input.on("submit",fuck1);
		function fuck1(text){
				username = text;
				Graphics.input.removeListener("submit",fuck1);
				Graphics.input.censor = true;
				Graphics.input.clearValue();
				Graphics.render();
				Graphics.input.readInput();
				Graphics.input.on("submit",fuck2);
		}
		function fuck2(text){
				Graphics.input.removeListener("submit",fuck2);
				text = Crypto.createHash("md5").update(text).digest("hex");
				Graphics.input.censor = false;
				Graphics.input.clearValue();
				Graphics.render();
				Graphics.input.readInput();
				callback(username, text);
		}
/*		rl.question("username: ",username=>{
				rl.question("password: ",password=>{
						var passwordhash = 
						callback(username, passwordhash);
				});
		});*/
}

function load_session(callback){
		Fs.readFile(SESSION_FILE, (err, data)=>{
				callback(data);
		});
}

function save_session(session){
		Fs.writeFile(SESSION_FILE, session, x=>x);
}

function get_session(force, callback){
		function after_got(session) {
				if (session) {
						save_session(session);
						callback(session);
				} else
						callback(null);
		}
		function after_load(session) {
				if (session)
						after_got(session);
				else
						get_login(function(username,passwordhash){
								if (username && passwordhash)
										login2session(username, passwordhash, after_got);
						});
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
