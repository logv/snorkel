"use strict";

var auth = require_app("server/auth");
var perf = require_app("server/perf");
var config = require_core("server/config");
var express = require("express");
var main = require_core("server/main");
var plugins = require_app("server/plugins");
var globals = require_app("server/globals");

module.exports = {
  setup_app: function(app) {
    console.log("SETTING UP APP");
    // Now we need to verify snorkel's version is high enough
    var semver = require("semver");
    var super_json = require("superfluous/package.json");
    var super_version = super_json.version;

    var min_super_version = "0.0.73";
    if (!semver.gt(super_version, min_super_version)) {
      console.log("SUPER VERSION IS TOO LOW, NEEDS TO BE", min_super_version)
      console.log("PLEASE REINSTALL WITH 'npm install superfluous'");
      process.exit(0);
    }



    var passport = require('passport');
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(express.bodyParser());

  },
  insteadof_store: function() {
    var connect  = main.connect;
    var session_store_module = config.session_store || "connect-sqlite3";
    var session_dir = config.data_dir || "./";

    var SessionStore = require(session_store_module)(connect);
    var options = {
      dir: session_dir
    };

    var store = new SessionStore(options);
    require_core("server/store").set(store);
  },
  setup_context: function(ctx) {
    ctx.use_fullscreen = true;
    ctx.title = "snorkel";
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


    globals.install();
    perf.setup();
    auth.install();
    plugins.install();
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
