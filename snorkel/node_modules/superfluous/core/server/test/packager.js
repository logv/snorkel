"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");
describe("core/server/packager.js", function() {
  var packager = require_core("server/packager");
  describe("#js", function() {
    test_helper.it("should have a test", function(done) {
      packager.js(["core/client/prelude"], function(ret) {
        assert.notEqual(ret, null);
        var pkg = ret['core/client/prelude'];
        assert.equal(pkg.type, 'js');
        assert.notEqual(pkg.code, null);
        assert.notEqual(pkg.signature, null);
        assert.equal(pkg.name, 'core/client/prelude');
        done();

      });
    });
  });
  describe("#less", function() {
    test_helper.it("should have a test", function(done) {
      packager.less(["styles/about"], function(ret) {
        assert.notEqual(ret, null);
        var pkg = ret['styles/about'];
        assert.equal(pkg.type, 'css');
        assert.notEqual(pkg.code, null);
        assert.notEqual(pkg.signature, null);
        assert.equal(pkg.name, 'styles/about');
        done();

      });
    });
  });
  describe("#scoped_less", function() {
    test_helper.it("should have a test", function(done) {
      packager.scoped_less("button", "components/button/button", function(ret) {
        assert.notEqual(ret, null);
        var pkg = ret['components/button/button'];
        assert.equal(pkg.type, 'css');
        assert.notEqual(pkg.signature, null);
        assert.equal(pkg.name, 'components/button/button');
        done();

      });
    });
  });
});
