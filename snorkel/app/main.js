var auth = require_app("server/auth");
var perf = require_app("server/perf");

module.exports = {
  setup: function(options) {
    if (options.collector) {
      require_app("controllers/data/server").setup_collector();
    }


    perf.setup();
    auth.install();
  }
}
