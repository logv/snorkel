"use strict";

var context = require_core("server/context");
var config = require_core("server/config");

// NEED TO DO THIS VERY EARALY
var SAMPLE_VIEWS = {
  samples: true,
  overview: true,
  scatter: true,
  crossfilter: true
};

module.exports = {
 SAMPLE_VIEWS: SAMPLE_VIEWS
};

var driver_name = config.backend.driver;
var driver = require_app("server/backends/" + driver_name);

try {
  driver.validate();
} catch(e) {
  throw new Error("Couldn't validate backend driver");
}

function validate_pipeline_query(query_spec, ret) {
  if (!ret) {
    console.log("TODO: driver needs to return its handled params");
    return;
  }

  ret = _.clone(ret);

  // validate a pipeline's handling of parameters
  var unhandled = {};
  _.each(query_spec.opts, function(val, opt) {
    if (!ret[opt]) {
      ret[opt] = false;
    }
  });

  console.log("TODO: validate query params were handled (false = unhandled)", ret);
}

function validate_pipeline_results(query_spec, results, cb) {
  if (SAMPLE_VIEWS[query_spec.view]) {
    if (!_.isArray(results)) {
      return cb("Results was not like an array");
    }

    var result;
    for (var i = 0; i < results.length; i++) {
      result = results[i];
      if (!_.isObject(result)) {
        return cb("Results contained a non Object");
      }
    };

  } else if (false) { // Fill in more views, here
  } else {
    console.log("TODO: validate results", query_spec.view)

  }

  cb(null, results);
}

function run_pipeline(collection_name, pipeline_spec, unweight, cb) {
  var original_spec = _.clone(pipeline_spec)
  cb = context.wrap(cb);
  var handled = {};
  pipeline_spec.used = pipeline_spec.handle_param = function(param) {
    handled[param] = true;
  };

  _.each(original_spec.params, function(value, param) {
    pipeline_spec.params.__defineGetter__(param, function() {
      handled[param] = true;
      return value;
    });
  });

  driver.run(collection_name, pipeline_spec, unweight, function(err, results) {
    if (!err) {
      validate_pipeline_results(original_spec, results, cb);
    }
  });

  validate_pipeline_query(original_spec, handled);
}

function query_builder(query) {
  return function(opts, col_config) {
    return {
      "view" : query,
      "opts" : opts,
      "col_config" : col_config
    };
  };
}

var QUERIES = {
  dist: query_builder("hist"),
  table: query_builder("table"),
  samples: query_builder("samples"),
  time: query_builder("time")
};

function prep_pipeline(params, meta) {
  var query = QUERIES[params.view];

  if (!query) {
    query = QUERIES[params.baseview];
  }

  if (!query) {
    console.log("!!!! Couldn't find query base: " + params.view, params);
    return [];
  }

  var pipeline = query(params, meta.metadata.columns);
  pipeline.params = params;
  pipeline.meta = meta;

  return pipeline;

}

module.exports = {
  // Query builders
  samples: query_builder("samples"),
  time_series: query_builder("time"),
  hist: query_builder("hist"),
  table: query_builder("table"),

  // Metadata
  get_columns: driver.get_columns,
  get_stats: driver.get_stats,
  clear_cache: driver.clear_cache,
  get_tables: driver.get_tables,
  extra_buckets: function() {
    if (_.isFunction(driver.extra_buckets)) {
      return driver.extra_buckets();
    }

    if (_.isObject(driver.extra_buckets)) {
      return driver.extra_buckets;
    }
  },

  extra_metrics: function() {
    if (_.isFunction(driver.extra_metrics)) {
      return driver.extra_metrics();
    }

    if (_.isObject(driver.extra_metrics)) {
      return driver.extra_metrics;

    }
  },

  get_default_table: function() {
    return driver.default_table || "UNKNOWN_TABLE";
  },

  // Execution
  run: run_pipeline,
  prep_pipeline: prep_pipeline,
  drop: driver.drop_dataset,

  // Insertion
  add_samples: driver.add_samples,
  add_sample: function(dataset, subset, sample, cb) {
    driver.add_samples(dataset, subset, [sample], cb);
  },
  SAMPLE_VIEWS: SAMPLE_VIEWS,
  SEPARATOR: driver.SEPARATOR || "/"
};

