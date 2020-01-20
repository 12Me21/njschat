/**
 * Wrapper for built-in http.js to emulate the browser XMLHttpRequest object.
 *
 * This can be used with JS designed for browsers to improve reuse of code and
 * allow the use of existing libraries.
 *
 * Usage: include("XMLHttpRequest.js") and use XMLHttpRequest per W3C specs.
 *
 * @author Dan DeFelippi <dan@driverdan.com>
 * @contributor David Ellis <d.f.ellis@ieee.org>
 * @license MIT
 */

const http = require("http");
const https = require("https");

// Set some default headers
const defaultHeaders = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0",
	"Accept": "*/*",
};
// Alright so user-agent was a mistake lol
// currently it's only used for evil
// so I just hardcoded it to the most normal value (firefox/windows 10)

// These request methods are not allowed
var forbiddenRequestMethods = [
	"TRACE",
	"TRACK",
	"CONNECT"
];

// These headers are not user setable.
// The following are allowed but banned in the spec:
// * user-agent
const forbiddenRequestHeaders = [
	"accept-charset",
	"accept-encoding",
	"access-control-request-headers",
	"access-control-request-method",
	"connection",
	"content-length",
	"content-transfer-encoding",
	"cookie",
	"cookie2",
	"date",
	"expect",
	"host",
	"keep-alive",
	"origin",
	"referer",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade",
	"via"
];

exports.XMLHttpRequest = function(defaultHost){
	return function() {
		"use strict";

		/**
		 * Private variables
		 */
		var self = this;

		// Holds http.js objects
		var request;
		var response;

		// Request settings
		var settings = {};

		var headers = {};
		var headersCase = {};

		// Send flag
		var sendFlag = false;
		// Error flag, used when errors occur or abort is called
		var errorFlag = false;

		// Event listeners
		var listeners = {};

		/**
		 * Constants
		 */

		this.UNSENT = 0;
		this.OPENED = 1;
		this.HEADERS_RECEIVED = 2;
		this.LOADING = 3;
		this.DONE = 4;

		/**
		 * Public vars
		 */

		// Current state
		this.readyState = this.UNSENT;

		// default ready state change handler in case one is not set or is set late
		this.onreadystatechange = null;

		// Result & response
		this.responseText = "";
		this.responseXML = "";
		this.status = null;
		this.statusText = null;
		
		// Whether cross-site Access-Control requests should be made using
		// credentials such as cookies or authorization headers
		this.withCredentials = false;

		/**
		 * Private methods
		 */

		var isAllowedHttpHeader = function(header) {
			return header && forbiddenRequestHeaders.indexOf(header.toLowerCase()) === -1;
		};

		var isAllowedHttpMethod = function(method) {
			return method && forbiddenRequestMethods.indexOf(method) === -1;
		};

		/**
		 * Public methods
		 */

		this.open = function(method, url, async, user, password) {
			this.abort();
			errorFlag = false;

			// Check for valid request method
			if (!isAllowedHttpMethod(method)) {
				throw new Error("SecurityError: Request method not allowed");
			}

			settings = {
				"method": method,
				"url": url.toString(),
				"async": (typeof async !== "boolean" ? true : async),
				"user": user || null,
				"password": password || null
			};

			setState(this.OPENED);
		};

		this.setRequestHeader = function(header, value) {
			if (this.readyState !== this.OPENED) {
				throw new Error("INVALID_STATE_ERR: setRequestHeader can only be called when state is OPEN");
			}
			if (!isAllowedHttpHeader(header)) {
				console.warn("Refused to set unsafe header \"" + header + "\"");
				return;
			}
			if (sendFlag) {
				throw new Error("INVALID_STATE_ERR: send flag is true");
			}
			header = headersCase[header.toLowerCase()] || header;
			headersCase[header.toLowerCase()] = header;
			headers[header] = headers[header] ? headers[header] + ', ' + value : value;
		};

		this.getResponseHeader = function(header) {
			if (typeof header === "string"
				&& this.readyState > this.OPENED
				&& response
				&& response.headers
				&& response.headers[header.toLowerCase()]
				&& !errorFlag
			   ) {
				return response.headers[header.toLowerCase()];
			}

			return null;
		};

		this.getAllResponseHeaders = function() {
			if (this.readyState < this.HEADERS_RECEIVED || errorFlag) {
				return "";
			}
			var result = "";

			for (var i in response.headers) {
				// Cookie headers are excluded
				if (i !== "set-cookie" && i !== "set-cookie2") {
					result += i + ": " + response.headers[i] + "\r\n";
				}
			}
			return result.substr(0, result.length - 2);
		};

		this.getRequestHeader = function(name) {
			if (typeof name === "string" && headersCase[name.toLowerCase()]) {
				return headers[headersCase[name.toLowerCase()]];
			}

			return "";
		};

		this.send = function(data) {
			if (this.readyState !== this.OPENED) {
				throw new Error("INVALID_STATE_ERR: connection must be opened before send() is called");
			}

			if (sendFlag) {
				throw new Error("INVALID_STATE_ERR: send has already been called");
			}


			var url = new URL(settings.url, defaultHost);
			var ssl = url.protocol == "https:";
			var host = url.hostname;
			if (protocol!="https:" && protocol!="http:")
				throw new Error("Protocol not supported.");
			
			// Default to port 80. If accessing localhost on another port be sure
			// to use http://localhost:port/path
			var port = url.port || (ssl ? 443 : 80);
			// Add query string if one is used
			var uri = url.pathname + (url.search || "");
			
			// Set the defaults if they haven't been set
			for (var name in defaultHeaders) {
				if (!headersCase[name.toLowerCase()]) {
					headers[name] = defaultHeaders[name];
				}
			}
			
			// Set the Host header or the server may reject the request
			headers.Host = host;
			if (!((ssl && port === 443) || port === 80)) {
				headers.Host += ":" + url.port;
			}

			// Set Basic Auth if necessary
			if (settings.user) {
				if (typeof settings.password === "undefined") {
					settings.password = "";
				}
				var authBuf = new Buffer(settings.user + ":" + settings.password);
				headers.Authorization = "Basic " + authBuf.toString("base64");
			}

			// Set content length header
			if (settings.method === "GET" || settings.method === "HEAD") {
				data = null;
			} else if (data) {
				headers["Content-Length"] = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);

				if (!headers["Content-Type"]) {
					headers["Content-Type"] = "text/plain;charset=UTF-8";
				}
			} else if (settings.method === "POST") {
				// For a post with no data set Content-Length: 0.
				// This is required by buggy servers that don't meet the specs.
				headers["Content-Length"] = 0;
			}

			var options = {
				host: host,
				port: port,
				path: uri,
				method: settings.method,
				headers: headers,
				agent: false,
				withCredentials: self.withCredentials
			};

			// Reset error flag
			errorFlag = false;

			// Handle async requests
			if (settings.async) {
				// Use the proper protocol
				var doRequest = ssl ? https.request : http.request;

				// Request is being sent, set send flag
				sendFlag = true;

				// As per spec, this is called here for historical reasons.
				self.dispatchEvent("readystatechange");

				// Handler for the response
				var responseHandler = function responseHandler(resp) {
					// Set response var to the response we got back
					// This is so it remains accessable outside this scope
					response = resp;
					// Check for redirect
					// @TODO Prevent looped redirects
					if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307) {
						// Change URL to the redirect location
						settings.url = response.headers.location;
						var url = new URL(settings.url, defaultHost);
						// Set host var in case it's used later
						host = url.hostname;
						// Options for the new request
						var newOptions = {
							hostname: url.hostname,
							port: url.port,
							path: url.path,
							method: response.statusCode === 303 ? "GET" : settings.method,
							headers: headers,
							withCredentials: self.withCredentials
						};

						// Issue the new request
						request = doRequest(newOptions, responseHandler).on("error", errorHandler);
						request.end();
						// @TODO Check if an XHR event needs to be fired here
						return;
					}

					response.setEncoding("utf8");

					setState(self.HEADERS_RECEIVED);
					self.status = response.statusCode;

					response.on("data", function(chunk) {
						// Make sure there's some data
						if (chunk) {
							self.responseText += chunk;
						}
						// Don't emit state changes if the connection has been aborted.
						if (sendFlag) {
							setState(self.LOADING);
						}
					});

					response.on("end", function() {
						if (sendFlag) {
							// Discard the end event if the connection has been aborted
							setState(self.DONE);
							sendFlag = false;
						}
					});

					response.on("error", function(error) {
						self.handleError(error);
					});
				};

				// Error handler for the request
				var errorHandler = function errorHandler(error) {
					self.handleError(error);
				};

				// Create the request
				request = doRequest(options, responseHandler).on("error", errorHandler);

				// Node 0.4 and later won't accept empty data. Make sure it's needed.
				if (data) {
					request.write(data);
				}

				request.end();

				self.dispatchEvent("loadstart");
			} else {
				throw "sync req my balls";
			}
		};

		this.handleError = function(error) {
			this.status = 0;
			this.statusText = error;
			this.responseText = error.stack;
			errorFlag = true;
			setState(this.DONE);
			this.dispatchEvent('error');
		};

		this.abort = function() {
			if (request) {
				request.abort();
				request = null;
			}

			headers = defaultHeaders;
			this.status = 0;
			this.responseText = "";
			this.responseXML = "";

			errorFlag = true;

			if (this.readyState !== this.UNSENT
				&& (this.readyState !== this.OPENED || sendFlag)
				&& this.readyState !== this.DONE) {
				sendFlag = false;
				setState(this.DONE);
			}
			this.readyState = this.UNSENT;
			this.dispatchEvent('abort');
		};

		this.addEventListener = function(event, callback) {
			if (!(event in listeners)) {
				listeners[event] = [];
			}
			// Currently allows duplicate callbacks. Should it?
			listeners[event].push(callback);
		};

		this.removeEventListener = function(event, callback) {
			if (event in listeners) {
				// Filter will return a new array with the callback removed
				listeners[event] = listeners[event].filter(function(ev) {
					return ev !== callback;
				});
			}
		};

		// Bruh you're supposed to pass an event object to these functions
		this.dispatchEvent = function(event) {
			if (typeof self["on" + event] === "function") {
				self["on" + event]();
			}
			if (event in listeners) {
				for (var i = 0, len = listeners[event].length; i < len; i++) {
					listeners[event][i].call(self);
				}
			}
		};

		var setState = function(state) {
			if (state == self.LOADING || self.readyState !== state) {
				self.readyState = state;

				if (settings.async || self.readyState < self.OPENED || self.readyState === self.DONE) {
					self.dispatchEvent("readystatechange");
				}

				if (self.readyState === self.DONE && !errorFlag) {
					self.dispatchEvent("load");
					// @TODO figure out InspectorInstrumentation::didLoadXHR(cookie)
					self.dispatchEvent("loadend");
				}
			}
		};
	};
}

/*xhr = exports.XMLHttpRequest("https://smilebasicsource.com");
x = new xhr();
x.open("GET", "chat.js", true);
x.send();*/
