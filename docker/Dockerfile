FROM alpine:latest
# FROM node:10-slim
# FROM node:10-alpine

WORKDIR /app
COPY package*.json /app/

RUN apk --no-cache add  \ 
  # core deps
  nodejs=~10 \
  npm \
  # need for build from source
  coreutils \ 
  cmake \
  make \
  bash \
  build-base \
  # must come from edge
  gcompat \
  libc6-compat \
  # libs for raw mapbox build??
  grep \
  git \
  # binutils \
  glu \
  libxrandr-dev \
  libxinerama-dev \
  libxcursor-dev \
  mesa-dev \
  mesa-gbm \
  # libs
  cairo-dev \
  mesa-gles \
  mesa-egl \
  mesa-dri-swrast \
  llvm5-libs \
  protobuf-dev \
  xvfb \ 
  xdpyinfo \
  python2
# gcompat needs to be added from edge
# && apk add --no-cache gcompat --repository=http://dl-cdn.alpinelinux.org/alpine/edge/main
# libxxf86vm-dev \
# x11-utils
# && npm install

# RUN mkdir /lib64 && ln -s /lib/libc.musl-x86_64.so.1 /lib64/ld-linux-x86-64.so.2

# TODO: separate out the ones needed at build time from those needed at run time



# RUN apt-get update \
#   && DEBIAN_FRONTEND=noninteractive apt-get -y install \
#   libcairo2-dev \
#   libgles2-mesa-dev \
#   libgbm-dev \
#   libllvm3.9 \
#   libprotobuf-dev \
#   libxxf86vm-dev \
#   xvfb \
#   x11-utils \
#   && rm -rf /var/lib/apt/lists/*

# Run npm install and remove large folders no longer needed to reduce size of image
# RUN npm install --production --no-save && \ 
#   rm -rf "/root/.npm" && \
#   npm prune --production && \
#   npm uninstall --no-save typescript eslint && \
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/test" && \ 
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/vendor" && \ 
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/misc" && \
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/mapbox-gl-js" && \
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/scripts" && \
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/benchmark" && \
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/src" && \
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/cmake" && \
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/platform/darwin" && \
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/platform/ios" && \
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/platform/linux" && \
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/platform/android" && \
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/platform/macos" && \
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/platform/qt" && \
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/platform/default" && \
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/platform/glfw" && \
#   rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/include" && \
#   rm -rf "/app/node_modules/@mapbox/tiletype/test" && \
#   rm -rf "/app/node_modules/restify/benchmark"



# TEMP for testing
COPY ./src/* /app/src/
COPY ./tests/* /app/tests/
# COPY . /app

# add test deps back
RUN npm install jest pixelmatch


EXPOSE 80
ENV DISPLAY=:99

# Copy just the compiled code
COPY ./dist/* /app/dist/

COPY ./docker/entrypoint.sh /root
RUN chmod +x /root/entrypoint.sh
# ENTRYPOINT [ "/root/entrypoint.sh" ]
# HEALTHCHECK CMD curl --fail http://localhost:80/ || exit 1


RUN mkdir /build && \
  git clone https://github.com/mapbox/mapbox-gl-native.git /build/mapbox-gl-native && \
  cd /tmp/mapbox-gl-native && \ 
  make node && \
  npm install --build-from-source && \
  npm link && \
  cd /app && \
  npm link @mapbox/mapbox-gl-native && \ 
  npm install --production --no-save && \ 
  rm -rf "/root/.npm" && \
  npm prune --production && \
  npm uninstall --no-save typescript eslint

# TODO fix pthread issue in source
# to platform/default/src/mbgl/util/thread.cpp wrap p_threadgetname_np with #if defined(__GLIBC__)