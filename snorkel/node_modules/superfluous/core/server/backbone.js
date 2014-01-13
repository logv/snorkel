"use strict";

var bridge = require_core("server/bridge");
module.exports = {
  install_marshalls: function() {
    bridge.add_marshaller('backbone:collection', function(arg) {
      if (arg && arg instanceof Backbone.Collection) {
        return { data: arg.toJSON(), isCollection: true };
      }
    });
  }
};
