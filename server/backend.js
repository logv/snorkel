"use strict";

var url = require("url");
var http = require("http");
var mongo = require("mongodb");
var context = require_root("server/context");
var config = require_root("server/config");

var DATASET_PREFIX = "datasets/";

var snorkle_db = require_root("server/db")
  .db("snorkel", function(db, db_name) {
    db.createCollection(db_name,
      {
        capped: true,
        size: config.default_max_dataset_size
      }, function(err, data) { });
  });

function round_column(col, out_col, bin_size) {
  var transform = {};

  bin_size = bin_size || 100;
  var original = { $divide : [ { $subtract : [ "$integer." + col, {$mod :
    ["$integer." + col, 1]}] }, bin_size ]};
  var remainder = {$mod : [original, 1]};

  var divisor = { $subtract: [ original, remainder ]};
  var value = { $multiply: [ divisor, bin_size ]};
  transform[out_col] = value;


  return transform;
}

function weight_column(col, weight_col, out_col) {
  if (col === "weight") {
    return {};
  }

  var weighted = { $multiply: [ "$integer." + col, "$integer." + weight_col ] };
  var transform = {};
  transform[out_col || "integer." + col] = weighted;

  return transform;
}

// multiply_cols_by_weight
function multiply_cols_by_weight(cols, weight_col, group_by) {

  var projection = {};
  _.each(cols, function(col) {
    _.extend(projection, weight_column(col, weight_col));
  });

  _.extend(projection, { "weighted_count" : "$integer." + weight_col });

  _.each(group_by, function(field) {
    projection["string." + field] = 1;
  });

  // Also grab the time column
  projection["integer.time"] = 1;

  if (Object.keys(projection).length) {
    return [{ $project: projection }];
  }

  return [];
}

function query_table(opts) {
  var dims = opts.dims, cols = opts.cols;
  var agg = opts.agg;
  var pipeline = [];

  if (opts.weight_col) {
    var weighting = multiply_cols_by_weight(opts.cols, opts.weight_col, opts.dims);
    pipeline = pipeline.concat(weighting);
  }

  var dim_groups = {};
  _.each(dims, function(dim) {
    dim_groups[dim] = "$string." + dim;
  });

  var group_by = {$group: { _id: dim_groups, count: { $sum: 1 } }};

  _.each(cols, function(col) {
    group_by.$group[col] = {};
    var col_val = "$integer." + col;
    var temp_agg = agg;
    if (agg === "$count") {   col_val = 1; temp_agg = "$sum"; }
    group_by.$group[col][temp_agg] = col_val;
  });

  if (opts.weight_col) {
    group_by.$group.weighted_count = { $sum: "$weighted_count"};
  }

  pipeline.push(group_by);


  return pipeline;
}

function query_time_series(opts) {
  var dims = opts.dims, cols = opts.cols;
  var agg = opts.agg;
  var pipeline = [];

  if (opts.weight_col) {
    var weighting = multiply_cols_by_weight(opts.cols, opts.weight_col, opts.dims);
    pipeline = pipeline.concat(weighting);
  }

  opts.time_bucket = opts.time_bucket || 60 * 60 * 6; // 6 hours?

  var dim_groups = {};
  _.each(dims, function(dim) {
    dim_groups[dim] = "$string." + dim;
  });

  dim_groups = _.extend(dim_groups, round_column("time", "time_bucket", opts.time_bucket));

  var group_by = {$group: { _id: dim_groups, count: { $sum: 1 } }};
  if (opts.weight_col) {
    group_by.$group.weighted_count = { $sum: "$weighted_count" };
  }

  _.each(cols, function(col) {
    group_by.$group[col] = {};
    var col_val = "$integer." + col;
    var temp_agg = agg;
    if (agg === "$count") {   col_val = 1; temp_agg = "$sum"; }
    group_by.$group[col][temp_agg] = col_val;
  });

  pipeline.push(group_by);


  return pipeline;
}

// TODO: supply buckets by hand that can be queried
// Has to go through transformations, later
function query_hist(opts) {
  var col = opts.col, bucket_size = opts.hist_bucket;

  if (!col && opts.cols) {
    col = opts.cols[0];
  }

  if (!col) {
    console.log("COULDNT FIND FIELD FOR DISTRIBUTION QUERY");
  }

  var pipeline = [];

  var projection = { $project: round_column(col, "bucket", bucket_size) };
  if (opts.weight_col) {
    projection.$project["integer." + opts.weight_col] = 1;
  }

  pipeline.push(projection);

  var col_name = {};
  col_name[col] = "$bucket";


  var group_op = { $group: {
      _id: col_name,
      count: { $sum: 1 },
      weighted_count: { $sum: "$integer." + opts.weight_col }
    }};

  pipeline.push(group_op);

  pipeline.push({ $sort: { "count" : -1}});

  return pipeline;
}

function query_samples(opts) {

  opts = opts || {};
  var pipeline = [];

  pipeline.push({$limit: opts.limit || 100 });
  pipeline.push({ $sort: { "integer.time" : -1}});
  return pipeline;
}

function get_stats(table, cb) {
  cb = context.wrap(cb);
  var collection = snorkle_db.get(DATASET_PREFIX + table);
  collection.stats(function(err, stats) {
    cb(stats);
  });
}

function get_columns(table, cb) {
  var pipeline = query_samples();
  pipeline.push({$limit: 100});
  var schema = {};
  var collection = snorkle_db.get(DATASET_PREFIX + table);
  cb = context.wrap(cb);

  collection.aggregate(pipeline, function(err, data) {
    _.each(data, function(sample) {
      _.each(sample, function(fields, field_type) {
        _.each(fields, function(value, field) {
          if (!schema[field]) { schema[field] = {}; }
          if (!schema[field][field_type]) { schema[field][field_type] = 0; }
          schema[field][field_type] += 1;
        });
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

      cols.push({
        name: field,
        type_str: predicted_type});

    });

    cb(cols);
  });

}

function get_tables(cb) {
  cb = context.wrap(cb);

  snorkle_db.raw().collectionNames(function(err, collections) {
    var datasets = [];

    _.each(collections, function(collection) {
      var idx = collection.name.indexOf(DATASET_PREFIX);
      if (idx > -1) {
        datasets.push({
            table_name: collection.name.substr(idx + DATASET_PREFIX.length)
          });
      }
    });

    cb(datasets);

  });
}

// filters is an array of filters
// a filter looks like:
// {
//   column: <name>
//   conditions: [
//     { "$gt" : 1000 },
//     { "$lt" : 1200 }
//  ]
// }
function add_filters(filters) {
  var pipeline = [];

  _.each(filters, function(filter) {
    var transform = { $match: {}};
    var col = filter.column;

    if (!col) {
      // TODO: error here
      console.log("Missing column for filter: ", filter);
    }

    transform.$match[col] = {};
    _.each(filter.conditions, function(cond) {
      transform.$match[col][cond.op] = cond.value;
    });

    pipeline.push(transform);
  });


  return pipeline;
}

function add_time_range(start, end) {
  var conditions = [];
  if (start) {
    conditions.push({value: start, op: "$gt"});
  }

  if (end) {
    conditions.push({value: end, op: "$lt"});
  }

  var pipeline = add_filters([{
    column: "integer.time",
    conditions: conditions
  }]);

  return pipeline;
}

function run_pipeline(collection_name, pipeline, unweight, cb) {
  var collection = snorkle_db.get(DATASET_PREFIX + collection_name);
  cb = context.wrap(cb);

  collection.aggregate(pipeline, function(err, data) {

    if (unweight) {
      _.each(data, function(result) {
        var count = result.count;
        var weighted_count = result.weighted_count || count;

        _.each(result, function(val, key) {
          if (key === "weighted_count" || key === "count" || key === "_id") {
            return;
          }

          result[key] = val * count / weighted_count;
        });
      });
    }

    cb(err, data);
  });
}

function add_samples(dataset, subset, samples, cb) {
  var collection, collection_name;
  collection_name = DATASET_PREFIX + dataset;
  if (subset) {
    collection_name += "/" + subset;
  }

  _.each(samples, function(sample) {
    // TODO: more validation!
    _.each(sample.integer, function(value, key) {
      sample.integer[key] = parseInt(value, 10);
    });
  });

  snorkle_db.get(collection_name, function(collection) {
    collection.insert(samples, function(err, data) {
      if (err) { console.log("ERROR INSERTING DATA", data); return; }
      cb(err, data);
    });


  });
}

function add_sample(dataset, subset, sample, cb) {
    add_samples(dataset, subset, [sample], cb);
}

module.exports = {

  // Query builders
  samples: query_samples,
  time_series: query_time_series,
  hist: query_hist,
  table: query_table,

  // Filters
  add_filters: add_filters,
  time_range: add_time_range,

  // Metadata
  get_columns: get_columns,
  get_stats: get_stats,
  get_tables: get_tables,


  // Execution
  run: run_pipeline,

  // Insertion
  add_sample: add_sample,
  add_samples: add_samples
};

