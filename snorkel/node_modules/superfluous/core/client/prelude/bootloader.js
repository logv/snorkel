/**
 * @module Superfluous
 * @submodule Client
 */
"use strict";

/**
 * The bootloader is responsible for managing the assets on the page. It
 * exposes an API to load javascript, styles and components asynchronously and run
 * a callback when they are loaded.
 *
 *
 * @class bootloader (client)
 */

(function() {
  var _injected_css = {};
  var _css_defs = {};
  var _modules = {
    // blacklisted modules
    util: {},
    stream: {},
    url: {}
  };
  var _module_defs = {};
  var _signatures = {};
  var _versions = { };

  var SF = window.SF;
  var _blank_storage = {
    getItem: function() {},
    setItem: function() {}
  };
  var _storage = _blank_storage;
  var _component_storage = _blank_storage;

  if (window.localStorage) {
    console.log("Caching components in LocalStorage");
    _component_storage = window.localStorage;
  }

  if (window._query.use_storage) {
    _storage = (window.localStorage || _storage);
  }
  if (window._query.skip_storage) {
    _storage = _blank_storage;
    _component_storage = _blank_storage;
  }

  window.SF.once("bridge/socket", function(socket) {
    socket.on("update_version", function(type, entry, old_hash, new_hash) {
      console.log("Updated version", type, entry, old_hash, new_hash);
      delete _versions[type][old_hash];
      delete _versions[type][entry];

      try {
        localStorage.removeItem(old_hash);
      } catch(e) {}

      if (new_hash) {
        _versions[type][entry] = new_hash;
      }
    });

    SF.trigger("validate/versions", socket);
  });

  window.SF.on("validate/versions", function(socket) {
    socket.emit("__validate_versions", _versions, function() {
      SF.trigger("updated_versions");
    });
  });

  // When pulling info out of localStorage...
  // if we see a version for a pkg we already have, we reset it's value once
  // the next time we read it, if it is the same value, we use that value
  function sync_metadata() {

    try {
      var signatures = JSON.parse(_component_storage.getItem("_signatures"));
      _.defaults(_signatures, signatures);
    } catch(e) {
      console.log(e); 
      console.trace();
    }

    try {
      var versions = JSON.parse(_component_storage.getItem("_versions"));
      _.each(versions, function(def, type) {
        // Maybe?
        if (!_versions[type]) {
          _versions[type] = {};
        }

        _.defaults(_versions[type], def);
        _.extend(_signatures, _.object(_.map(def, function(v, k) {
          return [v, k];
        })));
      });
    } catch(ee) {
      console.log(ee); 
      console.trace();
    }

  }

  function sync_storage() {

    // remove old keys
    var key;
    for (key in localStorage) {
      if (key === "_versions" || key === "_signatures") {
        continue;
      }

      if (!_signatures[key] ) {
        try {
          var item = localStorage.getItem(key);
          if (!item) {
            localStorage.removeItem(key);
            return;
          }

          var parsed = JSON.parse(item);
          var type = parsed.type;
          var name = parsed.name;
          var ts = parsed.timestamp;
          if (type && name) {
            var current_version = _versions[type][name];
            console.log("Current version of", name, "is", current_version);
            var unparsed = localStorage.getItem(current_version);
            if (unparsed) {
              var current_data = JSON.parse(unparsed);
              var current_ts = current_data.timestamp;
              if (ts > current_ts) {
                _versions[type][name] = parsed.signature;
                _signatures[parsed.signature] = unparsed;
                localStorage.removeItem(current_version);
                console.log("Upgrading in memory version of", name, "due to old timestamp", parsed.signature);

                return;
              }
            }

            console.log("Expiring old localStorage entry", key, name);
          }

          localStorage.removeItem(key);
        } catch(e) {
          console.log(e);
          localStorage.removeItem(key);
        }
      }

    }

    // write metadata
    _component_storage.setItem("_versions", JSON.stringify(_versions));

    // sync versions and signatures to our known ones
    _signatures = {};
    _.each(_versions, function(defs) {
      _.each(defs, function(v, k) {
        _signatures[v] = k;
      });
    });

    _component_storage.setItem("_signatures", JSON.stringify(_signatures));

  }

  // We need to sync our _versions with server versions
  setInterval(sync_storage, 3000);
  sync_metadata();
  sync_storage();

  if (window._query.clear_storage) {
    console.log("Clearing Storage");
    localStorage.clear();
  }

  var MODULE_PREFIX="var module = {}; (function() {\n";
  var MODULE_SUFFIX="})(); module.exports";

  function raw_import(str, module_name) {

    var toval = "";
    if (module_name) {
      toval = "//# sourceURL=" + module_name + ".js\n";
    }
    toval += MODULE_PREFIX + str + MODULE_SUFFIX;

    return eval(toval);
  }

  function load_def_from_storage(module_dict, module, version, type, postload) {
    var defs = _storage.getItem(version);

    if (defs) {
      try {
        defs = JSON.parse(defs);
      } catch(e) {
        _storage.setItem(version, null);
        return;
      }

      if (_.isObject(defs)) {
        if (!module_dict[module]) {
          bootloader.from_storage[type][module] = version;
          if (postload) {
            defs.code = postload(module, defs.code);
          }

          module_dict[module] = defs.code;
        }
      }
    }
  }

  function bootload_factory(type, module_dict, postload) {
    return function(modules, cb) {
      if (bootloader.__use_storage && _storage === _blank_storage) {
        console.log("Caching assets in LocalStorage");
        _storage = _component_storage;
      }

      if (_.isString(modules)) {
        modules = [modules];
      }

      var loaded_modules = {};
      var necessary_modules = _.filter(modules, function(k) {
        if (!module_dict[k]) {
          var version = _versions[type][k];
          if (version) { load_def_from_storage(module_dict, k, version, type, postload); }
        }

        if (module_dict[k]) {
          loaded_modules[k] = module_dict[k];
        }

        // Let's see if we can load these modules from localStorage

        return !module_dict[k];
      });

      if (!necessary_modules.length) {
        if (cb) {
          cb(loaded_modules);
        }

        return;
      }

      var config = {
        data: {
          m: JSON.stringify(necessary_modules)
        }
      };

      if (bootloader.__release) {
          config.data.h = bootloader.__release;
      }


      var req = $.ajax("/pkg/" + type, config);

      req.done(function(data) {
        var versions = {};
        if (module_dict) {
          _.each(data, function(v, k) {

            v.module = k;
            if (v.signature) {
              _storage.setItem(v.signature, JSON.stringify(v));
              versions[k] = v.signature;
            }

            if (postload) {
              v.code = postload(k, v.code);
            }

            loaded_modules[k] = v.code;
          });

          _.extend(module_dict, loaded_modules);
          if (!_versions[type]) {
            _versions[type] = {};
          }

          _.extend(_versions[type], versions);
          _.extend(_signatures, _.object(_.map(versions, function(k, v) { return [k, v]; })));
        }

        if (cb) {
          cb(data);
        }
      });

      req.fail(function(data) {
        console.error("Failed to load", data);
      });

      req.always(function() {

      });
    };
  }

  function package_factory(type, module_dict, postload) {
    return function(packages, cb) {
      if (_.isString(packages)) {
        packages = [packages];
      }

      var loaded_modules = {};
      var necessary_packages = _.reject(packages, function(k) {
        loaded_modules[k] = module_dict[k];
        return module_dict[k];
      });

      var really_necessary = [];
      // Gotta see if we have this package version saved in _storage somewhere
      _.each(necessary_packages, function(pkg) {
        if (_versions[type][pkg] && _component_storage.getItem(_versions[type][pkg])) {
          var definition = _component_storage.getItem(_versions[type][pkg]);

          if (definition) {
            bootloader.from_storage[type][pkg] = _versions[type][pkg];
            postload(pkg, JSON.parse(definition));

            loaded_modules[pkg] = module_dict[pkg];

            return;
          }
        }

        really_necessary.push(pkg);
      });

      if (!really_necessary.length) {
        if (cb) {
          cb(loaded_modules);
        }
        return;
      }

      var config = {
        data: {
          m: JSON.stringify(really_necessary)
        }
      };

      if (bootloader.__release) {
          config.data.h = bootloader.__release;
      }

      var req = $.ajax("/pkg/" + type, config);

      req.done(function(data) {
        _.each(data, function(v, k) {

          if (v.signature) {
            _versions[type][k] = v.signature;
            _signatures[v.signature] = k;
            if (!_component_storage.getItem(v.signature)) {
              _component_storage.setItem(v.signature, JSON.stringify(v));
            }
          }

          postload(k, v);
          loaded_modules[k] = module_dict[k];

        });

        if (cb) {
          cb(loaded_modules);
        }
      });
    };
  }

  function register_component_packager(name, def_dict, postload) {
    if (!_versions[name]) {
      _versions[name] = {};
    }
    if (!bootloader.from_storage[name]) {
      bootloader.from_storage[name] = {};
    }
    var factory = package_factory(name, def_dict, postload);
    window.bootloader[name] = factory;
  }

  function register_resource_packager(name, def_dict, postload) {
    if (!_versions[name]) {
      _versions[name] = {};
    }
    if (!bootloader.from_storage[name]) {
      bootloader.from_storage[name] = {};
    }
    var factory = bootload_factory(name, def_dict, postload);
    window.bootloader[name] = factory;
  }

  var _controllers = {};
  var _pending;
  function get_controller(name, cb, signature) {
    var name = name || bootloader.__controller_name;
    signature = signature || bootloader.__controller_hash;

    if (!signature) {
      console.trace();
    }

    if (_controllers[name]) {
      if (cb) { cb(_controllers[name]); }
      return _controllers[name];
    }

    var controller = {
      name: name
    };

    if (_pending) {
      _pending.push(cb);
      return controller;
    }

    _pending = [ cb ];

    bootloader.require("app/controllers/" + name + "/client", function(mod) {
      var ViewController = Backbone.View.extend(mod);
      var instance = new ViewController();

      _.extend(instance, Backbone.Events);

      _.extend(controller, instance);
      controller.emit = function() {
        var socket = SF.socket();
        return socket.emit.apply(socket, arguments);
      };

      // TODO: wishful thinking that this gets everyone
      _controllers[name] = controller;
      _modules["app/controllers/" + name + "/client"] = controller;

      _.each(_pending, function(cb) {
        if (cb) {
          cb(controller);
        }
      });
    }, signature);

    controller.name = name;
    window.controller = controller;
    return controller;
  }

  function require_js(module, cb, signature) {
    if (_modules[module]) {
      if (cb) {
        cb(_modules[module]);
      }

      return _modules[module];
    }

    var version = signature || _versions.js[module];
    if (!_module_defs[module]) {
      if (version) {
        load_def_from_storage(_module_defs, module, version, "js");
      }
    }

    if (_module_defs[module]) {
      _modules[module] = raw_import(_module_defs[module], module);
      if (cb) {
        cb(_modules[module]);
      }
    } else {
      bootloader.js([module], function() {
        // race to evaluate! but only once
        if (!_modules[module]) {
          var data = raw_import(_module_defs[module], module);
          _modules[module] = data;
        }

        if (cb) {
          cb(_modules[module]);
        }
      });
    }

    return _modules[module];
  }

  function inject_css(name, css) {
    if (_injected_css[name]) {
      return css;
    }

    var stylesheetEl = $('<style type="text/css" media="screen"/>');
    stylesheetEl.text(css);
    stylesheetEl.attr("data-name", name);

    $("head").append(stylesheetEl);
    _injected_css[name] = true;

    return css;
  }

  function strip_comment_wrap(str) {
    var chars = str.length;
    chars -= "&lt;!--".length;
    chars -= "--&gt;".length;

    str = str.replace(/^\s*/, "");
    str = str.replace(/\s*$/, "");

    var ret= str.substr("&lt;!--".length, chars);
    // Decoding from HTML
    ret = $('<div />').html(ret).text();

    return ret;
  }

  function deliver_pagelet(options) {
    var el = document.getElementById(options.id);

    function insert_pagelet() {
      var payload_el = document.getElementById("pl_" + options.id);

      if (payload_el) {
        var payload_data = payload_el.innerHTML;

        var payload = strip_comment_wrap(payload_data);

        $(el).hide();
        $(el).html(payload);
      }
    }

    function display_pagelet() {
      // Instead of asking element to fadeIn alone,
      // also add a style to the page
      var id = $(el).attr("id");

      if (!id) {
        id = _.uniqueId("pd_");
        $(el).attr('id', id);
      }

      inject_css("_display_" + options.id, "#" + id + "{ display: block !important; }");
    }




    if (options.css && options.css.length) {
      insert_pagelet();
      bootloader.css(options.css, function() {
        // Delay the pagelet display ~10ms until the next browser work cycle,
        // so CSS can hopefully be parsed by then.
        display_pagelet();
      });
    } else {
      insert_pagelet();
      display_pagelet();
    }

  }


  SF.controller =  get_controller;

  var bootloader = {
    raw_import: raw_import,
    /**
     * @method inject_css
     */
    inject_css: inject_css,
    defs: _module_defs,
    css_defs: _css_defs,
    modules: _modules,

    /**
     * Load a javascript module.  (works like require.js)
     *
     * @method require
     */
    require: require_js,

    /**
     * Inserts an asynchronous pagelet into the page
     *
     * @method deliver
     * @private
     */
    deliver: deliver_pagelet,
    versions: _versions,
    signatures: _signatures,
    sync: function() {
      sync_metadata();
      sync_storage();
    },
    from_storage: { },
    register_component_packager: register_component_packager,
    register_resource_packager: register_resource_packager
  };

  window.bootloader = bootloader;
  window.require = bootloader.require;

  /**
   * Bootload in a css file or array of css files
   * @method css
   */
  register_resource_packager('css', _css_defs, inject_css);
  /**
   * Bootload in a js file or array of js files
   * @method js
   */
  register_resource_packager('js', _module_defs);

  console.log(_versions);

}());
