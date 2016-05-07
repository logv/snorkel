"use strict";

var mongo = require("mongodb");
var config = require_core("server/config");
var context = require_core("server/context");
var backend = require_app("server/backend");
var driver = require_app("server/backends/driver");

var config = require_core('server/config');
var host = "localhost";
var server_options = {
  auto_reconnect: true
};

var db_options = {
  journal: 1
};

var EventEmitter = require("events").EventEmitter;

var separator = "/";
function collection_builder(db_name, before_create) {
  var db_url = config.backend && config.backend.db_url;
  var _db;
  var _created = {};
  var arbiter = new EventEmitter();

  function onOpened(err, db) {
    // TODO: report errors somewhere?
    if (err) { return ; }
    _db = db;
    arbiter.emit("db_open", db);
  }

  if (db_url) {
    var options = {
      uri_decode_auth: true,
      server: server_options,
      db: db_options
    };
    mongo.connect(db_url, options, onOpened);
  } else {
    var port = mongo.Connection.DEFAULT_PORT;
    var mongoserver = new mongo.Server(host, port, server_options);
    var db_connector = new mongo.Db(db_name, mongoserver, db_options);
    _db = db_connector;
  }

  return {
    /**
     * This function returns a collection from the mongo DB, making sure that
     * the DB is created before using it.
     *
     * @method get
     * @param {String} db_name* A namespaced name for the DB
     * @param {Function} cb Function to run when the DB is returned.
     */
    get: function() {
      var cb;
      var args = _.toArray(arguments);
      var last = args.pop();

      if (_.isFunction(last)) {
        cb = last;
      } else {
        args.push(last);
      }

      var db_name = args.join(separator);

      if (!_db && !cb) {
        console.trace();
        throw("Trying to access DB before its been initialized");
      } else if (!_db) {
        return arbiter.once("db_open", function(db) {
          if (!_created[db_name] && before_create) {
            before_create(_db, db_name);
          }
          _created[db_name] = true;

          var collection = db.collection(db_name);
          cb(collection);
        });
      }


      if (!_created[db_name] && before_create) {
        before_create(_db, db_name);
      }

      var collection = _db.collection(db_name);
      _created[db_name] = true;
      if (cb) {
        cb(collection);
      }

      return collection;
    },

    /**
     * Returns the raw database connection
     *
     * @method raw
     * @return {Object} db Mongo DB Connection
     */
    raw: function() {
      return _db;
    }
  };
}

var COLLECTION = config.backend.db || "snorkel";

var snorkle_db = collection_builder(COLLECTION, function(db, db_name) {
    db.createCollection(db_name,
      {
        capped: true,
        size: config.default_max_dataset_size
      }, function(err, data) { });
  });

var _pending = {};
var _cached_columns = {};
function round_column(col, out_col, bin_size) {
  var transform = {};

  bin_size = bin_size || 100;
  var original = { $divide : [ { $subtract : [ "$" + col, {$mod :
    ["$" + col, 1]}] }, bin_size ]};
  var remainder = {$mod : [original, 1]};

  var divisor = { $subtract: [ original, remainder ]};
  var value = { $multiply: [ divisor, bin_size ]};
  transform[out_col] = value;


  return transform;
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
function add_time_range(time_field, start, end) {
  var conditions = [];
  if (start) {
    conditions.push({value: start, op: "$gt"});
  }

  if (end) {
    conditions.push({value: end, op: "$lt"});
  }

  var pipeline = add_filters([{
    column: time_field,
    conditions: conditions
  }]);

  return pipeline;
}

function weight_column(col, weight_col, out_col) {
  if (col === "weight") {
    return {};
  }

  var weighted = { $multiply: [ "$" + col, "$" + weight_col ] };
  var transform = {};
  transform[out_col || col] = weighted;

  return transform;
}

// multiply_cols_by_weight
function multiply_cols_by_weight(time_field, cols, weight_col, group_by) {

  var projection = {};
  _.each(cols, function(col) {
    _.extend(projection, weight_column(col, weight_col));
  });

  _.extend(projection, { "weighted_count" : "$" + weight_col });

  _.each(group_by, function(field) {
    projection[field] = 1;
  });

  // Also grab the time column
  projection[time_field] = 1;

  if (Object.keys(projection).length) {
    return [{ $project: projection }];
  }

  return [];
}

function cast_columns(time_field, translate, cols, weight_col, group_by) {
  var projection = {};

  var translated = {};
  _.each(translate, function(tr) {
    var orig_name = "$" + tr.from_type + "." + tr.name;
    var to_name = tr.to_type + "." + tr.name;
    translated[to_name] = true;

    projection[to_name] = orig_name;

  });

  _.each(cols, function(col) {
    if (translated[col]) {
      return;
    }

    projection[col] = 1;
  });

  if (weight_col) {
    projection[weight_col] = 1;
  }

  _.each(group_by, function(field) {
    if (translated[field]) {
      return;
    }

    projection[field] = 1;
  });

  // Also grab the time column
  projection[time_field] = 1;

  if (Object.keys(projection).length) {
    return [{ $project: projection }];
  }

  return [];
}


function query_table_to_mongo(opts, col_config) {
  var dims = opts.dims, cols = opts.cols;
  var agg = opts.agg;
  var time_field = opts.time_field || 'time';
  var pipeline = [];

  if (opts.weight_col) {
    var weighting = multiply_cols_by_weight(time_field, opts.cols, opts.weight_col, opts.dims);
    pipeline = pipeline.concat(weighting);
  }

  var dim_groups = {};
  _.each(dims, function(dim) {
    dim_groups[dim] = "$" + dim;
  });

  var group_by = {$group: { _id: dim_groups, count: { $sum: 1 } }};

  _.each(cols, function(col) {
    var col_val = "$" + col;
    var temp_agg = agg;
    if (agg === "$count") {   col_val = 1; temp_agg = "$sum"; }
    var col_key = col.replace(/\./g, "#");
    group_by.$group[col_key] = {};
    group_by.$group[col_key][temp_agg] = col_val;
  });

  if (opts.weight_col) {
    group_by.$group.weighted_count = { $sum: "$weighted_count"};
  }

  pipeline.push(group_by);


  return pipeline;
}

function query_time_series_to_mongo(opts, col_config) {
  var dims = opts.dims, cols = opts.cols;
  var agg = opts.agg;
  var time_field = opts.time_field || 'time';
  var pipeline = [];

  if (opts.weight_col) {
    var weighting = multiply_cols_by_weight(time_field, opts.cols, opts.weight_col, opts.dims);
    pipeline = pipeline.concat(weighting);
  }

  var time_bucket = opts.time_bucket || 60 * 60 * 6; // 6 hours?

  var dim_groups = {};
  _.each(dims, function(dim) {
    dim_groups[dim] = "$" + dim;
  });

  dim_groups = _.extend(dim_groups, round_column(time_field, "time_bucket", time_bucket));

  var group_by = {$group: { _id: dim_groups, count: { $sum: 1 } }};
  if (opts.weight_col) {
    group_by.$group.weighted_count = { $sum: "$weighted_count" };
  }

  _.each(cols, function(col) {
    var col_val = "$" + col;
    var temp_agg = agg;
    if (agg === "$count") {   col_val = 1; temp_agg = "$sum"; }
    var col_key = col.replace(/\./g, "#");
    group_by.$group[col_key] = {};
    group_by.$group[col_key] = {};
    group_by.$group[col_key][temp_agg] = col_val;
  });

  pipeline.push(group_by);


  return pipeline;
}

// TODO: supply buckets by hand that can be queried
// Has to go through transformations, later
function query_hist_to_mongo(opts, col_config) {
  var col = opts.col, bucket_size = opts.hist_bucket;

  if (!col && opts.cols) {
    col = opts.cols[0];
  }

  if (!col) {
    console.log("COULDNT FIND FIELD FOR DISTRIBUTION QUERY");
  }

  if (!bucket_size) {
    var col_meta = col_config[col];
    if (col_meta.max_value && col_meta.min_value) {
      var col_range = Math.abs(col_meta.max_value - col_meta.min_value);
      bucket_size = parseInt(col_range / 100, 10) + 1;
      console.log("INFERRING BUCKET SIZE", bucket_size);
    } else {
      bucket_size = 100;
    }
  }

  var pipeline = [];

  var projection = { $project: round_column(col, "bucket", bucket_size) };
  if (opts.weight_col) {
    projection.$project[opts.weight_col] = 1;
  }

  var dim_groups = {};
  dim_groups[col] = "$bucket";
  _.each(opts.dims, function(dim) {
    dim_groups[dim] = "$" + dim;
    projection.$project[dim] = 1;
  });

  pipeline.push(projection);

  var group_op = { $group: {
      _id: dim_groups,
      count: { $sum: 1 }
    }};

  if (opts.weight_col) {
    group_op.$group.weighted_count = { $sum: "$" + opts.weight_col };
  }

  pipeline.push(group_op);

  return pipeline;
}

function query_samples_to_mongo(opts, col_config) {

  opts = opts || {};
  var pipeline = [];

  pipeline.push({$sort: { _id: -1}});
  pipeline.push({$limit: opts.limit || 100 });
  return pipeline;
}

// matches full integer samples, avoiding the 'null' cell problem
function trim_and_match_full_samples(cols, col_config) {
  var conditions = [];

  if (!cols.length) {
    return [];
  }

  _.each(cols, function(col) {
    var column = col;
    var conds = [];

    conditions.push({
      $or: conds
    });


    _.each(["$gte", "$lt"], function(op) {
      var cond = {};
      cond[column] = {};
      cond[column][op] = 0;

      var col_meta = col_config[col];

      if (col_meta) {
        if (op === "$lt" && col_meta.max_value) {
            cond[column][op] = col_meta.max_value;
        }


        if (op === "$gte" && col_meta.min_value) {
            cond[column][op] = col_meta.min_value;
        }
      }

      cond[column].$ne = NaN;

      conds.push(cond);
    });

  });

  return [ { $match: { $and: conditions} } ];
}

function drop_dataset(collection_name, cb) {
  var collection = snorkle_db.get(collection_name);
  cb = context.wrap(cb);
  collection.drop();
  cb(collection_name);
}

function get_query_pipeline(spec) {
  var func;

  if (spec.view === "hist") {
    func = query_hist_to_mongo;
  }
  if (spec.view === "table") {
    func = query_table_to_mongo;
  }
  if (spec.view === "time") {
    func = query_time_series_to_mongo;
  }
  if (spec.view === "samples") {
    func = query_samples_to_mongo;
  }

  if (!func) {
    throw new Error("NO PIPELINE FOR VIEW", spec.view);
  }


  var pipeline = func(spec.opts, spec.col_config);
  return pipeline;
}

function query_to_pipeline(query) {
  var params = query.params;
  var meta = query.meta;
  var opts = query.opts || {};

  var time_field = "integer.time";

  var pipeline = get_query_pipeline(query);
  if (params.cast_cols && query.view !== "samples") {
    pipeline = cast_columns(time_field, params.cast_cols, params.cols, params.weight_col, params.dims).concat(pipeline);
  }

  var start_s = parseInt(params.start_ms / 1000, 10);
  var end_s = parseInt(params.end_ms / 1000, 10);

  // being a little presumptious, here

  var sort = [];
  if (params.view !== "samples") {
    sort =  [{$sort: { }}];
    sort[0].$sort[params.sort_by] = -1;
  }

  var timeline = add_time_range(time_field, start_s, end_s);
  var filters = add_filters(params.filters);
  var limit = [];

  if (params.limit) {
    if (query.view !== "time" &&
        query.view !== "area" &&
        query.view !== "distribution") {
      limit.push({$limit: params.limit || 100});
    }

  }

  var non_null_ints = trim_and_match_full_samples(params.cols, meta.metadata.columns);

  return { pipeline: timeline
      .concat(non_null_ints)
      .concat(filters)
      .concat(pipeline)
      .concat(sort)
      .concat(limit)
  };
}



function get_columns(table, cb) {
  // First, check if we have a relatively up to date metadata definition.
  var table_name = table.table_name || table;
  var pipeline = query_samples_to_mongo({ limit: 500 });
  var collection = snorkle_db.get(table_name);

  cb = context.wrap(cb);


  if (_pending[table_name]) {
    _pending[table_name].push(cb);
    return;
  }

  _pending[table_name] = [cb];

  collection.aggregate(pipeline, function(err, data) {
    data = marshall_samples_to_typed_samples(data);
    var cols = driver.predict_column_types(data);

    _cached_columns[table_name] = {
      results: cols,
      updated: Date.now()
    };

    _.each(_pending[table_name], function(cb) {
      cb(cols);
    });
    delete _pending[table_name];
  });
}


function check_field_type(field_schema, value, full_key, sole_key) {
  if (full_key.indexOf("_id") === 0) {
    return;
  }

  // Skip this key for now?
  if (_.isObject(value)) {
    _.each(value, function(value, inner_key) {
      check_field_type(field_schema, value, full_key + "." + inner_key, inner_key);
    });

    return;
  }

  var field_type = "unknown";
  if (_.isNumber(value)) {
    field_type = "integer";
  }

  if (_.isArray(value)) {
    field_type = "set";
    return;
  }

  if (_.isString(value)) {
    field_type = "string";
  }

  if (!field_schema[field_type]) {
    field_schema[field_type] = {};
  }

  field_schema[field_type][full_key] = value;
}

// This is useful!
function marshall_samples_to_typed_samples(data) {
  var marshalled = [];
  _.each(data, function(fields) {
    var row = {};
    _.each(fields, function(value, field) {
      check_field_type(row, value, field);
    });

    marshalled.push(row);
  });


  return marshalled;


}

function run(collection_name, query_spec, unweight, cb) {
  cb = context.wrap(cb);
  var collection = snorkle_db.get(collection_name);
  var ret = query_to_pipeline(query_spec);
  var pipeline = ret.pipeline;

  console.log("RUNNING QUERY", JSON.stringify(pipeline, null, 2));

  collection.aggregate(pipeline, function(err, data) {
    if (err) {
      console.log("Mongo Error", err);
    }

    // Before doing anything, we need to massage the data to its expected form (cast columns)
    if (query_spec.view === "samples") {
      data = marshall_samples_to_typed_samples(data);
    }

    _.each(data, function(result, row_key) {
        _.each(result, function(val, key) {
          if (key === "weighted_count" || key === "count" || key === "_id") {
            return;
          }

          if (unweight) {
            var count = result.count;
            var weighted_count = result.weighted_count || count;
            result[key] = val * count / weighted_count;
          }

          var translate_key = key.replace(/#/g, ".");
          if (translate_key !== key) {
            result[translate_key] = result[key];
            delete result[key];
          }



        });
    });

    cb(err, data);
  });
}

function get_stats(table, cb) {
  var collection = snorkle_db.get(table);
  cb = context.wrap(cb);
  collection.stats(function(err, stats) {
    cb(stats);
  });
}

function get_tables(cb) {
  cb = context.wrap(cb);

  snorkle_db.raw().collectionNames(function(err, collections) {
    var datasets = [];

    _.each(collections, function(collection) {
      var table_name = collection.name;
      var idx = table_name.indexOf(COLLECTION);
      if (idx === 0) {
        table_name = table_name.substr(idx + COLLECTION.length + 1);
      }

      if (!table_name || table_name === "undefined" || table_name === "[object Object]") { return; }
      datasets.push({
        table_name: table_name
      });
    });

    cb(datasets);

  });
}

function get_cached_columns(table, cb) {
  if (_cached_columns[table]) {
    console.log("Using cached column results for", table);
    var cached_for = (Date.now() - _cached_columns[table].updated) / 1000;
    cb(_cached_columns[table].results);
    cb = function() { };
    if (cached_for < 60 * 10) {
      return;
    }
  }

  get_columns(table, cb);
}


function clear_column_cache(table, cb) {
  if (_cached_columns[table]) {
    delete _cached_columns[table];
  }

  if (cb) {
    cb();
  }
};

function add_samples(dataset, subset, samples, cb) {
  if (!config.backend.write_samples) {
    return;
  }

  var collection, collection_name;
  collection_name = dataset;
  if (subset) {
    collection_name += "/" + subset;
  }

  _.each(samples, function(sample) {
    // TODO: more validation!
    if (!_.isObject(sample.integer)) {
      return;
    }
    _.each(sample.integer, function(value, key) {
      sample.integer[key] = parseInt(value, 10);
    });
  });

  var chunk_size = 1000;
  var chunks = Math.ceil(samples.length / chunk_size);

  var after = _.after(chunks, cb);

  snorkle_db.get(collection_name, function(collection) {
    var i;
    for (i = 0; i < chunks; i++) {
      var subsamples = samples.slice(i * chunk_size, (i + 1) * chunk_size);

      if (!subsamples.length) {
        after(null, []);
      }

      collection.insert(subsamples, function(err, data) {
        if (err) { console.log("ERROR INSERTING DATA", data); return; }
        after(err, data);
      });
    }
  });
}

var MongoDriver = _.extend(driver.Base, {
  run: run,
  install: function() {
    var config = require_core('server/config');
    var package_json = require_core("../package.json");

    var SF_db = collection_builder(config.db_name || package_json.name);

  },
  get_stats: get_stats,
  get_tables: get_tables,
  get_columns: get_cached_columns,
  add_samples: add_samples,
  clear_cache: clear_column_cache,
  drop_dataset: drop_dataset,
  default_table: "snorkle/queries"
});

module.exports = MongoDriver;
