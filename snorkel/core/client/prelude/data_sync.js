(function() {
  var _store = {};

  function data_getter(k, ns) {
    ns = ns || SF.controller().name;

    _store[ns] = _store[ns] || {};
    return _store[ns][k];
  }

  function data_setter(k, v, ns) {
    ns = ns || SF.controller().name;
    _store[ns] = _store[ns] || {};
    _store[ns][k] = v;

    SF.inform("update:" + k, v);
  }

  // Very hard to over-ride
  function data_subscriber(k, cb) {
    var ns = SF.controller().name;
    _store[ns] = _store[ns] || {};

    $(function() {
      if (_store[ns][k]) {
        // wait for doc ready
          cb(_store[ns][k]);
      }
    });

    SF.subscribe("update:" + k, cb);
  }

  // tells the server to store some data for us, too.
  // this is a first come, first served type of thing, btw.
  function data_store(k, v, ns) {
    SF.socket().emit("store", {
      key: k,
      value: v,
      controller: ns || SF.controller().name });
  }

  function data_sync(data) {
    data_setter(data.key, data.value, data.controller);
  }

  
  var SF = window.SF;
  SF.set =  data_setter;
  SF.get =  data_getter;
  SF.sync =  data_store;
  SF.watch =  data_subscriber;
  SF.data_sync = data_sync;
}());
