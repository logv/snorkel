"use strict";

var _ = require_vendor("underscore");
var Backbone = require_vendor("backbone");
var async = require("async");

var fs = require("fs");
var context = require_core("server/context");
var bridge = require_core("server/bridge");
var cheerio = require('cheerio');

var template = require_core("server/template");
var readfile = require_core("server/readfile");
var packager = require_core("server/packager");
var quick_hash = require_core("server/hash");
var stringify = require("json-stable-stringify");


Backbone.$ = cheerio;

var Component = require_root("components/component");

var _versions = {};

Component.load = function(component) {
  var base_dir = "./components/" + component + "/";
  var package_data;
  try {
    package_data = readfile(base_dir + "package.json");
  } catch (e) {
    console.log("Couldn't find package.json for ", component, ". Are you sure the component is named that?");
    throw new Error("Missing Component " + component);
  }

  var pkg = JSON.parse(package_data);
  // Look for package.json file in component dir
  // this will contain dependencies, stylesheets, etc

  var cmp = {};
  var main = require_root(base_dir + pkg.main + ".js");
  var tmpl = readfile(base_dir + pkg.template);

  cmp.schema = pkg;
  cmp.main = main;
  cmp.template = tmpl;

  var newCmp = Component.extend(cmp.main);
  newCmp.template = cmp.tmpl;

  return cmp;
};

// Need to cache these bad boys
var _packages = {};
Component.build_package = function(component, cb) {
  var package_ = {};
  var base_dir = "./components/" + component + "/";

  var package_data = readfile(base_dir + "package.json");
  if (!package_data) {
    cb();
    return;
  }
  var pkg = JSON.parse(package_data);
  // Look for package.json file in component dir
  // this will contain dependencies, stylesheets, etc
  //
  if (_packages[component] && !_.isEmpty(_packages[component])) {
    if (cb) {
      cb(_packages[component]);
    }

    return;
  }

  var cmp = {};
  cmp.helpers = {};
  _packages[component] = cmp;

  function process_template(obj, file, key, cb) {
    return function(cb) {
      var data = readfile(file);
      if (!data) {
        obj[key] = null;
      } else {
        obj[key] = data;
      }
      cb();
    };
  }

  function process_file(obj, file, key, cb) {
    return function(cb) {
      var data = readfile(file);
      if (!data) {
        obj[key] = "console.log('Couldnt find helper " + key + " for " + component + " component');";
      } else {
        obj[key] = data;
      }
      cb();
    };
  }

  function process_style(obj, style_file, key) {

    return function(cb) {
      packager.scoped_less(component, style_file, function(data) {
        obj[key] = data[style_file];
        cb();
      });
    };
  }

  // Do asynchronous readfiles, my friend.
  var js_dir = "app/static/";
  var jobs = [
    process_file(cmp, base_dir + pkg.main + ".js", "main"),
    process_file(cmp, base_dir + "events.js", "events"),
    process_template(cmp, base_dir + pkg.template, "template"),
    process_style(cmp, base_dir + pkg.style.replace(".css", ""), "style")
  ];

  var named = _.isObject(pkg.helpers);
  if (_.isArray(pkg.helpers)) {
    named = false;
  }

  _.each(pkg.helpers, function(helper, name) {
    jobs.push(process_file(cmp.helpers, js_dir + helper + ".js", (named && name) || helper));
  });


  cmp.schema = pkg;
  cmp.styles = pkg.styles;

  async.parallel(jobs, function(err, results) {
    var hash = quick_hash(stringify(cmp));
    _versions[component] = hash;

    cmp.signature = hash;
    cmp.name = component;
    cmp.type = "pkg";
    cmp.timestamp = parseInt(+Date.now() / 1000, 10);
    if (cb) {
      cb(cmp);
    }
  });

  return cmp;
};

var __id = 0;
Component.build = function(component, options, cb) {
  var base_dir = "./components/" + component + "/";
  var cmp = Component.load(component);
  var id = "s" + __id;
  __id += 1;
  var main = require_root(base_dir + cmp.schema.main + ".js");
  var cmpClass = Component.extend(main);
  var cmpInstance = new cmpClass({ id: id });

  var additionalClasses = options.classes || "";


  var className = "";
  if (cmpInstance.className) {
    className += cmpInstance.className;
  }

  if (additionalClasses) {
    className += " " + additionalClasses;
  }

  if (cmp.template) {
    var render_options = _.extend({
      id: id,
      classes: className
    }, options || {});

    render_options = _.defaults(render_options, main.defaults);

    var rendered = _.template(cmp.template,
      template.setup_context(render_options));

    cmpInstance.html(rendered);
  }

  cmpInstance.$el.attr("data-cmp", component);
  cmpInstance.$el.attr("class", className);
  cmpInstance.id = id;
  cmpInstance.render();
  cmpInstance.isComponent = true;

  if (cmpInstance.server) {
    cmpInstance.server();
  }

  var oldToString = cmpInstance.toString;

  // This is basically the 'first render' wrapper for
  // server side components. It has important responsibilities,
  // like:
  //    * marshalling data to the client
  //    * making sure that client behaviors get installed.
  //
  function marshallToClient(cmpInstance) {

    // TODO: This needs to only be called after the component is rendered
    // toString'd the first time
    cmpInstance.toString = oldToString;
    var ret = oldToString.call(cmpInstance, arguments);
    // make sure to require the necessary css files, too

    var client_options = {
      component: component,
      id: id
    };

    var behavior_path;
    if (options.behavior) {
      behavior_path = "app/client/behaviors/" + options.behavior;
      client_options.behavior = behavior_path;
    }

    if (options.delegate) {
      var controller = options.controller || context("controller");
      client_options.delegate = {
        events: options.delegate,
        controller: controller
      };
    }

    if (options.controller) {
      client_options.controller = options.controller;
    }

    if (options.client_options) {
      client_options.client_options = options.client_options;
    }

    var page = require_core("server/page");
    page.async(function(flush) {
      Component.build_package(component, function() {
        client_options.hash = _versions[component];
        bridge.call("core/client/component", "instantiate", client_options);
        flush();
      });
    })();

    return ret;
  }

  cmpInstance.toString = function() {
    return marshallToClient(cmpInstance);
  };

  cmpInstance.marshall = function() {
    return marshallToClient(cmpInstance);
  }

  if (cb) {
    cb(cmpInstance);
  }

  return cmpInstance;
};

global.$C = Component.build;
module.exports = Component;
