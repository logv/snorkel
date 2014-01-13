"use strict";

var readfile = require_core("server/readfile");
var component = require_core("server/component");
var path_ = require("path");
var config = require_core("server/config");

var _registered_paths = {};
function register_path(tl_path) {
  readfile.register_path(path_.join(tl_path, "static"));
  component.register_path(tl_path);

  _registered_paths[tl_path] = true; 
}

function get_registered_paths() {
  return _.keys(_registered_paths);
}

function register_plugin(plugin) {
  console.log("'" + plugin + "' plugin is packaged, adding it to static asset path");
  register_path(path_.join("app", "plugins", plugin));
}

function register_controller(controller) {
  console.log("'" + controller + "' controller is packaged, adding it to static asset path");
  register_path(path_.join("app", "controllers", controller));
}

var _registered_externs = {};
function register_external_plugin(plugin_dir, mount_point) {
  mount_point = mount_point || "/plugins";
  if (_registered_externs[plugin_dir]) {
    return;
  }
  _registered_externs[plugin_dir] = true;

  external_paths[plugin_dir] = mount_point;
  controller_paths.push(plugin_dir);
  register_path(plugin_dir);

  var ctrl;
  try {
    // If we are loading an external dir, load it's index file for
    // instructions on how to install it.
    ctrl = require_root(path_.join(plugin_dir, "index"));
  } catch(e) { }

  if (ctrl && ctrl.install) {
    ctrl.install();
  }
}

var path = require("path");
var ROOT_RE = new RegExp("^/?\\$ROOT/");
var controller_paths = ["app/controllers", "app/plugins"];
var external_paths = {};

function get_full_path(controller_include) {

  var stripped_include = controller_include.replace(ROOT_RE, "");
  var paths = controller_paths;
  var resolved;
  _.each(paths, function(p) {
    if (resolved) {
      return;
    }

    var full_path = path.join(p, stripped_include);
    if (readfile(full_path + ".js")) {
      resolved = full_path;
    }
  });

  return resolved;
}
function get_base_dir(controller_include) {

  var stripped_include = controller_include.replace(ROOT_RE, "");
  var paths = controller_paths;
  var resolved;
  _.each(paths, function(p) {
    if (resolved) {
      return;
    }

    var full_path = path.join(p, stripped_include);
    if (readfile(full_path + ".js")) {
      resolved = p;
    }
  });

  return resolved;
}

function register_core(plugin) {
  var plugin_path = path_.join(config.CORE_DIR, "plugins", plugin);
  register_external_plugin(plugin_path);
}

module.exports = {
  register_plugin: register_plugin,
  register_core: register_core,
  register_controller: register_controller,
  register_external_plugin: register_external_plugin,
  register_path: register_path,
  get_registered_paths: get_registered_paths,
  get_external_paths: function() {
    return external_paths;
  },
  get_controller_paths: function() {
    return controller_paths;
  },
  get_base_dir: get_base_dir,
  get_full_path: get_full_path
};
