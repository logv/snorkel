"use strict";

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");

var context = require_core("server/context");

var app = require("connect")();
app.locals = {};

describe('bridge', function(){
  var bridge = require_core("server/bridge");
  describe('#call()', function(){
    test_helper.it('should enqueue a call in BRIDGE_CALLS', function(done){
      context.reset("BRIDGE_CALLS");
      var calls = context("BRIDGE_CALLS");
      assert.equal(calls.length, 0);
      bridge.call("foo", "bar", "baz", "bog");
      calls = context("BRIDGE_CALLS");
      assert.equal(calls.length, 1);
      assert.equal(calls[0][0], 'foo');
      assert.equal(calls[0][1], 'bar');
      assert.equal(calls[0][2].length, 2);
      done();
    });

  });

  describe('#controller()', function(){
    test_helper.it('should enqueue a call in BRIDGE_CALLS', function(done){
      context.reset("BRIDGE_CALLS");
      var calls = context("BRIDGE_CALLS");
      assert.equal(calls.length, 0);
      bridge.controller("foo", "bar", "baz", "bog");
      calls = context("BRIDGE_CALLS");
      assert.equal(calls.length, 1);
      assert.equal(calls[0][0], 'core/client/controller');
      assert.equal(calls[0][1], 'call');
      assert.equal(calls[0][2].length, 5);
      done();
    });
  });
  describe('#raw()', function(){
    test_helper.it('should write directly to the stream', function(){
      var _raw;
      context("stream", {
        write: function(str) {
        _raw = str;
        }
      });

      bridge.raw("FOO");
      assert.equal(_raw, "<script>FOO </script>");
    });

  });
});
