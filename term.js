// interface level 0
// (write, ioctl, etc.)

// interface level 1
// generic terminal control
// this one is for xterm, but others could be made for other terminals if needed
class XTerm {
	constructor(inp, out) {
		this.o = out;
		this.i = inp;
	}
	
	onKey(key) {
		if (key == "\x03")
			process.exit();
	}
	
	updateSize(){
		this.width = this.o.columns;
		this.height = this.o.rows;
	}

	write(x) {
		this.o.write(x);
	}
	
	enter() {
		process.on('exit', this.leave.bind(this));
		this.updateSize();
		this.o.on('resize', this.updateSize.bind(this));
		this.i.on('data', this.onKey.bind(this));
		
		this.i.setRawMode(true);
		this.write("\x1B[?1049h");
	}

	// WARNING: this does not remove the event listeners
	// it is assumed that you will never need to destroy
	// an instance of this class before the program ends
	leave() {
		// should remove eventlistners :(
		this.scrollRegion(0,999);
		this.write("\x1B[?1049l");
		this.i.setRawMode(false);
		this.write("bye!\n");
	}

	scrollRegion(top, bottom) {
		this.write(`\x1B[${top+1};${bottom+1}r`);
	}

	scroll(dist) {
		if (dist > 0)
			this.write(`\x1B[${dist}T`);
		else if (dist < 0)
			this.write(`\x1B[${-dist}S`);
	}

	locate(x, y) {
		if (x && y)
			this.write(`\x1B[${y+1};${x+1}H`);
		else if (y)
			this.write(`\x1B[${y+1}H`);
		else if (x)
			this.write(`\x1B[;${x+1}H`);
		else
			this.write(`\x1B[H`);
	}
	
	color(color) {
		return `\x1B[48;5;${color}m`;
	}
	
	fillLine(text, bg) {
		this.write(`${this.color(bg)}${text}\x1B[K`);
	}
}

// interface level 2:
// scrolling buffers
class Scroll {
	constructor(term, above = 0, below = 0, autoscroll, stylesheet, className) {
		this.above = above;
		this.below = below;
		this.lines = [];
		this.scroll = 0;
		this.autoscroll = autoscroll;
		this.style = stylesheet;
		this.className = className;
		this.t = term;
		this.t.o.on('resize', this.calculateSize.bind(this));
		this.calculateSize();
	}

	setPosition(above, below) {
		// this only redraws lines when the size is increased
		// if size is reduced, it is the responsibility of the surrounding windows to overwrite the old lines
		var change = above - this.above;
		this.above = above
		if (change < 0)
			this.redraw(0, -change);
		var change = below - this.above;
		if (change > 0)
			this.redraw(this.height-change); //+-1
	}
	
	calculateSize() {
		var width = this.t.width;
		var height = this.t.height - this.above - this.below;
		if (width != this.width || height != this.height) {
			if (height <= 0) {
				throw "resize too small :("
			}
			var atBottom = this.atBottom();
			this.width = width;
			this.height = height;
			if (atBottom && this.autoscroll)
				this.scroll = Math.max(0, this.lines.length - this.height);
			this.redraw();
			this.appendLines("resize");
		}
	}
	
	setScroll(scroll) {
		var change = scroll - this.scroll;
		this.scroll = scroll
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
	}

	scrollHelper(amount, start = 0, end = this.height-1){
		this.t.scrollRegion(this.above+start, this.above+end);
		this.t.scroll(amount);
	}
	
	replaceLines(lines, start) {
		if (typeof lines == "string")
			lines = [lines];
		this.lines.splice(start, lines.length, ...lines);
		var insertRelative = start - this.scroll;
		if (!sizeChange) {
			if (insertRelative < this.height && insertRelative + lines.length > 0)
				this.redraw(Math.max(insertRelative, 0), Math.min(insertRelative + lines.length, this.height)-1);
		}
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
			if (lines.length < this.height) {
				this.scrollHelper(-lines.length);
				this.scroll += lines.length;
				this.redraw(this.height - lines.length, this.height-1);
			} else {
				this.redraw();
			}
		} else if (insertRelative >= this.height) {
			// nothing to draw (inserted below screen)
		} else if (-insertRelative >= lines.length) {
			// nothing to draw (inserted above screen)
		} else { //inserted on screen (should only happen when screen is not full) (or if you somehow scrolled past the bottom limit)
			this.redraw(
				Math.max(insertRelative, 0),
				Math.min(insertRelative + lines.length, this.height)-1
			);
		}
	}
	
	redraw(start = 0, end = this.height-1) {
		for (var i = start; i <= end; i++) {
			this.t.locate(0, this.above+i);
			var pos = i + this.scroll;
			if (this.lines[pos] === undefined)
				this.t.fillLine("", this.style[this.className].bgcolor);
			else
				this.t.fillLine(this.lines[pos], this.style[this.className].bgcolor);
		}
	}
}

class ScrollStack {
	// this will be a list of Scrolls
	// stacked on top of each other
	// so that one can be resized, and resize the others automatically,
	// among other things
}

// todo: interface level 3: message list + tag styling etc.
// ideally, this should be able to queue several changes and then display them all at once
// perhaps at first just things like "insert these 10 messages on the end" or whatever

var style = {
	main: {
		bgcolor: 87,
	}
}

var x = new XTerm(process.stdin, process.stdout);
x.enter();
var s = new Scroll(x, 0, 20, true, style, 'main');
var i = 0;
function add(){
	s.appendLines("test"+i);
	i++;
	setTimeout(add, 100);
}
add();

//s.setScroll(-1);
//setTimeout(()=>{s.setScroll(1)},1000);

['SIGINT', 'SIGUSR1', 'SIGUSR2', 'SIGTERM'].forEach((eventType) => {
	
	process.on(eventType, process.exit);
});
process.on('uncaughtException', (e)=>{
	x.leave();
	console.error(e);
	process.exit();
})
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
