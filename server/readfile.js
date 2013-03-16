"use strict";
var fs = require("fs");

var cached_files = {};
module.exports = function(file) {
  if (!cached_files[file]) {
    var filedata = fs.readFileSync(file).toString();

    var watcher = fs.watch(file, function(event, filename) {
      delete cached_files[file];
      watcher.close();
    });

    cached_files[file] = filedata;
  }

  return cached_files[file];
};
