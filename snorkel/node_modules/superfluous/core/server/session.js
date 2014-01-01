"use strict";

var connect = require('connect');
var config = require('./config');
var store = require_core("server/store");

var _session;

var SESSION_SECRET = config.session_secret || 'keyboard cat';


module.exports = {
  install: function(app) {
    var persistence_store = store.get();

    if (!_session) {
      if (persistence_store) {
        try {
          _session = connect.session({
            secret: SESSION_SECRET,
            store: persistence_store
          });

          app.use(_session);

          return;
        } catch(e) {
          console.log("Session store and session are incompatible");
        }
      } 

    }

    _session = connect.cookieSession({
      secret: SESSION_SECRET
    });

    app.use(_session);

  },
  get: function() {
    return _session;
  },
  set: function(s) {
    _session = s;
  },
  secret: function() {
    return SESSION_SECRET;
  },
  store: function() {
    return store.get();
  }
};
