FROM node:10.16.3-alpine

ADD . /tmp
WORKDIR /tmp

RUN npm install -g serve
RUN npm ci

ENV PUBLIC_URL=.

RUN npm run build
RUN npm run webpack:prod
RUN mv /tmp/build /app
WORKDIR /app

COPY ./setup_env.sh .
RUN chmod +x ./setup_env.sh

EXPOSE 5000

CMD ["./setup_env.sh"]
