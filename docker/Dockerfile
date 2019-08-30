
FROM node:10-slim

WORKDIR /app
COPY package*.json /app/

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get -y install \
  libcairo2-dev \
  libgles2-mesa-dev \
  libgbm-dev \
  libllvm3.9 \
  libprotobuf-dev \
  libxxf86vm-dev \
  xvfb \
  x11-utils \
  && rm -rf /var/lib/apt/lists/*

# Run npm install and remove large folders no longer needed to reduce size of image
RUN npm install --no-save && \ 
  rm -rf "/root/.npm" && \
  npm prune --production && \
  npm uninstall --no-save typescript eslint && \
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/test" && \ 
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/vendor" && \ 
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/misc" && \
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/mapbox-gl-js" && \
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/scripts" && \
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/benchmark" && \
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/src" && \
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/cmake" && \
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/platform/darwin" && \
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/platform/ios" && \
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/platform/linux" && \
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/platform/android" && \
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/platform/macos" && \
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/platform/qt" && \
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/platform/default" && \
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/platform/glfw" && \
  rm -rf "/app/node_modules/@mapbox/mapbox-gl-native/include" && \
  rm -rf "/app/node_modules/@mapbox/tiletype/test" && \
  rm -rf "/app/node_modules/restify/benchmark"

EXPOSE 80
ENV DISPLAY=:99

# Copy just the compiled code
COPY ./dist/* /app/dist/

COPY ./docker/entrypoint.sh /root
RUN chmod +x /root/entrypoint.sh
ENTRYPOINT [ "/root/entrypoint.sh" ]
HEALTHCHECK CMD curl --fail http://localhost:80/ || exit 1

