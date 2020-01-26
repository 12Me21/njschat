#!/usr/bin/env bash
function get {
	name="${1##*/}"
	rm -rf "$name"
	echo -n "Installing $name ... "
	git clone --depth=1 --quiet "git://$1"
	echo "done"
}
mkdir -p node_modules
cd node_modules || exit

get github.com/chjj/blessed
get github.com/websockets/ws
get github.com/heineiuo/isomorphic-ws
