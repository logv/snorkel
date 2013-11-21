"use strict";

// Keep it small
(function() {
  window.debug = function() { };
  // Backbone must have run by now
  var Backbone = window.Backbone;
  Backbone.$ = window.jQuery;

  (function() {
    var url = window.location.href;
    var hashes = url.slice(url.indexOf('?') + 1).split('&');
    var query = {};
    _.each(hashes, function(h) {
      var args = h.split('=');
      var k = args[0];
      var v = args[1];
      if (query[k]) {
        if (_.isArray(query[k])) {
          query[k].push(v);
        } else {
          query[k] = [query[k], v];
        }
      } else {
        query[k] = v;
      }
    });
    window._query = query;
  }());




  var SF = {};
  function do_when(field, signal, func) {
    if (!field) {
      this.once(signal, function() {
        func();
      });
    } else {
      func();
    }
  }
  SF.do_when =  do_when;

  _.extend(SF, Backbone.Events);
  // do some legwork to scope on/emit events to their controllers
  SF.subscribe = function() {
    var args = _.toArray(arguments);
    args[0] = SF.controller().name + ":" + args[0];
    return SF.on.apply(SF, args);
  };

  SF.inform = function() {
    var args = _.toArray(arguments);
    args[0] = SF.controller().name + ":" + args[0];
    return SF.trigger.apply(SF, args);
  };

  Backbone.history.start({ pushState: true });
  var _history = new Backbone.Router();
  SF.go = function(uri, data) {
    _history.navigate(uri, { trigger: true });
  };

  SF.replace = function(uri, data) {
    _history.navigate(uri, { trigger: true, replace: true });
  };

  $(window).bind('popstate', function(evt) {
    // see if we have any results saved for the current URI
    SF.inform("popstate");
  });

  window.SF = SF;

}());
