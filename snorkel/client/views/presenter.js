"use strict";

module.exports = {
  set_fields: function(table, fields) {
    if (!this.metadata) { this.metadata = {}; }

    this.metadata[table] = fields;
  },

  set_metadata: function(all) {
    if (!this.metadata) { this.metadata = {}; }

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

  get_field_description: function(dataset, col) {
    return this.get_col_attr(dataset, col, 'description');
  }
};
