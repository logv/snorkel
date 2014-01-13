"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");
var component = require_core("server/component");

describe('TEMPLATE', function(){
  test_helper.setup_server(function() {
    component.build('TEMPLATE', {}, function(cmp) {
      describe('#initialize()', function(){
        it('should initialize the component', function(){
          assert.notEqual(cmp, null);
        });
      });
    });

    component.build('TEMPLATE', {}, function(cmp) {
      describe('#client()', function(){
        it('should initialize the component on the client', function(){
          assert.notEqual(cmp.$el.html(), null);
        });
      });
    });
  });
});
