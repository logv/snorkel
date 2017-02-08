var data_dir = process.env.SNAP_USER_COMMON || ".";

module.exports = {
  hostname: 'localhost',
  behind_proxy: false,
  config_driver: "linvo",
  data_dir: data_dir,
  config_dir: data_dir,
  authorized_users: data_dir + "/config/users.htpasswd",
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
