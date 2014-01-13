"use strict";

var test_helper = require("superfluous").test_helper;
test_helper.init();
var assert = require("assert");

describe("Home Controller", function() {
  it("should render the index page", function(done) {
    test_helper.test_route("home", "index", [], function(rendered_page) {
      // we've only verified that it contains the words 'html' and 'superfluous', so
      // far...
      assert.notEqual(rendered_page.indexOf("html"), -1);
      assert.notEqual(rendered_page.indexOf("superfluous"), -1);
      done();
    });
  });
});
