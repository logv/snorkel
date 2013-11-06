"use strict";

var db = require_core("server/db");

var session = require_core("server/session");
var context = require_core("server/context");
var config = require_core("server/config");
var readfile = require("./readfile");
var htpasswd = require("htpasswd");

var https = require('https');

module.exports = {

  install: function(app, io) {
    this.app = app;
    this.io = io;
  },

  setup_ssl_server: function(app) {
    var https_options;
    if (config.ssl) {
      try {
        var privateKey = readfile(config.ssl.key);
        var certificate = readfile(config.ssl.certificate);

        https_options = {
          key: privateKey,
          cert: certificate
        };
      } catch(e) { }


      if (!privateKey || !certificate) {
        console.log("Warning: couldn't read SSL certs and keys, please run scripts/setup_certificates.sh");
      }

    }

    var https_server;
    if (https_options && https_options.key && https_options.cert) {
      https.globalAgent.maxSockets = config.max_https_sockets;
      https_server = https.createServer(https_options, app);
    }

    return https_server;
  }
};

