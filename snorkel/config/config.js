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
  authorized_roles: "config/users.rbac",
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
  frontend: {
    // this could be "highcharts", too
    graph_driver: "nvd3"
  },
  backend: {
    driver: "mongo"
  },

  // If the data_dir is set, we try to write all our data into this directory.
  // This includes: session store, query results and sybil data
  // The main purpose of this is for SNAP support
  data_dir: ".",
  // which local DB do we store our data in? can be tingodb, mongodb or linvodb.
  // if using mongodb driver, may as well use mongodb backend.
  // otherwise, go with linvodb
  //
  // (tingodb is in testing)
  config_driver: "linvo",
  // you should have libsqlite3-dev installed for the npm install of connect-sqlite3 to work
  // or you can swap it with connect-level
  session_store: "connect-sqlite3",
  // this is table name to use for storing old queries and dataset metadata
  db_name: "jank", // CHANGE ME! (to something like snorkel_config)
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
    authorized_users: false,

    // Generate these per project in http://console.developers.google.com -> credentials
    // and add the URL: http://snorkel.server/auth/google/return to the allowed callback URL
    client_secret: null,
    client_id: null
  },
  behind_proxy: false,
  rss_feed: {
    url: null
  },
  upload_csv: false,
  show_tour: false, // display the snorkel tour screens? mostly useful for demo installs
  slog: true,
  // This is the default max data size of the collection. Each dataset will
  // only grow to this size and no further, ideally
  default_max_dataset_size: 1024 * 1024 * 100 // 100 MB
};
