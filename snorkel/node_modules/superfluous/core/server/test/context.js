"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");
describe("core/server/context.js", function() {
  var context = require_core("server/context");
  describe("#create", function() {
    test_helper.it("should have a test", function(done) {
      context.create({foo: 'baz'}, function(ctx) {

        assert.notEqual(ctx, null);
        assert.equal(ctx.foo, 'baz');
        done();
      });
    });
  });
  describe("#reset", function() {
    test_helper.it("should have a test", function(done) {
      context.create({foo: 'baz'}, function(ctx) {
        assert.notEqual(ctx, null);
        assert.equal(ctx.foo, 'baz');
        context.reset('foo');
        assert.equal(ctx.foo, null);
        done();
      });
    });
  });
});
