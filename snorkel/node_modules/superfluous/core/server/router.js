/**
 * The routes module is responsible for calling a route in a controller. It is
 * the entry point for all route handling on the server and is where the
 * context is created.
 *
 * @class routes (server)
 * @module Superfluous
 * @submodule Server
 */

"use strict";

var context = require("./context");
var page = require("./page");
var route_collector = require("./route_collector");
var socket = require("./socket");
var hooks = require("./hooks");

var readfile = require("./readfile");

var _ = require_vendor("underscore");


var template = require_core("server/template");
var bridge = require_core("server/bridge");
var readfile = require_core("server/readfile");

var API = {
  bridge: bridge,
  page: page,
  template: template,
  readfile: readfile,
  inspect: function() {
    return "API: " + _.keys(API).sort().join(", ");
  }
};

_.each(API, function(v, k) {
  v.inspect = function() {
    return k + ":" + _.keys(v).sort().join(",");
  };
});

var zlib = require("zlib");
function request_handler_factory(app, route_data) {
  var handler = route_data.handler;
  var route = route_data.route;
  var name = route_data.name;
  var controller_instance = route_data.controller;

  return function handle_req(req, res) {
    var stream = zlib.createGzip();
    stream._flush = zlib.Z_SYNC_FLUSH;
    stream.pipe(res);

    hooks.invoke("setup_request_ip", req, function() {
      var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

      req.ip = ip;
    });

    hooks.invoke("setup_request", req, res, function() {
      context.create(
        {
          req: req,
          res: res,
          route_name: name,
          stream: stream,
          app: app,
          router: app.router },
        function(ctx) {
          hooks.invoke("setup_context", ctx, function() {
            page.emit("start", {
              route: route
            });

            var handled = false;
            var handle_request = function() {
              if (handled) {
                return;
              }
              handled = true;
              debug("Starting request", ctx.id, ctx.req.url.pathname);
              res.set("Transfer-Encoding", "chunked");

              handler(ctx, API);

              page.emit("main_duration");
              debug("Ending main request", ctx.id, ctx.req.uri.pathname);
              ctx.exit();
            };

            if (controller_instance && controller_instance.before_request) {
              var ret = controller_instance.before_request(ctx, API, handle_request);

              // if the controller calls 'handle_request', they should definitely return true...
              if (ret) {
                return;
              }
            }

            handle_request();
          });
      });
    });
  };
}

var install = function(app) {
  var Router = require('reversable-router');
  var router = new Router();
  router.extendExpress(app);
  router.registerAppHelpers(app);

  app.router = router;

  // Read the routes in from an external file
  // TODO: make this more automagic
  var Controllers = JSON.parse(readfile("routes.json"));

  var app_routes = route_collector.collect(Controllers);
  var plugin_routes = route_collector.collect_plugins();
  var core_routes = route_collector.collect_core();

  _.each(core_routes.concat(app_routes).concat(plugin_routes), function(route_data) {
    var type = route_data.method || 'get';
    if (!app[type]) {
      console.log("Route", route_data.route, "has an invalid method");
      return;
    }


    router.add(type, route_data.route, request_handler_factory(app, route_data), {
      name: route_data.name
    });
  });

  var named_routes = _.map(router.routesByNameAndMethod, function(v, k) {
    var type = v.get || v.post;
    return [k, type.path];
  });

  console.log("Routes:\n", named_routes);
  app.use(function(req, res, next) {
    // pretend we are expressive
    req.path = req.uri.pathname;
    res.set = res.setHeader;

    router.dispatch(req, res, next);
  });
};

module.exports = {
  install: install,
  API: API
};
