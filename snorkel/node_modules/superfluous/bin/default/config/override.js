module.exports = {
  sockets: true,
  behind_proxy: true,
  require_https: false,
  http_port: process.env.PORT || 3300,
  https_port: process.env.HTTP_PORT || 3343
};
