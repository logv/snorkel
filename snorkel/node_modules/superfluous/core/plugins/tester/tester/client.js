"use strict";

require("$ROOT/tester/static/assert");
require("core/client/component");

var run_mocha = _.debounce(function() {
  localStorage.clear();

  if (window.mochaPhantomJS) {
    window.mochaPhantomJS.run();
  } else {
    window.mocha.run();
  }


}, 100);

function run_tests(test_requires) {
  window.bootloader.js(test_requires, function() {
    _.each(test_requires, function(f) {
      window.require(f);
    });

    run_mocha();
  });
}

module.exports = {
  init: function() {
    window.mocha.setup('bdd');
    window.mocha.ui('bdd');
    window.mocha.reporter('html');
  },
  run_controller_tests: function(tests) {
    run_tests(_.map(tests, function(t) {
      return "$ROOT/" + t + "/test/client";
    }));
  },
  run_component_tests: function(tests) {
    run_tests(_.map(tests, function(t) {
      return "components/" + t + "/test/client";
    }));

  },
  run_tests: function(tests) {
  }
};
