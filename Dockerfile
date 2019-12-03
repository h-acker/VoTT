FROM node:10.16.3-alpine

ADD . /tmp
WORKDIR /tmp

RUN npm install -g serve
RUN npm ci

ARG REACT_APP_INSTRUMENTATION_KEY=instrumentation_key
ARG REACT_APP_API_URL=https://backend.cortexia.io
ARG NODE_ENV=production
ARG BUILDTIME_CORTEXIA_VERSION=0.0.0
RUN echo "REACT_APP_INSTRUMENTATION_KEY=$REACT_APP_INSTRUMENTATION_KEY" > .env \
    && echo "REACT_APP_API_URL=$REACT_APP_API_URL" >> .env \
    && echo "REACT_APP_CORTEXIA_VERSION=$BUILDTIME_CORTEXIA_VERSION" >> .env \
    && echo "PUBLIC_URL=." >> .env
RUN npm run build

ARG ENVIRONMENT=prod
RUN npm run webpack:$ENVIRONMENT

RUN mv /tmp/build /app
WORKDIR /app

ENV REACT_APP_CORTEXIA_VERSION=$BUILDTIME_CORTEXIA_VERSION

EXPOSE 5000

CMD serve -s .
