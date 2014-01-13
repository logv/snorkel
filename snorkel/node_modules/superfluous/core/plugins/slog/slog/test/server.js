"use strict";

var test_helper = require("superfluous").test_helper;
test_helper.init();
var assert = require("assert");

describe("Slog Controller", function() {
  it("should render the index page", function(done) {
    test_helper.test_route("slog", "index", [], function(rendered_page) {
      // we've only verified that it contains the words 'html' and 'superfluous', so
      // far...
      assert.notEqual(rendered_page.indexOf("REDIRECT"), -1);
      done();
    });
  });
});
