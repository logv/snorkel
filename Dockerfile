FROM node:8-stretch

WORKDIR /snorkel
COPY snorkel/package.json /snorkel/
COPY snorkel/npm-shrinkwrap.json /snorkel/
RUN npm install

COPY snorkel /snorkel

EXPOSE 3000
EXPOSE 59036/udp

CMD ["node", "app.js"]
