const Http = require("http");
const Https = require("https");
const Concat = require("concat-stream");
const Sharp = require("sharp");
//const Blessed = require("blessed");

function getAvatar(url, width, height, callback) {
	const resize = Sharp().resize(width,height,{fit:"cover"}).raw();
	function gotBuffer(buffer){
		if(!buffer.length)
			return;
		var pxsize = buffer.length/(width*height);
		var out=[];
		for(var i=0;i<buffer.length;i+=pxsize){
			if (pxsize==4 && !buffer[i+3])
				out.push([255,255,255]);
			else
				out.push([buffer[i],buffer[i+1],buffer[i+2]]);
			
		}
		callback(out,width,height);
	}

	try{
		Http.get(url, function(response){
			x = response.pipe(resize).on("error",function(e){
				console.error(e);
			}).pipe(Concat(gotBuffer));
		});
	}catch(e){
		console.error("request failed in getavatar: "+url);
	}
}

exports.getImage = getAvatar;

function ansi(fg,bg){
	if (!bg)
		return "\x1B[38;2;"+fg[0]+";"+fg[1]+";"+fg[2]+"m";
	if (!fg)
		return "\x1B[48;2;"+bg[0]+";"+bg[1]+";"+bg[2]+"m";
	return "\x1B[38;2;"+fg[0]+";"+fg[1]+";"+fg[2]+";48;2;"+bg[0]+";"+bg[1]+";"+bg[2]+"m";
}
/*
var screen = Blessed.screen({
	smartCSR: true,
});

var box = Blessed.box({
	parent: screen,
	style: {
		bg: "#FFFFFF",
	},
	tags: true,
});

var min = Math.min(box.width, box.height*2);*/

var min=70;

//getAvatar(process.argv[2],min,min,print);

function print(data, width, height){
	var str="";
	var n=0;

	//console.log(width, height);
	for (var j=0;j<height;j+=2){
		if (j)
			str+="\n";
		for (var i=0;i<width;i++){
			str+=ansi(data[n],data[n+width])+"▀";
			n++;
		}
		n+=width;
		str +="\x1B[m";
	}
	console.log(str);
}
//*/

