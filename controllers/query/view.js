"use strict";

var context = require_root("server/context");
var backend = require_root("server/backend");
var template = require_root("server/template");
var bridge = require_root("server/bridge");
var page = require_root("server/page");
var view_helper = require_root("client/views/helpers");
var $ = require("cheerio");

var BLACKLIST = require_root("controllers/query/filters").BLACKLIST;

var GROUPABLE_TYPE = "string";
var AGGREGABLE_TYPE = "integer";

function add_control(control_name, control_label, component, options) {

  options = options || {};
  var html = template.partial("query/control_row.html.erb", {
    name: control_name,
    label: control_label,
    component: component.toString(),
    space: options.space
  });



  return $(html);
}

function get_view_selector_row() {
  var view_selector = $C("selector", {
    name: "view",
    options: {
      "table" : "Table",
      "time" : "Time Series",
      "dist" : "Distribution",
      "samples" : "Samples"
    },
    delegate: {
      "change": "view_changed"
    }
  });
  return add_control("view", "View", view_selector.toString());
}

function get_table_selector() {
  return page.async(function(flush_data) {
    backend.get_tables(function(tables) {
      var table_options = {};

      _.each(tables, function(table) {
        if (table.table_name === "undefined") { return; }

        table_options[table.table_name] = table.table_name;
      });

      var cmp = $C("selector", {
        name: "table",
        options: table_options,
        selected: context("query_table"),
        delegate: {
          "change" : "table_changed"
        }
      });

      flush_data(cmp.toString());
    });
  });
}

function get_table_row() {
  return add_control("table", "Table", get_table_selector()());
}

var time_opts = [
  "-1 hour",
  "-3 hours",
  "-6 hours",
  "-12 hours",
  "-1 day",
  "-3 days",
  "-1 week",
  "-2 weeks"
];

function dict(arr) {
  return _.object(arr, arr);
}

function get_time_inputs() {
  // TIME INPUTS
  var start_time = $C("selector", {
    name: "start",
    selected: "-1 week",
    options: dict(time_opts)
  });

  var cloned_opts = _.clone(time_opts);
  cloned_opts.unshift("Now");
  cloned_opts.pop();
  cloned_opts.pop();

  var end_time = $C("selector", {
    name: "end",
    selected: "Now",
    options: dict(cloned_opts)
  });

  var opts = ["", "-1 hour", "-3 hours", "-6 hours", "-1 day", "-1 week"];
  var compare_time = $C("selector", {
    name: "compare",
    selected: "-1 week",
    options: dict(opts)
  });


  var start_row = add_control("start", "Start", start_time.toString());
  var end_row = add_control("end", "End", end_time.toString());
  var compare_row = add_control("compare", "Compare Against", compare_time.toString());

  var control_box = $("<div />");

  control_box.append($("<div id='time_inputs' style='position: relative; top: -40px'>"));
  control_box.append($("<hr />"));
  control_box.append($(start_row));
  control_box.append($(end_row));
  control_box.append($(compare_row));

  return control_box;
}

function get_max_results_row() {
  var max_results_input = $C("textinput", { name: "max_results" });
  return add_control("max_results", "Limit", max_results_input.toString());
}

// expressed in seconds
var time_bucket_opts = {
  "auto" : "",
  "1 min" : 60,
  "5 min" : 300,
  "10 min" : 600,
  "30 min" : 30 * 60,
  "1 hour" : 60 * 60,
  "3 hours" : 3 * 60 * 60,
  "6 hours" : 6 * 60 * 60,
  "daily" : 24 * 60 * 60
};

function get_time_bucket_row() {
  var opts = {};
  _.each(time_bucket_opts, function(bucket, name) { opts[bucket] = name; });
  var max_results_input = $C("selector", { name: "time_bucket", options: opts });
  return add_control("time_bucket", "Granularity", max_results_input.toString());
}

var hist_bucket_opts = [
  "10",
  "100",
  "1000",
  "10000",
  "100000"
]

function get_hist_bucket_row() {
  var opts = {};
  _.each(hist_bucket_opts, function(o) { opts[o] = o; });
  var max_results_input = $C("selector", { name: "hist_bucket", options: opts });
  return add_control("hist_bucket", "Bucket", max_results_input.toString());
}

function get_group_by_row(group_columns) {
  var group_names = {};
  _.each(group_columns, function(m) { group_names[m.name] = m.name; });

  var group_by_selector = $C("multiselect", { name: "group_by", options: group_names });
  var group_by_row = add_control("group_by", "Group By", group_by_selector.toString(), {
    space: true });

  return group_by_row;
}


function get_aggregate_row() {
  // AGGREGATE INPUTS
  var agg_selector = $C("selector", {
    name: "agg",
    options: {
      "$avg" : "Average",
      "$sum" : "Sum",
      "$count" : "Count"
    }
  });
  var aggregate_row = add_control("agg", "Aggregate", agg_selector.toString(), { space: true });
  return $(aggregate_row);
}

function get_field_row(agg_columns) {
  var agg_names = {};
  _.each(agg_columns, function(m) { agg_names[m.name] = m.name; });

  var field_selector = $C("selector", {
    name: "field",
    options: agg_names
  });
  return add_control("field", "Field", field_selector.toString());
}

function get_fieldset_row(agg_columns) {
  var agg_names = {};
  _.each(agg_columns, function(m) { agg_names[m.name] = m.name; });

  var field_selector = $C("multiselect", {
    name: "fieldset",
    options: agg_names
  });
  return add_control("fieldset", "Fields", field_selector.toString());
}

function get_controls(columns) {
  var control_box = $("<div>");

  var groupable_columns = _.filter(columns, function(col) {
    return col.type_str === GROUPABLE_TYPE;
  });

  var agg_columns = _.filter(columns, function(col) {
    return col.type_str === AGGREGABLE_TYPE && col.name !== "time";
  });

  var tag_columns = _.filter(columns, function(col) {
    return col.type_str.match("set_");
  });


  var table_row = get_table_row();
  table_row.addClass("visible-phone");
  control_box.append(table_row);

  control_box.append(get_view_selector_row());

  control_box.append(get_time_inputs());

  control_box.append($("<div id='rollup' style='position: relative; top: -40px'>"));
  control_box.append(get_group_by_row(groupable_columns));
  control_box.append(get_max_results_row());
  control_box.append(get_time_bucket_row());
  control_box.append(get_hist_bucket_row());
  control_box.append(get_aggregate_row());
  control_box.append(get_field_row(agg_columns));
  control_box.append(get_fieldset_row(agg_columns));

  return control_box.toString();
}

module.exports = {
  get_filters: function() {
    return page.async(function(flush_data) {

      backend.get_columns(context("query_table"), function(columns) {
        var typed_fields = {};
        _.each(columns, function(field) {
          if (BLACKLIST[field.name] || BLACKLIST[field.type_str]) {
            return;
          }

          typed_fields[field.type_str + "." + field.name] = field.name;
        });

        var filter_row = $C("filter_row", { fields: typed_fields });
        var compare_filter_row = $C("filter_row", { fields: typed_fields });

        var filter_box = $("<div class='filter_group query_filters'>");
        var compare_filter_box = $("<div class='filter_group compare_filters' data-filter-type='compare'>");
        compare_filter_box.attr("style", "display: none;");

        filter_box.append($(filter_row.toString()));
        compare_filter_box.append($("<hr />"));
        compare_filter_box.append($("<h2>Comparison</h2>"));
        compare_filter_box.append($(compare_filter_row.toString()));

        var filters = $("<div>");
        filters.append(filter_box);
        filters.append(compare_filter_box);


        bridge.controller("query", "set_fields", columns);
        flush_data(filters.toString());
      });

    })(); // resolve this async immediately
  },

  get_controls: function() {
    var view = context("req").query.view || "table";
    // this is how i do data dependencies, :P
    return page.async(function(flush_data) {
      backend.get_columns(context("query_table"), function(columns) {
        var controls = get_controls(columns);
        bridge.controller("query", "update_view", view);
        flush_data(controls.toString());
      });
    })(); // try resolve the async immediately
  },

  get_stats: function() {
    return page.async(function(flush_data) {
      backend.get_stats(context("query_table"), function(stats) {

        function get_stats_box(stats) {
          var box = $("<div class='stats' style='padding-bottom: 100px'/>");
          box.append($("<h2>Stats: </h2>"));
          box.append($("<h4>Dataset Size: </h4>")
            .append(view_helper.byte_format(stats.size)));
          box.append($("<h4>Samples: </h4>")
            .append(view_helper.number_format(stats.count)));
          box.append($("<h4>Average sample size: </h4>")
            .append(view_helper.byte_format(stats.avgObjSize)));
          box.append($("<h4>On Disk Size: </h4>")
            .append(view_helper.byte_format(stats.storageSize)));
          return box.toString();
        }

        var stats_str = "";
        if (stats) {
          // build the stats up here.
          stats_str = get_stats_box(stats);
        }

        flush_data(stats_str);
      });

    })(); // resolve async -> string immediately;
  },

  add_control: add_control,

  table_selector: get_table_selector
};
