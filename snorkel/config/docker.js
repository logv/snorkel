var data_dir = process.env.DATA_DIR || ".";

module.exports = {
  hostname: process.env.HTTPHOST || "localhost",
  data_dir: data_dir,
  dataset_config_dir: data_dir + "app/plugins/snorkel-dataset-config",
  http_port: process.env.PORT || 3000,
  frontend: {
    graph_driver: process.env.FRONTEND_GRAPH_DRIVER || "nvd3"
  },
  backend: {
    driver: "sybil",
    bin_path: "sybil",
    db: "snorkel"
  },
  no_api_auth: Boolean(process.env.NO_API_AUTH), // require user authentication to use API endpoint
  google_auth: {
    enabled: Boolean(process.env.GOOGLE_AUTH_ENABLED),
    require_domain: process.env.GPLUS_DOMAIN,
  },
  upload_csv: Boolean(process.env.UPLOAD_CSV),

  show_tour: Boolean(process.env.SHOW_TOUR),

};
