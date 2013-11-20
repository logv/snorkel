"use strict";

var _name;
var _mod;

var _loaded = {};
var _arbiter = _.clone(window.Backbone.Events);
function call(controller, func, args) {
  SF.controller(controller, function(ctrl) {
    if (ctrl[func]) {
      ctrl[func].apply(ctrl, args);
    } else {
      console.log(func, "isnt present in", controller, "WTF!");
    }
  });
}

module.exports = {
  // Sets up the controller and the page
  set: function(controller, pageId) {
    _name = controller;
    var page = window.document.getElementById(pageId);

    window.bootloader.__controller_name = controller;

    console.log("Setting controller", controller, pageId);
    SF.controller(controller, function(cmp) {
      if (!cmp) {
        console.log("Tried to set server to", controller, "but fialed!");
        return;
      }

      console.log("Loaded controller", controller, cmp);

      cmp.page = page;
      cmp.setElement(page);
      cmp.$page = $(page);
      cmp.delegateEvents();

      if (cmp.init) {
        cmp.init();
      }

      _loaded[controller] = true;

      _arbiter.trigger(controller);
    });
  },

  get: function() {
    return SF.controller(_name);
  },

  call: function() {
    // cant just call stuff before its ready, can we?
    var args = _.toArray(arguments);
    var controller = args.shift();
    var func = args.shift();

    if (_loaded[controller]) {
      call(controller, func, args);
    } else {
      _arbiter.once(controller, function() {
        call(controller, func, args);
      });
    }
  }

};
