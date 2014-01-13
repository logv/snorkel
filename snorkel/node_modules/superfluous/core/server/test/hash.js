"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");
describe("core/server/hash.js", function() {
  var quick_hash = require_core("server/hash");
  describe("#hash", function() {
    test_helper.it("should have a test", function(done) {
      assert.notEqual(quick_hash("foo"), null);
      done();
    });
  });
});
