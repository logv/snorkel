"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");
describe("core/server/console.js", function() {
  describe("#install", function() {
    var console_mod = require_core('server/console');
    console_mod.install();

    test_helper.it("should have a test", function(done) {
      assert.notEqual(global.console.log_no_ts, null);
      assert.notEqual(global.console.log, null);
      done();
    });

    console_mod.uninstall();
  });
});
