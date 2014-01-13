"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");
describe("core/server/readfile.js", function() {
  var readfile = require_core("server/readfile");
  describe("#read", function() {
    test_helper.it("should have a test", function(done) {
      var contents = readfile("core/client/prelude.json");
      assert.notEqual(contents, "");
      done();
    });
  });
  describe("#all", function() {
    test_helper.it("should have a test", function(done) {
      var contents = readfile.all("core/client/prelude.json");
      assert.notEqual(contents, "");
      done();
    });
  });
});
