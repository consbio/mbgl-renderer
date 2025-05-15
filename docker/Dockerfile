# Adapted from https://github.com/ConservationMetrics/mapgl-tile-renderer/blob/main/Dockerfile

FROM buildpack-deps:jammy

ENV NODE_VERSION=22.15.1
ENV NVM_DIR=/usr/local/nvm
ENV NODE_PATH=$NVM_DIR/versions/node/$NODE_VERSION/bin
ENV PATH=$NODE_PATH:$PATH
ENV DISPLAY=:99

RUN groupadd --gid 1000 node \
  && useradd --uid 1000 --gid node --shell /bin/bash --create-home node

WORKDIR /app

RUN dpkgArch="$(dpkg --print-architecture)" \
  && apt-get update && apt-get install -y \
  curl \
  wget \
  libcairo2-dev \
  libgles2-mesa-dev \
  libgbm-dev \
  libllvm11 \
  libuv1-dev \
  libprotobuf-dev \
  libxxf86vm-dev \
  libwebp-dev \
  xvfb \
  x11-utils \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get autoremove -y



COPY package*.json /app/

RUN mkdir -p $NVM_DIR \
  && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash \
  && . $NVM_DIR/nvm.sh \
  && nvm install $NODE_VERSION \
  && nvm alias default node \
  && nvm use --delete-prefix $NODE_VERSION \
  && npm ci --omit=dev \
  && nvm cache clear \
  && rm -rf "/root/.npm" \
  && rm -rf "/root/.cache" \
  # create local directory for tiles to prevent startup errors
  # if this is not defined via a bind point to host
  && mkdir /app/tiles


# Copy just the compiled code into the container
COPY ./dist/* /app/dist/

COPY ./docker/entrypoint.sh /root
RUN chmod +x /root/entrypoint.sh

EXPOSE 80
ENTRYPOINT [ "/root/entrypoint.sh" ]
HEALTHCHECK CMD curl --fail http://localhost:80/health || exit 1

