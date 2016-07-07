module.exports = {
  sockets: false,
  hostname: 'snorkel.superfluous.io',
  backend: {
    driver: "sybil"
  },
  google_auth: {
    enabled: false,
  },
  behind_proxy: true,
  default_max_dataset_size: 1024 * 1024 * 100
};
