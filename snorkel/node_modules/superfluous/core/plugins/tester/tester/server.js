"use strict";

var controller = require_core("server/controller");
// Helpers for serialized form elements
var value_of = controller.value_of,
    array_of = controller.array_of;
    

module.exports = {
  // If the controller has assets in its subdirs, set is_package to true
  is_package: true,
  routes: {
    "" : "index",
  },

  index: function(ctx, api) {
    var template_str = api.template.render("tester/tester.html.erb", {});
    var fs = require("fs");
    api.page.defer(function(done) {
      fs.readdir("app/controllers", function(err, dirs) {
        api.bridge.controller("tester", "run_controller_tests", dirs);
        done();
      });

    });

    api.page.defer(function(done) {
      fs.readdir("components/", function(err, dirs) {
        api.bridge.controller("tester", "run_component_tests", _.without(dirs, "template"));
        done();
      });
    });

    api.page.render({ content: template_str});
  },

  socket: function() {}
};
