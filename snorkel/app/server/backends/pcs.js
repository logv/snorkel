"use strict";

var driver = require_app("server/backends/driver");
var context = require_core("server/context");

var child_process = require("child_process");
var backend = require_app("server/backend");

var path = require("path")
var cwd = process.cwd()

var BIN_PATH = path.join(cwd, "./bin/sybil ");

var DB_DIR = "./"
// TODO:
// implement weighting columns
// implement sort by
// implement sum/count metrics


function get_cmd(bin, arg_string) {
  return bin + " " + arg_string
}

function run_query_cmd(arg_string, cb) {
  var cmd = get_cmd(BIN_PATH, " query " + arg_string);
  cb = context.wrap(cb);
  console.log("RUNNING COMMAND", cmd);
  child_process.exec(cmd, {
    cwd: DB_DIR,
    maxBuffer: 100000*1024
  }, function(err, stdout, stderr) {
    console.log(stderr)
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
      var row = {};
      row._id = {};
      _.each(dims, function(d) {
        row._id[d] = r[d];
      });

      _.each(cols, function(c) {
        row[c] = extract_val(query_spec, r, c);
      });

      row._id.time_bucket = parseInt(time_bucket, 10);

      row.count = r.Count;

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

  if (agg === "$sum") {
    sum = true;
  } else if (agg === "$count") {
    count = true;
  }
  if (agg.indexOf("$p") === 0) {
    percentile = parseInt(agg.substr(2), 10);
    if (_.isNaN(percentile)) {
      percentile = null;
    }
  }
  if (percentile) {
    if (r[c]) {
      return parseFloat(r[c].percentiles[percentile], 10);
    } else {
      return  "NA";
    }
  } else if (sum) {
    return r.Count * parseFloat(r[c], 10);
  } else if (count) {
    return  r.Count;
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
    row.count = r.Count;

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
      var group_by = dims.join(",");
      if (group_by.trim() !== "") {
        cmd_args += " -group " + group_by + " ";
      }
    }
  }
  if (query_spec.opts.cols.length) {
    var int_by = query_spec.opts.cols.join(",");
    cmd_args += " -int " + int_by + " ";

    if (query_spec.opts.agg && query_spec.opts.agg.indexOf("$p") === 0) {
      cmd_args += " -op hist ";
    }

  }

  return cmd_args;
}

function add_limit(query_spec) {

  if (query_spec.opts.limit) {
    return "-limit " + query_spec.opts.limit + " "
  }

  return ""
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

  var tf = query_spec.meta.metadata.time_col || df;

  if (query_spec.opts.start_ms) {
    filters.push(tf + ":gt:" + query_spec.opts.start_ms / 1000);
  }

  if (query_spec.opts.end_ms) {
    filters.push(tf + ":lt:" + query_spec.opts.end_ms / 1000);
  }

  _.each(query_spec.opts.filters, function(f) {
    var tokens = f.column.split('.');
    if (tokens[0] !== "integer") {
      return
    }
    var column = tokens.slice(1).join('.');
    var value = f.conditions[0].value; //hardcoded for now

    filters.push(column + ':' + f.conditions[0].op.replace("$", "") + ':' + value);
  });


  var args = "";

  if (tf) {
    args = "-time-col " + tf + " ";
  }

  if (filters.length === 0) {
    return args;
  }

  return " -int-filter \"" + filters.join(",") + "\" " + args;
}

function add_str_filters(query_spec) {
  if (!query_spec || !query_spec.opts) {
    return "";
  }

  var filters = []

  _.each(query_spec.opts.filters, function(f) {
    var tokens = f.column.split('.');
    if (tokens[0] !== "string") {
      return
    }
    var column = tokens.slice(1).join('.');
    var op = "re"; // hardcoded
    if (f.conditions[0].op != "$regex") {
      op = "nre"
    }

    var value = f.conditions[0].value; //hardcoded for now

    filters.push(column + ':' + op + ':' + value);
  });

  if (filters.length === 0) {
    return "";
  }

  return "-str-filter \"" + filters.join(",") + "\" ";
}

function run_samples_query(table, query_spec, cb) {
  if (!table) {
    return cb("No TABLE!", table)
  }

  var args = "";
  args += get_args_for_spec(query_spec)
  var table_name = table.table_name || table;
  run_query_cmd(args + " -samples -json -table " + table_name, function(err, samples) {
    var results = [];

    _.each(samples, function(sample) {
      var result = {
        integer: {},
        string: {}
      };

      _.each(sample, function(v, k) {
        try {
          var res = parseInt(v, 10);
          if (isNaN(res)) { throw "NaN"; }

          result.integer[k] = res;
          return;
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

  console.log("GETTING COLUMNS", table)
  run_query_cmd("-info -json -table " + table, function(err, info) {
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
}, 30000, { leading: false });

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
  extra_metrics: function() {

    return {
      "$p5" : "P5",
      "$p25" : "P25",
      "$p50" : "P50",
      "$p75" : "P75",
      "$p90" : "P90",
      "$p95" : "P95"
    };
  },
  default_table: "snorkel_test_data",
  add_samples: function(dataset, subset, samples, cb) {
    console.log("ADDING SAMPLES", dataset, subset, samples);
    var table_name = dataset + "." + subset;
    var cmd = get_cmd(BIN_PATH, "ingest -table " + table_name);
    cb = context.wrap(cb);
    console.log("RUNNING COMMAND", cmd);
    queue_digest_records(table_name);
    var cp = child_process.exec(cmd, {
      cwd: DB_DIR,
    });

    _.each(samples, function(s) {
      cp.stdin.write(JSON.stringify(s) + "\n");
    });
    cp.stdin.destroy();

    cb();


  }
});

module.exports = PCSDriver;
