#!/bin/sh

# Start Xvfb
echo "Starting Xvfb"
Xvfb ${DISPLAY} -screen 0 "1024x768x24" -ac +extension GLX +render -noreset  -nolisten tcp  &
Xvfb_pid="$!"
echo "Waiting for Xvfb (PID: $Xvfb_pid) to be ready..."
while ! xdpyinfo -display ${DISPLAY} > /dev/null 2>&1; do
    sleep 0.1
done
echo "Xvfb is running"

echo "Starting mbgl-renderer server"
node dist/server.js -p 80 -t /app/tiles &
echo "Hit Ctrl-C to exit"

trap "echo 'Stopping'; kill -s TERM $Xvfb_pid" INT TERM

# Wait for process to end.
while kill -0 $Xvfb_pid > /dev/null 2>&1; do
    wait
done
