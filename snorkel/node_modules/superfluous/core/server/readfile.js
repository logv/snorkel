"use strict";
var fs = require("fs");
var path = require("path");

var cached_files = {};
module.exports = function(file) {
  if (!cached_files[file]) {
    var filedata;
    try {
      filedata = fs.readFileSync(file).toString();
    } catch(e) {
      return "";
    }

    var watcher = fs.watch(file, function(event, filename) {
      delete cached_files[file];
      watcher.close();
    });

    cached_files[file] = filedata;
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
  var ret;
  try {
    ret = module.exports.app(file);
  } catch(e) { }
  if (!ret) {
    try {
      ret = module.exports.core(file);
    } catch(e) { };
  }

  return ret;
}
