"use strict";

window.bootloader.add_marshaller('backbone:collection', function(arg, cb) {
  if (arg && arg.isCollection) {
    cb(new Backbone.Collection(arg.data));
    return true;
  }
});

window.bootloader.add_marshaller('backbone:model', function(arg, cb) {
  if (arg && arg.isModel) {
    cb(new Backbone.isModel(arg.data));
    return true;
  }
});

module.exports = { };


