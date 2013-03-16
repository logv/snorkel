"use strict";

var helpers = require("client/views/helpers");
var BaseView = require("client/views/base_view");

function row_key(group_by, result) {
  var row = [];
  _.each(group_by, function(group) {
    row.push(result._id[group]);
  });

  
  return row.join(",");
}

var TableView = BaseView.extend({
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
  }

}, {
  icon: "noun/table.svg"
});

module.exports = TableView;
