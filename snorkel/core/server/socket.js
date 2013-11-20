"use strict";

var load_controller = require("./controller").load;
var context = require_core("server/context");
var _handlers = {};
var config = require_core("server/config");
var db = require_core("server/db");

var _sockets = [];
var _dirty = false;

var _controller_caches = {};
module.exports = {
  setup_io: function(app, server) {
    // Setup Socket.IO
    var io;
    io = require('socket.io').listen(server);

    io.set('log level', 1); // reduce logging
    if (!config.sockets) {
      console.log("Falling back to xhr-polling");
      // disable socket.io websockets for people behind proxies
      io.set('transports', ['xhr-polling', 'htmlfile', 'jsonp-polling']);
    }

    var routes = require('./routes');
    routes.socket(io);

    var shutdown = require_core('server/shutdown');
    shutdown.install(io);

    var auth = require_core("server/auth");
    auth.install(app, io);

    return io;
  },

  save_cache: function(cb) {
    if (!_dirty) {
      return;
    }

    _dirty = false;
    cb = context.wrap(cb);
    db.get("socket", "cache", function(collection) {
      var after = _.after(_controller_caches.length, cb);
      _.each(_controller_caches, function(cache, controller) {
        var instance = load_controller(controller);
        if (!instance.socket_cache_whitelist) {
          return after();
        }

        if (_.isFunction(instance.socket_cache_whitelist)) {
          cache = _.pick.call(_, cache, instance.socket_cache_whitelist());
        } else {
          cache = _.pick.call(_, cache, instance.socket_cache_whitelist);
        }

        collection.findOne({name: controller}, function(err, obj) {
          if (!err && obj) {
            collection.update( {_id: obj._id}, {name: controller, data: cache }, function(err, results) { });
          } else {
            collection.insert( {name: controller, data: cache }, function(err, results) { });
          }

          after();
        });
      });
    });

  },

  read_cache: function(cb) {
    cb = context.wrap(cb);
    db.get("socket", "cache", function(collection) {
      collection.find({}, function(err, cur) {
        cur.toArray(function(err, results) {
          if (!err) {
            _.each(results, function(cache) {
              _controller_caches[cache.name] = cache.data;
            });
          }
        });

        if (cb) {
          cb();
        }
      });
    });
  },

  get_cache: function(cb) {
    cb(_controller_caches);
  },

  install: function(io, controllers) {
    var self = this;
    setInterval(function() {
      self.save_cache();
    }, 3000);
    this.read_cache(function() {
      _.each(controllers, function(name, path) {
        var controller = load_controller(name);

        if (!controller.socket) {
          return;
        }

        if (!_controller_caches[name]) {
          _controller_caches[name] = {};
        }
        var controller_cache = _controller_caches[name];

        var controller_socket = io.of(path);
        controller.get_shared_value = function(key) {
          return _controller_caches[name][key];
        };

        if (controller.realtime) {
          controller.realtime(controller_socket);
        }

        controller_socket.on('connection', function(socket) {
          if (controller.socket) {
            controller.socket(socket);
          }
          socket.handshake.controller = name;

          _sockets.push(socket);

          _.each(controller_cache, function(v, k) {
            socket.emit('store', {
              key: k,
              value: v,
              controller: name
            });
          });

          socket.on('store', function(data) {
            var controller_cache = _controller_caches[data.controller];
            _dirty = true;

            controller_cache[data.key] = data.value;

            // TODO: validate this before sending it to other clients.
            socket.broadcast.emit("store", data);
          });

          socket.on('close', function() {
            _sockets = _.without(_sockets, socket);
          });

        });

      });
    });
  },
  get_open_sockets: function() {
    return _sockets;
  }
};
