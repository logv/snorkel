var config = require_core("server/config");

module.exports = {
  install: function() {
    var plugin_dir = config.data_dir + "app/plugins/";

    function require_plugin(mod) {
      return require(plugin_dir + mod);
    }

    function require_common(mod) {
      if (config.data_dir != ".") {
        return require(mod);
      }

      return require_root(mod);
    }


    global.require_plugin = require_plugin;
    global.require_common = require_common;

  }

};
