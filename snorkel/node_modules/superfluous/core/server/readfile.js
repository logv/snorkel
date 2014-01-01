/**
 * This module provides a simple synchronous readfile + caching mechanism.
 *
 * @class readfile (server)
 * @module Superfluous
 * @submodule Server
 */

"use strict";
var fs = require("fs");
var path = require("path");

var cached_files = {};
module.exports = function(file, options) {
  if (!cached_files[file]) {
    var ret = "";
    var paths = [ "" ];

    if (options && options.paths) {
      paths = paths.concat(options.paths);
    }

    _.each(paths, function(subpath) {
      if (ret) { return; }

      try {
        var file_name = path.join(subpath, file);
        ret = fs.readFileSync(file_name).toString();
        var watcher = fs.watch(file, function() {
          delete cached_files[file];
          watcher.close();
        });

      } catch(e) { 
      }

    });

    cached_files[file] = ret;
    return ret;

  }

  return cached_files[file];
};

var core_path = __dirname + "/../../";
// This is for letting us read core files...
module.exports.core = function(file) {
  return module.exports(core_path + file);
};

module.exports.app = module.exports;
module.exports.both = function(file) {
  // First, try to read from app. Then read from core
  // Need to go through the list of places to read files, actually...
  var ret;
  try {
    ret = module.exports.app(file);
  } catch(e) { }

  if (!ret) {
    try {
      ret = module.exports.core(file);
    } catch(e) { }
  }

  return ret;
};

var _paths = {
  "./" : true,
  "app/static" : true,
  "core/static" : true
};

module.exports.all = function(file) {
  var ret;
  _.each(_paths, function(v, include_path) {
    if (ret) {
      return;
    }

    var search_path = path.join(include_path, file);
    ret = module.exports(search_path);
  });
  

  return ret;

};

module.exports.register_path = function(subpath) {
  _paths[subpath] = true;
};
