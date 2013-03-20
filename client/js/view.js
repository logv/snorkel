"use strict";

var helpers = require("client/views/helpers");

var _container;

// TODO: Push these into views instead of toplevel?
var STD_INPUTS = [
  "start", "end", "group_by", "max_results", "fieldset", "agg"
];

var STD_EXCLUDES = [
  "field", "time_bucket", "hist_bucket"
];

var VIEW_INPUTS = {
  "table" : {
    include: STD_INPUTS.concat(["compare"]),
    exclude: STD_EXCLUDES,
    icon: "noun/table.svg"
  },
  "time" : {
    include: STD_INPUTS.concat(["time_bucket", "compare"]),
    exclude: ["field", "hist_bucket"],
    icon: "noun/line.svg"
  },
  "dist" : { 
    include: STD_INPUTS.concat(["field", "hist_bucket", "compare"]),
    exclude: [ "group_by", "max_results", "agg", "fieldset", "time_bucket" ],
    icon: "noun/dist.svg"
  },
  "samples" : {
    include: STD_INPUTS,
    exclude: [ "group_by", "compare", "agg", "field", "fieldset", "compare", "time_bucket", "hist_bucket" ],
    icon: "noun/pin.svg"
  }
};

var ResultsStore = require("client/js/results_store");

function get_control(name) {
  var selector = "#query_sidebar .controls[name=" + name + "]";
  var ctl = $(selector);

  return ctl;
}

function get_control_row(name) {
  var row = get_control(name).parents(".control-group");

  return row;
}

function handle_update_view(view) {
  var input_schema = VIEW_INPUTS[view];

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


var TimeView = require("client/views/time_view");
var TableView = require("client/views/table_view");
var DistView = require("client/views/dist_view");
var SamplesView = require("client/views/samples_view");
var graphers = {
  time: TimeView,
  table: TableView,
  dist: DistView,
  samples: SamplesView
};



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
  var graph_view = graphers[graph_type];
  var comparison;

  if (graph_view) {
    return create_graph(graph_view, data);
  }

  // TODO: verify the failure path works at some point.
  if (!graph_view) {
    $C("views/" + graph_type, function(cmp) {
      console.log("LOADING EXTERNAL VIEW", cmp);
      create_graph(cmp, data);
      graphers[graph_type] = cmp;
    });
  }
}

function insert_comparison(graph_type, data) {
  var graph = graphs[data.parsed.id];
  if (graph) {
    graph.handle_compare(data);
  }
}

function show_saved_query_details(id, created, data) {
  $C("query_details", {created: created, query: data}, function(cmp) {
    _container.prepend(cmp.$el);
  });
}

function redraw_graph(id, query) {
  $(_container).empty();

  var data = ResultsStore.get_results_data(id);
  var compare = ResultsStore.get_compare_data(id);

  if (!data) {
    console.log("Cant redraw graph: ", id);
    return;
  }

  var type = data.parsed.view;

  var timestamp = ResultsStore.get_timestamp(id);
  // If the query is more than 5 minutes old, display a notice to the user
  var delta = Date.now() - timestamp;
  if (delta > 60 * 5 * 1000) {
    console.log("query is out of date: ", delta);
    // Show a 'refresh query' button (and add historical results, eventually)
    show_saved_query_details(id, timestamp, query);
  }

  if (compare) {
    insert_comparison(type, compare);
  }
  insert_new_graph(type, data);
}

module.exports = {
  update_controls: handle_update_view,
  insert_graph: insert_new_graph,
  insert_comparison: insert_comparison,
  insert_error: insert_error,
  redraw: redraw_graph,
  set_container: function(container) { _container = container; },
  VIEWS: VIEW_INPUTS
};
