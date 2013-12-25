(function() {
  var _marshalls = [];

  // ooooh boy.
  // a marshaller will return 'true' if it is holding onto a component and will
  // use 'cb' to say it is done
  function add_marshaller(name, marshaller) {
    _marshalls.push(marshaller);
  }

  add_marshaller('component', function(arg, cb) {
    if (arg && arg.isComponent) {
      SF.do_when(window.$G, "core/client/component", function() {
        window.$G(arg.id, function(cmp) {
          cb(cmp);
        });
      });

      return true;
    }
  });

  var _sockets = {};
  function install_socket(name, socket) {
    // Presumes that name starts with a slash
    _sockets[name] = socket;

    socket.on("__store", SF.data_sync);
    socket.on("__call", call);
    socket.on("__controller_call", controller_call);
    socket.on("__log", function() {
      console.log('%c[Server] ' + _.toArray(arguments).join(" "), 
        'background: #fff; color: #2b3');
    });

    // when the page refreshes, let's first expire our localStorage cache, if
    // we can.
    socket.on("__refresh", function(data) {
      function refresh_page() {
        var promise = $.get(
          "/pkg/status", function() {

            SF.trigger("validate/versions", SF.socket());
            SF.on("updated_versions", function() {
              bootloader.sync();
              window.location.reload();
            });
          });

        promise.fail(function() {
          setTimeout(refresh_page, 500);
        });
      }

      // First ping the server, to see if its safe to reload
      setTimeout(refresh_page, 1500);
    });

    SF.controller(name, function(ctrl) {
      // TODO: Is this a good idea? (reaching in like this)
      ctrl.__socket = socket;

      if (!ctrl.socket) {
        debug("Warning: No socket installed on ", name);
        return;
      }

      ctrl.socket(socket);

    });

    SF.trigger("bridge/socket", socket);
  }

  function get_socket(name) {
    name = name || bootloader.__controller_name;

    if (!name) {
      window.debug("Trying to get a socket that doesn't exist");
    }
    return _sockets[name];
  }

  function marshall_args(args, cb) {
    var pending = 0;
    var resolved = 0;
    var finish_args = function() {
      cb(args);
      finish_args = function() { };
    };

    _.each(args, function(arg, index) {
      var marshalled = false;
      _.each(_marshalls, function(marshall) {
        if (marshalled) {
          return;
        }


        function count_cb(new_arg) {
          args[index] = new_arg;

          resolved += 1;

          if (resolved === args.length) {
            finish_args();
          }
        }

        if (marshall(arg, count_cb)) {
          pending += 1;
          marshalled = true;
        }
      });

      if (!marshalled) {
        resolved += 1;
      }

    });

    if (resolved === args.length) {
      finish_args();
    }
  }




  function call(module, func, args, signature) {
    bootloader.require(module, function(mod) {
      if (!mod[func]) {
        console.debug("Couldn't find", func, "in ", module, ". not running server call");
      } else {
        marshall_args(args, function(new_args) {
          mod[func].apply(mod[func], new_args);
        });
      }
    }, signature);
  }

  function controller_call(controller, func, args, signature) {
    SF.controller(controller, function(cntrl) {
      marshall_args(args, function(new_args) {
        if (_.isFunction(func)) {
          func.apply(cntrl, new_args);
        }

        if (_.isString(func)) {
          if (!cntrl[func]) {
            console.warn("Controller", "'" + controller + "'", "does not",
              "have function", func);
            return;
          }
          cntrl[func].apply(cntrl, new_args);
        }
      }, signature);
    });
  }

  var bootloader = window.bootloader;
  bootloader.call = call;
  bootloader.controller_call = controller_call;
  bootloader.get_socket = get_socket;
  bootloader.add_marshaller = add_marshaller;
  window.SF.socket = get_socket;
  bootloader.install_socket = install_socket;


}());
