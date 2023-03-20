# NodeJS 18 setup modified from standard NodeJS bullseye-slim installation

FROM buildpack-deps:bullseye

ENV NODE_VERSION 18.15.0

RUN groupadd --gid 1000 node \
  && useradd --uid 1000 --gid node --shell /bin/bash --create-home node

WORKDIR /app

# NOTE: arch trimmed to x64 / arm64; others not supported
RUN ARCH= && dpkgArch="$(dpkg --print-architecture)" \
  && case "${dpkgArch##*-}" in \
  amd64) ARCH='x64';; \
  arm64) ARCH='arm64';; \
  *) echo "unsupported architecture"; exit 1 ;; \
  esac \
  # gpg keys listed at https://github.com/nodejs/node#release-keys
  && set -ex \
  && for key in \
  4ED778F539E3634C779C87C6D7062848A1AB005C \
  141F07595B7B3FFE74309A937405533BE57C7D57 \
  74F12602B6F1C4E913FAA37AD3A89613643B6201 \
  DD792F5973C6DE52C432CBDAC77ABFA00DDBF2B7 \
  61FC681DFB92A079F1685E77973F295594EC4689 \
  8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600 \
  C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8 \
  890C08DB8579162FEE0DF9DB8BEAB4DFCF555EF4 \
  C82FA3AE1CBEDC6BE46B9360C43CEC45C17AB93C \
  108F52B48DB57BB0CC439B2997B01419BD92F80A \
  ; do \
  gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys "$key" || \
  gpg --batch --keyserver keyserver.ubuntu.com --recv-keys "$key" ; \
  done \
  && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$ARCH.tar.xz" \
  && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" \
  && gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc \
  && grep " node-v$NODE_VERSION-linux-$ARCH.tar.xz\$" SHASUMS256.txt | sha256sum -c - \
  && tar -xJf "node-v$NODE_VERSION-linux-$ARCH.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
  && rm "node-v$NODE_VERSION-linux-$ARCH.tar.xz" SHASUMS256.txt.asc SHASUMS256.txt \
  && ln -s /usr/local/bin/node /usr/local/bin/nodejs \
  # smoke tests
  && node --version \
  && npm --version

COPY package*.json /app/

RUN dpkgArch="$(dpkg --print-architecture)" && \
  DEBIAN_FRONTEND=noninteractive apt-get update && apt-get -y install \
  curl \
  libcairo2-dev \
  libgles2-mesa-dev \
  libgbm-dev \
  libllvm11 \
  libuv1-dev \
  libprotobuf-dev \
  libxxf86vm-dev \
  xvfb \
  x11-utils && \
  # install deps required by maplibre-gl-native but not available on bullseye
  wget http://snapshot.debian.org/archive/debian/20190501T215844Z/pool/main/g/glibc/multiarch-support_2.28-10_$dpkgArch.deb && \
  apt install ./multiarch-support_2.28-10_$dpkgArch.deb && \
  wget http://snapshot.debian.org/archive/debian/20141009T042436Z/pool/main/libj/libjpeg8/libjpeg8_8d1-2_$dpkgArch.deb && \
  apt install ./libjpeg8_8d1-2_$dpkgArch.deb && \
  if [ "$dpkgArch" = "arm64" ] ; then \
  wget http://ports.ubuntu.com/pool/main/i/icu/libicu66_66.1-2ubuntu2.1_arm64.deb ; else \
  wget http://archive.ubuntu.com/ubuntu/pool/main/i/icu/libicu66_66.1-2ubuntu2.1_amd64.deb ;\
  fi && \
  apt install ./libicu66_66.1-2ubuntu2.1_$dpkgArch.deb && \
  mkdir src && \
  npm ci --omit=dev && \
  rm -rf "/root/.npm" && \
  rm -rf "/root/.cache" && \
  # remove packages known not to be needed and cleanup apt cache
  apt-get autoremove -y && \
  apt-get remove -y libc6-dev && \
  rm -rf "/var/lib/apt/lists/*" && \
  # create local directory for tiles to prevent startup errors
  # if this is not defined via a bind point to host
  mkdir /app/tiles

EXPOSE 80
ENV DISPLAY=:99

# Copy just the compiled code into the container
COPY ./dist/* /app/dist/

COPY ./docker/entrypoint.sh /root
RUN chmod +x /root/entrypoint.sh

ENTRYPOINT [ "/root/entrypoint.sh" ]
HEALTHCHECK CMD curl --fail http://localhost:80/health || exit 1