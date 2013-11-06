"use strict";

var _ = require_vendor("underscore");
var backend = require_app("server/backend");

var lookup = {
  "integer" : parseInt,
  "ip" : function(val) { return false; },
  "country" : function(val) { return false; },
  "string" : function(val) { return true; }
};
var lookup_keys = Object.keys(lookup);
var lookup_length = lookup_keys.length;

var col_parsers = {
  "integer" : parseInt
}

function guess_value_type(value) {

  var i;
  for (i = 0; i < lookup_length; i++) {
    if (lookup[lookup_keys[i]](value)) {
      return lookup_keys[i];
    }
  }
}

function read_csv(username, name, data, options, cb) {
  if (_.isString(data)) {
    data = data.split("\n");
  }

  var headers = _.map(data.shift().split(","), function(h) {
    return h.replace(/^\s*/, "").replace(/\s*$/, "");
  });

  var rows = [];
  var type_counts = {};
  var err;

  function infer_type(key, datum) {
    var type = guess_value_type(datum);
    if (!type_counts[key]) {
      type_counts[key] = {};
    }

    if (!type_counts[key][type]) {
      type_counts[key][type] = 0;
    }

    type_counts[key][type] += 1;
  }

  _.each(data, function(row) {
    var row_data = _.map(row.split(","), function(h) {
      return h.replace(/^\s*/, "").replace(/\s*$/, "");
    });
    var row_obj = {};
    rows.push(row_obj);

    var i;
    var val;
    for (i = 0; i < row_data.length; i++) {
      var key = headers[i];
      try {
        val = row_data[i];
        row_obj[key] = val;
        infer_type(key, val);
      } catch(e) {
        row_obj[key] = null;
      }
    }
  });

  var cols = Object.keys(type_counts);
  var col_types = {};

  function finalize_types() {
    for (var i = 0; i < cols.length; i++) {
      var candidates = type_counts[cols[i]];
      var candidate_keys = Object.keys(candidates);
      candidate_keys.sort(function(a, b) {
        return candidates[b] - candidates[a];
      });
      col_types[cols[i]] = candidate_keys[0];
    }

  }

  // The shape of the CSV should be more or less consistent 
  // (let's allow for say... 1% error?)
  function check_shape(rows) {
    var row_size_count = {};
    _.each(rows, function(row) {
      var row_length = Object.keys(row).length;
      row_size_count[row_length] = (row_size_count[row_length] || 0) + 1;
    });

    
    var total = _.reduce(row_size_count, function(sum, v, k) {
      sum += v;
    }, 0);

    var row_sizes = Object.keys(row_size_count);
    row_sizes.sort(function(a, b) {
      return row_size_count[b] - row_size_count[a];
    });

    console.log(row_size_count);

    if (row_sizes[0] / total < 0.99) {
      err = "This CSV isnt legit";
      return true;
    }

    if (row_sizes[0] != headers.length) {
      err = "Row size does not match header size";
      return true;
    }

    if (row_sizes[0] == 1) {
      err = "Most rows are only size 1. This is probably not a CSV file"
      return true;
    }

  }

  if (check_shape(rows)) {
    if (cb) {
      cb(err);
    }

    return;
  }

  finalize_types();

  function transform_rows(rows, cols, col_types) {
    var ret_rows = [];
    _.each(rows, function(row) {
      var new_row = { integer: { time: parseInt(+Date.now() / 1000, 10) }};
      _.each(row, function(value, key) {
        var type = col_types[key];
        if (!new_row[type]) { new_row[type] = {}; }

        var parser = col_parsers[type];

        if (parser) {
          value = parser(value);
        }

        new_row[type][key.replace(/\./g, "_")] = value;
      });

      ret_rows.push(new_row);
    });

    return ret_rows;
  }

  rows = transform_rows(rows, cols, col_types);

  backend.add_samples(username + "/csv", name, rows, function(insert_err) { 
    if (cb) {
      cb(insert_err || err, rows);
    }
  });
}

module.exports = {
  read: read_csv
};
