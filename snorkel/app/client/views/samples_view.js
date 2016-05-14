"use strict";

var helpers = require("app/client/views/helpers");
var BaseView = require("app/client/views/base_view");
var presenter = require("app/client/views/presenter");
var filter_helper = require("app/controllers/query/filters");

var SamplesView = BaseView.extend({
  baseview: helpers.VIEWS.SAMPLES, 
  events: {
    "click td" : "handle_cell_clicked",
    "click .popover a.option" : "handle_popover_filter_clicked",
    "click .popover a.view" : "handle_popover_view_clicked"
  },
  prepare: function(data) {
    // Samples are broken up into raw samples of
    // integer, string, set types
    var cols = {
      "integer" : {},
      "string" : {},
      "set" : {}
    }; 

    var lookup = {};

    // assume that first sample is full row? or just do two passes?
    _.each(data.results, function(result) {
      _.each(result.integer, function(val, field) {
        cols.integer[field] = true;
        lookup[field] = "integer";
      });
      _.each(result.set, function(val, field) {
        cols.set[field] = true;
        lookup[field] = "set";
      });
      _.each(result.string, function(val, field) {
        cols.string[field] = true;
        lookup[field] = "string";
      });
    });

    var headers = [];
    var integer_cols = Object.keys(cols.integer);
    var string_cols = Object.keys(cols.string);
    var set_cols = Object.keys(cols.set);
    var dataset = this.table;

    integer_cols.sort();
    set_cols.sort();
    string_cols.sort();


    var all_cols = string_cols.concat(integer_cols).concat(set_cols);
    _.each(all_cols, function(col) {
      headers.push(col);
    });

    var rows = [];
    _.each(data.results, function(result) {
      var row = [];
      _.each(all_cols, function(field) {
        var types = result[lookup[field]];
        if (!types) {
          row.push("");
          return;
        }

        var value = result[lookup[field]][field];

        row.push(value);
      });

      rows.push(row);
    });

    return {
      rows: rows,
      headers: headers
    };
  },

  finalize: function() {
    if (!this.data.rows.length) {
      return "No Samples";
    }
  },

  render: function() {
    var table = helpers.build_table(this.table, this.data.headers, this.data.rows, SF.controller().get_fields(this.table));

    this.$el
      .append(table)
      .fadeIn();
  },

  handle_popover_filter_clicked: function(evt) {
    var el = $(evt.target);
    if (!el.hasClass("option")) {
      el = el.parents(".option");
    }

    var filter = helpers.get_filter_for_popup(el);

    filter_helper.add_or_update([filter], [filter]);
  },

  handle_popover_view_clicked: function(evt) {
    var el = $(evt.target);
    if (!el.hasClass("view")) {
      el = el.parents(".view");
    }

    var table = this.table;

    var row = this.popover.options.row;
    var filters = [];
    _.each(row.find("td"), function(td) {
      var $td = $(td);
      var type = helpers.get_field_type_for_cell(table, $td);
      if (type === "string") {
        var filter = helpers.get_filter_for_cell(table, $td);
        filters.push(filter);
      }
    });


    if (filters.length) {
      if (SF.controller().compare_mode()) {
        filter_helper.add_or_update(filters, filters);
        SF.controller().show_compare_filters();
      } else {
        filter_helper.add_or_update(filters);
      }
    }

    var to_view = el.attr("data-view");

    var agg;
    var field = helpers.get_field_name_for_cell(this.table, this.popover.options.cell);
    var fields = [field];

    if (to_view === "time_count") {
      to_view = "time";
      field = "";
      fields = [];
      agg = "$count";
    }

    if (field) {
      SF.controller().trigger("set_control", "field", field);
      SF.controller().trigger("set_control", "fieldset", fields);
    }

    if (agg) {
      SF.controller().trigger("set_control", "agg", agg);
    }


    SF.controller().trigger("swap_panes", false);
    SF.controller().trigger("switch_views", to_view);

    // update location
  },

  handle_cell_clicked: function(evt) {
    if (this.options.widget) {
      return;
    }

    if ($(evt.target).parents(".popover").length) {
      return;
    }

    var $td = $(evt.target);
    if (!$td.is("td")) {
      $td = $td.parents("td");
    }

    // http://stackoverflow.com/questions/3523770/how-can-i-get-the-corresponding-table-header-th-from-a-table-cell-td
    var $th = $td.closest('table').find('th').eq($td.index());

    var div = $("<div class='cell_data'>");


    var col_name = $th.attr('data-name');
    var col_type = presenter.get_field_type(this.table, col_name);
    var col_value = $td.find(".value_cell").attr("data-value") || $td.html();

    div.attr("data-value", col_value);
    div.attr("data-name", col_name);
    div.attr("data-type", col_type);

    $td.append(div);

    _.delay(function() {
        SF.once("page:clicked", function() {
          div.popover('destroy');
          div.remove();
        });
      }, 200);

    var that = this;
    $C("table_popover", 
      { type: col_type, name: col_name, row: $td.parents("tr"), cell: $td}, 
      function(cmp) {
        that.popover = cmp;
        div.popover({
          trigger: 'manual',
          placement: 'bottom',
          content: cmp.$el,
          html: true
        }).popover('show');
      });
  }
}, {
  icon: "noun/pin.svg"
});

SF.trigger("view:add", "samples",  {
  include: helpers.inputs.TIME_INPUTS
    .concat(helpers.inputs.LIMIT),
  icon: "noun/pin.svg"
}, SamplesView);

module.exports = SamplesView;
