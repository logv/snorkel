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

  // setting to true will make the UDP collector and the web server run as
  // different processes, for stability reasons
  separate_services: false,
  http_port: 3000,
  https_port: 3443,
  max_http_sockets: 1000,
  max_https_sockets: 1000,
  require_https: true,
  backend: {
    driver: "mongo"
  },
  hostname: "localhost",
  no_api_auth: false, // require user authentication to use API endpoint
  google_auth: {
    enabled: false,
    // require_domain: 'my_custom_domain.com',
    require_domain: false,
    // authorized_users: { 
    //  'you@your_google_domain.com': true,
    //  'your_friend@her_google_domain.com' : true
    // }
    authorized_users: false
  },
  behind_proxy: false,
  rss_feed: {
    url: null
  },
  // This is the default max data size of the collection. Each dataset will
  // only grow to this size and no further, ideally
  default_max_dataset_size: 1024 * 1024 * 100 // 100 MB
};
