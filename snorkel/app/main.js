"use strict";

var auth = require_app("server/auth");
var perf = require_app("server/perf");
var config = require_core("server/config");
var express = require("express");
var main = require_core("server/main");

module.exports = {
  setup_app: function(app) {
    console.log("SETTING UP APP");
    var passport = require('passport');
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(express.bodyParser());

    // Install our console.log slogger
    require_app("controllers/slog/server").install();
  },
  insteadof_store: function() {
    var package_json = require_core("../package.json");
    var app_name = package_json.name;
    var url = config.backend && config.backend.db_url;
    var connect = main.connect;
    var MongoStore = require('connect-mongo')(connect);
    var store = new MongoStore({url: url, db: app_name, auto_reconnect: true } );
    require_core("server/store").set(store);
  },
  setup_context: function(ctx) {
    ctx.use_fullscreen = true
  },
  after_ready: function() {
    if (!config.separate_services) {
      require_app("controllers/data/server").setup_collector();
    }

    try {
      var override = require("/etc/snorkel/config.js");
      _.extend(config, override);
      console.log("Using custom overrides in /etc/snorkel/config.js");
    } catch(e) { console.log("Not using /etc/snorkel/config.js"); }


    perf.setup();
    auth.install();
  },
  setup_template_context: function(options) {
    var context = require_core("server/context");
    // TODO: this should be more extensible than just adding a user
    var user = context("req").user;
    options.username = (user && user.username) || "";
    options.loggedin = !!user;
  },
  setup_db: function(app) {
    require_app("server/db").install(app);
    if (config.backend.driver == "mongo") {
      require_app("server/backends/mongo").install();
    }
  }
};
