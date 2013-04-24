module.exports = {
  sockets: false,
  udp: {
    port: 59036
  },
  authorized_users: "config/users.htpasswd",
  http_port: 3000,
  max_http_sockets: 1000,
  // Collector and Web server are run separately
  separate_services: true,
  google_auth: {
    enabled: true
  },
  behind_proxy: true,
  // This is the default max data size of the collection. Each dataset will
  // only grow to this size and no further, ideally
  default_max_dataset_size: 1024 * 1024 * 100 // 100 MB
};
