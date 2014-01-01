/**
 * This module is responsible for instantiating controllers on the client side
 * and calling into the controller on directions from the bridge.
 *
 * @class controller (client)
 */

"use strict";


var _name;
var _mod;

var _loaded = {};
var _arbiter = _.clone(window.Backbone.Events);
function call(controller, func, args, hash) {
  SF.controller(controller, function(ctrl) {
    if (ctrl[func]) {
      window.bootloader.controller_call(controller, ctrl[func], args);
    } else {
      SF.error(func, "isnt present in", controller, "WTF!");
    }
  });
}

module.exports = {
  // Sets up the controller and the page
  set: function(controller, pageId, signature) {
    _name = controller;
    var page = window.document.getElementById(pageId);

    window.bootloader.__controller_name = controller;

    SF.log("Setting controller", controller, pageId);
    SF.controller(controller, function(cmp) {
      if (!cmp) {
        SF.error("Tried to set server to", controller, "but failed!");
        return;
      }

      SF.log("Loaded controller", controller, cmp);

      cmp.page = page;
      cmp.setElement(page);
      cmp.$page = $(page);
      cmp.delegateEvents();

      if (cmp.init) {
        cmp.init();
      }

      _loaded[controller] = true;

      _arbiter.trigger(controller);
    }, signature);
  },

  get: function() {
    return SF.controller(_name);
  },

  call: function() {
    // cant just call stuff before its ready, can we?
    var args = _.toArray(arguments);
    var controller = args.shift();
    var func = args.shift();
    var hash = args.pop();

    if (_loaded[controller]) {
      call(controller, func, args, hash);
    } else {
      _arbiter.once(controller, function() {
        call(controller, func, args, hash);
      });
    }
  }

};
