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

module.exports = {
  get_path: function(controller_name) {
    return this.paths[controller_name];
  },

  collect: function(controllers) {
    // Takes an enumerable of controller names, loads the controllers and then
    // harvests their routes
    var routes = [];
    var self = this;
    self.paths = {};
    self.controllers = {};

    var inst = load_core_controller("bootloader");
    function run_route(handler) {
      return function() {
        context("controller", "bootloader");
        inst[handler].apply(inst, arguments);
      };
    }

    _.each(inst.routes, function(handler, subpath) {
      routes.push({
        route: "/pkg" + subpath,
        method: "get",
        name: "pkg." + handler,
        handler: run_route(handler)
      });
    });



    _.each(controllers, function(controller, path) {
      var inst = load_controller(controller);
      self.paths[controller] = path;
      self.controllers[path] = controller;

      function run_route(handler) {
        return function() {
          context("controller", controller);
          context("controller_path", path);

          inst[handler].apply(inst, arguments);
        };
      }

      _.each(inst.routes, function(handler, subpath) {
        var subberpath;
        if (path === '/' && subpath !== '') {
          subberpath = subpath;
        } else {
          subberpath = path + subpath;
        }

        routes.push({
          route: subberpath,
          method: "get",
          name: controller + "." + handler,
          handler: run_route(handler)
        });
      });

      _.each(inst.post_routes, function(handler, subpath) {
        var subberpath;
        if (path === '/' && subpath !== '') {
          subberpath = subpath;
        } else {
          subberpath = path + subpath;
        }
        routes.push({
          route: subberpath,
          method: "post",
          name: controller + "." + handler,
          handler: run_route(handler)
        });
      });
    });

    return routes;
  }

};
