module.exports = {
  sockets: true,

  authorized_users: "config/users.htpasswd",
  authorized_roles: "config/users.rbac",
  superuser: {
    "admin" : true
  },
  http_port: 3000,
  https_port: 3443,
  max_http_sockets: 1000,
  max_https_sockets: 1000,
  // SSL is only necessary if you want snorkel to serve HTTPS
  // usually you can put snorkel behind NGINX to avoid this
  ssl: {
    key: "config/certs/server.key",
    certificate: "config/certs/server.crt"
  },
  // if you turn off in-box ssl support, turn off require_https, too
  require_https: true,
  // setting separate services to false will disable data ingestion
  // in the web server
  separate_services: false,
  // delete this udp key to turn off udp collection (on port 59036)
  udp: { port: 59036 },

  frontend: {
    // this could be "highcharts", too
    graph_driver: "nvd3"
  },

  backend: {
    // can be mongo, mongo_raw, postgres, postgres_raw or sybil
    driver: "sybil"
  },

  config_dir: "app/plugins/snorkel-config/",
  // this is kept in app/plugins/
  dataset_config_dir: "app/plugins/snorkel-dataset-config",

  // If the data_dir is set, we try to write all our data into this directory.
  // This includes: session store, query results and sybil data
  // The main purpose of this is for SNAP support
  data_dir: ".",
  // which local DB do we store our data in? can be tingodb, mongodb or linvodb.
  // if using mongodb driver, may as well use mongodb backend.
  // otherwise, go with linvodb
  config_driver: "linvo",
  // you should have libsqlite3-dev installed for the npm install of connect-sqlite3 to work
  // or you can swap it with connect-level
  session_store: "connect-sqlite3",
  // this is table name to use for storing old queries and dataset metadata
  db_name: "snorkel",

  // is the server behind a proxy or load balancer
  behind_proxy: false,
  // hostname to use when serving URLs if we are behind a proxy
  hostname: "localhost",

  // do we let anyone query our API endpoints?
  // this is relevant to grafana
  no_api_auth: false,

  // turn on google based user authentication
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

  // the default RSS feed to show on every dataset. this
  // can be customized on a per dataset basis through the UI
  rss_feed: {
    url: null
  },

  // do we support CSV uploads from the dataset page?
  upload_csv: false,

  // do we turn on the tour page? only useful for demo installs
  show_tour: false,

  // This is the default max data size of the collection. Each dataset will
  // only grow to this size and no further, ideally
  default_max_dataset_size: 1024 * 1024 * 100, // 100 MB

  // turn on continuation local storage. this is a per request context
  // for storing variables.
  use_cls: true
};
