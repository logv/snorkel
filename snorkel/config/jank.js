module.exports = {
  sockets: false,
  hostname: 'snorkel.superfluous.io',
  backend: {
    driver: "pcs"
  },
  google_auth: {
    enabled: true
  },
  behind_proxy: true,
  default_max_dataset_size: 1024 * 1024 * 100
};
