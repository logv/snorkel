"use strict";


function create_throbber(container, text_func) {
  
  var _loading = null;
  var _throbber_interval = null;
  var _throbber = null;

  function kick_throbber() {

    function remove_throbber() {
      $(_throbber).remove();
      clearInterval(_throbber_interval);
      _throbber_interval = null;
      _throbber = null;
    }

    if (!_loading) {
      return remove_throbber();
    }

    if (!_throbber) {
      _throbber = $("<div class='throbber'>");
    }

    container.append(_throbber);

    var last_second = null,
        start = Date.now();

    clearInterval(_throbber_interval);
    _throbber_interval = setInterval(function() {
      var now = Date.now();
      var elapsed = parseInt((now - start) / 1000, 10);
      if (!_loading) {
        remove_throbber();
      }

      // render the throbber, now
      _throbber.empty();

      if (text_func) {
        var ret = text_func();
        _throbber.html(ret);
      }

      if (elapsed >= 1) {
        var duration = $("<div>You've been waiting <b>" + elapsed + "</b> seconds, so far.</div>");
        _throbber.append(duration);
      }

      return _loading;
    }, 50);
  }

  // TODO: use an overlay instead of a query
  return {
    stop: function() {
      _loading = false;
      kick_throbber();
    },
    start: function() {
      _loading = true;
      kick_throbber();
    },
    kick: kick_throbber
  };
}

module.exports = {
  create: create_throbber
};
