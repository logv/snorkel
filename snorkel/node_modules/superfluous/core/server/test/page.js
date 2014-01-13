"use strict";

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");

var app = require("connect")();
app.locals = {};

describe('page', function(){
  describe('#render', function(){
    it("should render a page", function(done) {
      test_helper.test_route('demo', "index", [], function(page_str){
        assert.notEqual(page_str, null);
        assert.notEqual(page_str.indexOf('demo'), -1);
        done();
      });
    });

  });

  describe('#async', function(){
    var page = require_core("server/page");
    test_helper.it('should return a placeholder', function(done){
      var ret = page.async(function() { })();
      assert.notEqual(ret, null);
      assert.equal(ret.length, 1);
      done();
    });

  });
});
