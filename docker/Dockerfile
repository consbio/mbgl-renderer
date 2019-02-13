FROM node:8-stretch

WORKDIR /app
COPY . /app

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get -y install \
  apt-transport-https \
  curl \
  unzip \
  build-essential \
  python \
  libcairo2-dev \
  libgles2-mesa-dev \
  libgbm-dev \
  libllvm3.9 \
  libprotobuf-dev \
  libxxf86vm-dev \
  xvfb \
  x11-utils \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --no-save

EXPOSE 80

COPY ./docker/entrypoint.sh /root
RUN chmod +x /root/entrypoint.sh
ENTRYPOINT [ "/root/entrypoint.sh" ]
HEALTHCHECK CMD curl --fail http://localhost:80/ || exit 1

