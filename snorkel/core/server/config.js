var _config = {};

var env = process.env.ENV;

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

console.log("CONFIG:", _config);
module.exports = Object.freeze(_config);
