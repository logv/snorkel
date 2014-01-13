"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");
describe("core/server/globals.js", function() {
  describe("#install", function() {
    test_helper.it("should have a test", function(done) {
      assert.notEqual(global.require_core, null);
      assert.notEqual(global.require_app, null);
      assert.notEqual(global.require_vendor, null);
      assert.notEqual(global._, null);
      assert.notEqual(global.Backbone, null);
      done();
    });
  });
});
