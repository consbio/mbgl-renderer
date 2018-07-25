FROM ubuntu:18.04

WORKDIR /app
COPY ./ .

# TODO merge below
RUN apt-get update  

RUN apt-get install -y make automake gcc build-essential g++ cpp libc6-dev libstdc++6 man-db \
    autoconf pkg-config zlib1g-dev libcairo2-dev libgles2-mesa-dev libgbm-dev libllvm3.9 libprotobuf-dev \
    libxxf86vm-dev xvfb mesa-common-dev libgl1-mesa-dev cmake nodejs curl npm

# Remove cmdtest, it gets in the way
RUN apt-get remove cmdtest

# # Install yarn
# RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
# RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
# RUN apt-get update && apt-get install yarn

RUN npm install -g npm@latest node-gyp

RUN npm install
# RUN yarn install --verbose

# # symlink our bin files to /usr/local/bin
# RUN yarn link

EXPOSE 80

COPY ./docker/entrypoint.sh /root
RUN chmod +x /root/entrypoint.sh
ENTRYPOINT [ "/root/entrypoint.sh" ]

