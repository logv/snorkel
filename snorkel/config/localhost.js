module.exports = {
  hostname: 'localhost',
  behind_proxy: false,
  config_driver: "linvo",
  backend: {
    driver: "sybil",
    bin_path: "sybil",
    db: "snorkel"
  },
};
