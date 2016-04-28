"use strict";

function not_implemented(func) {
  return function() {
    throw new Error("Driver does not implement required function:" + func);
  };
}

function validate() {
  console.log("Validating backend driver");
}

// This is meant for predicting data from samples of the form { integer: { }, string: {}, set: {} }
function predict_column_types(data) {
  var schema = {};
  var values = {};
  _.each(data, function(sample) {
    _.each(sample, function(fields, field_type) {
      if (_.isObject(fields)) {
        _.each(fields, function(value, field) {
          if (!schema[field]) {
            schema[field] = {};
            values[field] = {};
          }
          if (!schema[field][field_type]) {
            schema[field][field_type] = 0;
            values[field][field_type] = [];
          }
          schema[field][field_type] += 1;
          values[field][field_type].push(value);
        });
      }
    });
  });

  var cols = [];
  _.each(schema, function(field_types, field) {
    if (field === "_bsontype") { // Skip that bad boy
      return;
    }

    var max = 0;
    var predicted_type = null;

    _.each(field_types, function(count, type) {
      if (count > max) {
        predicted_type = type;
        max = count;

      }
    });

    var col_meta = {
      name: field,
      type_str: predicted_type};

    // can we auto-windsorize these values?
    if (predicted_type === "integer") {
      var int_values = values[field].integer;
      int_values.sort(function(a, b) { return a - b; });

      var high_p = parseInt(0.975 * int_values.length, 10);
      var low_p = parseInt(0.025 * int_values.length, 10);

      if (int_values.length > 100) {
        col_meta.max_value = int_values[high_p];
        col_meta.min_value = int_values[low_p];
      }
    }

    cols.push(col_meta);

  });
  return cols;
}



var driver = {
  run: function(dataset, query_spec, unweight_columns, cb) {
    not_implemented("run");
  },
  get_stats: function(dataset, cb) {
    not_implemented("get_stats");
  },
  get_datasets: function(cb) {
    not_implemented("get_datasets");
  },
  get_columns: function(dataset, cb) {
    not_implemented("get_columns");
  },
  clear_cache: function(dataset, cb) {
    not_implemented("clear_cache");
  },
  drop_dataset: function(dataset, cb) {
    not_implemented("drop_dataset");
  },
  add_samples: function(dataset, subset, samples, cb) {
    not_implemented("add_samples");
  },
  supports_percentiles: function() {
    not_implemented("supported_metrics");
  },
  validate: validate,
  predict_column_types: predict_column_types
};

module.exports = {
  Base: driver,
  predict_column_types: predict_column_types
};
