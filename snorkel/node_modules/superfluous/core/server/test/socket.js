"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");
describe("core/server/socket.js", function() {
  var socket = require_core("server/socket");
  var app = require("connect")();
  var http = require('http');
  var http_server = http.createServer(app);
  var authorized;
  var socket_lib = {
    authorize: function() {
      authorized = true;
    },
    channel: function() {
      return _.extend({ 
        
      }, Backbone.Events);
    }
  };
  describe("#get_cache", function() {
    test_helper.it("should have a test", function(done) {
      socket.get_cache(function(ret) {
        assert.notEqual(ret, null);
        done();
      });
    });
  });
  describe("#install", function() {
    var readfile = require_core("server/readfile");
    test_helper.it("should have a test", function(done) {
      var Controllers = JSON.parse(readfile("routes.json"));

      socket.install(socket_lib, Controllers);

      _.each(Controllers, function(name) {
        var controller = require_core("server/controller").load(name);
        assert.notEqual(controller.get_socket, null);
      });
      done();
    });
  });
  describe("#get_open_sockets", function() {
    test_helper.it("should have a test", function(done) {
      var socks = socket.get_open_sockets();
      assert.equal(socks.length, 0);
      done();
    });
  });
  describe("#get_socket_library", function() {
    test_helper.it("should have a test", function(done) {
      socket.setup_io(app, http_server);
      var lib = socket.get_socket_library();

      assert.notEqual(lib, null);
      done();
    });
  });
});
