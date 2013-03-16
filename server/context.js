/**
 * This module represents a request level context.
 *
 */

"use strict";

var domain = require('domain');

var __defaults = {};

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
  set: function(ctx) {
    process.domain.ctx = ctx;
  },

  get: function() {
    var ctx =  process.domain.ctx;

    if (!ctx) { throw("HOW IS THERE NO PROCESS DOMAIN CONTEXT") }

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
    if (!k) {
      process.domain.ctx = {
        id: "unset"
      };
    } else {
      process.domain.ctx[k] = _.clone(__defaults[k]);
    }
  },

  create: function(req, res, cb) {
    var ctx = {
      req: req,
      res: res,
      id: __id++
    };

    var d = domain.create();
    d.domain = ctx.id;
    d.add(req);
    d.add(res);

    d.on('error', function(err) {
      console.log("Error", err, "happened in context", ctx.id);
    });

    d.run(function() {
      context.set(ctx);
      cb(ctx);
    });

  },

  wrap: function(func) {
    var d = process.domain;
    if (!d) { return func; }

    return function() {
      var args = arguments;
      d.run(function() { 
        func.apply(func, args);
      });
    };
  }
});
