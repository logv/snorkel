"use strict";

var context = require("./context");
var page = require("./page");
var router = require("./router");
var socket = require("./socket");
var fs = require("fs");

var _ = require_vendor("underscore");


// Read the routes in from an external file
// TODO: make this more automagic
var Controllers = JSON.parse(fs.readFileSync("routes.json"));

var routes = router.collect(Controllers);
console.log('INSTANTIATED ROUTES', routes);

var __id = 0;

var install_socket = function(io) {
  socket.install(io, Controllers);
};

function request_handler_factory(route, handler) {
  return function handle_req(req, res) {
    context.create(req, res, function(ctx) {

      page.emit("start", {
        route: route
      });

      debug("Starting request", ctx.id, ctx.req.url);
      res.set("Transfer-Encoding", "chunked");
      handler();

      page.emit("main_duration");
      debug("Ending main request", ctx.id, ctx.req.url);
      // Nulling out context after request is over
    });
  };
}

var setup = function(app) {
  _.each(routes, function(route_data) {
    var type = route_data.method || 'get';
    var handler = route_data.handler;
    var route = route_data.route;
    if (!app[type]) {
      console.log("Route", route_data.route, "has an invalid method");
      return;
    }

    app[type](route, request_handler_factory(route, handler));
  });
};

module.exports = {
  setup: setup,
  socket: install_socket
};
