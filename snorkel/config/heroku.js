module.exports = {
  sockets: true,
  ssl: false,
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
  http_port: process.env.PORT || 3000,
  max_http_sockets: 1000,
  max_https_sockets: 1000,
  require_https: false,
  backend: {
    driver: "mongo",
    db_url: process.env.MONGOHQ_URL
  },
  hostname: process.env.HTTPHOST || "localhost",
  no_api_auth: true, // require user authentication to use API endpoint
  google_auth: {
    enabled: true,
    require_domain: process.env.GPLUS_DOMAIN,
  },
  behind_proxy: true,
  rss_feed: {
    url: null
  },
  // This is the default max data size of the collection. Each dataset will
  // only grow to this size and no further, ideally
  default_max_dataset_size: process.env.MAX_DATASET_SIZE || 1024 * 1024 * 100 // 100 MB
};
