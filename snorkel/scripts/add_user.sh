#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
EXPECTED_ARGS=1
NODE_MODULES_DIR="${DIR}/../node_modules/"
NODE_BIN_DIR="${NODE_MODULES_DIR}/.bin/"
if [ $# -ne $EXPECTED_ARGS ]; then
  echo "Usage: ./$0 <user>"
  exit
fi

# WE NEED THE HTPASSWD COMMAND
if [ -e config/users.htpasswd ]; then
  ${NODE_BIN_DIR}/htpasswd config/users.htpasswd $1
else
  ${NODE_BIN_DIR}/htpasswd -c config/users.htpasswd $1
fi
