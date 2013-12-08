(function() {
  var _injected_css = {};
  var _css_defs = {};
  var _modules = {};
  var _module_defs = {};
  var _template_defs = {};
  var _packages = {};
  var _signatures = {};
  var _versions = {
    pkg: {},
    js: {},
    css: {}
  };

  var SF = window.SF;
  var _blank_storage = {
    getItem: function() {},
    setItem: function() {}
  };
  var _storage = _blank_storage;
  var _component_storage = window.localStorage || _blank_storage;

  if (window._query.use_storage) {
    _storage = (window.localStorage || _storage);
  }
  if (window._query.skip_storage) {
    _storage = _blank_storage;
    _component_storage = _blank_storage;
  }

  window.SF.once("bridge/socket", function(socket) {
    socket.on("update_version", function(type, entry, old_hash, new_hash) {
      var component = _signatures[old_hash];
      delete _versions[type][old_hash];
      _versions[type][entry] = new_hash;
    });

    SF.trigger("validate/versions", socket);
  });

  window.SF.on("validate/versions", function(socket) {
    socket.emit("validate_versions", _versions, function(versions) {
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
    } catch(e) {}

    try {
      var versions = JSON.parse(_component_storage.getItem("_versions"));
      _.each(versions, function(def, type) {
        // Maybe?
        _.defaults(_versions[type], def);
        _.extend(_signatures, _.object(_.map(def, function(v, k) {
          return [v, k];
        })));
      });
    } catch(ee) {}

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
            console.log("CURRENT VERSION", current_version);
            var unparsed = localStorage.getItem(current_version);
            if (unparsed) {
              current_data = JSON.parse(unparsed);
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
    _.each(_versions, function(defs, type) {
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

  window._packages = _packages;

  var MODULE_PREFIX="var module = {}; (function() {\n";
  var MODULE_SUFFIX="})(); module.exports";

  function raw_import(str) {
    return eval(MODULE_PREFIX + str + MODULE_SUFFIX);
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

      var req = $.ajax("/pkg/" + type, {
        data: {
          m: JSON.stringify(necessary_modules)
        }
      });

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

  function define_package(component, definition) {
    var first_define = !_packages[component];

    if (!definition.schema.no_redefine || first_define) {
      _packages[component] = definition;

      // marshalling some JSONified code into code
      _packages[component].exports = raw_import(definition.main);
      _packages[component].events = raw_import(definition.events);
    }
  }

  function bootload_pkg(packages, cb) {
    if (_.isString(packages)) {
      packages = [packages];
    }

    var loaded_modules = {};
    var necessary_packages = _.reject(packages, function(k) {
      loaded_modules[k] = _packages[k];
      return _packages[k];
    });

    var really_necessary = [];
    // Gotta see if we have this package version saved in _storage somewhere
    _.each(packages, function(pkg) {
      if (_versions.pkg[pkg] && _component_storage.getItem(_versions.pkg[pkg])) {
        var definition = _component_storage.getItem(_versions.pkg[pkg]);

        if (definition) {
          bootloader.from_storage.pkg[pkg] = _versions.pkg[pkg];
          define_package(pkg, JSON.parse(definition));

          loaded_modules[pkg] = _packages[pkg];

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

    var req = $.ajax("/pkg/component", {
      data: {
        m: JSON.stringify(really_necessary)
      }
    });

    req.done(function(data) {
      _.each(data, function(v, k) {

        if (v.signature) {
          _versions.pkg[k] = v.signature;
          _signatures[v.signature] = k;
          if (!_component_storage.getItem(v.signature)) {
            _component_storage.setItem(v.signature, JSON.stringify(v));
          }
        }

        define_package(k, v);
        loaded_modules[k] = _packages[k];

      });

      if (cb) {
        cb(loaded_modules);
      }
    });
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
      _modules[module] = raw_import(_module_defs[module]);
      if (cb) {
        cb(_modules[module]);
      }
    } else {
      bootloader.js([module], function() {
        // race to evaluate! but only once
        if (!_modules[module]) {
          var data = raw_import(_module_defs[module]);
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
    css: bootload_factory("css", _css_defs, inject_css),
    inject_css: inject_css,
    js: bootload_factory("js", _module_defs),
    pkg: bootload_pkg,
    defs: _module_defs,
    css_defs: _css_defs,
    modules: _modules,
    require: require_js,
    deliver: deliver_pagelet,
    versions: _versions,
    signatures: _signatures,
    from_storage: {
      js: {},
      css: {},
      pkg: {}
    }
  };

  window.bootloader = bootloader;
  window.require = bootloader.require;


}());
