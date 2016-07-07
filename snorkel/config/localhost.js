module.exports = {
  hostname: 'localhost',
  behind_proxy: false,
  backend: {
    driver: "sybil",
    bin_path: "/home/okay/go/bin/sybil",
    db: "snorkel"
  },
};
