"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");
describe("core/server/backbone.js", function() {
  var bkbn = require_core("server/backbone");
  var bridge = require_core("server/bridge");
  describe("#install_marshalls", function() {
    test_helper.it("should have a test", function(done) {
      bkbn.install_marshalls();
      assert.notEqual(bridge.get_marshaller("backbone:collection"), null);
      done();
    });
  });
});
