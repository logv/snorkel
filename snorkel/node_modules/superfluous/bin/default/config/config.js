module.exports = {
  sockets: true,
  ssl: {
    key: "config/certs/server.key",
    certificate: "config/certs/server.crt"
  },
  udp: {
    port: 59036
  },
  authorized_users: "config/users.htpasswd",
  superuser: {
    "admin" : true
  },
  backend: {

  },
  http_port: process.env.PORT || 3000,
  https_port: process.env.HTTPS_PORT || 3443,
  max_http_sockets: 1000,
  max_https_sockets: 1000,
  require_https: true
};
