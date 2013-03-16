"use strict";

// vendor
var express = require('express');
var http = require('http');
var app = express();

// setup helpers
var globals = require("./globals");
globals.install();

var config = require("./config");

if (config.behind_proxy) {
  app.enable('trust proxy');
}

var socket = require_root("server/socket");


var http_server = http.createServer(app);

// Setup an HTTPS server
var auth = require_root("server/auth");
var https_server = auth.setup_ssl_server(app);

http.globalAgent.maxSockets = config.max_http_sockets;

// Authorization
var passport = require('passport');


// Better stack traces
require("longjohn");

app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

// Setup authentication
app.use(express.cookieParser());

var session = require("./session");
session.install(app);
app.use(passport.initialize());
app.use(passport.session());


// parse POST request body bits
app.use(express.bodyParser());


//app.use(express.logger());
app.use(express.compress());


// setup static helpers
app.use(express.static('static'));

// setup error handling
//var errorHandlers = require_root("server/error_handlers");
//app.use(errorHandlers.default);

// lib
var routes = require('./routes');
routes.setup(app);

module.exports = {
  run: function() {
    var http_port = config.http_port;
    var https_port = config.https_port;
    socket.setup_io(app, http_server);
    http_server.listen(http_port);


    console.log("Listening for HTTP connections on port", http_port);

    // Setting up SSL server
    if (https_server && https_port) {
      console.log("Listening for HTTPS connections on port", https_port);
      socket.setup_io(app, https_server);
      https_server.listen(https_port);
    }
    // End SSL Server
  }
};
