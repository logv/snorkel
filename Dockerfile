FROM node:8-stretch

# build sybil
RUN apt-get update
RUN apt-get install -y golang-go rsync
ENV GOPATH=/go
ENV PATH=/go/bin:$PATH
RUN go get -v github.com/logv/sybil # built-after:2018-06-28

WORKDIR /snorkel
RUN npm install sqlite3 --build-from-source
RUN cp -r node_modules/sqlite3 /tmp/sqlite3

# if DEV is set to something install extra packages.
ARG DEV
RUN if [ -z "${DEV}" ]; then exit 0; else apt-get install -y vim; fi

COPY snorkel/package.json /snorkel/
COPY snorkel/package-lock.json /snorkel/
RUN npm install
RUN rsync -Ap /tmp/sqlite3/ ./node_modules/sqlite3/

COPY snorkel /snorkel

EXPOSE 3000
EXPOSE 59036/udp

ENV ENV=docker

CMD ["node", "app.js"]
