"use strict";

var filter_helper = require("controllers/query/filters");
var helpers = require("client/views/helpers");
var BaseView = require("client/views/base_view");

function row_key(group_by, result) {
  var row = [];
  _.each(group_by, function(group) {
    row.push(result._id[group]);
  });


  return row.join(",");
}

function get_wrapper_for_cell(el) {
  var $el = $(el);
  if (!$el.is("td")) {
    $el = $el.parents("td");
  }

  return $el;
}

function get_field_type_for_cell(el) {
  var $td = get_wrapper_for_cell(el);
  var $th = $td.closest('table').find('th').eq($td.index());

  var col_name = $th.text();
  var col_type = filter_helper.get_field_type(col_name);

  return col_type;
}

function get_field_name_for_cell(el) {
  var $td = get_wrapper_for_cell(el);
  var $th = $td.closest('table').find('th').eq($td.index());

  var col_name = $th.text();

  return col_name;
}

function get_filter_for_popup(el) {
  // ugh, aunt and uncle datas?
  var wrapper = get_wrapper_for_cell(el).find(".cell_data");


  var op = el.attr("data-op");
  var name = wrapper.attr("data-name");
  var filter_type = wrapper.attr("data-type");
  var value = wrapper.attr("data-value");

  var filter = [filter_type + "." + name, op, value];

  return filter;

}

function get_filter_for_cell(el) {
  var field_type = get_field_type_for_cell(el);
  var field_name = get_field_name_for_cell(el);
  var op = "$regex";

  var value;
  if (el.find(".cell_data").length) {
    value = el.find(".cell_data").attr("data-value");
  } else {
    value = el.html();
  }

  return [field_type + "." + field_name, op, value];
}

var TableView = BaseView.extend({
  events: {
    "click td" : "handle_cell_clicked",
    "click .popover a.option" : "handle_popover_filter_clicked",
    "click .popover a.view" : "handle_popover_view_clicked"
  },

  finalize: function() {
    if (!this.data.results.length) {
      return "No Samples";
    }

    var group_by = _.clone(this.data.parsed.dims);
    var cols = _.clone(this.data.parsed.cols);

    // TODO: something
    cols.unshift("count"); // modifies cols column

    if (this.data.parsed.weight_col) {
      cols.unshift("weighted_count");
    }

    var headers = [];
    _.each(group_by.concat(cols), function(col) {
      headers.push(col);
    });

    var rows = [];
    var compare_row_hash = {};
    var compare = this.data.parsed.compare_mode;

    if (compare) {
      _.each(this.compare_data.results, function(result) {
        var key = row_key(group_by, result);
        compare_row_hash[key] = result;
      });
    }

    _.each(this.data.results, function(result) {
      var key = row_key(group_by, result);
      var row = [];
      _.each(group_by, function(group) {
        row.push(result._id[group]);
      });


      var compare_result = compare_row_hash[key];
      _.each(cols, function(col) {
        var col_value = result[col];
        var cell_div;
        if (compare) {
          var compare_value = (compare_result && compare_result[col]) || 0;
          cell_div = helpers.build_compare_cell(col_value, compare_value);
        } else {
          cell_div = helpers.build_compare_cell(col_value);
        }

        row.push(cell_div);
      });

      rows.push(row);

    });

    this.headers = headers;
    this.rows = rows;

  },

  render: function() {

    var table = helpers.build_table(this.headers, this.rows);

    this.$el
      .append(table)
      .fadeIn();

    return table;
  },

  handle_cell_clicked: function(evt) {
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


    var col_name = $th.text();
    var col_type = filter_helper.get_field_type(col_name);

    div.attr("data-value", $td.find(".value_cell").attr("data-value") || $td.html());
    div.attr("data-name", col_name);
    div.attr("data-type", col_type);
    $td.append(div);

    _.delay(function() {
        jank.once("page:clicked", function() {
          div.popover('destroy');
          div.remove();
        });
      }, 200);

    var that = this;
    $C("table_popover", { type: col_type, name: col_name, row: $td.parents("tr"), cell: $td }, function(cmp) {
      that.popover = cmp;
      div.popover({
        trigger: 'manual',
        placement: 'bottom',
        content: cmp.$el,
        html: true
      }).popover('show');
    });
  },

  handle_popover_filter_clicked: function(evt) {
    var el = $(evt.target);
    if (!el.hasClass("option")) {
      el = el.parents(".option");
    }

    var filter = get_filter_for_popup(el);

    filter_helper.add_or_update([filter]);
    filter_helper.add_or_update([filter], true);
  },

  handle_popover_view_clicked: function(evt) {
    var el = $(evt.target);
    if (!el.hasClass("view")) {
      el = el.parents(".view");
    }

    var row = this.popover.options.row;
    var filters = [];
    _.each(row.find("td"), function(td) {
      var $td = $(td);
      var type = get_field_type_for_cell($td);
      if (type === "string") {
        var filter = get_filter_for_cell($td);
        filters.push(filter);
      }
    });

    filter_helper.add_or_update(filters);

    if (jank.controller().compare_mode()) {
      filter_helper.add_or_update(filters, true);
      jank.controller().show_compare_filters();
    }

    var to_view = el.attr("data-view");

    var agg;
    var field = get_field_name_for_cell(this.popover.options.cell);
    var fields = [field];
    if (to_view === "time_count") {
      to_view = "time";
      field = "";
      fields = [];
      agg = "$count";
    }

    if (field) {
      jank.controller().trigger("set_control", "field", field);
      jank.controller().trigger("set_control", "fieldset", fields);
    }

    if (agg) {
      jank.controller().trigger("set_control", "agg", agg);
    }


    jank.controller().trigger("swap_panes", false);
    jank.controller().trigger("switch_views", to_view);

    // update location
  }

}, {
  icon: "noun/table.svg"
});

module.exports = TableView;
