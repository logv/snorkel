/**
 * A Component is a Backbone View and the templates, styles and javascript that
 * it is packaged with.
 *
 * This module exposes an API for creating components on the server. Any
 * Componet will be an instance of a Backbone.View and have several convenience
 * methods attached, including toString and marshall.
 *
 * (See components/component.js for the conveniences)
 *
 * @class component (server)
 * @module Superfluous
 * @submodule Server
 */

"use strict";

var _ = require_vendor("underscore");
var Backbone = require_vendor("backbone");
var async = require("async");

var fs = require("fs");
var path = require("path");
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
var _component_paths = {
  "app/static" : true // serve component helpers out of app/static, just in case
};

Component.register_path = function(subpath) {
  _component_paths[subpath] = true;
};

Component.load = function(component) {
  var base_dir = path.join(".", "components", component);
  var read_options = {
    paths: _.keys(_component_paths)
  };
  var package_data;

  // Need to locate which dir this thingie lives in, right?
  try {
    package_data = readfile(path.join(base_dir, "package.json"), read_options);
  } catch (e) {
    console.log("Couldn't find package.json for ", component, ". Are you sure the component is named that?");
    throw new Error("Missing Component " + component);
  }

  var pkg = JSON.parse(package_data);
  // Look for package.json file in component dir
  // this will contain dependencies, stylesheets, etc

  var cmp = {};
  var main = require_root(path.join(base_dir, pkg.main + ".js"), read_options);
  var tmpl = readfile(path.join(base_dir, pkg.template), read_options);

  cmp.schema = pkg;
  cmp.main = main;
  cmp.template = tmpl;

  var newCmp = Component.extend(cmp.main);
  newCmp.template = cmp.tmpl;

  return cmp;
};

// Need to cache these bad boys
var _packages = {};
/**
 * Creates a complete package for a component by reading package.json and
 * running the styles, js and templates through their preprocessors.
 *
 * @static
 * @method build_package
 *
 */
Component.build_package = function(component, cb) {
  var base_dir = path.join(".", "components", component);
  var read_options = {
    paths: _.keys(_component_paths)
  };

  var file_name = path.join(base_dir, "package.json");
  var package_data = readfile(file_name, read_options);
  if (!package_data) {
    console.log("Couldn't find package.json at", file_name, read_options);
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

  function process_template(obj, file, key) {
    return function(cb) {
      var data = readfile(file, read_options);
      if (!data) {
        obj[key] = null;
      } else {
        obj[key] = data;
      }
      cb();
    };
  }

  function process_file(obj, file, key) {
    return function(cb) {
      var data = readfile(file, read_options);
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
  var jobs = [
    process_file(cmp, path.join(base_dir, pkg.main + ".js"), "main"),
    process_file(cmp, path.join(base_dir, "events.js"), "events"),
    process_template(cmp, path.join(base_dir, pkg.template), "template"),
    process_style(cmp, path.join(base_dir, pkg.style.replace(".css", "")), "style")
  ];

  var named = _.isObject(pkg.helpers);
  if (_.isArray(pkg.helpers)) {
    named = false;
  }

  _.each(pkg.helpers, function(helper, name) {
    jobs.push(process_file(cmp.helpers, path.join(helper + ".js"), (named && name) || helper));
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

/**
 * Builds a Component for usage on the server. This Component is loaded from
 * the components/ directory out of the component's package.json file. When
 * instantiated on the server side, the component is created with only its main
 * JS file (the events file is only used on the client).
 *
 * The component lifecycle for server created components is:
 *
 *  Server:
 *  component.initialize(options)
 *  component.render
 *  component.server
 *
 *  Client:
 *  component.initialize(options)
 *  component.client(options.client_options)
 *
 * @static
 * @method build
 * @param {String} component_name The name of the component ("button", f.e.)
 * @param {Object} options The options to pass to the component's initialize
 * function. The 'client_options' member of this Object is special and will be
 * passed to the client() function when this Component is instantiated on the
 * client.
 * @param {Function} cb The callback to run once the Component is instantiated
 *
 */
var __id = 0;
Component.build = function(component, options, cb) {
  var base_dir = path.join(".", "components", component);
  var cmp = Component.load(component);
  var id = "s" + __id;
  __id += 1;
  var main = require_root(path.join(base_dir, cmp.schema.main + ".js"));
  var cmpClass = Component.extend(main);
  var cmpInstance = new cmpClass(_.extend({ id: id }, options));

  var additionalClasses = options.classes || "";


  var className = "";
  if (cmpInstance.className) {
    className += cmpInstance.className;
  }

  if (additionalClasses) {
    className += " " + additionalClasses;
  }

  className += " cmp-" + component;

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

  /**
   *
   * Renders this component into HTML for the server to send to the client. The
   * side effect of this is that this component is also marshalled to the
   * client through the bridge. 
   * This function is safe to call multiple times and only one instance will be
   * instantiated on the client.
   *
   * @method toString
   * @return {String} the generated HTML for this component
   *
   *
   */
  cmpInstance.toString = function() {
    return marshallToClient(cmpInstance);
  };

  /**
   *
   * Marshall this component through the bridge to the client.
   * This function is safe to call multiple times and only one instance will be
   * instantiated on the client.
   *
   * @method marshall
   * @return {String} the generated HTML for this component
   *
   *
   */
  cmpInstance.marshall = function() {
    return marshallToClient(cmpInstance);
  }

  if (cb) {
    cb(cmpInstance);
  }

  return cmpInstance;
};

Component.install_marshalls = function() {
  var bridge = require_core("server/bridge");
  bridge.add_marshaller('component', function component_marshaller(arg) {
    if (arg && arg.isComponent) {
      return { id: arg.id, isComponent: true };
    }
  });
};

global.$C = Component.build;
module.exports = Component;
