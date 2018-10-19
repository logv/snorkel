"use strict";

function proxy_method(method) {
  var proxied_func = function() {
    return $P._refs.sidebar.filters[method].apply(this, arguments);
  }

  return proxied_func;
}

module.exports = {
  get: proxy_method("get"),
  set: proxy_method("set"),
  empty: proxy_method("empty"),
  add: proxy_method("add"),
  add_compare: proxy_method("add_compare"),
  add_or_update: proxy_method("add_or_update"),
  set_fields: proxy_method("set_fields"),
  set_field_types: proxy_method("set_field_types"),
};
