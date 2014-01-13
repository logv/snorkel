"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();
var readfile = require_core("server/readfile");

var assert = require("assert");
describe("core/server/route_collector.js", function() {
  var Controllers = JSON.parse(readfile("routes.json"));
  var route_collector = require_core("server/route_collector");
  describe("#get_path", function() {
    test_helper.it("should have a test", function(done) {
      console.suppress();
      route_collector.collect(Controllers);
      console.restore();
      var about_path = route_collector.get_path("about");
      assert.equal(about_path, "/about");
      done();
    });
  });
  describe("#collect", function() {
    test_helper.it("should have a test", function(done) {
      console.suppress();
      route_collector.collect(Controllers);
      console.restore();
      var about_path = route_collector.get_path("about");
      var demo_path = route_collector.get_path("demo");
      assert.equal(about_path, "/about");
      assert.equal(demo_path, "/demo");
      done();
    });
  });
  describe("#get_packaged_controllers", function() {
    test_helper.it("should have a test", function(done) {
      console.silent(function() {
        route_collector.collect(Controllers);
      });
      var pkgs = route_collector.get_packaged_controllers();
      assert.equal(_.contains(pkgs, "about"), true);
      assert.equal(_.contains(pkgs, "kitten"), true);
      assert.equal(_.contains(pkgs, "demo"), false);
      assert.equal(_.contains(pkgs, "react_demo"), false);
      done();
    });
  });
});
