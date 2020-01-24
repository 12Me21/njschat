module.exports = function(G, input){
	input.key("C-c", function(ch, key) {
		return process.exit(0);
	});
	input.key("up", function(ch, key) {
		x= G.Room.current;
//		G.log(x.atBottom(), x.box.getScroll(), x.box.getScrollHeight());
		G.scrollCurrent(-1);
	});
	input.key("down", function(ch, key) {
		x= G.Room.current;
//		G.log(x.atBottom(), x.box.getScroll(), x.box.getScrollHeight());
		G.scrollCurrent(1);
	});
	input.key("left", function(ch, key) {
		G.switchRoom(-1);
	});
	input.key("right", function(ch, key) {
		G.switchRoom(1);
	});
	/*input.key("C-x", function(ch, key) {
		reload();
	});*/
}
