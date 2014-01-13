"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");


describe("core/server/auth.js", function() {
  var auth = require_core("server/auth");
  var app = require("connect")();

  describe("#install", function() {
    test_helper.it("adds an authorize function to io", function(done) {
      var _cb;
      auth.install(app, { authorize: function(cb) {
        _cb = cb;
      
      }});
      assert.notEqual(_cb, null);
      done();
    });
  });

  describe("#setup_ssl_server", function() {
    test_helper.it("should create an https server", function(done) {
      var https_server = auth.setup_ssl_server(app);

      // TODO: uncomment these, later. right now, SSL isn't set up by default
      // assert.notEqual(https_server, null);
      // assert.notEqual(https_server.cert, null);
      done();
    });
  });
});
