"use strict";

var config = require('./config');
var connect = require('connect');

var _store;
module.exports = {
  install: function() {
    var MemoryStore = connect.session.MemoryStore;
    _store = new MemoryStore({});
  },
  get: function() {
    return _store;
  },
  set: function(s) {
    _store = s;
  },
};
