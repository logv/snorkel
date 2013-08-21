"use strict";

module.exports = {
  set_fields: function(table, fields) {
    if (!this.metadata) { this.metadata = {}; }
    if (!this.formatters) { this.formatters = {}; }

    this.metadata[table] = fields;
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

  get_field_formatter: function(dataset, col) {

    if (!this.formatters[dataset])  {
      this.formatters[dataset] = {};
    }

    if (!this.formatters[dataset][col]) {
      this.formatters[dataset][col] = function(val) {
        return val;
      };

      try {
        var formatter_js = this.get_col_attr(dataset, col, 'formatter');
        if (formatter_js) {
          var args = [ "value", col, formatter_js ];
          var func = Function.apply(null, args);
          this.formatters[dataset][col] = function(value) {
            return func.apply(null, [value, value]);
          }

          console.log("Using custom formatter for", dataset, col);
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
