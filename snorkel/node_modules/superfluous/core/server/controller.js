/**
 *
 * The Server Controller is the entry point for every app. Each server
 * controller dwells at a top level URL (which is registered in routes.json).
 * This module deals with loading server controllers and convenience functions
 * exposed to them.
 *
 * @private
 * @class controller (server)
 * @module Superfluous
 * @submodule Server
 */

"use strict";
var url = require("url");
var context = require_core("server/context");
var config = require_core("server/config");

module.exports = {
  core: function load_controller(name) {
    var mod = require_core("controllers/" + name + "/server");
    mod.name = name;
    return mod;
  },

  load: function load_controller(name) {
    var mod = require_app("controllers/" + name + "/server");
    mod.name = name;
    _.extend(mod, {
      set_fullscreen: function(val) {
        context("use_fullscreen", val);
      },
      set_title: function(title) {
        context("title", title);
      },
      add_to_head: function(line) {
        if (!context("HEAD_SUPPLEMENTS")) { context("HEAD_SUPPLEMENTS", []); }

        context("HEAD_SUPPLEMENTS").push(line);
      }
    });
    return mod;
  },

  /**
   * Forces this route to check for HTTPS before serving it. This lets you make sure endpoints are secured.
   *
   * @method require_https
   * @param {Function} A route handler to wrap
   *
   */
  require_https: function() {
    var req = context("req");
    if (req.secure) {
      return;
    }


    console.log("CONFIG", config);

    if (!config.ssl || !config.require_https) {
      console.log("We dont really need HTTPS");
      return;
    }

    var cur_url = url.parse(req.url);

    var host = cur_url;

    var port;
    if (config.behind_proxy) {
      port = '443';
    } else {
      port = config.https_port;
    }

    console.log(host, port, req.url);
    var hostname = req.headers.host;
    var redirect_uri = url.format({
      hostname: hostname,
      port: port,
      protocol: "https",
      pathname: req.url
    });

    context("res").redirect(redirect_uri);

    console.log("NO HTTPS!");
    return true;

  },
  /**
   * Deserializes a URL param from jquery and returns it as an array.
   *
   * @method array_of
   *
   */
  array_of: function(arr, key) {
    var ret = [];
    _.each(arr, function(field) {
      if (field.name === key) {
        ret.push(field.value);
      }
    });

    return ret;
  },
  /**
   * Deserializes a URL param from jquery and returns it as a value.
   *
   * @method value_of
   *
   */
  value_of: function(arr, key, default_) {
    var ret = default_;
    _.each(arr, function(field) {
      if (field.name === key) {
        ret = field.value;
      }
    });

    if (ret === "") {
      ret = default_;
    }
    return ret;
  }

};

