"use strict";

var driver = require_app("server/backends/driver");
var context = require_core("server/context");

var child_process = require("child_process");
var backend = require_app("server/backend");
var config = require_core("server/config");

var path = require("path")
var cwd = process.cwd()

var BIN_PATH = config.backend.bin_path || path.join(cwd, "./bin/sybil ");
var DATASET_SEPARATOR = "@"
var FIELD_SEPARATOR = ",";
var RECORD_SEPARATOR = ":";
var CUSTOM_SEPARATORS = false;
var HAS_HDR_HIST = false;
var HAS_LOG_HIST = false;
var HAS_QUERY_CACHE = false;

function path_exists(path) {
  var fs = require('fs');
  try {
      fs.statSync(path);
      return true;
  }
  catch (e) {
  }
}

if (!path_exists(BIN_PATH.trim())) {
  console.log("Using global sybil path");
  BIN_PATH = "sybil ";
} else{
  console.log("Using local sybil path,", path);
}

var DB_DIR = config.data_dir || config.backend.db_dir || cwd;
if (!path_exists(DB_DIR.trim())) {
  console.log("Can't find DB dir:", DB_DIR);
}

// TODO:
// implement sort by
// implement sum/count metrics


function get_cmd(bin, arg_string) {
  return bin + " " + arg_string
}

function get_cmd_info(cb) {
  var query_args = " version -json";
  var cmd = get_cmd(BIN_PATH, query_args);
  cb = context.wrap(cb);
  child_process.exec(cmd, {
    cwd: DB_DIR,
  }, function(err, stdout, stderr) {
    var parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch(e) {

      cb("Error Parsing JSON", null);
      return;
    }

    cb(err, parsed);
  });
}


get_cmd_info(function(err, info) {
  if (err) {
    return;
  }

  console.log("GOT CMD INFO", info);
  if (info.field_separator) {
    CUSTOM_SEPARATORS = true;
    RECORD_SEPARATOR = String.fromCharCode(30);
    FIELD_SEPARATOR = String.fromCharCode(31);
  }

  if (info.hdr_hist) {
    HAS_HDR_HIST = true;
  }

  if (info.log_hist) {
    HAS_LOG_HIST = true;
  }

  if (info.query_cache) {
    HAS_QUERY_CACHE = true;
  }
});

function run_query_cmd(arg_string, cb) {
  var query_args = " query -read-log ";

  if (HAS_QUERY_CACHE) {
    query_args += " -cache-queries ";
  }

  if (CUSTOM_SEPARATORS) {
    query_args = query_args + " -field-separator '" + FIELD_SEPARATOR + "' " + "-filter-separator '" + RECORD_SEPARATOR + "' ";
  }

  var cmd = get_cmd(BIN_PATH, query_args + arg_string);
  cb = context.wrap(cb);

  if (config.debug_driver) {
    console.log("RUNNING COMMAND", cmd);
  }

  child_process.exec(cmd, {
    cwd: DB_DIR,
    maxBuffer: 100000*1024
  }, function(err, stdout, stderr) {
    if (config.debug_driver) {
      console.log(stderr)
    }
    var parsed;
    try {
      parsed = JSON.parse(stdout)
    } catch(e) {

      cb("Error Parsing JSON", null)
      return
    }

    cb(err, parsed)
  })

}

function marshall_time_rows(query_spec, time_buckets) {
  var cols = query_spec.opts.cols;
  var dims = query_spec.opts.dims;
  var ret = [];
  _.each(time_buckets, function(rows, time_bucket) {
    _.each(rows, function(r) {
      if (!r) {
        return;
      }

      var row = {};
      row._id = {};
      _.each(dims, function(d) {
        row._id[d] = r[d];
      });

      _.each(cols, function(c) {
        row[c] = extract_val(query_spec, r, c);
      });

      row._id.time_bucket = parseInt(time_bucket, 10);

      row.count = r.Samples || r.Count;
      row.weighted_count = r.Count || r.Samples;

      ret.push(row);
    });

  });

  return ret;

}

function extract_val(query_spec, r, c) {

  var agg = query_spec.opts.agg;
  var percentile;
  var sum;
  var count;
  var distinct;

  if (agg === "$sum") {
    sum = true;
  } else if (agg === "$count") {
    count = true;
  } else if (agg === "$distinct") {
    distinct = true;
  }

  if (agg.indexOf("$p") === 0) {
    percentile = parseInt(agg.substr(2), 10);
    if (_.isNaN(percentile)) {
      percentile = null;
    }
  }
  if (percentile) {
    if (r[c] && r[c].percentiles) {
      return parseFloat(r[c].percentiles[percentile], 10);
    } else {
      return  "NA";
    }
  } else if (sum) {
    return r.Count * parseFloat(r[c], 10);
  } else if (count) {
    return  r.Count;
  } else if (distinct) {
    return r.Distinct || r.distinct;
  } else {
    return parseFloat(r[c], 10);

  }

}

function marshall_table_rows(query_spec, rows) {
  var cols = query_spec.opts.cols;
  var dims = query_spec.opts.dims;


  var ret = [];
  _.each(rows, function(r) {
    var row = {};
    row._id = {};
    _.each(dims, function(d) {
      row._id[d] = r[d];
    });

    _.each(cols, function(c) {
      row[c] = extract_val(query_spec, r, c);
    });
    row.count = r.Samples || r.Count;
    row.distinct = r.Distinct || r.distinct;
    row.weighted_count = r.Count || r.Samples;

    if (query_spec.opts.agg === "$distinct") {
      row.count = row.distinct;
    }

    ret.push(row);
  });

  return ret;
}

function add_dims_and_cols(query_spec) {
  var cmd_args = "";
  if (!query_spec || !query_spec.opts || !query_spec.opts.dims) {
    return "";
  }

  if (query_spec.opts.dims.length) {
    var dims = _.filter(query_spec.opts.dims, function(d) {
      return d.trim() !== "";
    });

    if (dims.length > 0) {
      var group_by = dims.join(FIELD_SEPARATOR);
      if (group_by.trim() !== "") {
        cmd_args += " -group " + group_by + " ";
      }
    }
  }
  if (query_spec.opts.cols.length) {
    var int_by = query_spec.opts.cols.join(FIELD_SEPARATOR);
    cmd_args += " -int " + int_by + " ";

    if (query_spec.opts.agg && query_spec.opts.agg.indexOf("$p") === 0) {
      cmd_args += " -op hist ";
    }

    if (query_spec.opts.hist_bucket) {
      cmd_args += " -int-bucket " + query_spec.opts.hist_bucket + " ";

    }

    if (query_spec.opts.hist_bucket_str == "log_hist") {
      cmd_args += " -op hist -loghist ";

    }

    if (query_spec.opts.hist_bucket_str == "hdr_hist") {
      cmd_args += " -op hist -hdr ";
    }


  }

  if (query_spec.opts.agg && query_spec.opts.agg === "$distinct") {
    cmd_args += "-op distinct ";
  }


  return cmd_args;
}

function add_limit(query_spec) {

  if (query_spec.opts.limit) {
    return "-limit " + query_spec.opts.limit + " "
  }

  return ""
}

function add_weight(query_spec) {

  if (query_spec.opts.weight_col) {
    return "-weight-col " + query_spec.opts.weight_col + " ";
  }

  return "";
}

function get_args_for_spec(query_spec) {
  var cmd_args = "";
  if (!query_spec || !query_spec.opts) {
    return cmd_args;
  }

  cmd_args += " ";
  cmd_args += add_dims_and_cols(query_spec);
  cmd_args += add_str_filters(query_spec);
  cmd_args += add_int_and_time_filters(query_spec);
  cmd_args += add_limit(query_spec);
  cmd_args += add_weight(query_spec);
  return cmd_args;
}

function marshall_dist_rows(query_spec, rows) {
  var cols = query_spec.opts.cols;
  var dims = query_spec.opts.dims;
  var ret = [];
  _.each(rows, function(r) {
    var row = {};
    row._id = {};
    _.each(dims, function(d) {
      row._id[d] = r[d];
    });

    var col = cols[0];
    _.each(r[col].buckets, function(count, bucket) {
      var copy = _.clone(row);
      copy._id = _.clone(row._id);
      var val = parseInt(bucket, 10);
      copy._id[col] = val;
      copy[col] = val;
      copy.count = count;

      ret.push(copy);
    });
  });

  return ret;


}


function run_hist_query(table, query_spec, cb) {
  var cmd_args = "-print -json -op hist";
  cmd_args += get_args_for_spec(query_spec);
  console.log("RUNNING DIST QUERY");

  run_query_cmd(cmd_args + " -table " + table, function(err, results) {
    var marshalled = marshall_dist_rows(query_spec, results);
    cb(null, marshalled)
  })
}

function run_time_query(table, query_spec, cb) {
  var cmd_args = "-print -json -time ";

  cmd_args += "-time-bucket " + query_spec.opts.time_bucket;

  cmd_args += get_args_for_spec(query_spec);

  run_query_cmd(cmd_args + " -table " + table, function(err, results) {
    if (err) {
      return cb("Error parsing JSON");
    }

    var marshalled = marshall_time_rows(query_spec, results);
    cb(null, marshalled);

  })


}

function run_table_query(table, query_spec, cb) {
  var cmd_args = "-print -json"
  cmd_args += get_args_for_spec(query_spec)

  run_query_cmd(cmd_args + " -table " + table, function(err, results) {
    var marshalled = marshall_table_rows(query_spec, results);
    cb(null, marshalled)

  })
}

function add_int_and_time_filters(query_spec) {
  if (!query_spec || !query_spec.opts) {
    return "";
  }

  var filters = []


  var df = "integer_time";

  try {
    var col_types = query_spec.meta.metadata.col_types;
    if (col_types.integer.time) {
      df = "time";
    } else if (col_types.integer.integer_time) {
      df = "integer_time";
    }
  } catch(e) {
    console.log("Couldn't guess at TIME COL", e)
  }

  // TODO: uncomment when the query_spec.time_field is put into common usage
//  var tf = query_spec.opts.time_field || query_spec.meta.metadata.time_col || df;
  var tf = query_spec.meta.metadata.time_col || df;

  if (query_spec.opts.start_ms) {
    filters.push(tf + RECORD_SEPARATOR + "gt" + RECORD_SEPARATOR + parseInt(query_spec.opts.start_ms / 1000, 10));
  }

  if (query_spec.opts.end_ms) {
    filters.push(tf + RECORD_SEPARATOR + "lt" + RECORD_SEPARATOR + parseInt(query_spec.opts.end_ms / 1000, 10));
  }

  _.each(query_spec.opts.filters, function(f) {
    var column = f.column;
    if (!query_spec.col_config[column] ||
        query_spec.col_config[column].final_type !== "integer") {
      return;
    }
    var value = f.conditions[0].value; //hardcoded for now

    filters.push(column + RECORD_SEPARATOR + f.conditions[0].op.replace("$", "") + RECORD_SEPARATOR + value);
  });


  var args = "";

  if (tf) {
    args = "-time-col " + tf + " ";
  }

  if (filters.length === 0) {
    return args;
  }

  return " -int-filter \"" + filters.join(FIELD_SEPARATOR) + "\" " + args;
}

function add_str_filters(query_spec) {
  if (!query_spec || !query_spec.opts) {
    return "";
  }

  var filters = []

  _.each(query_spec.opts.filters, function(f) {

    var column = f.column;
    column = column.replace(/^string\./, "");
    column = column.replace(/^integer\./, "");
    column = column.replace(/^set\./, "");
    if (!query_spec.col_config[column] ||
        query_spec.col_config[column].final_type !== "string") {
      return;
    }

    var op = "re"; // hardcoded
    if (f.conditions[0].op != "$regex") {
      op = "nre"
    }

    var value = f.conditions[0].value; //hardcoded for now

    filters.push(column + RECORD_SEPARATOR + op + RECORD_SEPARATOR + value);
  });

  if (filters.length === 0) {
    return "";
  }

  return "-str-filter \"" + filters.join(FIELD_SEPARATOR) + "\" ";
}

function run_samples_query(table, query_spec, cb) {
  if (!table) {
    return cb("No TABLE!", table)
  }

  var args = "";
  args += get_args_for_spec(query_spec)
  var table_name = table.table_name || table;

  var meta = query_spec.meta.metadata;
  var col_info = meta.columns;
  run_query_cmd(args + " -samples -json -table " + table_name, function(err, samples) {
    var results = [];

    _.each(samples, function(sample) {
      var result = {
        integer: {},
        string: {}
      };

      // TODO: use the column metadata to convert rows -> nest samples
      _.each(sample, function(v, k) {
        if (col_info[k]) {
          if (col_info[k].type_str === "integer") {
            result.integer[k] = v;
            return;
          } else if (col_info[k].type_str === "string") {
            result.string[k] = v;
            return;
          }
        }

        try {
           var res = parseInt(v, 10);
           if (isNaN(res)) { throw "NaN"; }

           if (v == res.toString()) {
             result.integer[k] = res;
             return;
           }
        } catch (e)  { }

        result.string[k] = v;

      });

      results.push(result);

    });

    cb(null, results);
  })
}

var _cached_columns = {};
function get_cached_columns(table, cb) {
  if (!table) {
    return;
  }

  table = table.table_name || table
  if (_cached_columns[table]) {
    var cached_for = (Date.now() - _cached_columns[table].updated) / 1000;
    cb(_cached_columns[table].results);
    cb = function() { };
    if (cached_for < 60 * 10) {
      return;
    }
  }

  get_columns(table, cb);
}


var _pending = {};
function get_columns(table, cb) {
  if (!table) {
    return cb();
  }

  cb = context.wrap(cb)
  table = table.table_name || table;

  if (_pending[table]) {
    _pending[table].push(cb);
    return;
  }
  _pending[table] = [cb];

  run_query_cmd("-info -json -table " + table, function(err, info) {
    var cols;
    if (err || !info || !info.columns) {
      cols = {};
    } else {

      var cols = []
      var PREFIX_RE = /^(integer_|string_|set_)/;
      _.each(info.columns.ints, function(col) {
        cols.push({name: col, type_str: 'integer', display_name: col.replace(PREFIX_RE, '')});
      });

      _.each(info.columns.strs, function(col) {
        cols.push({name: col, type_str: 'string', display_name: col.replace(PREFIX_RE, '')});
      });

      _cached_columns[table] = {
        results: cols,
        updated: Date.now()
      };
    }


    _.each(_pending[table], function(_cb) {
      _cb(cols);
    });

    delete _pending[table];
  });

}

var DIGESTIONS = {}
function queue_digest_records(table_name) {
  DIGESTIONS[table_name] = true
  digest_records();
}

var digest_records = _.throttle(function () {
  _.each(DIGESTIONS, function(val, table_name) {
    child_process.exec(BIN_PATH + " digest -table " + table_name, {
      cwd: DB_DIR,
    }, function(err, stdout, stderr) {
      console.log(stderr);
    });
  });

  DIGESTIONS = {};
}, 60 * 5 * 1000 /* 5 minute digestions */, { leading: false });


var QUEUES = {};

var flush_queue = _.throttle(function() {
  _.each(QUEUES, function(queue, table_name) {
    var all = [];
    _.each(queue, function(samples) {
      all = all.concat(samples);
    });
    queue.length = 0;

    if (!all.length) {
      return;
    }

    console.log("QUEUE", table_name, all.length);

    var cmd = get_cmd(BIN_PATH, "ingest -table " + table_name);
    if (config.debug_driver) {
      console.log("RUNNING COMMAND", cmd);
    }
    queue_digest_records(table_name);
    var cp = child_process.exec(cmd, {
      cwd: DB_DIR,
    });

    _.each(all, function(s) {
      cp.stdin.write(JSON.stringify(s) + "\n");
    });
    cp.stdin.destroy();
  });
}, 3000);

var PCSDriver = _.extend(driver.Base, {
  run: function(table, query_spec, unweight, cb) {
    console.log("RUNNING QUERY", table, query_spec);
    if (!table) {
      return cb("Error TABLE", table, "is undefined")
    }

    if (backend.SAMPLE_VIEWS[query_spec.view]) {
      run_samples_query(table, query_spec, cb);
    }

    if (query_spec.view === 'table') {
      run_table_query(table, query_spec, cb);
    }

    if (query_spec.view === 'time') {
      run_time_query(table, query_spec, cb);
    }
    if (query_spec.view === 'hist') {
      run_hist_query(table, query_spec, cb);
    }
  },
  get_stats: function(table, cb) {
    console.log("GETTING STATS FOR TABLE", table)
    table = table.table_name || table
    // count: 3253,
    // size: 908848,
    // avgObjSize: 279.3876421764525,
    // storageSize: 1740800,
    run_query_cmd("-json -info -table " + table, function(err, info) {
      cb(info);
    });
  },
  get_tables: function(cb) {
    run_query_cmd("-tables -json",
      function(err, info) {
        var tables = [];
        _.each(info, function(table) {
          tables.push({ table_name: table });
        });

        cb(tables);
      });
  },
  get_columns: get_cached_columns,
  clear_cache: function(table, cb) {},
  drop_dataset: function(table, cb) {},
  extra_buckets: function() {

    var ret = {};
    if (HAS_LOG_HIST) {
      ret["log_hist"] = "dynamic";

    }

    if (HAS_HDR_HIST) {
      ret["hdr_hist"] = "hdr";
    }

    return ret;
  },
  extra_metrics: function() {

    return {
      "$p5" : "P5",
      "$p25" : "P25",
      "$p50" : "P50",
      "$p75" : "P75",
      "$p90" : "P90",
      "$p95" : "P95",
      "$distinct" : "Distinct"
    };
  },
  default_table: "snorkel_test_data",
  add_samples: function(dataset, subset, samples, cb) {
    if (!samples || !samples.length) {
      return;
    }

    var table_name = dataset + DATASET_SEPARATOR + subset;
    var queue = QUEUES[table_name] || [];
    QUEUES[table_name] = queue;
    queue.push(samples);
    cb();

    flush_queue();

  },
  SEPARATOR: DATASET_SEPARATOR
});

module.exports = PCSDriver;
