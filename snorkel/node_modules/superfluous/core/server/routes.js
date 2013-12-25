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
var router = require("./router");
var socket = require("./socket");
var fs = require("fs");
var readfile = require("./readfile");

var _ = require_vendor("underscore");


// Read the routes in from an external file
// TODO: make this more automagic
var Controllers = JSON.parse(readfile("routes.json"));

var routes = router.collect(Controllers);

var install_socket = function(io) {
  socket.install(io, Controllers);
};

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
function request_handler_factory(route, handler) {
  return function handle_req(req, res) {
    var stream = zlib.createGzip();
    stream._flush = zlib.Z_SYNC_FLUSH;
    stream.pipe(res);

    context.create({ req: req, res: res, stream: stream }, function(ctx) {

      page.emit("start", {
        route: route
      });

      debug("Starting request", ctx.id, ctx.req.url);
      res.set("Transfer-Encoding", "chunked");

      handler(ctx, API);

      page.emit("main_duration");
      debug("Ending main request", ctx.id, ctx.req.url);
      // Nulling out context after request is over
      ctx.exit();
    });
  };
}

var setup = function(app) {
  var Router = require('reversable-router');
  var router = new Router();
  router.extendExpress(app);
  router.registerAppHelpers(app);

  app.router = router;

  console.log("ROUTER IS", router, router.__proto__);
  _.each(routes, function(route_data) {
    var type = route_data.method || 'get';
    var handler = route_data.handler;
    var route = route_data.route;
    var name = route_data.name;

    if (!app[type]) {
      console.log("Route", route_data.route, "has an invalid method");
      return;
    }


    router.add(type, route, request_handler_factory(route, handler), {
      name: name
    });
  });

  
  console.log("Routes:\n", router.routesByNameAndMethod);
  app.use(function(req, res, next) {
    // pretend we are expressive
    req.path = req.uri.pathname;
    res.set = res.setHeader;

    router.dispatch(req, res, next);
  });
};

module.exports = {
  install: setup,
  socket: install_socket
};
