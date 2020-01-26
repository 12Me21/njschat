colors = require("blessed/lib/colors");

colors._cache = {};

//remove first 16 colors from matching
for(var i=0;i<16;i++){
	colors.colors[i] = "#000000";
	colors.vcolors[i] = [-100,-100,-100];
}

/*colors.ccolors = (function() {
  var _cols = exports.vcolors.slice()
    , cols = exports.colors.slice()
    , out;

  exports.vcolors = exports.vcolors.slice(0, 8);
  exports.colors = exports.colors.slice(0, 8);

  out = cols.map(exports.match);
	exports._cache={};
	
  exports.colors = cols;
  exports.vcolors = _cols;
  exports.ccolors = out;

  return out;
})();*/

var Textarea = require("blessed/lib/widgets/textarea");
Textarea.prototype.editor = Textarea.prototype.setEditor = Textarea.prototype.readEditor = function(){}; //fuck you

var Screen = require("blessed/lib/widgets/screen");
Screen.prototype.readEditor = function(){};

var ScrollableBox = require("blessed/lib/widgets/scrollablebox");
ScrollableBox.prototype.getScroll = function(){return this.childBase;};

var Element = require("blessed/lib/widgets/element");
Element.prototype.lineCount = function(){
	if (!this.content)
		return 0;
	return this._clines.fake.length;
};
