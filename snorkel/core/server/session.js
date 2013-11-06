"use strict";

var express = require('express');
var MongoStore = require('connect-mongo')(express);

var _store, _session;

var SESSION_SECRET = 'keyboard cat';
module.exports = {
  install: function(app) {
    _store = new MongoStore({ db: 'jank' } );
    _session = express.session({
        secret: SESSION_SECRET,
        store: _store
      });

    app.use(_session);

  },
  store: function() {
    return _store;
  },
  get: function() {
    return _session;
  },
  secret: function() {
    return SESSION_SECRET;
  }
};
