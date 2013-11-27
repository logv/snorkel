"use strict";

// vendor
var express = require('express');
var http = require('http');
var app = express();
// setup helpers
var globals = require("./globals");
globals.install();

var config = require_core("server/config");

var package_json = require_core("../package.json");
var app_name = package_json.name;

// setup() fills these in
var socket,
    http_server,
    https_server;


function setup() {
  // Better stack traces
  require("longjohn");

  if (config.behind_proxy) {
    app.enable('trust proxy');
  }

  socket = require_core("server/socket");

  http_server = http.createServer(app);

  // Setup an HTTPS server
  var auth = require_core("server/auth");
  https_server = auth.setup_ssl_server(app);

  http.globalAgent.maxSockets = config.max_http_sockets;

  // Add timestamps
  require("./console").install();

  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

  // Setup authentication
  app.use(express.cookieParser());

  var session = require("./session");
  session.install(app);


  // Opportunity for Authorization and other stuff
  var main = require_app("main");
  if (main.setup_app) {
    main.setup_app(app);
  }



  // parse POST request body bits
  app.use(express.bodyParser());


  //app.use(express.logger());
  app.use(express.compress());


  // setup static helpers
  var oneDay = 1000 * 60 * 60 * 24;
  var oneYear = oneDay * 365;
  app.use(express.static('app/static', { maxAge: oneYear }));
  app.use(express.static('core/static', { maxAge: oneYear }));

  // setup error handling
  //var errorHandlers = require_core("server/error_handlers");
  //app.use(errorHandlers.default);

  // lib
  var routes = require('./routes');
  routes.setup(app);
}

function setup_services(options) {
  setup();
}

function try_restart(server, port) {
  var retries = 0;

  return function(e) {
    if (e.code === 'EADDRINUSE') {
      console.log('Port', port, 'in use, retrying...');
      setTimeout(function () {
        try { server.close(); } catch(e) {}

        if (retries > 5) {
          console.log("Couldn't listen on port", port, ", exiting.");
          process.exit();
        }

        retries += 1;
        server.listen(port);
      }, 2000);
    }
  };
}
module.exports = {
  name: app_name,
  run: function() {
    var services = { web_server: true };
    if (!config.separate_services) { services.collector = true; }
    setup_services(services);

    var http_port = config.http_port;
    var https_port = config.https_port;
    socket.setup_io(app, http_server);
    http_server.listen(http_port);
    http_server.on('error', try_restart(http_server, http_port));

    console.log("Listening for HTTP connections on port", http_port);

    require_app("main").setup(services);

    // Setting up SSL server
    if (https_server && https_port) {
      console.log("Listening for HTTPS connections on port", https_port);
      socket.setup_io(app, https_server);
      https_server.listen(https_port);
      https_server.on('error', try_restart(https_server, https_port));
    }
    // End SSL Server
  },

  run_collector: function() {
    setup_services({
      collector: true
    });
  }
};
