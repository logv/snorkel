"use strict";

var test_helper = require("superfluous").test_helper;
test_helper.init();
var assert = require("assert");

describe("tester server controller", function() {
  it("should render its index page", function(done) {
    test_helper.test_route("tester", "index", [], function(rendered_page) {
      assert.notEqual("test", "written");
      done();
    });
  });

  it("should send out the initial socket payloads", function(done) {
    test_helper.test_socket("tester", function(socket, setup_socket) {
      // the message we are expecting for the client
      socket.on("something", function() {
        assert.notEqual("test", "written");
        done();
      });

      setup_socket(function() {
        assert.notEqual("test", "written");

        // a message we are simulating from the client
        socket.emit("other thing");
      });
    });
  });
});
