"use strict";

var helpers = require("client/views/helpers");

var _container;

var STD_INPUTS = helpers.STD_INPUTS;
var STD_EXCLUDES = helpers.STD_EXCLUDES;
var VIEW_INPUTS = {
};
var GRAPHERS = {};


jank.on("view:add", function(view, details, view_class) {
  if (VIEW_INPUTS[view]) {
    console.log("Warning, trying to redefine", view, "as a view");
  }

  console.log("Adding view:", view, details);

  VIEW_INPUTS[view] = details;
  GRAPHERS[view] = view_class;
});

// Requiring these here has this side effect of adding them to the list of
// views we can use.
var TimeView = require("client/views/time_view");
var TableView = require("client/views/table_view");
var DistView = require("client/views/dist_view");
var SamplesView = require("client/views/samples_view");
var ScatterView = require("client/views/scatter_view");
var AreaView = require("client/views/area_view");
var BarView = require("client/views/bar_view");
var ResultsStore = require("client/js/results_store");

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

    _.each(input_schema.exclude, function(control_name) {
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


function insert_error(err) {
  console.log(err);

  $(_container).empty();

  var errorEl = $("<div class='clearfix' style='vertical-align: bottom'>");
  errorEl.append($("<img src='images/no-diving.png' style='height: 60%'>"));
  errorEl.append($("<h1 class='span2'>Doh.</h1>"));
  errorEl.append($("<div class='clearfix' />"));
  errorEl.append($("<hr />"));
  errorEl.append($("<h2 class='span12'>").html(err.name));
  errorEl.append($("<h3 class='span12'>").html(err.errmsg));

  console.log(errorEl);

  $(_container).append(errorEl);
}

function no_samples(error) {
  insert_error({
    name: "No Samples Found",
    errmsg: error || "Your query returned no samples, try expanding the time range or removing some filters."
  });
}

jank.on("query:no_samples", function() {
  console.log("NO SAMPLES");
  no_samples();
});


var graphs = {};
function create_graph(Grapher, data) {
  var graphEl = $("<div>");
  var graph = new Grapher({
    el: graphEl,
    compare_mode: data.parsed.compare_mode });

  $(_container).empty();
  graphEl.appendTo(_container);
  graph.handle_data(data);

  graphs[data.parsed.id] = graph;

  // TODO: do we delay if comparison mode is on but no results come back?
  var compare = ResultsStore.get_compare_data(data.parsed.id);
  if (compare) {
    graph.handle_compare(compare);
  }
}

function insert_new_graph(graph_type, data) {
  var graph_view = GRAPHERS[graph_type];
  var comparison;

  if (graph_view) {
    return create_graph(graph_view, data);
  }

  // TODO: verify the failure path works at some point.
  if (!graph_view) {
    $C("views/" + graph_type, function(cmp) {
      console.log("LOADING EXTERNAL VIEW", cmp);
      create_graph(cmp, data);
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

function show_saved_query_details(id, data) {
  var created = ResultsStore.get_timestamp(id);
  data = data || {};
  var options = {created: created, query: data, title: data.title, description: data.description};

  options.show_timestamp = Date.now() - created > 5 * 60 * 1000;
  $C("query_details", options, function(cmp) {
    _container.prepend(cmp.$el);
  });
}

function redraw_graph(id, query) {
  $(_container).empty();

  var data = ResultsStore.get_results_data(id);
  var compare = ResultsStore.get_compare_data(id);

  if (!data) {
    console.log("Cant redraw graph: ", id);
    return false;
  }

  var type = data.parsed.view;

  show_saved_query_details(id, query);

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
  set_control: update_control,
  get_control: get_control_value,
  set_container: function(container) { _container = container; },
  VIEWS: VIEW_INPUTS,
  show_query_details: show_saved_query_details
};
