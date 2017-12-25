module.exports = {
  hostname: 'localhost',
  behind_proxy: false,
  show_tour: true,
  config_driver: "linvo",
  authorized_roles: "config/localhost.rbac",
  analytics: {
    enabled: true
  },
  backend: {
    driver: "sybil",
    db: "snorkel",
    hostfile: "bin/hosts"
  },
};
