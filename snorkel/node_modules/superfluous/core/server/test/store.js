"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");
describe("core/server/store.js", function() {
  var store = require_core("server/store");
  describe("#install", function() {
    test_helper.it("should have a test", function(done) {
      store.install();

      assert.notEqual(store.get(), null);
      done();
    });
  });
  describe("#get", function() {
    test_helper.it("should have a test", function(done) {
      assert.notEqual(store.get(), null);
      done();
    });
  });
  describe("#set", function() {
    test_helper.it("should have a test", function(done) {
      store.set({foo: 1});
      assert.notEqual(store.get(), null);
      assert.equal(store.get().foo, 1);
      done();
    });
  });
});
