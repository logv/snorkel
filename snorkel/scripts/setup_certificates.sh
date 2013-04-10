#!/bin/bash

CONFIG_DIR="$(dirname "$0")"
mkdir -p $CONFIG_DIR/../config/certs && cd $CONFIG_DIR/../config/certs
echo `pwd`
openssl genrsa -passout "pass:foozle" -des3 -out server.key 1024
openssl rsa -in server.key -passin "pass:foozle" -out server.key.insecure
mv server.key server.key.secure && mv server.key.insecure server.key
openssl req -new -key server.key -out server.csr -subj "/C=US/ST=CA/L=San Francisco/O=Snorkel/OU=Engineering/CN=localhost"
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
