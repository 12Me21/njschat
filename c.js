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

let Credits    =
      12       ,
   randomous   ,
    Yttria     ,
    chicken    ;
