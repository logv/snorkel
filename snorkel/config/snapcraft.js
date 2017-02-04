module.exports = {
  hostname: 'localhost',
  behind_proxy: false,
  config_driver: "linvo",
  http_port: process.env.PORT || 3000,
  frontend: {
    graph_driver: "nvd3"
  },
  backend: {
    driver: "sybil",
    bin_path: "sybil",
    db: "snorkel"
  },
};
