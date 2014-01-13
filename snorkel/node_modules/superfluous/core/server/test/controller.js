"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");
var val_array = [ { name: "foo", value: "bar" }, {name: "baz", value : "aza"}];
var context = require_core("server/context");

describe("core/server/controller.js", function() {
  var controller = require_core("server/controller");
  describe("#core", function() {
    test_helper.it("should have a test", function(done) {
      var mod = controller.core("bootloader");

      assert.notEqual(mod, null);
      done();
    });
  });
  describe("#load", function() {
    test_helper.it("should have a test", function(done) {
      var mod = controller.load("demo");
      assert.notEqual(mod, null);
      done();
    });
  });
  describe("#require_https", function() {
    test_helper.it("should have a test", function(done) {
      // TODO: write a good test for requiring HTTPS
      context("req", {
        secure: true
      });

      var was_redirected = controller.require_https();
      assert.equal(!!was_redirected, false);

      context("req", {
        secure: true
      });


      done();
    });
  });
  describe("#array_of", function() {
    test_helper.it("should have a test", function(done) {
      var val = controller.array_of(val_array, 'foo');
      assert.equal(val.length, 1);
      assert.equal(val[0], 'bar');
      done();
    });
  });
  describe("#value_of", function() {
    test_helper.it("should have a test", function(done) {
      var val = controller.value_of(val_array, 'foo');
      assert.equal(val, 'bar');
      done();
    });
  });
});
