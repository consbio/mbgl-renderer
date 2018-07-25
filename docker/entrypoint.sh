#!/usr/bin/env bash

_term() {
	echo "Caught signal, stopping gracefully"
	kill -TERM "$child" 2>/dev/null
}

trap _term TERM

start-stop-daemon --start --pidfile ~/xvfb.pid --make-pidfile --background --exec /usr/bin/Xvfb -- :99 -screen 0 1024x768x24 -ac +extension GLX +render -noreset

echo "Waiting 3 seconds for xvfb to start..."
sleep 3

export DISPLAY=:99.0

yarn link
node dist/server.js -p 80 -t ./tiles &

child=$!
wait "$child"

# Shut down the framebuffer
start-stop-daemon --stop --pidfile ~/xvfb.pid # stop xvfb when exiting 
rm ~/xvfb.pid
