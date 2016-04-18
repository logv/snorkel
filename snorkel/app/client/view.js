"use strict";

var helpers = require("app/client/views/helpers");

var _container;
var _containers = {};
var _widget;

var ResultsStore = require("app/client/results_store");

var STD_INPUTS = helpers.STD_INPUTS;
var STD_EXCLUDES = helpers.STD_EXCLUDES;
var VIEW_INPUTS = {
};
var GRAPHERS = {};

var QUERIES = {};

function get_container(query) {
  var emptyEl = $("<div />");
  if (!query) {
    return emptyEl;
  }


  var server_id = ResultsStore.to_server(query.clientid) || ResultsStore.to_server(query.parsed.id) || query.hashid;

  return _containers[server_id] || _container || emptyEl;
}


SF.on("view:add", function(view, details, view_class) {
  if (VIEW_INPUTS[view]) {
    console.log("Warning, trying to redefine", view, "as a view");
  }

  console.log("Adding view:", view, details);

  VIEW_INPUTS[view] = details;
  GRAPHERS[view] = view_class;

  QUERIES[view] = details.baseview;
});

// Requiring these here has this side effect of adding them to the list of
// views we can use.
var TimeView = require("app/client/views/time_view");
var TableView = require("app/client/views/table_view");
var DistView = require("app/client/views/dist_view");
var MultiDistView = require("app/client/views/multi_dist_view");
var OverView = require("app/client/views/over_view");
var SamplesView = require("app/client/views/samples_view");
var ScatterView = require("app/client/views/scatter_view");
var AreaView = require("app/client/views/area_view");
var BarView = require("app/client/views/bar_view");
var DrillView = require("app/client/views/drill_view");
var LagView = require("app/client/views/lag_view");
var ResultsStore = require("app/client/results_store");

function get_control(name) {
  var selector = "#query_sidebar .controls[name=" + name + "]";
  var ctl = $(selector);

  return ctl;
}

function get_control_value(name) {
  return get_control(name).find(":input").val();
}

function get_control_row(name) {
  var row = get_control(name).parents(".control-group");

  return row;
}

function handle_update_view(view) {
  var input_schema = VIEW_INPUTS[view];

  var custom_controls = input_schema.custom_controls;
  var customControlsEl = $("#query_sidebar .view_custom_controls");
  if (custom_controls) {
    customControlsEl.empty();

    var controlEls = custom_controls();
    customControlsEl.append(controlEls);
    customControlsEl.stop(true).slideDown();

  } else {
    customControlsEl.stop(true).slideUp();
  }


  get_control('view').find("select").val(view);

  var can_compare = true;
  if (input_schema) {
    _.each(input_schema.include, function(control_name) {
      var controls = get_control_row(control_name)
        .stop(true)
        .slideDown();

      controls
        .find("input, select")
        .attr("disabled", false);

      controls
        .find("select[multiple=multiple]")
        .attr("data-disabled", false);

      if (control_name === "compare") {
        can_compare = true;
      }
    });

    var all_inputs = _.uniq(_.flatten(helpers.inputs));
    var exclude = _.difference(all_inputs, input_schema.include);

    _.each(exclude, function(control_name) {
      var controls = get_control_row(control_name)
        .stop(true)
        .slideUp();

      controls
        .find("input[multiple!=multiple], select[multiple!=multiple]")
        .attr("disabled", true);

      controls
        .find("select[multiple=multiple]")
        .attr("data-disabled", true);

        if (control_name === "compare") {
          can_compare = false;
        }
    });

    if (can_compare) {
      $(".compare_filter").slideDown();
    } else {
      $(".filter_group[data-filter-type=compare]").slideUp();
      $(".compare_filter").slideUp(function() {
        $(this).html("Add comparison filter");
      });
    }
  }
}


function insert_error(query, err) {
  console.log(err);

  $(get_container(query)).empty();

  var errorEl = $("<div class='clearfix' style='vertical-align: bottom'>");
  errorEl.append($("<img src='/images/no-diving.png' style='height: 60%'>"));
  errorEl.append($("<h1 class='span2'>Doh.</h1>"));
  errorEl.append($("<div class='clearfix' />"));
  errorEl.append($("<hr />"));
  errorEl.append($("<h2 class='span12'>").html(err.name));
  errorEl.append($("<h3 class='span12'>").html(err.errmsg));

  $(get_container(query)).append(errorEl);
}

function no_samples(data, error) {
  insert_error(data, {
    name: "No Samples Found",
    errmsg: error || "Your query returned no samples, try expanding the time range or removing some filters."
  });
}

SF.on("query:no_samples", function(data) {
  console.log("NO SAMPLES");
  no_samples(data, (data && data.error));
});


var graphs = {};
function create_graph(Grapher, data, throbber) {

  var graphEl = $("<div>");
  var graph = new Grapher({
    el: graphEl,
    throbber: throbber,
    compare_mode: data.parsed.compare_mode,
    widget: _widget});

  get_container(data).empty();
  graphEl.appendTo(get_container(data));
  graph.handle_data(data);

  graphs[data.parsed.id] = graph;

  // TODO: do we delay if comparison mode is on but no results come back?
  var compare = ResultsStore.get_compare_data(data.parsed.id);
  if (compare) {
    graph.handle_compare(compare);
  }
}

function insert_new_graph(graph_type, data, throbber) {
  var graph_view = GRAPHERS[graph_type];
  var comparison;

  if (graph_view) {
    return create_graph(graph_view, data, throbber);
  }

  // TODO: verify the failure path works at some point.
  if (!graph_view) {
    $C("views/" + graph_type, function(cmp) {
      console.log("LOADING EXTERNAL VIEW", cmp);
      create_graph(cmp, data, throbber);
      GRAPHERS[graph_type] = cmp;
    });
  }
}

function insert_comparison(graph_type, data) {
  var graph = graphs[data.parsed.id];
  if (graph) {
    graph.handle_compare(data);
  }
}

function show_saved_query_details(id, data, force) {
  if (!data) {
    return;
  }

  var created = ResultsStore.get_timestamp(id) || data.updated || data.created;
  var options = {created: created, query: data };

  if (!_widget) {
    options.title = data.title;
    options.description = data.description;
  }

  options.show_timestamp = Date.now() - created > 5 * 60 * 1000;

  if (typeof force !== "undefined") {
    options.show_timestamp = force;
    if (!force) {
      return;
    }
  }

  var container = get_container(data);
  $C("query_details", options, function(cmp) {
    container.prepend(cmp.$el);
  });
}

function redraw_graph(id, query, show_details) {
  $(get_container(query)).empty();

  var data = ResultsStore.get_results_data(id);
  var compare = ResultsStore.get_compare_data(id);

  console.log("Redrawing graph", id, data);

  if (!data) {
    console.log("Cant redraw graph: ", id, data);
    return false;
  }

  var type = data.parsed.view;

  show_saved_query_details(id, query, show_details);

  if (compare) {
    insert_comparison(type, compare);
  }
  insert_new_graph(type, data);

  return true;
}

function update_control(name, value) {
  var control = get_control(name).find(":input");
  control.val(value);
  control.trigger("liszt:updated");
}

module.exports = {
  update_controls: handle_update_view,
  insert_graph: insert_new_graph,
  insert_comparison: insert_comparison,
  insert_error: insert_error,
  redraw: redraw_graph,
  GRAPHS: GRAPHERS,
  QUERIES: QUERIES,
  set_control: update_control,
  get_control: get_control_value,
  set_default_container: function(container) {
    _container = container;
  },
  set_container: function(container, query) {
    if (!query) { return; }

    var server_id = ResultsStore.to_server(query.clientid) || ResultsStore.to_server(query.parsed.id);
    _containers[server_id] = container;
  },
  set_widget: function(widget) { _widget = widget; },
  VIEWS: VIEW_INPUTS,
  show_query_details: show_saved_query_details
};
