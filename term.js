// interface level 0
// (write, ioctl, etc.)

// interface level 1
// generic terminal control
// this one is for xterm, but others could be made for other terminals if needed
class XTerm {
	constructor(inp, out) {
		this.o = out;
		this.i = inp;
		process.on('exit', ()=>{ // this will cause a memory leak
			this.leave();
		});
		this.o.on('resize', ()=>{
			this.width = this.o.columns;
			this.height = this.o.rows;
		});
		this.width = this.o.columns;
		this.height = this.o.rows;
	}

	write(x) {
		this.o.write(x);
	}
	
	enter() {
		this.i.setRawMode(true);
		this.write("\x1B[?1049h");
	}
	
	leave() {
		this.write("\x1B[?1049l");
		this.i.setRawMode(false);
	}

	scrollRegion(top, bottom) {
		this.write(`\x1B[${top+1};${bottom+1}r`);
	}

	scroll(dist) {
		if (dist > 0)
			this.write(`\x1B[${dist}S`);
		else if (dist < 0)
			this.write(`\x1B[${-dist}T`);
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
	
	fillLine(text) {
		this.write(`${text}\x1B[K`);
	}
}

// interface level 2:
// scrolling buffers
class Scroll {
	constructor(term, above = 0, below = 0) {
		this.above = above;
		this.below = below;
		this.lines = [];
		this.scroll = 0;
		this.t = term;
		this.t.o.on('resize', this.calculateSize);
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
	
	// so here's something to consider...
	// when moving the scroll window, how should the contents move?
	// should it try to keep the text in the same position,
	// or keep the same line at the top / bottom of the window?
	// same with inserting/removing text,
	// should it try to keep as much of the text at the same position on screen,
	// or try to keep a row visible, etc.

	// maybe make this configurable!
	// types of scrolling windows:
	// chat pane (size indepentant of contents, scroll to bottom, etc.)
	// user/room lists (size increases as it gets more full, maybe scroll if it gets too big)
	// input pane (size increase?)
	
	calculateSize() {
		this.width = this.t.width;
		this.height = this.t.height - this.above - this.below;
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
	
	insertLines(lines, start = this.lines.length, replace = 0) {
		if (typeof lines == "string")
			this.lines.splice(start, replace, lines);
		else
			this.lines.splice(start, replace, ...lines);
	}
	
	redraw(start = 0, end = this.height-1) {
		for (var i = start; i <= end; i++) {
			this.t.locate(0, this.above+i);
			var pos = i + this.scroll;
			if (this.lines[pos] === undefined)
				this.t.fillLine("");
			else
				this.t.fillLine(this.lines[pos]);
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


var x = new XTerm(process.stdin, process.stdout);
x.enter();
var s = new Scroll(x, 0, 0);
s.insertLines("test");
s.insertLines("test2");
s.redraw();
s.setScroll(-1);
setTimeout(()=>{s.setScroll(1)},1000);

['SIGINT', 'SIGUSR1', 'SIGUSR2', 'uncaughtException', 'SIGTERM'].forEach((eventType) => {
	process.on(eventType, process.exit);
});
setTimeout(()=>{},10000);




/*
problem: converting high level Message objects into lines
need to do styling and text wrapping
maybe have an intermediate representation?
with tags and whatever

*/

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
