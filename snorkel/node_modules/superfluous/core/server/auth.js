/**
 *
 * The core Server module in superfluous contains code related to routing,
 * authentication, page generation, template rendering and input handling.
 *
 * @module Superfluous
 * @submodule Server
 */

/**
 * The auth class helps with setting up the SSL server and connecting the
 * authentication between the sockets and request.
 *
 * @class auth (server)
 * @private
 */

"use strict";

var session = require_core("server/session");
var config = require_core("server/config");
var readfile = require("./readfile");
var session = require_core("server/session");

var store = require_core("server/store");
var https = require('https');

module.exports = {

  /**
   * After the http and socket servers are setup, the app and socket server are
   * passed to the install method, so the socket authorization can carry forward
   * context from the original request.
   *
   *
   * @private
   * @method install
   * @param {Object} connect_app
   * @param {Object} socket_server (primus, socket.io, etc)
   */
  install: function(app, io) {
    this.app = app;
    this.io = io;

    io.authorize(function(handshake_data, cb) {
      var parseCookie = require("connect").cookieParser(session.secret());

      parseCookie(handshake_data, null, function() {
        var sid = handshake_data.signedCookies['connect.sid'];
        var used_store = store.get();

        if (!sid) {
          cb("No SID specified");
          return;
        }

        // check to see if session is being held in the cookie proper, if there
        // is no server side store being used
        if (!used_store) {
          var session = handshake_data.signedCookies['connect.sess'];
          handshake_data.headers.sid = sid;
          handshake_data.headers.session = session;
          cb(null, true);
          return;
        }

        // if the cookie isn't holding the session, let's use our real persistence store
        try {
          used_store.load(sid, function(err, sess) {
            sess.reload(function() {
              if (sess) {
                handshake_data.headers.sid = sid;
                handshake_data.headers.session = sess;
              }

              cb(err, true);
            });
          });
        } catch(e) {
          console.log(e);
          cb(e, false);
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

