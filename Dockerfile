FROM node:12-alpine

ADD . /tmp
WORKDIR /tmp

RUN npm install -g serve
RUN npm ci

ENV PUBLIC_URL=.

RUN npm run build
RUN npm run webpack:prod
RUN mv /tmp/build /app
WORKDIR /app

ENV REACT_APP_CORTEXIA_VERSION=$BUILDTIME_CORTEXIA_VERSION

COPY ./setup_env.sh .
RUN chmod +x ./setup_env.sh

EXPOSE 3000

CMD ["./setup_env.sh"]
