"use strict";

var express = require('express');
var package_json = require_core("../package.json");
var app_name = package_json.name;
var MongoStore = require('connect-mongo')(express);
var _store = new MongoStore({ db: app_name } );

var _session;

var SESSION_SECRET = 'keyboard cat';
module.exports = {
  install: function(app) {
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
