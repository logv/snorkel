/**
 * The router hooks up the routes on the server to the express app. It pull the
 * routes off the bootloader, as well as any controllers listed in routes.json
 * and creates their 'routes' and 'post_routes' handlers on behalf of the controller.
 *
 * @class router (server)
 * @module Superfluous
 * @submodule Server
 */

"use strict";

var _ = require_vendor("underscore");
var context = require("./context");
var load_controller = require("./controller").load;
var load_core_controller = require("./controller").core;
var plugin = require_core("server/plugin");
var path_ = require("path");


module.exports = {
  paths: {},
  controllers: {},
  controller_apps: {},
  get_path: function(controller_name) {
    return this.paths[controller_name];
  },

  collect_plugins: function() {
    var readfile = require_core("server/readfile");
    var routes = [];
    _.each(plugin.get_external_paths(), function(mount_path, controller_path) {
        var controller_json = readfile(path_.join(controller_path, "routes.json"));
        if (!controller_json) {
          return;
        }

        var external_controllers = JSON.parse(controller_json);

        plugin.register_external_plugin(controller_path);
        routes = routes.concat(module.exports.collect(external_controllers));
    });

    return routes;
  },

  collect_core: function() {
    var routes = [];
    function add_core_controller(controller, name) {
      var inst = load_core_controller(controller);
      function run_route(handler) {
        return function() {
          context("controller", controller);
          inst[handler].apply(inst, arguments);
        };
      }

      _.each(inst.routes, function(handler, subpath) {
        routes.push({
          route: path_.normalize("/" + name + "/" + subpath),
          method: "get",
          name: name + "." + handler,
          handler: run_route(handler),
          controller: inst
        });
      });
    }

    add_core_controller("bootloader", "pkg");

    return routes;
  },

  collect: function(controllers, prefix) {
    prefix = prefix || '';
    // Takes an enumerable of controller names, loads the controllers and then
    // harvests their routes
    var routes = [];
    _.each(controllers, function(controller, path) {
      if (!controller) {
        return;
      }
      var inst = load_controller(controller);

      // Registering Plugins & Self Contained controllers
      if (inst.is_extern) {
        module.exports.controller_apps[controller] = true;
        plugin.register_external_plugin(inst.base_dir);
      } else if (inst.is_package) {
        plugin.register_controller(controller);
        module.exports.controller_apps[controller] = true;
      }


      module.exports.paths[controller] = path;
      module.exports.controllers[path] = controller;

      function run_route(handler) {
        return function() {
          context("controller", controller);
          context("controller_path", path);
          context("controller_instance", inst);

          inst[handler].apply(inst, arguments);
        };
      }

      _.each(inst.routes, function(handler, subpath) {
        var subberpath = prefix + path + subpath;

        routes.push({
          route: path_.normalize(subberpath),
          method: "get",
          name: controller + "." + handler,
          handler: run_route(handler),
          controller: inst
        });
      });

      _.each(inst.post_routes, function(handler, subpath) {
        var subberpath = prefix + path + subpath;
        routes.push({
          route: path_.normalize(subberpath),
          method: "post",
          name: controller + "." + handler,
          handler: run_route(handler)
        });
      });
    });

    return routes;
  },
  get_packaged_controllers: function() {
    return _.keys(module.exports.controller_apps);
  }

};
