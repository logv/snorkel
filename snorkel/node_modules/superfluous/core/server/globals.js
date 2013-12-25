var cwd = process.cwd();

function install() {
  global.require_root = function(path) {
    var root_path = cwd;
    return require(root_path + "/" + path);
  };

  global.require_core = function(path) {
    var root_path = __dirname + "/../";
    return require(root_path + path);
  };

  global.require_app = function(path) {
    var root_path = cwd + "/app/";
    return require(root_path + path);
  };

  global.require_vendor = function(path) {
    try {
      var root_path = "static/vendor/";
      return require_core(root_path + path);
    } catch (e) { }

    try {
      var root_path = "static/vendor/";
      return require_app(root_path + path);
    } catch (e) {
      console.log(e);
    }
  };

  var _debug = false;
  global.debug = function() {
    if (_debug) {
      console.log.apply(console, arguments);
    }
  }

  var Backbone = require_vendor("backbone");
  var _ = require_vendor("underscore");
  global.Backbone = Backbone;
  global._ = _;
}

module.exports = {
  install: install
};
