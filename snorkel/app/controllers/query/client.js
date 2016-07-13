"use strict";


var component = require("core/client/component");

var filter_helper = require("app/controllers/query/filters");
var helpers = require("app/client/views/helpers");
var presenter = require("app/client/views/presenter");
var views = require("app/client/view");

var _show_controls = false;
var ResultsStore = require("app/client/results_store");
var Throbber = require("app/client/throbber");
var StatusBar = require("app/client/query_status_bar");


var _query_id;
var _query_details;


function get_query_from_str(query_str) {
  var query = $.deparam(query_str);
  var filters = query.filters;

  var fields = [];
  _.each(query, function(val, key) {
    if (_.isString(val)) {
      fields.push({ name: key, value: val });
    }

    if (_.isArray(val)) {
      _.each(val, function(v) { fields.push( {name: key, value: v }); });
    }
  });
  var serialized = {
    data: fields,
    string: query_str
  };

  return serialized;
}

function QueryState() {
  var _loading;
  var _acked;
  var _received;
  var _start;
  var _compare;
  var _results;
  var _should_compare;

  function get_text() {

    // ask meself what's up
    var ret;
    if (_received) {
      ret = "Rendering Results";
    }

    // For the first second, look like we're sending the query to the server :-)
    if (_acked && Date.now() - _start > 1000) {
      ret = "Running Query";
    } else if (_loading) {
      ret = "Uploading Query";
    }

    return $("<h1>")
      .html(ret);

  }

  var tr = Throbber.create($("#query_content"), get_text);
  tr.tick(function(elapsed) {
    StatusBar.set_query_time(elapsed);
  });

  function reset() {
    _loading = null;
    _acked = null;
    _received = null;
    _start = null;
    _should_compare = false;
    _compare = null;
    _results = null;

    tr.set_text_function(get_text);
  }

  function is_finished() {
    var done = _results && (!_should_compare || _compare);
    return done;
  }

  function handle_results() {
    if (is_finished()) {
      tr.stop();
    }
    _received = true;
    _loading = false;
    _results = true;
  }

  function handle_compare() {
    if (is_finished()) {
      tr.stop();
    }
    _compare = true;
    _received = true;
  }

  function handle_ack() {
    _acked = true;
    _loading = true;
  }

  function handle_new_query() {
    tr.start();
    _loading = true;
    _start = Date.now();
  }

  function should_compare(compare) {
    _should_compare = compare;
  }



  return {
    get_text: get_text,
    got_ack: handle_ack,
    new_query: handle_new_query,
    got_compare: handle_compare,
    got_results: handle_results,
    reset: reset,
    should_compare: should_compare,
    throbber: tr
  };


}

var QS = new QueryState();

function serialized_array_to_str(arr) {

  var form_str = _.map(arr, function(f) { return f.name + "=" + f.value; }).join('&');

  return form_str;
}

// How do we tie query_results and new_query together?
// through the views! (maybe?)
function handle_query_results(data) {
  if (!data) {
    return;
  }

  QS.got_results();

  if (data.error) {
    views.insert_error(data, data.error);
  } else {
    views.insert_graph(data.parsed.view, data, QS.throbber);
    ResultsStore.add_results_data(data);
  }

}

function handle_compare_results(data) {
  if (!data) {
    return;
  }

  QS.got_compare();

  if (data.error) {
    views.insert_error(data, data.error);
  } else {
    ResultsStore.add_compare_data(data);
    views.insert_comparison(data.parsed.view, data);
  }

}

function handle_query_id(data) {
  ResultsStore.identify(data);
}

function handle_query_saved(query_details) {
  var container = $("#query_queue .saved_queries");
  // Psas in the query from above for later re-usage
  $C("query_tile", { query: query_details }, function(tile) {
    tile.$el.hide();
    tile.prependTo(container);
    tile.$el.fadeIn(1000);
  });

  $C("modal", {
    title: "Success!",
    body: "Your query has been saved. Look in your query history for it. <br />" +
          "<small>(Click on your username to see recent &amp; saved queries)</small>"
  });
}

function insert_query_tiles(container, queries, in_order) {
  var controller = SF.controller();
  var table = controller.table;

  _.each(queries, function(data) {
    var view_data = views.VIEWS[data.parsed.view];

    ResultsStore.identify({ client_id: data.clientid, server_id: data.hashid });
    ResultsStore.set_timestamp(data.hashid, data.updated || data.created);

    if (data.results) {
      if (data.results.query) {
        ResultsStore.add_results_data(data.results.query);
      }

      if (data.results.compare) {
        ResultsStore.add_compare_data(data.results.compare);
      }
    }

    ResultsStore.handle_ack({
      input: data.input,
      id: data.hashid
    });

    var icon = "noun/view.svg";
    if (view_data) {
      icon = view_data.icon || "noun/view.svg";
    }

    if (table !== data.parsed.table) {
      return;
    }

    // Psas in the query from above for later re-usage
    $C("query_tile", { query: data, icon: icon }, function(tile) {
      tile.$el.hide();
      if (in_order) {
        tile.appendTo(container);
      } else {
        tile.prependTo(container);
      }
      tile.$el.fadeIn(1000);
    });
  });
}

function set_query(query) {
  _query_id = query.hashid;
  _query_details = query;

  if (query.results) {
    ResultsStore.add_results_data(query.results.query);
    ResultsStore.add_compare_data(query.results.compare);
  }

  ResultsStore.identify({ client_id: query.clientid, server_id: query.hashid });

  function replace_id_in_params() {
    var uri = window.location.pathname + window.location.search;
    var params = window.location.search.substr(1).split('&');

    params = _.reject(params, function(r) {
      var vals = r.split('=');

      return vals[0] === 'h';
    });

    params.push('h=' + _query_id);

    var param_str = params.join('&');

    var url = window.location.pathname + '?' + param_str;
    SF.replace(url, true);
  }

  replace_id_in_params();


}

function handle_query_ack(data) {
  QS.got_ack();
  ResultsStore.handle_ack(data);

  set_query(data);

  QS.should_compare(data.parsed.compare_mode);

  insert_query_tiles($("#query_queue .query_list"), [data]);
}

function handle_new_query() {
  QS.reset();

  QS.new_query();
}

function load_recent_queries(queries) {
  insert_query_tiles($("#query_queue .query_list"), queries, true);
}

function load_saved_queries(queries) {
  insert_query_tiles($("#query_queue .saved_queries"), queries, true);
}

function load_shared_queries(queries) {
  insert_query_tiles($("#query_queue .shared_queries"), queries, true);
}

module.exports = {
  init: function() {
    // this is initializing component interactions
    SF.controller().on("rename_query", function(query, name, info) {
      SF.socket().emit("save_query", query, name, info);
    });

    SF.controller().on("delete_query", function(query, cb) {
      SF.socket().emit("delete_query", query);
      if (cb) { cb(); }
      // gotta show a little dealie for old queries
    });

    SF.controller().on("update_portlet", function(portlet) {
      handle_portlet_update(portlet);
    });

    SF.controller().on("refresh_query", function(query) {
      SF.socket().emit("refresh_query", query);
      // gotta show a little dealie for old queries
    });

    $(window.document).on("click", function() {
      SF.trigger("page:clicked");
    });


    var _history_modal;

    SF.controller().on("show_query_history", function(query) {
      SF.socket().emit("get_past_results", query.hashid, function(queryid, results) {
        var outerDiv = $("<div />");
        _.each(results, function(r) {
          var innerDiv = $("<div />");
          r.hashid = queryid;
          $C("past_query_tile", { query: r, updated: r.updated }, function(tile) {
            innerDiv.append(tile.$el);
          });

          outerDiv.append(innerDiv);
        });

        $C("modal", {title: "History"}, function(cmp) {
          cmp.$el.find(".modal-body").append(outerDiv);
          _history_modal = cmp;

        });

      });
      // gotta show a little dealie for old queries
    });

    SF.controller().on("query_id_clicked", function(short_query) {
      SF.socket().emit("load_query_data", { hashid: short_query.hashid, updated: short_query.updated }, function(query) {
        if (_history_modal) {
          _history_modal.hide();
        }

        SF.controller().trigger("query_tile_clicked", query);
      });
    });

    SF.controller().on("query_tile_clicked", function(query) {

      // TODO: this should be better encapsulated into a modal hider/shower
      // thats shared across modules
      $("#user_dialog").modal('hide');
      this.toggle_pane(false);

      this.set_dom_from_input(query.input);

      var client_id, server_id;


      if (query.hashid) {
        server_id = query.hashid;
        client_id = query.clientid || ResultsStore.to_client(server_id);
      } else {
        client_id = query.clientid || query.id;
        server_id = ResultsStore.to_server(client_id);
      }

      SF.go("/query?table=" + this.table + "&h=" + server_id);
      set_query(query);

      views.redraw(client_id, query);
    });

    SF.controller().on("swap_panes", function(show_pane) {
      this.toggle_pane(!show_pane);
    });

    var that = this;
    SF.controller().on("switch_views", function(view) {
      that.update_view(view);
    });

    SF.controller().on("set_control", function(key, value) {
      views.set_control(key, value);
    });

    SF.controller().on("hide_compare_filters", function() {
      that.hide_compare_filters();
    });

    SF.controller().on("show_compare_filters", function() {
      that.show_compare_filters();
    });

    SF.subscribe("popstate", function() {
      var form_str = window.location.search.substring(1);
      var data = $.deparam(form_str);
      var id = data.c;

      var server_id;
      if (!id) {
        server_id = data.h;
        if (server_id) {
          id = ResultsStore.to_client(server_id);
        }
      }

      server_id = ResultsStore.to_server(id);



      var input = ResultsStore.get_input(server_id);
      if (input) {
        that.set_dom_from_input(input);
      } else {
        that.set_dom_from_query(form_str);
      }

      if (server_id !== _query_id) {
        // if we dont have a local cache of the ID, then we should probably
        // re-run the query, huh?
        if (!views.redraw(id)) {
          that.run_query(form_str, true);
          // run this query again?
          // TODO: show 'save' button
        }
        // need to restore the old query
      }

      set_query({
        hashid: server_id,
        clientid: id
      });

    });

    views.set_default_container($("#query_content"));
    filter_helper.set_container(this.$page);


    var query_str = window.location.search.substring(1);
  },

  run_startup_query: function() {
    var that = this;
    var query_str = window.location.search.substring(1);
    SF.do_when(this.fields, 'query:fields', function() {
      that.set_dom_from_query(query_str);
    });

  },

  events: {
    "click .pane_toggle" : "handle_pane_toggle_clicked",
    "click .logout" : "handle_logout",
    "click .compare_filter" : "handle_compare_toggle",
    "click .show_user_dialog" : "handle_user_history"
  },

  delegates: {
    // delegate events
    view_changed: function(cmp, evt) {
      var view_selector = cmp.$el.find("select");
      var view = view_selector.val();
      views.update_controls(view);
    },

    // double hmmm
    table_changed: function(cmp) {
      var table_selector = cmp.$el.find("select");
      var table = table_selector.first().val();

      // TODO: do better than just reloading the URL.
      // something more ajaxy, with Backbone's Router
      //
      if (table && this.table && table != this.table) {
        window.location = "/query?table=" + table;
      }

    },

    save_clicked: function(el) {
      this.save_query();
    },
    share_clicked: function(el) {
      this.share_query();
    },
    download_clicked: function(el) {
      this.download_query();
    },
    dashboard_clicked: function(el) {
      this.dashboard_query();
    },
    go_clicked: function(el) {
      this.run_query();
    }
  },

  get_query_from_dom: function() {
    var formEl = this.$page.find("#query_sidebar form");

    formEl
      .find("[data-disabled=true]")
      .attr("disabled", true);
    var form_data = formEl.serializeArray();

    formEl
      .find("[data-disabled=true]")
      .attr("disabled", false);

    // a hook for views to use to inject their own input values, in the *VERY* rare
    // case that they need it
    var view = this.$page.find("#query_sidebar form select[name=view]").val();

    var GraphClass = views.GRAPHS[view];
    var grapher = new GraphClass();

    if (grapher && grapher.supplement_inputs) {
      grapher.supplement_inputs(form_data);
    }
    // END HOOK

    // should we make sure to do some human readable junk before
    // transmitting to server?
    var form_str = serialized_array_to_str(form_data);

    var filter_data = filter_helper.get(this.$page);

    var json_filters = JSON.stringify(filter_data);
    form_str += "&filters=" + json_filters;

    form_data.push({name: "baseview", value: views.QUERIES[view] || grapher.baseview });
    form_data.push({name: "filters", value: json_filters});

    return {
      string: form_str,
      data: form_data,
      filters: filter_data
    };

  },

  load_saved_query: function(obj) {
    var that = this;
    var done = _.after(2, function() {
      set_query(obj);

      handle_query_results(obj.results.query);
      handle_compare_results(obj.results.compare);
      that.set_dom_from_input(obj.input);

      views.show_query_details(obj.clientid, obj, true /* show client timestamp */);
    });

    // Gotta wait for certain components...
    component.load("selector", done);
    component.load("multiselect", done);
  },

  get_current_query: function() {
    return this.query_params || {};
  },

  set_dom_from_query: function(query_str) {
    var query = $.deparam(query_str);
    this.query_params = query;
    var view = query.view;
    this.update_view(view || "table");

    var formEl = this.$page.find("#query_sidebar form");
    formEl.deserialize(query_str);
    formEl.find(":input[name]").each(function() {
      var val = $(this).val();
      var name = $(this).attr("name");
      if (name === "table" || name === "view") {
        return;
      }

      if ($(this).val() && typeof query[name] !== "undefined") {
        $(this).val(query[name]);
        $(this).trigger("liszt:updated");
      }
    });

    // deserialization for multiselects. grr.
    var multiselects = this.$page.find("#query_sidebar form select[multiple]");
    multiselects.each(function(m) {
      var name = $(this).attr("name");
      var val = query[name];
      $(this).val(val);
      $(this).trigger("liszt:updated");
    });


    // deserialization for filters, which are JSON
    var filters = {};
    try {
      filters = JSON.parse(query.filters);
    } catch(e) { }

    if (filters.query || filters.compare) {
      var filterEl = this.$page.find("#filters");
      // one level of dependencies?
      SF.do_when(this.fields, 'query:fields', function() {
        filter_helper.empty();
        filter_helper.set(filters);
      });

    }
  },

  show_graph: function() {
    // switching to graph view
    this.toggle_pane(false);

  },

  show_controls: function() {
    // switching to graph view
    this.toggle_pane(true);
  },

  // TODO: add this to controller and use this.$page
  toggle_pane: function(controls_show) {
    // Hmmmmm... need to figure out which way to toggle the panes?
    _show_controls = controls_show;
    var text = "Graph";
    if (!controls_show) {
      text = "Query";
    }

    this.$page.find(".pane_toggle").find(".name").html(text);
    var paneToggle = this.$page.find(".pane_toggle");
    var queryContent = this.$page.find("#query_content");
    var querySidebar = this.$page.find("#query_sidebar");

    if (controls_show) {
      // Need to figure this out
      queryContent
        .removeClass("above")
        .addClass("below");
      querySidebar
        .removeClass("below")
        .addClass("above");

      this.$page.find(".graph_quick_links").hide();
      this.$page.find(".query_quick_links").show();
    } else {
      this.$page.find(".query_quick_links").hide();
      this.$page.find(".graph_quick_links").show();
      querySidebar
        .removeClass("above")
        .addClass("below");
      queryContent
        .removeClass("below")
        .addClass("above");
    }

  },

  handle_logout: function() {
    $.post("/logout", function() {
      $(window.location).attr("href", "/");
    });
  },

  handle_user_history: function() {
    // clear out history
    $("#query_queue .query_tile").remove();

    // Only run this when we open the user dialog!
    var socket = SF.socket();
    var table = this.table;

    var throbberWrapper = $("<div style='text-align: center' />");
    var tr = Throbber.create(throbberWrapper);
    $("#query_queue .query_list").append(throbberWrapper);
    tr.start();

    this.query_history_throbber = tr;

    socket.emit("get_saved_queries", table);
    socket.emit("get_shared_queries", table);
    socket.emit("get_recent_queries", table);
  },

  compare_mode: function() {
    var compare = views.get_control("compare");
    if (compare) {
      // if we have time, we are comparing
      return true;
    }

    var filterBox = this.$page.find(".filter_group[data-filter-type=compare]");
    // if the compare filter el is visible, means we are comparing
    return $(filterBox).is(":visible");
  },

  show_compare_filters: function(add_if_empty) {
    var filterBox = this.$page.find(".filter_group[data-filter-type=compare]");
    var compareFilter = this.$page.find(".compare_filter");
    filterBox.show();
    compareFilter.show();

    // If there is no filter row and we want to show comparison filters
    if (!filterBox.find(".filter_row").length && add_if_empty) {
      filter_helper.add_compare(["", "", ""], true);
    }

    compareFilter.html("Remove Comparison Filters");
    var container = filterBox.parents("#query_sidebar");
    container.stop(true).animate({
        scrollTop: filterBox.offset().top - container.offset().top + container.scrollTop()
    }, 1000);

  },

  hide_compare_filters: function() {
    var filterBox = this.$page.find(".filter_group[data-filter-type=compare]");
    var compareFilter = this.$page.find(".compare_filter");
    filterBox.hide();
    compareFilter.html("Add Comparison Filters");
  },

  handle_compare_toggle: _.debounce(function() {
    var filterBox = this.$page.find(".filter_group[data-filter-type=compare]");

    var to_hide = $(filterBox).is(":visible") && filterBox.find(".filter_row").length;

    if (to_hide) {
      this.hide_compare_filters();
    } else {
      this.show_compare_filters(true /* add if empty */);
    }

  }, 50),

  set_dom_from_input: function(input) {
    var that = this;
    SF.do_when(this.fields, 'query:fields', function() {
      var form_str = serialized_array_to_str(input);
      that.set_dom_from_query(form_str);
    });
  },

  socket: function(socket) {
    var self = this;
    socket.on("new_query", handle_new_query);
    socket.on("query_ack", handle_query_ack);
    socket.on("query_results", handle_query_results);
    socket.on("compare_results", handle_compare_results);
    socket.on("query_id", handle_query_id);
    socket.on("saved_query", handle_query_saved);

    socket.on("recent_queries", load_recent_queries);
    socket.on("saved_queries", load_saved_queries);
    socket.on("shared_queries", function(queries) {
      load_shared_queries(queries);

      if (self.query_history_throbber) {
        self.query_history_throbber.stop();
      }

    });

    // TODO: make sure this is for reals.
    var table = $("select[name=table]").first().val();

  },

  set_table: function(table) {
    this.table = table;
    SF.trigger('query:table');
  },

  set_dashboards: function(dashboards) {
    this.dashboards = dashboards;
  },

  set_fields: function(data) {
    var that = this;
    SF.do_when(that.table, 'query:table', function() {
      that.fields = data;

      var weight_col;
      _.each(that.fields, function(f) {
        if (f.name === "weight" || f.name === "sample_rate") {
          weight_col = f.name;
        }
      });

      that.weight_col = weight_col;

      filter_helper.set_fields(that.fields);
      helpers.set_fields(that.fields);
      presenter.set_fields(that.table, that.fields);
      SF.trigger('query:fields', that.fields);
    });
  },

  get_fields: function() {
    return this.fields;
  },

  update_view: function(view) {
    views.update_controls(view);
  },

  handle_pane_toggle_clicked: _.debounce(function(e) {
    SF.controller().trigger("swap_panes", _show_controls);
  }, 50),

  share_query: function() {
    var table = this.table;
    $C("modal", { title: "Query URL" }, function(cmp) {
      var div = $("<div>");
      var input = $("<input type='text' style='width: 100%' />");
      var uri = window.location.protocol + '//' + window.location.host + window.location.pathname + '?table=' + table + '&h='  + _query_id;

      input.val(uri);
      div.append(input);
      cmp.$el.find(".modal-body").append(div);

      var closeButtonEl = $("<a href='#' class='btn rfloat' data-dismiss='modal'>Close</a>");
      cmp.$el.find(".modal-footer").append(closeButtonEl);

      input.select();

    });
  },

  download_query: function() {
    var query_id = _query_id;
    var url = window.location.pathname + '/download?h=' + query_id;
    window.open(url, '_blank');
  },

  save_query: function() {
    var query_id = _query_id;
    // TODO: get current query details

    var title, description, edit;
    if (_query_details) {
      edit = true;
      title = _query_details.title;
      description = _query_details.description;
    }

    $C("save_query_modal", { query_id: _query_id, title: title, description: description, edit: edit }, function(cmp) { });
  },

  run_query: function(query_ish, keep_url) {
    _query_details = null;
    var serialized;
    if (!query_ish) {
      serialized = this.get_query_from_dom();

    } else {
      if (_.isString(query_ish)) {
        serialized = get_query_from_str(query_ish);
      } else if (_.isObject(query_ish)) {
        serialized = query_ish;
      }
    }

    if (!keep_url) {
      SF.go("/query?" + serialized.string);
    } else {
      SF.replace("/query?" + serialized.string);

    }

    // TODO: collect filter values, too

    if (this.weight_col) {
      serialized.data.push({ name: 'weight_col', value: this.weight_col});
    }

    var table = $("select[name=table]").first().val();
    serialized.data.push({ name: 'table', value: table});

    SF.socket().emit("new_query", serialized.data);

    this.$page.find("#query_content").empty();

    serialized.data.originated = true;

    // TODO: this should be an optimistic tile, i guess
    handle_new_query(serialized.data);
    this.show_graph();
  }

};
