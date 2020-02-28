// interface level 0
// (write, ioctl, etc.)

const EventEmitter = require('events');
const Readline = require('readline');

// interface level 1
// generic terminal control
// this one is for xterm, but others could be made for other terminals if needed
// need to clean up the enter/leave etc. functions
// enter - call when you want to take over the terminal
// leave - call when finished, to restore terminal to normal state
// suspend - call before SIGSTOP
// restore - call after SIGCONT

class XTerm extends EventEmitter {
	constructor(inp, out) {
		super();
		//this.rl = Readline.createInterface({input:inp, output:out});
		this.o = out;
		this.i = inp;
		this.csrx = 0;
		this.csry = 0;
		
		// these can't be methods because they're passed to .on()
		this.onUncaughtException = (e)=>{
			this.leave();
			console.error(e);
			// this isn't ideal, but for now...
			// ideally there should be a way to detect
			// errors that aren't recovered from otherwise
			process.exit();
		};
		this.onKill = ()=>{
			this.leave();
			process.exit();
		}
		this.onKey = (key)=>{
			if (key == "\x03")
				process.exit();
			if (key == "\x1A")
				this.suspend()
			if (key == "\x0C") {
				this.o.getWindowSize();
				this.onResize();
			}
			if (key == "w")
				this.setCursorPos(this.csrx, this.csry-1);
			if (key == "a")
				this.setCursorPos(this.csrx-1, this.csry);
			if (key == "s")
				this.setCursorPos(this.csrx, this.csry+1);
			if (key == "d")
				this.setCursorPos(this.csrx+1, this.csry);
			this.emit('key', key);
		};
		this.onResize = ()=>{
			this.width = this.o.columns;
			this.height = this.o.rows;
			this.scrollTop = undefined;
			this.scrollBottom = undefined;
			if (this.cursorVisible)
				this.locate(this.csrx, this.csry);
			this.emit('resize');
		};
		this.onContinue = ()=>{
			this.i.setRawMode(true);
			this.halt = false;
			this.scrollTop = undefined;
			this.scrollBottom = undefined;
			this.write("\x1B[?1049h\x1B[?12l");
			this.onResize(); // this is going to send too many events
			this.emit("resume");
		};
	}
	
	write(x) {
		if (!this.halt)
			this.o.write(x);
	}

	// Take over terminal
	enter() {
		this.i.setRawMode(true);
		this.i.on('data', this.onKey);
		this.o.on('resize', this.onResize);
		process.once('uncaughtException', this.onUncaughtException);
		process.once('exit', this.onKill);
		process.once('SIGTERM', this.onKill);
		process.once('SIGINT', this.onKill);
		this.onResize();
		this.write("\x1B[?1049h\x1B[?12l");
	}

	// Clean up terminal + remove events
	// destructor
	leave() {
		this.i.removeListener('data', this.onKey);
		this.o.removeListener('resize', this.onResize);
		process.removeListener('uncaughtException', this.onUncaughtException);
		process.removeListener('exit', this.onKill);
		process.removeListener('SIGTERM', this.onKill);
		process.removeListener('SIGINT', this.onKill);
		process.removeListener('SIGCONT', this.onContinue);
		
		this.write("\x1B[r"); // reset scroll region
		this.write("\x1B[?1049l"); // main buffer
		this.i.setRawMode(false);
		//this.write("bye!\n");
		this.halt = true;
	}
	
	// called when process is suspended (usually bound to ctrl+z)
	suspend() {
		this.write("\x1B[r"); // reset scroll region
		this.write("\x1B[?1049l"); // switch to main buffer
		this.i.setRawMode(false);
		process.once('SIGCONT', this.onContinue);
		this.halt = true;
		process.kill(process.pid,"SIGTSTP");
	}
	
	scrollRegion(top, bottom) {
		if (this.scrollTop === top && this.scrollBottom === bottom)
			return;
		this.write(`\x1B[${top+1};${bottom+1}r`);
		this.scrollTop = top;
		this.scrollBottom = bottom;
	}

	// it's important that the fucking bg color is set correctly first
	// otherwise you get flickering
	scroll(dist) {
		if (dist > 0)
			this.write(`\x1B[${dist}T`);
		else if (dist < 0)
			this.write(`\x1B[${-dist}S`);
		else
			return;
	}

	locate(x = 0, y = 0) {
		if (x && y)
			this.write(`\x1B[${y+1};${x+1}H`);
		else if (y)
			this.write(`\x1B[${y+1};H`);
		else if (x)
			this.write(`\x1B[;${x+1}H`);
		else
			this.write(`\x1B[H`);
	}

	locateX(x){
		this.write(`\x1B[${x+1}G`);
	}
	
	color(color) {
		return `\x1B[48;5;${color}m`;
	}

	fillLine(text, bg, scrollbar) {
		this.write(`${this.color(bg)}${text}\x1B[K`);
		if (scrollbar)
			this.write(`\x1B[${this.width}G${this.color(scrollbar)} `);
	}

	showCursor() {
		if (this.cursorVisible == true)
			return;
		this.write("\x1B8\x1B[?25h");
		this.cursorVisible = true;
		this.locate(this.csrx, this.csry);
	}
	
	hideCursor() {
		if (this.cursorVisible == false)
			return;
		this.write("\x1B7\x1B[?25l");
		this.cursorVisible = false;
	}

	setCursorPos(x, y) {
		this.csrx = x;
		this.csry = y;
		this.locate(x, y);
	}
	
	nextLine() {
		this.write("\n");
	}
}

module.exports = XTerm;
