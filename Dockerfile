FROM node:10.16.3-alpine

ADD . /tmp
WORKDIR /tmp

RUN npm install -g serve
RUN npm ci

ENV PUBLIC_URL=.
ARG REACT_APP_API_URL

RUN npm run build
RUN npm run webpack:prod

RUN mv /tmp/build /app
WORKDIR /app

EXPOSE 5000

CMD serve -s .
