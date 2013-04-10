"use strict";

var db = require_root("server/db");

var passport = require('passport');
var session = require_root("server/session");
var context = require_root("server/context");
var config = require_root("server/config");
var readfile = require("./readfile");
var htpasswd = require("htpasswd");

var https = require('https');
var LocalStrategy = require('passport-local').Strategy;
var parseCookie = require("express").cookieParser(session.secret());

var USERS = {};

try {
  var users = readfile(config.authorized_users);
  _.each(users.split("\n"), function(user_line) {
    var user_data = user_line.split(":");
    var passhash = user_data.pop();
    var username = user_data.pop();
    USERS[username] = passhash;
  });

} catch (e) {};

if (!Object.keys(USERS).length) {
  console.log("AUTH: default login is 'test' / 'me'");
  USERS = {
    'test' : '$apr1$XkcK6vCf$RTzLu3dNhr71R.mEmJPBK0'
  };
}


var auth_function = function(req, res, next) {
  context.create(req, res, function() {
    passport.authenticate(
      'local',
      { failureRedirect: '/login' },
      function(req, res, next) {
            return res.redirect('/query?user=' + user.id);
    })(req, res);
  });
};

var _users = {};
var __id = 0;

function new_user(name) {
  var obj = {id: __id++, username: name};
  _users[obj.id] = obj;
  return obj;

}
module.exports = {

  install: function(app, io) {
    passport.serializeUser(function(user, done) {
      _users[user] = user;
      done(null, user.username);
    });

    passport.deserializeUser(function(id, done) {
      _users[id] = _users[id] || { id: __id++, username: id };
      done(null, _users[id]);
    });

    passport.use(new LocalStrategy(
      function(username, password, done) {
        // creates a user, with an incrementing ID from RAM
        var passhash = USERS[username] || "lkj";
        if (htpasswd.validate(passhash, password)) {
          done(null, new_user(username));
        } else {
          done("just kidding, not just any credentials will wrok. try again");
        }


      }));

    // TODO: via sockets!
    app.post(
      '/logout',
      function(req, res) {
        req.logout();
        res.end("OK");
      });

    app.post(
      '/login',
      passport.authenticate(
        'local',
        { failureRedirect: '/login' }),
      function(req, res, next) {
        var next = req.query.next || '/';
        return res.redirect(next +'?user=' + req.user.id);
      });

    io.set('authorization', function(handshake_data, cb) {
      var that = this;
      var cookie = handshake_data.headers.cookie;
      parseCookie(handshake_data, null, function() {
        var sid = handshake_data.signedCookies['connect.sid'];
        var store = session.store();


        if (sid) {
          store.get(sid, function(err, session) {
            if (err) {
              return cb(err, false);
            }

            var user = session.passport.user;
            // this hangs off the socket manager, technically
            // this is used by query server to log which user is on which
            // socket. maybe i should just make a look up table over here
            // instead, though.
            that.__user = {
              username: user,
              sid: sid
            };

            cb(null, true);

          });
        }
      });

    });
  },

  ensure: function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login?next=' + req.path);
  },

  require_user: function(func) {
    var ensure = this.ensure;

    return function() {
      var req = context("req");
      var res = context("res");
      var that = this;

      ensure(req, res, function() {
        func.apply(that, arguments)
      });
    }
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

