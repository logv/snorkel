(function() {
  var _sockets = {};
  function install_socket(name, socket) {
    // Presumes that name starts with a slash
    _sockets[name] = socket;

    socket.on("store", SF.data_sync);
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
      debug("Trying to get a socket that doesn't exist");
    }
    return _sockets[name];
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
    marshall_args(args, function(new_args) {
      SF.controller(controller, function(cntrl) {
        func.apply(cntrl, new_args);
      }, signature);
    });
  }

  var bootloader = window.bootloader;
  bootloader.call = call;
  bootloader.controller_call = controller_call;
  bootloader.get_socket = get_socket;
  window.SF.socket = get_socket;
  bootloader.install_socket = install_socket;


}());
