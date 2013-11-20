"use strict";

var db = require_core("server/db");

var session = require_core("server/session");
var context = require_core("server/context");
var config = require_core("server/config");
var readfile = require("./readfile");
var htpasswd = require("htpasswd");
var session = require_core("server/session");
var parseCookie = require("express").cookieParser(session.secret());

var https = require('https');

module.exports = {

  install: function(app, io) {
    this.app = app;
    this.io = io;


    io.set('authorization', function(handshake_data, cb) {
      var that = this;
      var cookie = handshake_data.headers.cookie;
      parseCookie(handshake_data, null, function() {
        var sid = handshake_data.signedCookies['connect.sid'];
        var store = session.store();

        if (sid) {
          try {
            store.get(sid, function(err, session) {
              if (err) {
                return cb(err, false);
              }

              handshake_data.sid = sid;
              cb(null, true);
            });
          } catch(e) {
            cb(e, false);
          }
        }

      });
    });
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

