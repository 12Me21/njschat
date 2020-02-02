// eventually I'm just going to have to completely rewrite the keyboard
// input handling

module.exports = function(G, input){
	input.key("C-c", function(ch, key) {
		return process.exit(0);
	});
	input.key("up", function(ch, key) {
		G.scrollCurrent(-1);
	});
	input.key("down", function(ch, key) {
		G.scrollCurrent(1);
	});
	input.key("pageup", function(ch, key) {
		G.scrollCurrent(-1, true);
	});
	input.key("pagedown", function(ch, key) {
		G.scrollCurrent(1, true);
	});
	input.key("left", function(ch, key) {
		G.switchRoom(-1);
	});
	input.key("right", function(ch, key) {
		G.switchRoom(1);
	});
	input.key("C-r", function(ch, key) {
		G.loadConfig();
	});
	/*input.key("C-z", function(ch, key) {
		G.onSuspend();
		process.kill(process.pid, 'SIGSTOP');
	});*/
}
