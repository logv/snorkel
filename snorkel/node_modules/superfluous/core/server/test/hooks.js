"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");
describe("core/server/hooks.js", function() {
  var hooks = require_core("server/hooks");
  // TODO: test hook implementation in more details
  describe("#call", function() {
    test_helper.it("should have a test", function(done) {
      var main_called, setup_called, after_called;
      hooks.set_main({
        before_foo: function() {
          setup_called = true;
        },
        call_foo: function() {
          main_called = true;
        },
        after_foo: function() {
          after_called = true;
        }
      });

      hooks.call("foo", "bar", function(arg) {
        assert.equal(arg, "bar");
        assert.equal(main_called, true);
        assert.equal(setup_called, true);
        assert.equal(!after_called, true);
      });

      assert.equal(after_called, true);

      done();
    });
  });
  describe("#invoke", function() {
    test_helper.it("should have a test", function(done) {
      var invoked = false;
      hooks.set_main({
        invoke_foo: function() {
          invoked = true;

        }
      });

      hooks.invoke("invoke_foo");
      assert.equal(invoked, true);
      done();
    });
  });
});
