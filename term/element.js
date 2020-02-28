// styles:
// - block: boolean - whether to display element as block
// - color: color - text color
// - bgcolor: color - background color
// - scrollcolor: color - color of scrollbar
// - scrollbgcolor: color - color of scrollbar background
// - bold: boolean - bold
// - underline: boolean - underlined
// - blockbgcolor: color

class Stylesheet {
	constructor(styles) {
		this.styles = styles;
	}

	lookup(element, stack) {
		var styles = this.styles[element.tag];
		if (!styles)
			styles = {};
		if (typeof styles == 'function')
			styles = styles(element);
		// compute fallback styles
		var newStyles = {};
		for (var style in styles)
			newStyles[style] = styles[style];
		if (stack)
			for (var i=stack.length-1; i>=0; i--)
				for (var style in stack[i])
					if (newStyles[style] === undefined)
						newStyles[style] = stack[i][style];
		return newStyles;
	}
}

module.exports = Stylesheet;

// when called for the first time, stack should contain
// the default styles (from the window)
function processElement(element, stylesheet, callback, stack) {
	if (typeof element == 'string')
		callback(element, stylesheet.lookup({}, stack));
	else
		var styles = stylesheet.lookup(element, stack);
	
	if (typeof element.contents == 'string') {
		callback(element.contents, styles);
	} else if (element.contents instanceof Array) { //
		if (element.block) {
			callback(true, styles);
		}
		stack.push(styles);
		element.contents.forEach((element)=>{
			processElement(element, stylesheet, callback, stack);
		});
		stack.pop();
		if (element.block) {
			callback(false, styles);
		}
	}
}

var styles = new Stylesheet({
	main: {
		bgcolor: "white",
		color: "black",
	},
	bold: {
		bold: true,
	},
	username: function(element) {
		return {
			color: element.user.uid % 256,
		};
	}
});

var element = {tag: "main", contents:[
	{tag: "sender", contents: [
		{tag: "username", user: {uid:286}, contents: "Multi-Color Graphics"},
		":",
	], right: {
		tag: "time", contents: "10:30 pm"
	}},
	{tag: "message", block: true, contents: [
		"the",
		{tag: "bold", contents: "sand"},
		"can be eaten"
	]},
]}

// todo: make element parser an iterable(?)

// idea: all text must be inside a block
// that way, there only needs to be 3? types of callback values
// - block start
// - normal text
// - end

processElement(element, styles, console.log, []);
