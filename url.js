// This simulates the modern URL library

const Url = require("url");

class URL {
	constructor(url, host) {
		if (host)
			url = Url.resolve(host, url)
		url =  Url.parse(url, false, true);
		if (!(url && url.host))
			return {}; //bad
		return url;
	}
}

module.exports = URL;
