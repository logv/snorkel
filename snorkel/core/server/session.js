"use strict";

var config = require('./config');
var express = require('express');
var package_json = require_core("../package.json");
var app_name = package_json.name;
var MongoStore = require('connect-mongo')(express);

var _store, _session;

var SESSION_SECRET = 'keyboard cat';

module.exports = {
  install: function(app) {
    _store = new MongoStore({url: config.backend.db_url, db: app_name } );
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
