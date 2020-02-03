var API = require("../api.js");

API.addCommand("yt", "Get youtube video info", function(param){
	var video = (" "+param+" ").match(/\W(\w{11})\W/);
	if (video) {
		video = video[1];
		API.Axios.get("https://www.youtube.com/oembed?url=https://youtu.be/"+video).then(resp=>{
			API.display.module(`Info for http://youtu.be/${video}
Title: ${resp.data.title}
Author: ${resp.data.author_name}`);
		}).catch(err=>{
			console.error(err);
		});
	} else {
		API.display.warning("couldn't find video id");
	}
});
