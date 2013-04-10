#!/bin/bash

EXPECTED_ARGS=1

if [ $# -ne $EXPECTED_ARGS ]; then
  echo "Usage: ./$0 <user>"
  exit
fi

# WE NEED THE HTPASSWD COMMAND
if [ -e config/users.htpasswd ]; then
  htpasswd -s config/users.htpasswd $1
else
  htpasswd -s -c config/users.htpasswd $1
fi
