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


Backbone.$ = cheerio;

var Component = require_root("components/component");

Component.load = function(component) {
  var base_dir = "./components/" + component + "/";
  var package_data = readfile(base_dir + "package.json");
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

Component.build_package = function(component, cb) {
  var package_ = {};
  var base_dir = "./components/" + component + "/";
  var package_data = readfile(base_dir + "package.json");
  var pkg = JSON.parse(package_data);
  // Look for package.json file in component dir
  // this will contain dependencies, stylesheets, etc

  var cmp = {};
  cmp.helpers = {};

  function process_file(obj, file, key, cb) {
    return function(cb) {
      fs.readFile(file, function(err, data) {
        if (err) {
          obj[key] = "console.log('Couldnt find helper " + key + " for " + component + " component');";
        } else {
          obj[key] = data.toString();
        }
        cb();
      });
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
    process_file(cmp, base_dir + pkg.template, "template"),
    process_file(cmp, base_dir + "events.js", "events"),
    process_style(cmp, base_dir + pkg.style.replace(".css", ""), "style")
  ];

  var named = _.isObject(pkg.helpers);

  _.each(pkg.helpers, function(helper, name) {
    jobs.push(process_file(cmp.helpers, js_dir + helper + ".js", (named && name) || helper));
  });


  cmp.schema = pkg;
  cmp.styles = pkg.styles;

  async.parallel(jobs, function(err, results) {
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

  if (cmpInstance.server) {
    cmpInstance.server();
  }

  var oldToString = cmpInstance.toString;

  // This is basically the 'first render' wrapper for
  // server side components. It has important responsibilities,
  // like:
  //    * marshalling data to the client
  //    * making sure that client behaviors get installed.
  cmpInstance.toString = function() {
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


    bridge.call("core/client/component", "instantiate", client_options);
    return ret;
  };

  if (cb) {
    cb(cmpInstance);
  }

  return cmpInstance;
};

global.$C = Component.build;
module.exports = Component;
