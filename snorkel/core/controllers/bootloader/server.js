var fs = require("fs");
var _ = require_vendor("underscore");
var template = require_core("server/template");
var page = require_core("server/page");
var context = require_core("server/context");
var packager = require_core("server/packager");
var Component = require_core("server/component");
var async = require("async");
var readfile = require_core("server/readfile");
var quick_hash = require_core("server/hash");
var less = require("less");

function multi_pack(dir, extension, prepack) {
  return function() {
    var req = context("req");
    var res = context("res");

    var loaded = {};
    var modules = JSON.parse(req.query.m);

    async.each(modules, function(module, done) {
      var filename = dir + "/" + module;

      // Does an unwind and prepack, technically
      if (prepack) {
        prepack([filename], function(data) {
          if (_.isObject(data)) {
            _.each(data, function(v, k) {
              if (dir) {
                loaded[k.replace(dir + "/", '')] = v;
              } else {
                loaded[k] = v;
              }
            });
          } else if (_.isString(data)) {
            loaded[module] = data;
          }

          done();
        });

      } else {
        fs.readFile(filename + "." + extension, function(err, data) {
          if (err) {
            data = template.render_core("helpers/missing_resource.html.erb", {
              name: module,
              file: filename,
              extension: extension
            });

          } else {
            data = data.toString();
          }

          loaded[module] = data;
          done();
        });

      }

    }, function resolution(err) {
      res.set("Content-Type", "application/json");
      res.write(JSON.stringify(loaded));
      res.end();
    });
  };
}

var js = multi_pack("", "js", packager.js);
var css = multi_pack("app/static/styles", "css", packager.less);


var js_prelude = function() {
  // Shrink wrap the prelude files
  var req = context("req");
  var res = context("res");

  var data = readfile("core/client/prelude.json");

  data = JSON.parse(data);
  res.set("Content-Type", "text/javascript");


  var contents = {};

  // The files need to be ordered properly
  async.each(data.vendor.concat(data.files),
    function(item, cb) {
      fs.readFile(item, function(err, data) {
        if (err) {
          console.log("Error reading", item);
          return cb();
        }

        var ret = data.toString();
        contents[item] = ret;

        cb();
      });
    },
    function(err) {
      _.each(data.vendor.concat(data.files), function(file) {
        res.write(contents[file]);
      });
      res.end();
    });
};

var get_status = function() {
  var res = context("res");
  res.write("OK");
  res.end();
}

var css_prelude = function() {
  var res = context("res");

  // Shrink wrap the prelude files
  var data = readfile("core/client/prelude.json");

  data = JSON.parse(data);
  res.set("Content-Type", "text/css");

  var css_datas = {};
  async.each(
    data.styles,
    function(file, cb) {
      fs.readFile(file, function(err, css_data) {
        if (!err) {
          less.render(css_data.toString(), function(err, data) {
            if (!err) {
              css_datas[file] = data;
            } else {
              console.log("Error lessing", file, ", sending uncompiled version");
              css_datas[file] = css_data.toString();
            }
          });
        } else {
          console.log("Error reading", file);
        }
      cb();
      });
    },
    function(err) {
      _.each(data.styles, function(file) {
        if (css_datas[file]) {
          res.write(css_datas[file]);
        }
      });
      res.end();
    });
}

var component = function() {
  var req = context("req");
  var res = context("res");

  var loaded = {};

  var modules = JSON.parse(req.query.m);
  async.each(
    modules,
    function(module, cb) {
      Component.build_package(module, function(ret) {
       loaded[module] = ret;
       cb();
      });
    }, function(err, results) {
      res.set("Content-Type", "application/json");

      res.end(JSON.stringify(loaded));
    });
}

function validate_versions(versions, socket) {
  _.each(versions.css, function(old_hash, css) {
    var hash = quick_hash(readfile("app/static/styles/" + css + ".css"));
    if (hash != old_hash) {
      socket.emit("update_version", 'css', css, old_hash, hash);
    }
  });
  _.each(versions.js, function(old_hash, js) {
    var hash = quick_hash(readfile(js + ".js"));
    if (hash != old_hash) { 
      socket.emit("update_version", 'js', js, old_hash, hash); 
    }
  });
  _.each(versions.pkg, function(old_hash, pkg) {
    Component.build_package(pkg, function(ret) {
      if (old_hash != ret.signature) { 
        socket.emit("update_version", 'pkg', pkg, old_hash, ret.signature); 
      }
    });
  });
}

module.exports = {
  js: js,
  css: css,
  js_prelude: js_prelude,
  css_prelude: css_prelude,
  component: component,
  get_status: get_status,
  validate_versions: validate_versions,

  routes: {
    "/status" : "get_status",
    "/css" : "css",
    "/js" : "js",
    "/component" : "component",
    "/prelude.js" : "js_prelude",
    "/prelude.css" : "css_prelude"
  }
}
