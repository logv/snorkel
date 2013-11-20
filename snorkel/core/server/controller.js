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
      set_title: function(title) {
        context("title", title);
      }
    });
    return mod;
  },
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
  array_of: function(arr, key) {
    var ret = [];
    _.each(arr, function(field) {
      if (field.name === key) {
        ret.push(field.value);
      }
    });

    return ret;
  },
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

