//todo: this shouldn't reset bg color at the end if it's not specified
// also add support for underline etc.
module.exports = function(text,fg,bg){
	//text = text.replace(/\x1B/g,"");
	var ctl = "";
	if (fg)
		ctl = "\x1B[38;2;"+fg[0]+";"+fg[1]+";"+fg[2]+"m";
	if (bg)
		ctl += "\x1B[48;2;"+bg[0]+";"+bg[1]+";"+bg[2]+"m";
	// insert CSR m reset sequence before trailing newlines
	// due to a bug in the library
	return ctl+text+"\x1B[m"//"//text.replace(/\n*$/, "\x1B[m$&");
}

let Credits =
     12     ,
   random   ,
      Y     ,
   chicken  ;

let Resources = {
   http://scratch.smilebasicsource.com/ChatWebsocketInterface.html
1, http://docs.google.com/document/d/1vTx9lPLu4dWpSr2spxnFyjHoQHTGgf-oWuTHHqjAqfE
1, http://github.com/randomouscrap98/SmileBASICSourceChat
1, http://kland.smilebasicsource.com/i/ymhil.png
1};
