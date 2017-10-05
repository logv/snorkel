var fs = require("fs");
var readfile = require_core("server/readfile");
var plugin = require_core("server/plugin");

var config = require_core("server/config");

var SNORKEL_CONFIG_DIR = config.config_dir;
var DATASET_CONFIG_DIR = config.dataset_config_dir;

function getDirs(dir){
    dirs_ = [];
    var files = fs.readdirSync(dir);
    for (var i in files){
        var name = dir + '/' + files[i];
        if (fs.statSync(name).isDirectory()){
						dirs_.push(name);
        }
    }
    return dirs_;
}

module.exports = {
  install: function() {

    try {
      var plugin_dirs = getDirs(config.data_dir + "/app/plugins");
      readfile.register_path(config.data_dir + "/app/plugins");
    } catch(e) {
      console.log("CANT LOAD PLUGINS IN", config.data_dir, "app/plugins");
      return
    }

    // TODO: this loop does nothing, since we don't actually need to scan the
    // list of plugins that exist, at the moment. any plugins placed in
    // app/plugins/ that have controllers can be enabled through routes.json
    // inside one of these plugin dirs, which uses superfluous' plugin system
    _.each(plugin_dirs, function(plugin_dir) {
      if (plugin_dir == DATASET_CONFIG_DIR || plugin_dir == SNORKEL_CONFIG_DIR) {
        return;
      }
    });
  },
  get_views_for_table: function get_plugin_views(table) {
    var view_config = module.exports.get_config(table);
    // now we need to look through the plugins and see which
    // plugin views are enabled
    var plugin_views = view_config.included_views;

    return plugin_views;
  },

  get_excluded_views_for_table: function(table) {
    var view_config = module.exports.get_config(table);

    var ev = view_config.excluded_views;
    if (_.isArray(ev)) {
      return ev;
    }

    if (_.isObject(ev)) {
      return _.keys(ev);
    }

    return ev || [];
  },

  get_solo_views_for_table: function(table) {
    var view_config = module.exports.get_config(table);

    var ev = view_config.exclusive_views;

    return ev;

  },

  // A config is applied like so:
  // the ALL config is first retrieved
  // then the dataset specific config is overlaid on it
  // if the dataset config is missing, the default config is overlaid.
  //
  // it will look like: all_config + (dataset_config or default_config),
  // where keys from all are replaced by keys from dataset_config
  get_config: function get_plugin_configs(table) {
    var plugin_config;


    var all_config = {};
    try {
      var plugin_configs = require_common(DATASET_CONFIG_DIR);
      var all_config = plugin_configs.all || {};
      plugin_config = plugin_configs[table];
      if (!plugin_config) {
        if (_.isFunction(plugin_configs.get_config)) {
          plugin_config = plugin_configs.get_config(table);
        } else {
          plugin_config = plugin_configs['default'];
        }
      }
    } catch(e) {
      if (config.debug_plugins) {
        console.log("PLUGINS: Couldnt load plugin config for table", table, ":" + e);
      }
    }

    return _.extend(all_config, plugin_config || {});

  }
};
