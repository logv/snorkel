module.exports = {
  sockets: true,
  // setting to true will make the UDP collector and the web server run as
  // different processes, for stability reasons
  http_port: process.env.PORT || 3000,
  max_http_sockets: 1000,
  max_https_sockets: 1000,
  hostname: process.env.HTTPHOST || "localhost",
  behind_proxy: true
};
