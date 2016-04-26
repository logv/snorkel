"use strict";

var helpers = require("app/client/views/helpers");

module.exports = {
  set_fields: function(table, fields) {
    if (!this.metadata) { this.metadata = {}; }
    if (!this.formatters) { this.formatters = {}; }

    this.metadata[table] = fields;
  },

  get_fields: function(table) {
    if (!this.metadata) { this.metadata = {}; }
    return this.metadata[table];
  },

  set_metadata: function(all) {
    if (!this.metadata) { this.metadata = {}; }
    if (!this.formatters) { this.formatters = {}; }

    _.extend(this.metadata, all);
  },

  get_col_attr: function(dataset, col, attr, default_) {
    var col_config = this.metadata[dataset] && this.metadata[dataset][col];
    return (col_config && col_config[attr]) || default_;
  },

  get_field_name: function(dataset, col) {
    return this.get_col_attr(dataset, col, 'display_name', col);
  },

  get_field_type: function(dataset, col) {
    return this.get_col_attr(dataset, col, 'final_type', 'unknown');

  },

  get_field_axis: function(dataset, col) {
    return this.get_col_attr(dataset, col, 'axis');
  },

  get_field_number_formatter: function(dataset, col) {

    var self = this;
    var formatter = function(val) {
      var inner_formatter = self.get_field_formatter(dataset, col);

      var ret = inner_formatter(val);

      try {
        return $(ret).attr("data-transform") || ret;
      } catch(e) {
        return ret;
      }
    };

    return formatter;

  },

  get_field_formatter: function(dataset, col) {
    if (!this.formatters[dataset])  {
      this.formatters[dataset] = {};
    }

    if (!this.formatters[dataset][col]) {

      var col_type = this.get_field_type(dataset, col);
      this.formatters[dataset][col] = function(val) {

        if (col_type === "integer" &&
            (typeof(val) === "string" || typeof(val) === "number")) {
          return helpers.count_format(val);
        }

        return val;
      };

      try {
        var formatter_js = this.get_col_attr(dataset, col, 'formatter');
        if (formatter_js) {
          var args = [ "value", col, formatter_js ];
          var func = Function.apply(null, args);
          this.formatters[dataset][col] = function(value) {
            var val = func.apply(null, [value, value]);
            return $("<div >")
              .attr("data-value", value)
              .attr("data-transform", val)
              .addClass("value_cell")
              .append(val);
          }

        }
      } catch(e) {
        console.log("Couldn't build formatters for", dataset, col, "using default", e);
      }
    }

    return this.formatters[dataset][col];

  },

  get_field_description: function(dataset, col) {
    return this.get_col_attr(dataset, col, 'description');
  }
};
