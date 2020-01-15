colors = require("blessed/lib/colors");

colors.ccolors = (function() {
	var _cols = colors.vcolors.slice();
	var cols = colors.colors.slice();
   var out;
	
	colors.vcolors = colors.vcolors.slice(0, 8);
	colors.colors = colors.colors.slice(0, 8);
	
	out = cols.map(colors.match);
	colors._cache={};
	
	colors.colors = cols;
	colors.vcolors = _cols;
	colors.ccolors = out;
	
	return out;
})();
