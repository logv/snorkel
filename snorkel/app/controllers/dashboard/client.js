"use strict";

var presenter = require("app/client/views/presenter");
var views = require("app/client/view");
var ResultsStore = require("app/client/results_store");
var helpers = require("app/client/views/helpers");

var sortable = require("app/static/vendor/jquery-sortable");

var _containers = {};
var _dashboard;

var default_refresh = 60 * 1000;

function handle_refresh_query(hashid) {
  SF.socket().emit("refresh_query", {
    hashid: hashid
  });
}

function refresh_query(hashid) {
  return function() {
    handle_refresh_query(hashid);
    _.delay(refresh_query(hashid), default_refresh);
  };
}

function get_query(hashid) {
  return function() {
    SF.socket().emit("refresh_query", {
      hashid: hashid,
      intermediate: true
    });

    refresh_query(hashid)();
  };
}

function handle_new_portlet(obj, el) {
  _containers[obj.hashid] = el;
  views.set_container(_containers[obj.hashid], obj);
  views.set_widget(true);

  if (obj.results) {
    _.delay(refresh_query(obj.hashid), default_refresh + Math.random() * 2000);

    ResultsStore.add_results_data(obj.results.query);
    ResultsStore.add_compare_data(obj.results.compare);

    views.redraw(obj.clientid, obj, false);
  } else {
    _.defer(get_query(obj.hashid));
  }
}

function handle_query_results(data) {
  ResultsStore.add_results_data(data);

  SF.do_when(ResultsStore.to_server(data.parsed.id), 'portlet:' + data.parsed.id, function() {
    views.insert_graph(data.parsed.view, data);
  });
}

function handle_query_id(data) {
  ResultsStore.identify(data);
  views.set_container(_containers[data.server_id], { clientid: data.client_id });
  SF.trigger('portlet:' + data.client_id);
}


function handle_compare_results(data) {
  ResultsStore.add_compare_data(data);
  views.insert_comparison(data.parsed.view, data);
}

function handle_portlet_remove(data) {
  helpers.confirm_action({
    title: "Really remove this portlet?",
    body: "Are you sure you want to delete this portlet?",
    confirm: "Yah, yah"
  }, function() {
    SF.socket().emit("remove_portlet", _dashboard, data);
  });
}

function handle_portlet_update(data) {
  SF.socket().emit("update_portlet", _dashboard, data);
}

module.exports = {
  init: function() {
    SF.controller().on("new_portlet", handle_new_portlet);
    SF.controller().on("refresh_query", handle_refresh_query);
    SF.controller().on("update_portlet", handle_portlet_update);
    SF.controller().on("remove_portlet", handle_portlet_remove);
    SF.controller().on("rename_query", function(query, name, info) {
      SF.socket().emit("save_query", query, name, info);
    });

    var that = this;
    SF.controller().on("stop_dragging", function() {
      that.stop_dragging(); 
    });
    SF.controller().on("start_dragging", function() {
      that.start_dragging();
    });

    that.start_dragging();

  },
  start_dragging: function() {

    var portlet_holder = this.$el.find(".portlet_holder");
    if (!this._init_drag) {
      this.$el.find(".portlet_holder").sortable({
        items: ".portlet_wrapper",
        scroll: true,
        distance: 5,
        update: function() {
          var portlets = portlet_holder.find(".portlet_wrapper").find("[data-query]");
          var queries = [];
          _.each(portlets, function(p) {
            queries.push($(p).data('query'));
          });

          $(window).resize();

          SF.socket().emit("order_portlets", _dashboard, queries);
        }
      }).disableSelection();
    } else {

      this.$el.find(".portlet_holder").sortable('enable');
    }

    this._init_drag = true;

  },

  stop_dragging: function() {
    this.$el.find(".portlet_holder").sortable('disable');
  },


  events: {
    "click .remove_dashboard" : "handle_remove_dashboard"
  },

  handle_remove_dashboard: function() {
    helpers.confirm_action({
      title: "Really delete this dashboard?",
      body: "Are you sure you want to delete this dashboard?",
      confirm: "Delete dashboard"
    }, function() {
      SF.socket().emit("remove_dashboard", _dashboard, function() {
        window.location = "/datasets";
      });
    });
  },

  socket: function(socket) {
    socket.on("query_results", handle_query_results);
    socket.on("compare_results", handle_compare_results);
    socket.on("query_id", handle_query_id);
    socket.on("updated_dashboard", function() {
      window.location.reload();
    });
  },

  set_dashboard: function(dashboard) {
    _dashboard = dashboard;
  },

  get_dashboard: function() {
    return _dashboard;
  },

  set_metadata: function(all) {
    this.metadata = all;
    presenter.set_metadata(all);
    SF.trigger("dashboard:metadata");
  },

  get_fields: function(dataset) {
    var meta = this.metadata[dataset];
    if (meta) {
      return meta.metadata.columns;
    }
  }
};
