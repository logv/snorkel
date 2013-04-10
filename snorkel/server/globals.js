function install() {
  global.require_root = function(path) {
    var root_path = "../";
    return require(root_path + path);
  };

  global.require_vendor = function(path) {
    var root_path = "static/scripts/vendor/";
    return require_root(root_path + path);
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
