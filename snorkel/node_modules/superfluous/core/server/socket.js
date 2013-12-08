"use strict";

var fs = require("fs");

var load_controller = require("./controller").load;
var context = require_core("server/context");
var _handlers = {};
var config = require_core("server/config");
var db = require_core("server/db");
var Primus = require("primus.io");

var _sockets = [];
var _dirty = false;

var _controller_caches = {};
var _primus = null;

var _socket_id = 0;
function wrap_socket(socket) {
  _socket_id += 1;

  var socket_id = _socket_id;

  var ret = {};
  ret.emit = function(evt, data) {
    socket.send.apply(socket, arguments);
  };

  ret.broadcast = {
    emit: function(evt, data) {
      socket.channel.send(evt, data);
    }
  };

  ret.on = function(evt, cb) {
    socket.on(evt, cb);
  };

  ret.socket = socket;

  // incoming connections have headers
  if (socket.headers) {
    ret.session = socket.headers.session;
    ret.sid = socket.headers.sid;
  }

  // a place to hang some data
  ret.manager = {};
  return ret;

}

function setup_new_socket(controller_cache, name, controller, socket) {
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
    var controller_cache = _controller_caches[data.controller];
    _dirty = true;

    controller_cache[data.key] = data.value;

    // TODO: validate this before sending it to other clients.
    socket.broadcast.emit("store", data);
  });

  socket.on('validate_versions', function(versions, cb) {
    var bootloader = require_core("controllers/bootloader/server");
    bootloader.validate_versions(versions, socket);
  });

  socket.on('close', function() {
    _sockets = _.without(_sockets, socket);
  });
}

function get_socket(io, path) {
  return wrap_socket(io.channel(path));
}

module.exports = {
  setup_io: function(app, server) {
    // Setup Socket.IO
    var io;
    var primus = new Primus(server, {
      transformer: 'socket.io'
    });
    // add rooms to Primus
    _primus = primus;

    var routes = require('./routes');
    routes.socket(primus);

    var shutdown = require_core('server/shutdown');
    shutdown.install(primus);

    var auth = require_core("server/auth");
    auth.install(app, primus);

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

        var controller_socket = get_socket(io, name);
        controller.get_shared_value = function(key) {
          return _controller_caches[name][key];
        };
        controller.get_socket = function() {
          return controller_socket;
        };

        if (controller.realtime) {
          controller.realtime(controller_socket);
        }

        controller_socket.socket.on('connection', function(s) {
          var socket = wrap_socket(s);
          socket.channel = controller_socket;

          context.create({ socket: socket }, function(ctx) {
            var old_on = socket.on;

            // Wrapping the context forward (or so i think)
            socket.on = function() {
              var args = _.toArray(arguments);
              var last_func = args.pop();
              last_func = context.wrap(last_func);
              args.push(last_func);

              old_on.apply(socket, args);
            };

            try {
              setup_new_socket(controller_cache, name, controller, socket);
            } catch(e) {
              console.log("Couldn't setup socket for new client on", name, "controller", e);
            }
          });

        });
      });
    });
  },
  get_open_sockets: function() {
    return _sockets;
  },
  get_socket_library: function() {
    return _primus.library();
  }
};
