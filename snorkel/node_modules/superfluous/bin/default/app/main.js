"use strict";

module.exports = {
  setup_app: function() {
    console.log("Main setup stuff, something, something");
  },
  setup_request: function(req) {
    console.log("Handling request", req.path, req.query, req.params);
  },
  setup_plugins: function(app) {
    app.add_plugin_dir("app/plugins/slog");
    app.add_plugin_dir("app/plugins/tester");
  }
};
