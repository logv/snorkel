"use strict";

var fs = require("fs");
var module_grapher = require("module-grapher");
var async = require("async");
var _ = require_vendor("underscore");
var less = require("less");
var quick_hash = require_core("server/hash");

function package_less(includes, cb) {
  var included = _.map(includes, function(s) { return s.trim(); });

  var ret = {};
  async.each(included, function(module, done) {
    fs.readFile(module + ".css", function(err, data) {
      if (!err) {
        var hash = quick_hash(data.toString());
        less.render(data.toString(), function(err, css) {
          ret[module] = {
            code: css,
            signature: hash
          };
          done();
        });
      } else {
        done();
      }
    });

  }, function(err) {
    cb(ret);
  });
}

function package_and_scope_less(component, module, cb) {
  var ret = {};
  fs.readFile(module + ".css", function(err, data) {
    var module_css = "[data-cmp=" + component + "] {\n";
    var module_end = "\n}";
    var hash = quick_hash(data.toString());
    less.render(module_css + data.toString() + module_end, function(err, css) {
      ret[module] = {
        code: css,
        signature: hash
      };

      cb(ret);
    });
  });

}

function package_js(includes, cb) {
  var included = _.map(includes, function(s) { return s.trim(); });
  var excluded = [];


  var definition = {
    baseUrl: "./",
    include: included,
    out: "tmp-build",
    optimize: "uglify",
    excludeShallow: excluded
  };


  var ret = {};
  _.each(included, function(inc) {
    module_grapher.graph(inc, {
        paths: [ './', './static' ]
      }, function(__, resolved) {
        if (!resolved || !resolved.modules) {
          console.log(__);
          return cb("console.log('Error loading module " + inc + "');");
        }

        // each works on arrays, not objects
        var modules = _.map(resolved.modules, function(v, k) { return v; });
        async.each(
          modules,
          function(module, done) {
            fs.readFile(module + ".js", function(err, data) {
              if (err) {
                console.log("TROUBLE READING", module);
              } else {
                var read = data.toString();
                ret[module] = {
                  code: read,
                  signature: quick_hash(read)
                };
              }
              done();
            });
          },
          function(err) {
            cb(ret);
          });
      });
  });

}

module.exports = {
  js: package_js,
  less: package_less,
  scoped_less: package_and_scope_less
}
