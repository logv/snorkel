mkdir -p config/certs && cd config/certs
openssl genrsa -des3 -out server.key 1024
openssl rsa -in server.key -out server.key.insecure
mv server.key server.key.secure && mv server.key.insecure server.key
openssl req -new -key server.key -out server.csr
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
