"use strict";


// External dependencies
var pg = require("pg");
var squel = require("squel");


var context = require_core("server/context");
var backend = require_app("server/backend");
var driver = require_app("server/backends/driver");
var conString = "postgres://postgres:1234@localhost/postgres";

var PREFIX = "_";

// TODO:
// x implement weighting columns
// x implement sort by
// x add limit filter clauses
// x add filters clauses for column specified filters
// x add filters clauses for time
// x implement time view
// x implement dist view
// x implement sum/count metrics


var col_defs = {
  "string" : "string",
  "integer" : "integer",
  "float" : "integer"
};

var cast_defs = {
  "string" : "text",
  "integer" : "float",
  "float" : "float"
};

var METRICS = {
  "$avg" : "AVG",
  "$sum" : "SUM",
  "$count" : "COUNT",
  "$distinct" : "COUNT"
};


function predict_column_types(data) {
  var schema = {};
  var values = {};
  _.each(data, function(fields) {
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

function get_time_column(col, type, do_cast, weight_col) {
  var cast_type = cast_defs[type] || type;
  var col_type = col_defs[type] || type;
  var ret = JSON.stringify(col);
  ret = "extract(epoch from " + ret + ")::" + cast_type;

  if (weight_col && type == "integer") {
    ret = ret + " * _weighted";
  }

  if (do_cast) {
    ret = ret + " AS _" + col;
  }

  return ret;

}

function get_column(col, type, do_cast, weight_col) {
  var cast_type = cast_defs[type] || type;
  var col_type = col_defs[type] || type;
  var ret = JSON.stringify(col);
  ret = "(" + ret + ")::" + cast_type;

  if (weight_col && type == "integer") {
    ret = ret + " * _weighted";
  }

  if (do_cast) {
    ret = ret + " AS _" + col;
  }

  return ret;
}

function get_metric(col, metric, weight) {
  var ret =  metric + "(" + col;
  if (weight) {
    ret += " * _weighted";
  }

  return ret + ") AS _" + col;
}

function round_column(col, bucket_size) {
  var ret = "(round(" + get_column(col, "integer");

  ret += "/ " + bucket_size + ")) *" + bucket_size + " AS _" + col;

  return ret;
}

function round_time_column(col, bucket_size) {
  var ret = "(round(extract(epoch from " + JSON.stringify(col) + ")";

  ret += "/ " + bucket_size + ")) *" + bucket_size + " AS _" + col;

  return ret;

}

function marshall_rows(rows) {
  var ret =  _.map(rows, function(r) { return r.blob || r; });
  return ret;
}

function marshall_count(from, to) {
  if (from._distinct) {
    to.count = parseInt(from._distinct, 10);
  } else {

    if (from._count) {
      to.count = parseInt(from._count, 10);
    }


    if (from._weighted_count) {
      to.weighted_count = parseInt(from._weighted_count, 10);
    }
  }

}

function marshall_time_rows(time_col, rows, cols, dims) {
  var ret = [];

  _.each(rows, function(r) {
    var row = {};
    row._id = {};
    _.each(dims, function(d) {
      row._id[d] = r[PREFIX + d];
    });

    _.each(cols, function(c) {
      row[c] = parseInt(r[PREFIX + c], 10);
    });

    var time_key = '_' + time_col.toLowerCase();
    if (r[time_key]) {
      row._id.time_bucket = parseInt(r[time_key], 10);
    }

    marshall_count(r, row);

    ret.push(row);
  });

  return ret;


}

function marshall_dist_rows(rows, cols, dims) {
  var ret = [];
  _.each(rows, function(r) {
    var row = {};
    row._id = {};
    _.each(cols, function(d) {
      row._id[d] = parseInt(r[PREFIX + d], 10);
    });
    _.each(dims, function(d) {
      row._id[d] = r[PREFIX + d];
    });

    marshall_count(r, row);

    ret.push(row);
  });


  return ret;


}

function marshall_table_rows(rows, cols, dims) {
  var ret = [];
  _.each(rows, function(r) {
    var row = {};
    row._id = {};
    _.each(dims, function(d) {
      row._id[d] = r[PREFIX + d];
    });

    _.each(cols, function(c) {
      row[c] = parseInt(r[PREFIX + c], 10);
    });

    marshall_count(r, row);

    ret.push(row);
  });

  return ret;
}

var query_defs = {
  "$gt" : function(col, type, value) {
    return get_column(col, type) + " > " + value;
  },
  "$lt" : function(col, type, value) {
    return get_column(col, type) + " < " + value;
  },
  "$regex" : function(col, type, value) {
    return get_column(col, type) + "~ '" + value + "'";
  },
  "$eq" : function(col, type, value) {
    return get_column(col, type) + " = " + value;
  },
  "$neq" : function(col, type, value) {
    return get_column(col, type) + " != " + value;
  },
  "$in" : function(col, type, value) {
    var ret = "blob#>>'{" + type + "," + col + "}'";
    return ret + " ~ '" + value + "'";

  },
  "$nin" : function(col, type, value) {
    var ret = "blob#>>'{" + type + "," + col + "}'";
    value = "^((?!" + value + ").)*$";
    return ret + " ~ '" + value + "'";

  },
  "$all" : function(col, type, value) {
    if (type == "set") {
      return _.map(value, function(value) {
        return query_defs.$in(col, type, value.trim()) + " ";
      }).join(" AND ");
    }

    return "";
  }
};

function add_query_filters(query_spec, stmt) {

  if (query_spec.params.filters) {
    _.each(query_spec.params.filters, function(filter) {
      var split_col = filter.column.split(".");
      var type = split_col[0];
      var col = split_col[1];

      _.each(filter.conditions, function(condition) {
        if (query_defs[condition.op]) {
          var clause = query_defs[condition.op](col, type, condition.value);
          if (clause) {
            stmt.where(clause);
          }
        }
      });
    });
  }

}

function pg_run(query, args, cb) {
  cb = context.wrap(cb);
  pg.connect(conString, function(err, client, done) {
    if(err) {
      return console.error('could not connect to postgres', err);
    }

    client.query(query, args, function(err, result) {
      done();

      try {
        if (cb) {
          cb(err, result);
        }
      } catch(e) {
        console.log("ERROR!", e);
      }
    });
  });
}

function prep_query(table, query_spec, unweight, stmt) {
  var pre_stmt = squel.select().from(JSON.stringify(table));

  stmt = stmt.from("_intermediate_results_");
  stmt.pre = pre_stmt;
  stmt.define = function(definition, col) {
    if (col) {
      pre_stmt.field(definition, col);
    } else {
      pre_stmt.field(definition);
    }
  };

  if (query_spec && query_spec.opts && query_spec.opts.weight_col
        && !backend.SAMPLE_VIEWS[query_spec.opts.view]) {
    stmt.define(get_column(query_spec.opts.weight_col, "integer") + " AS _weighted");

    stmt.field("SUM(_weighted)", "_weighted_count");
  }

  var params = query_spec.params;
  if (params.agg === "$distinct") {
    var str_dims = _.map(params.dims, function(r) { return JSON.stringify(r); });
    stmt.field("COUNT(DISTINCT " + str_dims.join(",") + ") AS _distinct");
    _.each(params.dims, function(dim) {
      pre_stmt.field(dim);
    });

    delete params["dims"];
  }


}

function do_query(query_spec, stmt, cb) {

  // i guess we should first translate to a lateral view, so the statement looks cleaner.
  // cols, dims and filters need to be pulled?
  var time_field = query_spec.meta.metadata.time_col || "time";
  _.each(query_spec.opts.dims, function(dim) {
    stmt.define(JSON.stringify(dim));
  });
  
  stmt.define(JSON.stringify(time_field));

  // need to translate start_ms and end_ms to time filters
  stmt.pre.where(get_time_column(time_field, "float", false) + " > " + query_spec.opts.start_ms / 1000);
  stmt.pre.where(get_time_column(time_field, "float", false) + " < " + query_spec.opts.end_ms / 1000);

  if (query_spec.opts.limit) {
    if (query_spec.opts.view !== "time" &&
        query_spec.opts.view !== "area" &&
        query_spec.opts.views !== "distribution") {
      stmt.limit(query_spec.opts.limit || 100);
    }
  }

  if (query_spec.opts.sort_by) {
    if (query_spec.opts.view !== "samples" && query_spec.opts.sort_by !== "count") {
      var metric = METRICS[query_spec.opts.agg];
      if (!_.contains(query_spec.opts.cols, query_spec.opts.sort_by)) {
        stmt.define(get_column(query_spec.opts.sort_by, "integer"), query_spec.opts.sort_by);
        stmt.field(get_metric(query_spec.opts.sort_by, metric));
      }

      stmt.order(PREFIX + query_spec.opts.sort_by, false);

    }
  }

  add_query_filters(query_spec, stmt.pre);

  console.log("PRE QUERY\n", stmt.pre.toString(), "\n");
  console.log("POST QUERY\n", stmt.toString(), "\n");


  var full_statement = "WITH _intermediate_results_ AS (" + stmt.pre.toString() + ")\n" + stmt.toString();
  console.log("FULL QUERY\n\n", full_statement, "\n");

  pg_run(full_statement, [], function(err, res) {
    if (err) {
      console.log("ERROR", err);
    }

    cb(err, res.rows);
  });
}


function build_table_view(query_spec, stmt, unweight, cb) {
  var params = query_spec.params;
  var col_config = query_spec.col_config;

  var cols = params.cols;
  var dims = params.dims;

  if (!cols.length) {
    cols = [];
  }

  var column_defs = [];
    stmt.field("COUNT(1)", "_count");

  _.each(dims, function(f) {
    stmt.define(get_column(f, "string", true, params.weight_col));
    stmt.field(PREFIX + f);
    stmt.group(PREFIX + f);
  });

  var metric = METRICS[params.agg];

  _.each(cols, function(f) {
    stmt.define(get_column(f, "integer"), f);
    stmt.field(get_metric(f, metric, params.weight_col));
  });

  do_query(query_spec, stmt, function(err, result){
    if (!err) {
      var m = marshall_table_rows(result, cols, dims);
      cb(null, m);
    } else {
      console.log("ERROR RUNNING QUERY", err);
      cb(err);
    }
  });
}

function build_samples_view(query_spec, stmt, unweight, cb) {
  stmt.limit(query_spec.params.limit || 100);

  stmt.define("*");
  do_query(query_spec, stmt, function(err, result){
    var col_types = query_spec.meta.metadata.columns;
    if (!err) {
      var marshalled = [];
      _.each(result, function(r) {
        var full_row = { string: {}, integer: {}, set: {}};
        _.each(r, function(data, col) {
          var col_info = col_types[col];
          if (col_info.actual_type.indexOf("timestamp") !== -1) {
            data = +new Date(data);
          }
          full_row[col_info.type_str][col] = data;

        });
        marshalled.push(full_row);

      });
      // Need to convert the samples into the form we would normally expect them!
      cb(null, marshalled);
    } else {
      cb(err);
    }
  });
}

function build_dist_view(query_spec, stmt, unweight, cb) {
  var col_config = query_spec.col_config;
  var opts = query_spec.params;
  var col = opts.col, bucket_size = opts.hist_bucket;

  if (!col && opts.cols) {
    col = opts.cols[0];
  }

  stmt.define(get_column(col, "integer"), col);

  if (opts.dims) {
    _.each(opts.dims, function(dim) {
      stmt.group(PREFIX + dim);
      stmt.field(PREFIX + dim);
      stmt.define(get_column(dim, "string"), PREFIX + dim);
    });
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

  stmt
    .field("COUNT(1) AS _count")
    .field(round_column(col, bucket_size, unweight))
    .group(PREFIX + col);

  do_query(query_spec, stmt, function(err, result) {
    var marshalled = marshall_dist_rows(result,
      [col] /* columns */,
      opts.dims /* dimensions */);
    if (!err) {
      cb(null, marshalled);
    } else {
      console.log("ERROR RUNNING QUERY", err);
      cb(err);
    }
  });
}

function build_time_view(query_spec, stmt, unweight, cb) {
  var col_config = query_spec.col_config;
  var opts = query_spec.params;
  var dims = opts.dims, cols = opts.cols;
  var agg = opts.agg;
  var time_field = query_spec.time_field || query_spec.meta.metadata.time_col || "time";
  var pipeline = [];

  stmt
    .field("COUNT(1) AS _count")
    .group(PREFIX + time_field);

  var time_bucket = opts.time_bucket || 60 * 60 * 6; // 6 hours?

  var dim_groups = {};
  _.each(dims, function(dim) {
    stmt
      .field(get_column(dim, "string", true))
      .group(PREFIX + dim);
  });

  stmt.field(round_time_column(time_field, time_bucket));


  _.each(cols, function(col) {
    stmt.define(get_column(col, "integer"), col);
    stmt.field(get_metric(col, METRICS[opts.agg], opts.weight_col));
  });

  do_query(query_spec, stmt, function(err, result) {

    var marshalled = marshall_time_rows(time_field, result,
      opts.cols /* columns */,
      opts.dims /* dimensions */);

    if (!err) {
      cb(null, marshalled);
    } else {
      console.log("ERROR RUNNING QUERY", err);
      cb(err);
    }
  });
}

function unweight_results(results) {
  _.each(results, function(result) {
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

function get_columns(table, cb) {

  var table_name = table.table_name || table;
  var stmt = squel.select()
    .field("column_name, data_type")
    .from("information_schema.columns")
    .where("table_name = '" + table_name + "'");

  pg_run(stmt.toString(), [], function(err, result) {
    if (!err) {
      var marshalled = _.map(result.rows, function(col) {
        var predicted_type = "";
        if (col.data_type.indexOf("character") !== -1) { predicted_type = "string"; } 
        else if (col.data_type.indexOf("integer") !== -1) { predicted_type = "integer"; }
        else if (col.data_type.indexOf("boolean") !== -1) { predicted_type = "string"; }
        else if (col.data_type.indexOf("timestamp") !== -1) { predicted_type = "integer"; }

        return {
          name: col.column_name,
          type_str: predicted_type,
          actual_type: col.data_type
        };

      });


      cb(marshalled);
    } else {
      cb();
    }
  });
}

var _cached_columns = {};
var _pending = {};
function get_cached_columns(table, cb) {

  cb = context.wrap(cb);
  table = table.table_name || table;
  if (_cached_columns[table]) {
    console.log("Using cached column results for", table);
    var cached_for = (Date.now() - _cached_columns[table].updated) / 1000;
    cb(_cached_columns[table].results);
    cb = function() { };
    if (cached_for < 60 * 10) {
      return;
    }
  }

  if (_pending[table]) {
    _pending[table].push(cb);
    return;
  }

  _pending[table] = [cb];


  get_columns(table, function(results) {
    _cached_columns[table] = {
      results: results,
      updated: Date.now()
    };

    _.each(_pending[table], function(cb) {
      console.log("EMITTING UPDATED RESULTS");
      cb(results);
    });
    delete _pending[table];
  });
}


var PGDriver = _.extend(driver.Base, {
  run: function(table, query_spec, unweight, cb) {

    // Need to generate filters from the query spec, too
    // generate_filter_clause(query_spec);
    
    var func;
    if (backend.SAMPLE_VIEWS[query_spec.view]) {
      func = build_samples_view;
    } else if (query_spec.view === "table") {
      func = build_table_view;
    } else if (query_spec.view === "hist") {
      func = build_dist_view;
    } else if (query_spec.view === "time") {
      func = build_time_view;
    } else {
      func = function() {
        console.log("NO VIEW TO RUN FOR", query_spec.view);
        cb("No view to validate");
      };
    }

    if (func) {
      var stmt = squel.select();

      prep_query(table, query_spec, unweight, stmt);
      var unweight_cb = function(err, results) {
        if (!err && !backend.SAMPLE_VIEWS[query_spec.view]) {
          unweight_results(results);
        }

        cb(err, results);
      };


      func(query_spec, stmt, unweight, unweight_cb);
    }
  },
  get_stats: function(table, cb) {
    var stmt = squel.select()
      .from(JSON.stringify(table))
      .field("count(1)", "count");

    var stats = {};
    var after = _.after(3, function() {
      cb(stats);
    });

    // count: 3253,
    // size: 908848,
    // avgObjSize: 279.3876421764525,
    // storageSize: 1740800,
    pg_run(stmt.toString(), [], function(err, result) {
      if (!err) {
        stats.count = parseFloat(result.rows[0].count);
        if (stats.size) {
          stats.avgObjSize = stats.size / stats.count;
        }
      }
      after();
    });

    var size_sql = "SELECT pg_relation_size('" + table + "') as bytes;";
    pg_run(size_sql, [], function(err, result) {
      if (!err) {
        stats.size = parseFloat(result.rows[0].bytes);
        if (stats.count) {
          stats.avgObjSize = stats.size / stats.count;
        }
      }
      after();

    });

    var total_size_sql = "SELECT pg_total_relation_size('" + table + "') as bytes;";

    pg_run(total_size_sql, [], function(err, result) {
      if (!err) {
        stats.storageSize = parseFloat(result.rows[0].bytes);
      }
      after();
    });
  },
  get_tables: function(cb) {
    cb = context.wrap(cb);
    var stmt = squel.select()
      .field("table_name")
      .from("information_schema.tables")
      .where("table_schema = 'public' and table_name LIKE '%'");

    pg_run(stmt.toString(), [], function(err, result) {
      if (!err) {
        cb(result.rows);
      } else {
        cb();
      }
    });
  },
  extra_metrics: function() {
    return {
      "$distinct" : "Distinct"
    };
  },
  get_columns: get_cached_columns,
  clear_cache: function(table, cb) {},
  drop_dataset: function(table, cb) {},
  default_table: "snorkel_test_data",
  add_samples: function(dataset, subset, samples, cb) {
    cb();
  }
});

module.exports = PGDriver;
