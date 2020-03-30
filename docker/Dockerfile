
FROM node:10-slim

WORKDIR /app

# create local directory for tiles to prevent startup errors
# if this is not defined via a bind point to host
RUN mkdir /app/tiles

COPY package*.json /app/

RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get -y install \
  libcairo2-dev \
  libgles2-mesa-dev \
  libgbm-dev \
  libllvm3.9 \
  libprotobuf-dev \
  libxxf86vm-dev \
  xvfb \
  curl \
  x11-utils && \
  rm -rf /var/lib/apt/lists/* && \
  # install node deps, then remove any that are not used in production
  npm install --no-save && \
  rm -rf "/root/.npm" && \
  npm uninstall --no-save typescript eslint @babel/cli && \
  npm prune --production && \
  rm -rf "/app/node_modules/@mapbox/tiletype/test" && \
  rm -rf "/app/node_modules/restify/benchmark" && \
  # WARNING: watch for changes to version to Yarn
  rm -rf "/opt/yarn-v1.17.3" && \
  rm "/usr/local/bin/yarn" && \
  rm "/usr/local/bin/yarnpkg" && \
  # remove any auto installed packages that are no longer needed
  apt-get autoremove -y

EXPOSE 80
ENV DISPLAY=:99

# Copy just the compiled code
COPY ./dist/* /app/dist/

COPY ./docker/entrypoint.sh /root
RUN chmod +x /root/entrypoint.sh
ENTRYPOINT [ "/root/entrypoint.sh" ]
HEALTHCHECK CMD curl --fail http://localhost:80 || exit 1

