const Http = require("http");
const Concat = require("concat-stream");
const Sharp = require("sharp");

function ansi(fg,bg){
	if (!bg){
		return "\x1B[38;2;"+fg[0]+";"+fg[1]+";"+fg[2]+"m";
	}
	return "\x1B[38;2;"+fg[0]+";"+fg[1]+";"+fg[2]+";48;2;"+bg[0]+";"+bg[1]+";"+bg[2]+"m";
}

function getAvatar(url, callback) {
	const resize = Sharp().resize(4,4,{kernel:"cubic"}).raw();
	function gotBuffer(buffer){
		//console.log(buffer);
		var pxsize = buffer.length/(4*4);
		var out=[];
		for(var i=0;i<buffer.length;i+=pxsize){
			out.push([buffer[i],buffer[i+1],buffer[i+2]]);
		}
		callback(out);
	}
	if(url.match(/^\/\//))
		url = "http:" + url;
	else if(!(url.match(/^\w+:\/\//)))
		url = "http://smilebasicsource.com/" + url;
	Http.get(url, function(response){
		response.pipe(resize).pipe(Concat(gotBuffer));
	});
}

exports.get3x2 = getAvatar;

console.log("start");
getAvatar(process.argv[2], print);


function print(data){
	console.log(data);
	var s=''
	for(var i=0;i<4;i++){
		s+=ansi(data[i],data[i+4])+"▀";
	}
	s+="\x1B[m\n"
	for(var i=8;i<12;i++){
		s+=ansi(data[i],data[i+4])+"▀";
	}
	console.log(s);
}
//*/
