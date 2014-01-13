"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");
describe("core/server/session.js", function() {
  var session = require_core("server/session");
  describe("#install", function() {
    test_helper.it("should have a test", function(done) {
      var app = require("connect")();
      var store = require_core("server/store");
      store.install(app);
      session.install(app);
      done();
    });
  });
  describe("#get", function() {
    test_helper.it("should have a test", function(done) {
      session.set({});
      assert.notEqual(session.get(), null);
      done();
    });
  });
  describe("#set", function() {
    test_helper.it("should have a test", function(done) {
      session.set({ foo: '12'});
      assert.notEqual(session.get(), null);
      assert.equal(session.get().foo, '12');
      done();
    });
  });
  describe("#secret", function() {
    test_helper.it("should have a test", function(done) {
      assert.notEqual(session.secret(), null);
      done();
    });
  });
});
