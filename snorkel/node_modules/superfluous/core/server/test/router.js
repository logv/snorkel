"use strict";

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");

var app = require("connect")();
app.locals = {};
var router = require_core("server/router");

describe('router', function(){
  describe('#install()', function(){
    console.silent(function() {
      router.install(app);
    });

    test_helper.it('should add the router onto the app', function(){
      assert.notEqual(app.router, null);
    });

    test_helper.it('should install route handlers into the app', function(){
      assert.notEqual(app.get, null);
      assert.notEqual(app.post, null);
      assert.equal(app.qed, null);
    });
  });
});
