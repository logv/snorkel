"use strict"

var test_helper = require("superfluous").test_helper;
test_helper.init();

var assert = require("assert");
describe("core/server/component.js", function() {
  var component = require_core("server/component");

  it("should install a $C global", function() {
    assert.notEqual(global.$C, null);
  });
});
