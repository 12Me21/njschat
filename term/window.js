const XTerm = require("./xterm.js");

// interface level 2:
// scrolling buffers
class Window {
	constructor(term, above = 0, height = 0, stylesheet, className, autoscroll, scrollbar) {
		this.visible = true;
		this.lines = [];
		this.scroll = 0;
		this.autoscroll = autoscroll;
		this.scrollbar = scrollbar;
		this.style = stylesheet;
		this.className = className;
		this.t = term;
		this.resize(above, height);
	}
	
	// todo: make this more efficient when width doesn't change
	// width is implied from the terminal width
	resize(above = this.above, height = this.height) {
		var width = this.t.width;
		if (above != this.above || height != this.height || width != this.width) {
			var atBottom = this.atBottom();
			this.width = this.t.width;
			this.height = height;
			this.above = above;
			if (atBottom && this.autoscroll)
				this.scroll = Math.max(0, this.lines.length - this.height);
			this.t.hideCursor();
			this.redraw();
			this.t.showCursor();
		}
	}

	redraw_external() {
		this.t.hideCursor();
		this.redraw();
		this.t.showCursor();
	}
	
	setScroll(scroll) {
		var change = scroll - this.scroll;
		this.scroll = scroll
		this.t.hideCursor();
		if (change > this.height) {
			this.redraw();
		} else if (change) {
			this.t.scrollRegion(this.above, this.height-this.below);
			this.t.scroll(change);
			if (change > 0)
				this.redraw(this.height-change, this.height-1);
			else
				this.redraw(0, change-1);
		}
		this.t.showCursor();
	}

	scrollHelper(amount, start = 0, end = this.height-1){
		if (!this.visible) {
			this.dirty = true;
			return;
		}
		this.t.scrollRegion(this.above+start, this.above+end);
		this.t.scroll(amount);
		// update scrollbar
		if (this.scrollbar) {
			for (var i=start; i<= end; i++) {
				this.t.locate(this.width-1, i);
				this.t.write(this.t.color(this.style[this.className].scrollbg)+" ");
			}
		}
	}
	
	replaceLines(lines, start) {
		if (typeof lines == "string")
			lines = [lines];
		this.lines.splice(start, lines.length, ...lines);
		var insertRelative = start - this.scroll;
		if (!sizeChange) {
			if (insertRelative < this.height && insertRelative + lines.length > 0) {
				this.redraw(Math.max(insertRelative, 0), Math.min(insertRelative + lines.length, this.height)-1);
			}
		}
	}

	show() {
		this.visible = true;
		this.t.hideCursor();
		this.redraw();
		this.t.showCursor();
	}

	hide() {
		this.visible = false;
	}
	
	atBottom() {
		if (this.scroll == this.lines.length - this.height)
			return 1;
		if (this.scroll > this.lines.length - this.height)
			return 2;
		return 0;
	}
	
	appendLines(lines) {
		if (typeof lines == "string")
			lines = [lines];
		if (!lines.length)
			return;
		var oldLen = this.lines.length;
		var atBottom = this.atBottom();
		this.lines.push(lines);
		// adding this as a special case because it's the most common
		var insertRelative = oldLen - this.scroll;
		if (atBottom && this.autoscroll && oldLen >= this.height) {
			this.t.hideCursor();
			if (lines.length < this.height) {
				this.scrollHelper(-lines.length);
				this.scroll += lines.length;
				this.redraw(this.height - lines.length, this.height-1);
			} else {
				this.redraw();
			}
			this.t.showCursor();
		} else if (insertRelative >= this.height) {
			// nothing to draw (inserted below screen)
		} else if (-insertRelative >= lines.length) {
			// nothing to draw (inserted above screen)
		} else { //inserted on screen (should only happen when screen is not full) (or if you somehow scrolled past the bottom limit)
			this.t.hideCursor();
			this.redraw(
				Math.max(insertRelative, 0),
				Math.min(insertRelative + lines.length, this.height)-1
			);
			this.t.showCursor();
		}
	}

	// do not call this yourself
	redraw(start = 0, end = this.height-1) {
		if (!this.visible) {
			this.dirty = true;
			return;
		}
		this.t.locate(0, this.above + start);
		for (var i = start; i <= end; i++) {
			
			var pos = i + this.scroll;
			if (this.lines[pos] === undefined)
				this.t.fillLine("", this.style[this.className].bgcolor);
			else
				this.t.fillLine(this.lines[pos], this.style[this.className].bgcolor);
			if (this.scrollbar) {
				this.t.locateX(this.width-1);
				this.t.write(this.t.color(this.style[this.className].scrollbg)+" ");
			}
			if (i < end)
				this.t.nextLine();
		}
	}
}

class Windows {
	constructor(term, stylesheet) {
		this.style = stylesheet;
		this.t = term;
		this.windows = [];
		// handle resize
		// eventually this will re-calculate sizes
		this.t.on('resize', ()=>{
			this.windows[0].appendLines("resize");
			var dirty = Array(this.t.height).fill(true);
			this.windows.forEach(window => {
				window.resize();
				dirty.fill(false, window.above, window.above+window.height);
			});
			for (var i = 0; i<dirty.length; i++){
				if(dirty[i]){
					this.t.locate(0,i);
					this.t.fillLine("",this.style.window.bgcolor);
				}
			}
		});
		// redraw all windows on terminal resume
		this.t.on('resume', ()=>{
			this.windows.forEach(window => {
				window.redraw_external();
			});
		});
	}
	
	createWindow(start, height, className, scrollbar, autoscroll) {
		var window = new Window(this.t, start, height, this.style, className, autoscroll, scrollbar);
		this.windows.push(window);
		return window;
	}

	// this will be a list of Scrolls
	// stacked on top of each other
	// so that one can be resized, and resize the others automatically,
	// among other things
	// each window should be sized as either
	// a fixed size, or based on content
	// with one window taking up the remaining space
}

// todo: interface level 3: message list + tag styling etc.
// ideally, this should be able to queue several changes and then display them all at once
// perhaps at first just things like "insert these 10 messages on the end" or whatever

var style = {
	window: {
		bgcolor: 15,
	},
	main: {
		bgcolor: 87,
		scrollbg: 96,
	},
	main2: {
		bgcolor: 125,
		scrollbg: 96,
	}
}

var term = new XTerm(process.stdin, process.stdout);
term.enter();
var stack = new Windows(term, style);
var s = stack.createWindow(0,10,'main',false,true);
var s2 = stack.createWindow(0,10,'main2',true,true);
var i = 0;
function add(){
	if (i % 20 < 10){
		s2.hide();
		s.show();
	} else {
		s.hide();
		s2.show();
	}
	if (i == 30)
		xyz();
	s.appendLines("test "+i);
	s2.appendLines("test2 "+i);
	i++;
	setTimeout(add, 100);
}
add();

//s.setScroll(-1);
//setTimeout(()=>{s.setScroll(1)},1000);

//bad
setTimeout(()=>{},10000);

class Message {
	constructor(json) {
		this.room = new Room(json.tag || 'any');
		if (json.sender)
			this.sender = new User(json.sender);
		this.type = json.type;
	}
}

// each block lists a style
// which provides a list of properties:
// (if not specified, they are inheritied from the outer blocks)
// - text color
// - background color
// - bold
// - underline
// for block elements:
// - left margin
// - 

[
	{block: "sender", contents: [
		{inline: "username", contents: "Multi-Color Graphics"},
		":",
	], right: {
		inline: "time", contents: "10:30 pm"
	}},
	{block: "message", contents: [
		"the",
		{inline: "bold", contents: "sand"},
		"can be eaten"
	]},
]
