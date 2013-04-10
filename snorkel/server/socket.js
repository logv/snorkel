"use strict";

var load_controller = require("./controller").load;
var _handlers = {};
var config = require_root("server/config");

var _sockets = [];

module.exports = {
  setup_io: function(app, server) {
    // Setup Socket.IO
    var io = require('socket.io').listen(server);
    io.set('log level', 1); // reduce logging
    if (!config.sockets) {
      console.log("Falling back to xhr-polling");
      // disable socket.io websockets for people behind proxies
      io.set('transports', ['xhr-polling', 'htmlfile', 'jsonp-polling']);
    }

    var routes = require('./routes');
    routes.socket(io);

    var shutdown = require_root('server/shutdown');
    shutdown.install(io);

    var auth = require_root("server/auth");
    auth.install(app, io);

    return io;
  },

  install: function(io, controllers) {
    _.each(controllers, function(name, path) {
      var controller = load_controller(name);
      if (!controller.socket) {
        return;
      }

      var controller_cache = {};
      var controller_socket = io.of(path);

      if (controller.realtime) {
        controller.realtime(controller_socket);
      }

      controller_socket.on('connection', function(socket) {
        if (controller.socket) {
          controller.socket(socket);
        }

        _sockets.push(socket);

        _.each(controller_cache, function(v, k) {
          socket.emit('store', {
            key: k,
            value: v,
            controller: name
          });
        });

        socket.on('store', function(data) {
          controller_cache[data.key] = data.value;

          // TODO: validate this before sending it to other clients.
          socket.broadcast.emit("store", data);
        });

        socket.on('close', function() {
          _sockets = _.without(_sockets, socket);
        });

      });

    });
  },
  get_open_sockets: function() {
    return _sockets;
  }
};
