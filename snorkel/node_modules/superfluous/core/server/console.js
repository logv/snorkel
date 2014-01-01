// patches console.log (and friends) to add timestamps
"use strict";

var _ = require_vendor("underscore");
var _log = console.log;

module.exports = {
  install: function() {

    _.each(['info', 'log', 'warn', 'debug'], function(func) {
      var old_func = console[func];
      console[func + "_no_ts"] = old_func;
      console[func] = function() {
        var args = _.toArray(arguments);
        args.unshift(new Date().toISOString());
        old_func.apply(this, args);
      };
    });

  },
  uninstall: function() {
    _.each(['info', 'log', 'warn', 'debug'], function(func) {
      var old_func = console[func+"_no_ts"];
      console[func] = old_func;
    });
  }
};
