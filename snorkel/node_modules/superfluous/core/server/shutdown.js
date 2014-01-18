"use strict";

var config = require_core("server/config");

function gracefulShutdown(io, cb) {
  var socket = require_core("server/socket");
  var sockets = socket.get_open_sockets();

  // if we are in development mode
  if (!config.RELEASE) {
    _.each(sockets, function(socket) {
      socket.emit("__refresh", { auth: parseInt(Math.random() * 120098, 10)});
    });
  }

  cb();
}

module.exports = {
  install: function(io) {
    process.on('exit', function() {
      gracefulShutdown(io, function() { });
    });

    process.once('SIGUSR2', function () {
      gracefulShutdown(io, function () {
        process.kill(process.pid, 'SIGUSR2'); 
      });
    });
  }
};
