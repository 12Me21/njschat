//note: currently doesn't support replacing message names
// alias has been changed to request uhhhhh

window.nicknames={};

var old_startChatConnection = startChatConnection;
startChatConnection = function(){
	nicknames = {};
	old_startChatConnection.apply(this, arguments)
};

function time_until(time){
	return Math.max(time-Date.now(), 0);
}

var last_request = Date.now();

function call_all(functions, arg){
	for(var i=0;i<functions.length;i++)
		functions[i](arg);
}

function escape_name(name){
	var out=""
	for(var i=0;i<name.length;i++){
		console.log(i)
		var chr=name.charAt(i);
		if(chr=="\0" || chr>="\x7F" || chr=="%")
			out+=escape(chr);
		else
			out+=chr;
	}
	return out;
}

var get_nickname=function(username, callback){
	//nickname unknown
	if(nicknames[username]!==undefined)
		callback(nicknames[username]);
	else{
		console.log("req");
		//make sure name hasn't already been loaded
		genericXHRSimple("/query/tinycomputerprograms?username="+username+"&program=nickname",function(nickname){
			//has nickname
			console.log("got "+nickname);
			nickname = unescape(nickname)
			if(nickname >= " " && nickname != "\r\n"){
				nicknames[username] = nickname;
			}else{ //doesn't have nickname
				nicknames[username] = false;
			}
			callback(nicknames[username]);
		});
	}
}

addMessageEvent(function(message){
	var username = message.dataset.username;
	var part = message.querySelector("message-part");
	if(part){
		var match = part.textContent.match(/^\[rpl[23]\dnick] (.*?)'s name is now (.*)/);
		if(match)
			nicknames[username] = match[2];
	}
});

function write_persistent(name, value){
	genericXHRSimple("/query/submit/varstore?nameb64="+btoa(name)+"&valueb64="+btoa(escape_name(value))+"&session=" + StorageUtilities.GetPHPSession(),function(a){console.log(a)});
}

commands.push(new Command("nick",function(param){
	var nickname = param.substring(1);
	if (nickname.length > 40)
		nickname = nickname.substring(0,40);
	nicknames[username] = nickname;
	write_persistent("nickname_tcf", nickname || "\r\n");
	sendMessage("[rpl29nick] " + username + "'s name is now " + nickname);
}));

commands.push(new Command("alias",function(param) {
	var result = "";
	param = param.substring(1) || username;

	get_nickname(param, function(nickname){
		if (nickname)
			localModuleMessage(param+" has nickname "+nickname);
		else
			localModuleMessage(param+" does not have a nickname");
	});
}));

function roll(n){
	//Rolls an n-sided die
	return Math.floor(Math.random()*n) + Math.sign(n);
}

commands.push(new Command("roll", function(param) {
	var n = Number.parseInt(param) || 20;
	var result = roll(n);
	var action;
	if(n==2){
		action = "flipped a coin";
		result = (result===1?"tails":"heads");
	}else{
		action = "rolled a d"+n;
	}
	sendMessage("[rpl25roll] "+(nicknames[username] || username)+" "+action+" and got "+result+"!");
}));
