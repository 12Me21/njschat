#!/usr/bin/env bash
function get {
	name="${1##*/}"
	rm -rf "$name"
	echo -n "Installing '$name' ... "
	git clone --depth=1 --quiet "git://$1"
	echo "done"
}
mkdir -p node_modules
cd node_modules || exit

get github.com/chjj/blessed
get github.com/websockets/ws
get github.com/axios/axios
get github.com/follow-redirects/follow-redirects

mkdir -p debug
echo '{"name":"debug","main":"m.js"}' > debug/package.json
echo 'module.exports=_=>_=>_' > debug/m.js
