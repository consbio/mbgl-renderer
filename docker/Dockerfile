FROM ubuntu:18.04

WORKDIR /app
COPY ./ .


RUN apt-get update && apt-get install -y make automake gcc build-essential g++ cpp libc6-dev libstdc++6 man-db \
    autoconf pkg-config zlib1g-dev libcairo2-dev libgles2-mesa-dev libgbm-dev libllvm3.9 libprotobuf-dev \
    libxxf86vm-dev xvfb mesa-common-dev libgl1-mesa-dev cmake nodejs curl npm

# Remove cmdtest, it gets in the way
RUN apt-get remove cmdtest

# Install yarn
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update && apt-get install yarn

RUN npm install -g npm@latest npx@latest node-gyp

RUN yarn install --verbose

# symlink our bin files to /usr/local/bin
RUN yarn link

# Setup the framebuffer
RUN start-stop-daemon --start --pidfile ~/xvfb.pid --make-pidfile --background --exec /usr/bin/Xvfb -- :99 -screen 0 1024x768x24 -ac +extension GLX +render -noreset
RUN export DISPLAY=:99.0