// Keep it small
(function() {
  function hideAddressBar() {

    var width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
    if (width < 768) {
      if (document.documentElement.scrollHeight<window.outerHeight/window.devicePixelRatio) {
        document.documentElement.style.height=(window.outerHeight/window.devicePixelRatio)+'px';
      }

      setTimeout(window.scrollTo(1,1),0);

    }
  }

  $(function() {
    console.log("Bring forth the SF (prelude loaded)");
  });

  $(function() {
    var fc = new FastClick(window.document.body);
    hideAddressBar();
    window.addEventListener("orientationchange", hideAddressBar);
  });


  var MODULE_PREFIX="var module = {}; (function() {\n";
  var MODULE_SUFFIX="})(); module.exports";

  function raw_import(str) {
    return eval(MODULE_PREFIX + str + MODULE_SUFFIX);
  }

  var _css_defs = {};
  var _modules = {};
  var _module_defs = {};
  var _template_defs = {};
  var _packages = {};
  window._packages = _packages;

  window.debug = function() {

  };
  // Backbone must have run by now
  Backbone.$ = window.jQuery;


  var _store = {};

  function data_getter(k, ns) {
    ns = ns || SF.controller().name;

    _store[ns] = _store[ns] || {};
    return _store[ns][k];
  }

  function data_setter(k, v, ns) {
    ns = ns || SF.controller().name;
    _store[ns] = _store[ns] || {};
    _store[ns][k] = v;

    SF.inform("update:" + k, v);
  }

  // Very hard to over-ride
  function data_subscriber(k, cb) {
    var ns = SF.controller().name;
    _store[ns] = _store[ns] || {};

    $(function() {
      if (_store[ns][k]) {
        // wait for doc ready
          cb(_store[ns][k]);
      }
    });

    SF.subscribe("update:" + k, cb);
  }

  // tells the server to store some data for us, too.
  // this is a first come, first served type of thing, btw.
  function data_store(k, v, ns) {
    SF.socket().emit("store", {
      key: k,
      value: v,
      controller: ns || SF.controller().name });
  }

  function data_sync(data) {
    data_setter(data.key, data.value, data.controller);
  }

  function bootload_factory(type, _dict, postload) {
    return function(modules, cb) {
      if (_.isString(modules)) {
        modules = [modules];
      }

      var loaded_modules = {};
      var loading_modules = {};
      var necessary_modules = _.filter(modules, function(k) {
        if (loaded_modules[k]) {
          loaded_modules[k] = _dict[k];
        }

        return !_dict[k];
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
        if (_dict) {
          _.each(data, function(v, k) {

            if (postload) {
              v = postload(k, v);
            }

            loaded_modules[k] = v;
          });

          _.extend(_dict, loaded_modules);
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

  function bootload_pkg(packages, cb) {
    if (_.isString(packages)) {
      packages = [packages];
    }

    var loaded_modules = {};
    var necessary_packages = _.reject(packages, function(k) {
      loaded_modules[k] = _packages[k];
      return _packages[k];
    });

    if (!necessary_packages.length) {
      if (cb) {
        cb()
      }
      return;
    }


    var req = $.ajax("/pkg/component", {
      data: {
        m: JSON.stringify(necessary_packages)
      }
    });

    req.done(function(data) {
      _.each(data, function(v, k) {
        var first_define = !_packages[k];
        if (!v.schema.no_redefine || first_define) {
          _packages[k] = v;
          _packages[k].exports = raw_import(v.main);
          _packages[k].events = raw_import(v.events);
        }
      });

      if (cb) {
        cb();
      }
    });
  }

  var _controllers = {};
  var _pending;
  function get_controller(name, cb) {
    var name = name || bootloader.__controller_name;
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
    });

    controller.name = name;
    window.controller = controller;
    return controller;
  }

  var require_js = function(module, cb) {
    if (_modules[module]) {
      if (cb) {
        cb(_modules[module]);
      }

      return _modules[module];
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

  };

  function call(module, func, args) {
    bootloader.require(module, function(mod) {
      if (!mod[func]) {
        console.debug("Couldn't find", func, "in ", module, ". not running server call");
      } else {
        marshall_args(args, function(new_args) {
          mod[func].apply(mod[func], new_args);
        });
      }
    });
  }

  function marshall_args(args, cb) {
    var count = 0;
    _.each(args, function(arg, index) {
      if (arg.isComponent) {
        count += 1;
      }
    });

    var after = _.after(count, function() {
      cb(args);
    });

    _.each(args, function(arg, index) {
      if (arg.isComponent) {
        SF.do_when(window.$G, "core/client/component", function() {
          $G(arg.id, function(cmp) {
            args[index] = cmp;
            after();
          });
        });
      }
    });
  }

  function controller_call(controller, func, args) {
    marshall_args(args, function(new_args) {
      SF.controller(controller, function(cntrl) {
        func.apply(cntrl, new_args);
      });
    });
  }

  var _injected_css = {};
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
      $(el).fadeIn();
    }



    insert_pagelet();

    if (options.css) {
      bootloader.css(options.css, display_pagelet);
    } else {
      display_pagelet();
    }

  }

  var _sockets = {};
  function install_socket(name, socket) {
    // Presumes that name starts with a slash
    _sockets[name] = socket;

    socket.on("store", data_sync);
    socket.on("refresh", function(data) {
      function refresh_page() {
        var promise = $.get(
          "/pkg/status", function() {
            window.location.reload();
          });

        promise.fail(function() {
          setTimeout(refresh_page, 1500);
        });
      }

      // First ping the server, to see if its safe to reload
      setTimeout(refresh_page, 1500);
    });

    get_controller(name, function(ctrl) {
      // TODO: Is this a good idea? (reaching in like this)
      ctrl.__socket = socket;

      if (!ctrl.socket) {
        debug("Warning: No socket installed on ", name);
        return;
      }

      ctrl.socket(socket);

    });
  }

  function get_socket(name) {
    name = name || bootloader.__controller_name;

    if (!name) {
      debug("Trying to get a socket that doesn't exist");
    }
    return _sockets[name];
  }

  function do_when(field, signal, func) {
    if (!field) {
      this.once(signal, function() {
        func();
      });
    } else {
      func();
    }
  }

  var bootloader = {
    raw_import: raw_import,
    css: bootload_factory("css", _css_defs, inject_css),
    inject_css: inject_css,
    js: bootload_factory("js", _module_defs),
    pkg: bootload_pkg,
    defs: _module_defs,
    modules: _modules,
    require: require_js,
    call: call,
    controller_call: controller_call,
    deliver: deliver_pagelet,
    install_socket: install_socket
  };

  var SF = {
    set: data_setter,
    get: data_getter,
    sync: data_store,
    watch: data_subscriber,
    socket: get_socket,
    controller: get_controller,
    do_when: do_when


  };

  _.extend(SF, Backbone.Events);
  // do some legwork to scope on/emit events to their controllers
  SF.subscribe = function() {
    var args = _.toArray(arguments);
    args[0] = get_controller().name + ":" + args[0];
    return SF.on.apply(SF, args);
  };

  SF.inform = function() {
    var args = _.toArray(arguments);
    args[0] = get_controller().name + ":" + args[0];
    return SF.trigger.apply(SF, args);
  };

  Backbone.history.start({ pushState: true });
  var _history = new Backbone.Router();
  SF.go = function(uri, data) {
    _history.navigate(uri, { trigger: true });
  };

  SF.replace = function(uri, data) {
    _history.navigate(uri, { trigger: true, replace: true });
  };

  $(window).bind('popstate', function(evt) {
    // see if we have any results saved for the current URI
    SF.inform("popstate");
  });

  window.bootloader = bootloader;
  window.SF = SF;
  window.require = bootloader.require;

}());
