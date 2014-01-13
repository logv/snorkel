"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");
describe("core/server/main.js", function() {
  var main = require_core("server/main");
  describe("#test_helper", function() {
    test_helper.it("should have a test", function(done) {
      assert.notEqual(main.test_helper, null);
      done();
    });
  });
  describe("#run", function() {
    test_helper.it("should have a test", function(done) {
      assert.notEqual(main.run, null);
      done();
    });
  });
});
