#!/bin/sh
/bin/sed -i "s|REACT_APP_API_URL_PLACEHOLDER|${REACT_APP_API_URL}|g" static/js/*.js
/bin/sed -i "s|NODE_ENV_PLACEHOLDER|${NODE_ENV_PLACEHOLDER}|g" static/js/*.js
exec "$@"
serve -s .