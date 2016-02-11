"use strict";

var context = require_core("server/context");
var template = require_core("server/template");
var bridge = require_core("server/bridge");
var page = require_core("server/page");


var backend = require_app("server/backend");
var metadata = require_app("server/metadata");
var view_helper = require_app("client/views/helpers");
var $ = require("cheerio");

var BLACKLIST = require_app("controllers/query/filters").BLACKLIST;

var GROUPABLE_TYPE = "string";
var AGGREGABLE_TYPE = "integer";
var SET_TYPE = "set";


var HELP_STRINGS = {
  "start" : {
    content: "all samples newer than the start time will be aggregated"
  },
  "end" : {
    content: "all samples that are from before the end time will be aggregated"
  },
  "compare" : {
    content: "re-run this query, but with the start and end time shifted by this amount. the final results are compared to the original query and summarized "
  },
  "group_by" : {
    content: "groups the data into several sub groups before calculating the final metric"
  },
  "sort_by" : {
    content: "sometimes, you just wanna sort shit"
  },
  "max_results" : {
    content: "after grouping the data, select a limit to the number of results we want to see. The higher this number, the slower the query (and graph drawing) will be. By default, snorkel will pick a reasonable number. "
  },
  "field" : {
    content: "use this field to calculate the final metric"
  },
  "fieldset" : {
    content: "use these fields when calculating the final metric"
  },
  "agg" : {
    content: "summarizes the samples in each group into one aggregate number for the integer fields selected"
  },
  "time_bucket" : {
    content: ""
  },
  "hist_bucket" : {
    content: "histograms are a tricky thing. the bucket size will influence the shape of the histogram, so try out a few when examining data."
  },
  "stacking" : {
    content: "by default, integer columns are laid out side by side. Turning stacking on will stack them on top of each other, turning each group by result into one stack of values"
  }
};

function add_control(control_name, control_label, component, options) {

  options = options || {};

  var help_link;
  var help_str = HELP_STRINGS[control_name];
  if (help_str) {
    help_link = $C("helpover", { title: help_str.title, content: help_str.content }).toString();
  }

  var html = template.partial("query/control_row.html.erb", {
    name: control_name,
    label: control_label,
    component: component.toString(),
    space: options.space,
    help_link: help_link
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
      "samples" : "Samples",
      "" : "--",
      "bar"  : "Bar Chart",
      "area" : "Stacked Area",
      "multidist" : "Grouped Dist.",
      "scatter" : "Scatter Plot",
      "drill" : "Drilldown",
      "overview" : "Overview"
    },
    delegate: {
      "change": "view_changed"
    }
  });
  return add_control("view", "View", view_selector.toString());
}

function get_table_selector() {
  return page.async(function(flush_data) {
    metadata.all(function(configs) {
      backend.get_tables(function(tables) {
        var table_options = {};

        _.each(tables, function(table) {
          table_options[table.table_name] = table.table_name;

          var config = configs[table.table_name];
          if (config) {
            table_options[table.table_name] = config.metadata.display_name || table.table_name;
          }
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
  "-2 weeks",
  "-3 weeks",
  "-4 weeks"
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

  var opts = ["", "-1 hour", "-3 hours", "-6 hours", "-1 day", "-1 week", "-2 weeks"];
  var compare_time = $C("selector", {
    name: "compare",
    selected: "",
    options: dict(opts)
  });


  var start_row = add_control("start", "Start", start_time.toString());
  var end_row = add_control("end", "End", end_time.toString());
  var compare_row = add_control("compare", "Against", compare_time.toString());

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
  "auto" : 0,
  "1 min" : 60,
  "5 min" : 300,
  "10 min" : 600,
  "30 min" : 30 * 60,
  "1 hour" : 60 * 60,
  "3 hours" : 3 * 60 * 60,
  "6 hours" : 6 * 60 * 60,
  "daily" : 24 * 60 * 60
};

function get_time_field_input(cols) {
  var integer_names = {};
  _.each(cols, function (cc) { integer_names[cc.name] = cc.display_name || cc.name; });
  var field_selector = $C("selector", {
    name: 'time_field',
    options: integer_names,
    selected: "time"
  });
  return add_control('time_field', 'Time Field', field_selector.toString());
}

function get_time_bucket_row() {
  var opts = _.invert(time_bucket_opts);
  var max_results_input = $C("selector", { name: "time_bucket", options: opts });
  return add_control("time_bucket", "Time Slice", max_results_input.toString());
}

var hist_bucket_opts = [
  "auto",
  "10",
  "20",
  "50",
  "100",
  "200",
  "500",
  "1000",
  "10000",
  "100000"
]

function get_hist_bucket_row() {
  var opts = {};
  _.each(hist_bucket_opts, function(o) { opts[o] = o; });
  var max_results_input = $C("selector", { name: "hist_bucket", options: opts, selected: "auto", order:  hist_bucket_opts});
  return add_control("hist_bucket", "Bucket", max_results_input.toString());
}

function get_stacking_row() {
  var opts = {
    "normal" : "Off",
    "stacked" : "On"
  };

  var stack_input = $C("selector", { name: "stacking", options: opts });
  return add_control("stacking", "Stacking", stack_input.toString());

}

function get_sort_by_row(sort_columns) {
  var sort_names = {};
  sort_names[""] = "Count";
  _.each(sort_columns, function(m) { sort_names[m.name] = m.display_name || m.name; });


  var sort_by_selector = $C("selector", { name: "sort_by", options: sort_names });
  var sort_by_row = add_control("sort_by", "Sort By", sort_by_selector.toString(), {
    space: true });

  return sort_by_row;
}

function get_group_by_row(group_columns) {
  var group_names = {};
  _.each(group_columns, function(m) { group_names[m.name] = m.display_name || m.name; });

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
  var aggregate_row = add_control("agg", "Metric", agg_selector.toString(), { space: true });
  return $(aggregate_row);
}

function get_field_row(agg_columns, name, display_name) {
  var agg_names = {};
  _.each(agg_columns, function(m) { agg_names[m.name] = m.display_name || m.name; });

  var field_selector = $C("selector", {
    name: name || "field",
    options: agg_names
  });
  return add_control(name || "field", display_name || "Field", field_selector.toString());
}

function get_fieldset_row(agg_columns) {
  var agg_names = {};
  _.each(agg_columns, function(m) { agg_names[m.name] = m.display_name || m.name; });

  var field_selector = $C("multiselect", {
    name: "fieldset",
    options: agg_names
  });
  return add_control("fieldset", "Fields", field_selector.toString());
}

function get_controls(columns) {
  var control_box = $("<div>");

  var groupable_columns = _.filter(columns, function(col) {
    return col.final_type === GROUPABLE_TYPE && col.hidden !== 'true';
  });

  var agg_columns = _.filter(columns, function(col) {
    return col.final_type === AGGREGABLE_TYPE && col.hidden !== 'true';
  });

  var tag_columns = _.filter(columns, function(col) {
    return col.final_type === SET_TYPE && col.hidden !== 'true';
  });

  var time_field_columns = _.filter(columns, function (col) {
    return col.final_type == AGGREGABLE_TYPE && col.hidden !== 'true';
  });

  var table_row = get_table_row();
  table_row.addClass("visible-phone");
  control_box.append(table_row);

  control_box.append(get_view_selector_row());

  control_box.append(get_time_inputs());
  control_box.append(get_time_field_input(time_field_columns));
  control_box.append($("<div id='rollup' style='position: relative; top: -40px'>"));
  control_box.append(get_group_by_row(groupable_columns));
  control_box.append(get_sort_by_row(agg_columns));
  control_box.append(get_max_results_row());
  control_box.append(get_time_bucket_row());
  control_box.append(get_hist_bucket_row());
  control_box.append(get_aggregate_row());
  control_box.append(get_field_row(agg_columns));
  control_box.append(get_field_row(agg_columns, "field_two", "Field (2)"));
  control_box.append(get_fieldset_row(agg_columns));
  control_box.append(get_stacking_row());

  return control_box.toString();
}

module.exports = {
  get_filters: function() {
    return page.async(function(flush_data) {

      metadata.get(context("query_table"), function(config) {
        var columns = config.metadata.columns;

        var typed_fields = {};
        _.each(columns, function(field) {
          if (BLACKLIST[field.name] || BLACKLIST[field.final_type] || field.hidden === 'true') {
            return;
          }

          typed_fields[field.type_str + "." + field.name] = field.display_name || field.name;
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
      metadata.get(context("query_table"), function(config) {
        var controls = get_controls(config.metadata.columns);
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
