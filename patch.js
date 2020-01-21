colors = require("blessed/lib/colors");

colors._cache = {};

//remove first 16 colors from matching
for(var i=0;i<16;i++){
	colors.colors[i] = "#000000";
	colors.vcolors[i] = [0,0,0];
}
