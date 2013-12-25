/**
 *
 * The Context module is how the server carries around request specific
 * information.
 *
 * During the request execution and app render, the superfluous core code will
 * use this context to coordinate information between modules. This is a sort
 * of "Request Local Storage", that is available in PHP or other thread based
 * web handlers. As a convenicence, it allows any variable to be stored and
 * retrieved from the context, without having to reference the request
 * explicitly.
 *
 * When a request is handled in a controller, it is placed into its own domain.
 * It is important that when using asynchronous operation, any callbacks passed into
 * them are wrapped by the context, which will re-instantiate the current domain before
 * running the callback.
 *
 *
 * @class context (server)
 * @module Superfluous
 * @submodule Server
 */

"use strict";

var domain = require('domain');

var __defaults = {};
var package_json = require_core("../package.json");
var config = require_core("server/config");
var app_name = package_json.name;
var USE_CLS = config.use_cls;

if (USE_CLS) {
  var ns = require("continuation-local-storage").createNamespace('superfluous');
}

var __id = 0;
module.exports = function(key, val) {
  if (typeof val !== "undefined") {
    module.exports.get()[key] = val;
  } else {
    return module.exports.get()[key];
  }
};

var context = module.exports;
_.extend(module.exports, {
  /**
   * Sets the current context in use
   *
   * @private
   * @method set
   */
  set: function(ctx) {
    process.domain.ctx = ctx;
  },

  /**
   * Sets the current context in use
   *
   * @private
   * @method get
   */
  get: function() {
    var ctx;
    if (USE_CLS) {
      ctx = ns.active;
    } else {
      ctx = process.domain.ctx;
    }

    if (!ctx) { throw("HOW IS THERE NO PROCESS DOMAIN CONTEXT"); }

    _.each(__defaults, function(v, k) {
      if (!ctx[k]) {
        ctx[k] = _.clone(v); // Don't use the default master copy
      }
    });

    return ctx;
  },

  setDefault: function(k, v) {
    __defaults[k] = v;
  },

  reset: function(k) {
    if (USE_CLS) {
      if (!k) {
        ns.active = {
          id: "unset"
        };
      } else {
        ns.set(k, _.clone(__defaults[k]));
      }
    } else {
      if (!k) {
        process.domain.ctx = {
          id: "unset"
        };
      } else {
        process.domain.ctx[k] = _.clone(__defaults[k]);
      }
    }
  },

  /**
   * Creates a new context (with prefilled globals) for a request to use.
   *
   * @method create
   * @param {Object} defaults The default options to pass into the domain
   * @param {Function} cb the callback to run after this context is created
   */
  create: function(defaults, cb) {
    defaults = defaults || {};

    var d;
    if (USE_CLS) {
      d = ns;
    } else {
      d = domain.create();
    }

    _.each(defaults, function(v) {
      if (USE_CLS) {
        d.bind(v);
      } else {
        d.add(v);
      }
    });

    var ctx = _.extend(defaults, {
      id: __id++,
      name: app_name,
      domain: d,
      inspect: function() {
        return "CTX:" + _.keys(ctx).sort();
      },
      enter: function() {
        if (USE_CLS) {
        } else {
          d.enter();
        }
      },
      exit: function() {
        if (USE_CLS) {
        } else {
          d.exit();

        }
      },
      wrap: function(f) {
        var self = this;
        d.run(function() {
          f.apply(self, arguments);
        });
      }
    });

    d.domain = ctx.id;

    // for DOMAINS
    if (!USE_CLS) {
      d.on('error', function(err) {
        console.trace();
        console.log("Error", err, "happened in context", ctx.id);
      });
    }

    d.run(function() {
      if (USE_CLS) {
        _.extend(ns.active, ctx);
        cb(ns.active);
      } else {
        context.set(ctx);
        cb(ctx);
      }

    });

  },

  /**
   *
   * Pulls the current domain out of the global namespace and makes sure that
   * before 'func' is called, the domain is placed back into the global
   * namespace. When running any async IO operations that potentially create
   * domains, you should place the callback inside a wrap call. As a
   * convenience, any function can have .wrap() or .intercept() called on it to
   * do this automatically
   *
   * @method wrap
   *
   *
   */
  wrap: function(func) {
    var d;
    if (USE_CLS) {
      d = ns;
    } else {
      d = process.domain;
    }
    if (!d) { return func; }

    return function() {
      var args = arguments;
      d.run(function() {
        func.apply(func, args);
      });
    };
  }
});
Function.prototype.wrap = module.exports.wrap;
Function.prototype.intercept = module.exports.wrap;
