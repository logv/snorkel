/**
 * This module loads the configuration for the superfluous app. 
 *
 * It first loads config/config.js for a base set of configuration options.
 * It then loads config/override.js for any local overrides (this file should be placed .gitignore)
 * It then loads config/${ENV}.js (this should be something like 'localhost', 'production', etc
 *
 * When requiring this module, the cascading objects will be available as
 * properties on it.
 *
 * @class config (server)
 * @module Superfluous
 * @submodule Server
 **/

var _config = {};

var env = process.env.ENV;
var RELEASE = process.env.RELEASE;

if (!RELEASE) {
  console.log("WARNING: Running server without a $RELEASE - assets will be served in development mode!");

}

var base_config = require_root("config/config");

_.extend(_config, base_config);

var override;

try {
  override = require_root("config/override");
  _.extend(_config, override);
  console.log("Using custom overrides in config/override");
} catch(e) {
}

if (env) {
  try {
    override = require_root("config/" + env);
    _.extend(_config, override);
    console.log("Using custom overrides in config/" + env);
  } catch(e) {
    console.log("Couldn't load Environment config from config/" + env);
  }
}

_config.RELEASE = RELEASE;
var cwd = process.cwd();
var path = require("path");
_config.APP_DIR = path.join(cwd, "app");
_config.CORE_DIR = path.relative(cwd, path.join(__dirname, ".."));

console.log("CONFIG:", _config);
module.exports = Object.freeze(_config);
