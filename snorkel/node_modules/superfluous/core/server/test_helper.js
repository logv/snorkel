"use strict";

var fs = require('fs');

var EventEmitter = require("events").EventEmitter;
var _suppressed_log;
function suppress_console_log() {
  if (_suppressed_log) {
    return;
  }

  _suppressed_log = console.log;
  console.log = function () { };
}
console.suppress = suppress_console_log;

function restore_console_log() { 
  if (_suppressed_log) {
    console.log = _suppressed_log;
  }
  _suppressed_log = null;
}
console.restore = restore_console_log;

console.silent = function(cb) {
  console.suppress();
  cb();
  console.restore();
};

var app = require("connect")();
app.locals = {};

function run_in_context(cb, defaults, done) {
  var context = require_core("server/context");
  if (cb) {
    defaults = defaults || {};
    context.create(_.defaults({ app: app }, defaults), function(ctx) {
      ctx.router = app.router;
      cb(context.wrap(done));
    });
  } else {
    done();
  }

}

var TEST_HEADER = [
  '"use strict"',
  '',
  'var test_helper = require_core("server/test_helper");',
  'test_helper.init();',
  '',
  'var assert = require("assert");' ].join("\n");

module.exports = {
  init: function() {
    app = require("connect")();
    app.locals = {};

    console.suppress();
    var domain = require('domain');
    var d = domain.create();
    d.enter();


    var router = require_core("server/router");
    router.install(app);

    var hooks = require_core("server/hooks");
    var main = {};
    hooks.set_main(main);

    require_core("server/component").install_marshalls();
    require_core("server/backbone").install_marshalls();
    console.restore();

    // this requires the test to be run from within mocha framework
    module.exports.it = function(msg, cb) {
      run_in_context(function() {
        it(msg, cb);
      });
    };
  },
  wrap: function(cb) {
    return function(done) {
      return run_in_context(cb, {}, done);
    };
  },
  setup_server: function(cb) {
    run_in_context(cb);
  },

  // TODO: define how this works better
  test_socket: function(controller_name, cb) {
    run_in_context(function() {
      var controller = require_core("server/controller");
      var controller_mod = controller.load(controller_name);
      var socket = require_core("server/socket");
      var fakeSocket = new EventEmitter();

      var wrappedSocket = socket.wrap_socket(fakeSocket);

      cb(wrappedSocket, function(next) {
        controller_mod.socket(wrappedSocket);
        next();
      });
    });
  },
  test_route: function(controller_name, route, args, cb) {
    var router = require_core("server/router");
    var controller = require_core("server/controller");
    var controller_mod = controller.load(controller_name);
  
    var stream_data = "";
    var ctx = {
      session: {
        user: "testsssss"
      },
      controller: controller_name,
      // one stubbed definition at a time
      req: {
        headers: {
          host: "test"
        },
        query: {

        }
      },
      res: {
        setHeader: function() {

        },
        redirect: function() {
          cb("REDIRECT " + _.toArray(arguments).join(" "));
        }
      },
      stream: {
        write: function(msg) {
          stream_data += msg;

        },
        flush: function() {

        },
        end: function(msg) {
          if (msg) {
            stream_data += msg;
          }

        }
      },
      __testing: true,
      __on_page_end: function() {
        cb(stream_data);
      }
    };

    var api = router.API;

    args = args || [];
    args.unshift(api);
    args.unshift(ctx);
    var socket = require_core("server/socket");
    socket.get_socket_library = function() {
      return "";
    };

    controller_mod.get_shared_value = function(key) {
      return "";
    };

    run_in_context(function() {
      controller_mod[route].apply(controller_mod, args);
    }, ctx);
  }, 

  // Loads a module and logs its module.exports as a test definition
  generate_tests_for_module: function(module_path) {
    // Stub FS watch, because it keeps the process open?
    console.suppress();
    fs.watch = function() { };
    var mod = require_root(module_path);
    console.restore();

    console.log(TEST_HEADER);
    var normal_path = require("path").normalize(module_path);
    console.log('describe("' + normal_path + '", function() {');
    _.each(mod, function(v, func_name) {
      console.log('  describe("#' + func_name + '", function() {');
      console.log('    test_helper.it("should have a test", function(done) {');
      console.log('      assert.equal("test", "is_written");');
      console.log('      done();');
      console.log('    });');
      console.log('  });');
    });
    console.log('});');
  }
};

if (require.main === module) {
  var args = _.clone(process.argv);
  if (!args[0].indexOf("node")) {
    args.shift();
  }

  // Pull off the script name
  args.shift();

  if (!args.length) {
    console.log("Please supply a path to a module to generate tests for");
  } else {
    module.exports.generate_tests_for_module(args[0]);
  }

}
