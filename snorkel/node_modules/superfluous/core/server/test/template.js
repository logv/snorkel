"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");
describe("core/server/template.js", function() {
  var template = require_core("server/template");
  var context = require_core("server/context");
  var hooks = require_core("server/hooks");
  var main = {};
  hooks.set_main(main);
  describe("#load", function() {
    test_helper.it("should have a test", function(done) {
      var tl = template.load("helpers/bridge_payload.html.erb");
      assert.notEqual(tl, null);
      assert.notEqual(tl, "");
      done();
    });
  });
  describe("#render", function() {
    context("router", {
      build: function() {

      }
    });
    test_helper.it("should have a test", function(done) {
      var str = template.render("helpers/js_link.html.erb", { path: "tonowhere" });
      assert.notEqual(str, null);
      assert.notEqual(str.indexOf("tonowhere"), -1);
      done();
    });
  });
  describe("#render_core", function() {
    test_helper.it("should have a test", function(done) {
      var str = template.render_core("helpers/js_link.html.erb", { path: "tonowhere" });
      assert.notEqual(str, null);
      assert.notEqual(str.indexOf("tonowhere"), -1);
      done();
    });
  });
  describe("#partial", function() {
    test_helper.it("should have a test", function(done) {
      var str = template.partial("demo/index.html.erb", { path: "tonowhere" });
      assert.notEqual(str, null);
      assert.equal(str.indexOf("tonowhere"), -1);
      done();
    });
  });
  describe("#add_stylesheet", function() {
    test_helper.it("should have a test", function(done) {
      context.reset("CSS_DEPS", {});
      template.add_stylesheet("foo");
      assert.equal(context("CSS_DEPS").foo, true);
      assert.notEqual(context("CSS_DEPS").bar, true);
      done();
    });
  });
  describe("#add_javascript", function() {
    test_helper.it("should have a test", function(done) {
      context.reset("JS_DEPS", {});
      template.add_javascript("foo");
      assert.equal(context("JS_DEPS").foo, true);
      assert.notEqual(context("JS_DEPS").bar, true);
      done();
    });
  });
  describe("#js_header", function() {
    test_helper.it("should have a test", function(done) {
      var str = template.js_header();
      assert.notEqual(str, null);
      assert.equal(str.indexOf("tonowhere"), -1);
      assert.notEqual(str.indexOf("prelude.js"), -1);
      done();
    });
  });
  describe("#css_header", function() {
    test_helper.it("should have a test", function(done) {
      var str = template.css_header();
      assert.notEqual(str, null);
      assert.equal(str.indexOf("tonowhere"), -1);
      assert.notEqual(str.indexOf("prelude.css"), -1);
      done();
    });
  });
  describe("#socket_header", function() {
    test_helper.it("should have a test", function(done) {
      var Primus = require("primus.io");
      var socket = require_core("server/socket");
      var http = require("http");
      var server = http.createServer();
      socket.set_primus(new Primus(server, { transformer: 'socket.io' }));

      // Need to figure this out?
      var str = template.socket_header("foo");
      assert.notEqual(str, null);
      assert.equal(str.indexOf("tonowhere"), -1);
      assert.notEqual(str.indexOf("/pkg/socket"), -1);
      done();
    });
  });
  describe("#setup_context", function() {
    test_helper.it("should have a test", function(done) {
      var ret = template.setup_context({ baz: true });
      assert.equal(ret.baz, true);
      done();
    });
  });
});
