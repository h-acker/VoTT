FROM node:10.16.3-alpine

ADD . /tmp
WORKDIR /tmp

RUN npm install -g serve

RUN npm ci \
    && npm run build \
    && npm run webpack:prod

RUN mv /tmp/build /app
WORKDIR /app

ENV CORTEXIA_VERSION ${CORTEXIA_VERSION}

CMD serve -s .
