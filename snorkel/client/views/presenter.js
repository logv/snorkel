"use strict";

module.exports = {
  set_fields: function(fields) {
    this.fields = fields;
  },

  get_col_attr: function(col, attr, default_) {
    var col_config = this.fields[col];
    return (col_config && col_config[attr]) || default_;
  },

  get_field_name: function(col) {
    return this.get_col_attr(col, 'display_name', col);
  },

  get_field_type: function(col) {
    return this.get_col_attr(col, 'type_str', 'unknown');

  },

  get_field_axis: function(col) {
    return this.get_col_attr(col, 'axis');

  },

  get_field_description: function(col) {
    return this.get_col_attr(col, 'description');
  }
};
