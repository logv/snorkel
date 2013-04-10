"use strict";


var async = require("async");
var auth = require_root("server/auth");
var backend = require_root("server/backend");
var config = require_root("server/config");
var context = require_root("server/context");
var controller = require_root("server/controller");
var db = require_root("server/db");
var page = require_root("server/page");
var bridge = require_root("server/bridge");
var querystring = require("querystring");
var Sample = require_root("server/sample");
var template = require_root("server/template");
var url = require("url");
var view = require_root("controllers/query/view");
var $ = require("cheerio");

var Hashids = require("hashids"),
    hashids = new Hashids("keyboard cat");

var strtotime = require_vendor("strtotime");

var __results_id = 0;

var value_of = controller.value_of,
    array_of = controller.array_of;

function fuzzy_time(time_str, now, delta) {
  now = now || Date.now();
  var pm = time_str.match("pm");
  time_str = time_str.replace(/(am|pm)/, "");

  var time_val = strtotime(time_str, now / 1000) * 1000;
  if (!time_val) {
    time_val = strtotime(new Date(now).toDateString() + " " + time_str, now / 1000) * 1000;
    if (pm) {
      // Add twelve hours if we see pm string
      time_val += 1000 * 60 * 60 * 12;
    }
  }

  var ret = time_val;
  if (delta) {
    var epoch = +(new Date());
    return ret - epoch;
  }

  return ret;

}

function estimate_time_buckets(query_interval, buckets) {
  var best_bucket_count = buckets || 1000;
  var min_intervals = [ 5, 10, 30, 60, 120, 360, 720 ];
  var i, interval_ms;


  for (i = 0; i < min_intervals.length; i++) {
    var interval = min_intervals[i] * 60 * 1000;
    if (query_interval / interval < best_bucket_count) {
      interval_ms = min_intervals[i] * 60;
      break;
    }
  }

  return interval_ms;
}

function marshall_query(form_data) {
  var query_data = {};

  query_data.limit = value_of(form_data, 'max_results', 100);
  if (_.isString(query_data.limit)) {
    query_data.limit = parseInt(query_data.limit, 10);
  }

  query_data.dims = array_of(form_data, 'group_by', ["browser"]);
  query_data.view = value_of(form_data, 'view', 'table');

  query_data.table = value_of(form_data, 'table');
  query_data.stacking = value_of(form_data, 'stacking', 'normal');

  var start_str_ms = value_of(form_data, 'start', '-1 hour');
  var end_str_ms = value_of(form_data, 'end', 'now');
  var now = Date.now();


  // Now we should round the start and end to the time bucket
  query_data.start_ms = fuzzy_time(start_str_ms, now);
  query_data.end_ms = fuzzy_time(end_str_ms, now);

  var query_interval = Math.abs(query_data.end_ms - query_data.start_ms);
  var time_bucket = parseInt(value_of(form_data, 'time_bucket'), 10);
  if (!time_bucket) {
    time_bucket = estimate_time_buckets(query_interval, 800);
  }

  if (time_bucket) {
    // Have to adjust the interval if there is a time bucket
    query_data.start_ms = (Math.round(query_data.start_ms / 1000 / time_bucket) - 1) * time_bucket * 1000;
    query_data.end_ms = (Math.ceil(query_data.end_ms / 1000 / time_bucket) + 1) * time_bucket * 1000;

    console.log("Looking for time between", query_data.start_ms, query_data.end_ms);
  }

  query_data.end_str = end_str_ms;
  query_data.start_str = start_str_ms;

  query_data.start_date = new Date(query_data.start_ms);
  query_data.end_date = new Date(query_data.end_ms);
  query_data.weight_col = value_of(form_data, 'weight_col');

  var compare_delta = value_of(form_data, 'compare');
  if (compare_delta) {
    query_data.compare_delta = fuzzy_time(compare_delta, null, true);
    query_data.compare_str = compare_delta;
  }


  var hist_bucket = parseInt(value_of(form_data, 'hist_bucket', 10), 10);

  // TODO: have views take more part in augmenting query data?
  query_data.hist_bucket = hist_bucket;
  query_data.time_bucket = time_bucket;

  var aggs = [];
  var agg = value_of(form_data, 'agg', 'avg');
  var fields = array_of(form_data, 'field');
  var fieldset = array_of(form_data, 'fieldset');

  query_data.cols = [];
  var use_fields;

  // TODO: Dist only accepts one field at a time, but this needs to be better
  // encapsulated
  if (fieldset.length && query_data.view !== "dist") {
    use_fields = fieldset;
  } else if (fields.length) {
    use_fields = fields;
  } else {
    console.log("Warning: no fields found for query");
    use_fields = [ ];
    agg = "$count";
  }

  _.each(use_fields, function(field) {
    query_data.cols.push(field);

    aggs.push({
      arg: field,
      type: agg.toUpperCase()
    });
  });

  var input_filters = JSON.parse(value_of(form_data, 'filters', '{}'));

  function parse_filters(form_filters, use_falsey) {
    var filters = {};
    // I don't know the field types over here. Oops.
    _.each(form_filters, function(filter) {
      var field = filter.shift();
      var op = filter.shift();
      var val = filter.shift();

      // TODO: come back ehere and fix logic for when to sue filters and not.
      if (!val && !use_falsey) {
        return;
      }

      if (field.match(/integer/)) {
        val = parseInt(val, 10);

        if (!_.isNumber(val)) {
          return;
        }
      }

      // ^((?!query).)*$
      // do some preproductions :-)
      // TODO: move operation preprocessing to lower in the stack?
      if (op === "$regexv") {
        val = "^((?!" + val + ").)*$";
        op = "$regex";
      }

      // there is no real support for $eq in mongo, instead using $all. even though 
      // its more janky.
      if (op === "$eq") {
        val = [val];
        op = "$all";
      }

      // For $nin and $in, try JSON first, then regular string second
      if (op === "$nin" || op === "$in") {
        if (_.isString(val)) {
          try {
            val = JSON.parse(val);
          } catch(e) {
            val = val.split(',');
          }
        }

        if (!_.isArray(val)) {
          val = [val];
        }
      }

      filters[field] = filters[field] || { conditions: [] };
      filters[field].conditions.push({ op: op, value: val });
      filters[field].column = field;
    });

    var ret = [];
    _.each(filters, function(filter) {
      ret.push(filter);
    });

    return ret;
  }

  if (input_filters.query) {
    query_data.filters = parse_filters(input_filters.query, false /* dont consider empty filters */);
  }

  if (input_filters.compare) {
    var compare_filters = parse_filters(input_filters.compare, true /* allow empty filters */);
    if (compare_filters.length) {
      query_data.compare_filters = compare_filters;
    }
  }

  query_data.agg = agg;

  return query_data;
}

var queries = {
  bar: backend.table,
  dist: backend.hist,
  table: backend.table,
  samples: backend.samples,
  scatter: backend.samples,
  time: backend.time_series,
  area: backend.time_series

};

function build_pipeline(params) {
  var query = queries[params.view];

  if (!query) {
    console.log("!!!! Couldn't find query base: " + params.view, params);
    return [];
  }



  var pipeline = query(params);

  var start_s = parseInt(params.start_ms / 1000, 10);
  var end_s = parseInt(params.end_ms / 1000, 10);

  var sort = [ {$sort: { "count" : -1 }} ];

  var timeline = backend.time_range(start_s, end_s);
  var filters = backend.add_filters(params.filters);
  var limit = [];
  if (params.limit) {
    limit.push({$limit: params.limit || 100});
  }

  return timeline
    .concat(filters)
    .concat(pipeline)
    .concat(sort)
    .concat(limit);
}

function run_query(table_name, pipeline, query_type, do_weighting, cb) {
  console.log("Running", query_type, "query", JSON.stringify(pipeline), "on", table_name);
  backend.run(table_name, pipeline, do_weighting, function(err, data) { cb(err, data); });
}



function get_index() {
  if (controller.require_https()) { return; }

  var table = context("req").query.table || "test/data";
  if (_.isArray(table)) {
    table = table.pop();
  }

  context("query_table", table);
  context("title", "snorkel");

  bridge.controller("query", "set_table", table);

  function render_query_content() {

    return template.partial("query/content.html.erb");
  }

  function render_query_sidebar() {
    var controls = view.get_controls(),
        filters = view.get_filters(),
        stats = view.get_stats(),
        aux_button = $C("button", {
          name: "Go",
          delegate: { "click" : "go_clicked" },
          classes: "go_button btn-primary"
        }),
        go_button = $C("button", {
          name: "Go",
          delegate: { "click" : "go_clicked" },
          classes: "go_button btn-primary"
        });

    function wrap_str(str) {
      return function() {
        return str;
      };
    }


    return template.partial("query/sidebar.html.erb", {
      render_controls: wrap_str(controls),
      render_filters: wrap_str(filters),
      render_stats: wrap_str(stats),
      render_go_button: go_button.toString,
      render_aux_button: aux_button.toString
    });
  }

  var header_str = template.render("helpers/header.html.erb", {
    tabs: function() {
      return $("<div>")
        .html(view.table_selector()())
        .html();
    }
  });

  var template_str = template.render("controllers/query.html.erb", {
      render_query_content: render_query_content,
      render_query_sidebar: render_query_sidebar
    });


  page.render({content: template_str, header: header_str});
}

function log_query(query_data, user) {
  var sample_data = {
    integer: {
      start_time: query_data.start_ms,
      end_time: query_data.end_ms
    },

    string: {
      weight_col: query_data.weight_col || "unspecified",
      view: query_data.view,
      table: query_data.table,
      start: (query_data.start_str || "unspecified"),
      end: (query_data.end_str || "unspecified"),
      // This relies on behaviors in server/auth
      user: user
    },
    set: {
      cols: query_data.cols || [query_data.col],
      dims: query_data.dims
    }

  };

  var sample = Sample.create(sample_data)
    .set_dataset("snorkle")
    .set_subset("queries");

  return sample;
}

function handle_new_query(query_id, query_data, socket, done) {
  var pipeline = build_pipeline(query_data);
  var compare_pipeline;
  var compare_data;


  if (query_data.compare_delta || query_data.compare_filters) {
    compare_data = _.clone(query_data);

    if (query_data.compare_delta) {
      compare_data.start_ms = query_data.start_ms + query_data.compare_delta;
      compare_data.end_ms = query_data.end_ms + query_data.compare_delta;
    }

    if (query_data.compare_filters) {
      // TODO: check these dont look the same as regular filters
      compare_data.filters = query_data.compare_filters;
    }

    compare_pipeline = build_pipeline(compare_data);
    query_data.compare_mode = true;
  }


  var user = "anon";
  if (socket.manager.__user) {
    user = socket.manager.__user.username || "__awkward__";
  }

  var sample = log_query(query_data, user);

  var start = Date.now();

  var results = {};

  var weight_cols = false;
  // TODO: better encode when views need post processing
  var sample_views = {
    samples: true,
    scatter: true,
    crossfilter: true
  };

  if (query_data.weight_col && !sample_views[query_data.view]) {
    weight_cols = true;
  }

  var jobs = [
    function(cb) {
      // how to execute these properly?
      run_query(query_data.table, pipeline, '', weight_cols, function(err, data) {
        query_data.id = query_id;
        var query_results = { parsed: query_data, results: data, error: err, id: query_id, created: start};
        socket.emit("query_results", query_results);
        results.query = query_results;
        sample.add_integer("query_duration", Date.now() - start);

        cb();
      });
    }
  ];

  if (compare_pipeline) {
    jobs.push(function(cb) {
      run_query(query_data.table, compare_pipeline, 'comparison', weight_cols, function(err, data) {
        compare_data.id = query_id;
        var compare_results = { parsed: compare_data, results: data, error: err, id: query_id, created: start};
        socket.emit("compare_results", compare_results);
        sample.add_integer("compare_duration", Date.now() - start);
        results.compare = compare_results;

        cb();
      });
    });
  }

  async.parallel(jobs, function(err, cb) {
    sample
      .flush();

    done(results);
  });
}

function get_query_from_db(hashid, cb) {

  var collection = db.get("query", "results");
  collection.findOne({ hashid: hashid }, function(err, obj) {
    if (cb) {
      cb(obj);
    }
  });
}

function get_saved() {
  var query_id = context("req").query.id;
  get_query_from_db(query_id, function(obj) {
    res.end(JSON.stringify(obj));
  });
}

function get_saved_queries(conditions, options, cb) {
  var visited = {};
  var collection = db.get("query", "results");
  collection.find(conditions, options, function(err, cur) {
    cur.sort({ updated: -1 });
    cur.limit(options.limit || 30);
    cur.toArray(function(err, arr) {
      _.each(arr, function(query) {
        if (visited[query.hashid]) {
          if ((visited[query.hashid].updated || 0) < query.updated) {
            visited[query.hashid] = query;
          }
        } else {
          visited[query.hashid] = query;
        }

      });

      var ret = _.map(visited, function(v, k) { return v; });
      if (cb) { cb(ret); }
    });

  });


}

function get_saved_for_user(username, dataset, cb) {
  var conditions = { username: username, "saved" : true };
  if (dataset) {
    conditions['parsed.table'] = dataset;
  }

  get_saved_queries(conditions, {}, function(arr) {
    cb(arr);
  });
}

function get_saved_for_dataset(username, dataset, cb) {
  var collection = db.get("query", "results");

  var conditions = {
    "parsed.table" : dataset,
    "saved" : true,
    "username": { "$ne": username }
  };

  get_saved_queries(conditions, {}, function(arr) {
    if (cb) { cb(arr); }
  });
}

function get_recent_queries_for_user(username, dataset, cb) {
  var conditions = { username: username };
  if (dataset) {
    conditions['parsed.table'] = dataset;
  }

  get_saved_queries(conditions, {limit: 100}, function(arr) {
    var with_results = [];
    var accepted = 0;
    _.each(arr, function(f) {
      if (accepted > 20) { return; }
      if (f && f.results && f.results.query && f.results.query.results.length) {
        with_results.push(f);
        accepted += 1;
      }
    });

    cb(with_results);
  });
}


function get_saved_query(hashid, cb) {
  var collection = db.get("query", "results");
  collection.find({hashid: hashid}, { limit: 1, sort: { updated: -1 }}, function(err, cur) {
    cur.toArray(function(err, arr) {
      if (arr && arr.length) {
        cb(null, arr[0]);
      } else {
        cb(err);
      }
    });
  });
}

module.exports = {
  routes: {
    "" : "index",
    "/saved": "saved",
    "/user" : "user",
    "/dataset" : "dataset"
  },

  socket: function(socket) {
    var __id = 1;
    var user_id = socket.manager.__user.id || parseInt(Math.random() * 10000, 10);
    var user_name = socket.manager.__user.username;

    socket.on("get_saved_queries", function(dataset) {
      get_saved_for_user(user_name, dataset, function(arr) {
        socket.emit("saved_queries", arr);
      });
    });

    socket.on("get_recent_queries", function(dataset) {
      get_recent_queries_for_user(user_name, dataset, function(arr) {
        socket.emit("recent_queries", arr);
      });
    });

    socket.on("get_shared_queries", function(dataset) {
      get_saved_for_dataset(user_name, dataset, function(arr) {
        socket.emit("shared_queries", arr);
      });
    });

    socket.on("save_query", function(query, name, shared) {
      get_saved_query(query.server_id || query.hashid, function(err, obj) {
        if (err || !obj) { return; }

          obj.saved = true;
          obj.title = name;
          obj.shared = shared;

        var collection = db.get("query", "results");
        collection.update({_id: obj._id}, obj);
      });
    });


    socket.on("delete_query", function(form_data) {
      var collection = db.get("query", "results");
      if (!form_data.hashid) {
        return;
      }

      collection.update(
        { hashid: form_data.hashid, username: user_name},
        { $set: { saved: false }}, 
        {multi: true});

    });
    socket.on("refresh_query", function(form_data) {
      var collection = db.get("query", "results");
      // save results to db
      if (!form_data || !form_data.hashid) {
        return;
      }

      get_saved_query(form_data.hashid, function(err, saved_query) {
        if (!saved_query) {
          return;
        }

        var now = parseInt(Date.now() / 1000, 10);
        var query_id = user_id + "/" + __id + "/" + now;
        var hashed_id = form_data.hashid;

        handle_new_query(query_id, saved_query.parsed, socket, function(results) {
          // save results to db
          var new_query = _.clone(saved_query);
          _.extend(new_query, {
            created: saved_query.created,
            updated: +Date.now(),
            parsed: saved_query.parsed,
            results: results,
            hashid: form_data.hashid,
            clientid: query_id
          });

          delete new_query._id;

          console.log("INSERTING", new_query);

          collection.insert(new_query, function(err, item) {
            if (err) { console.log("Error saving query results:", err); }
            socket.emit("query_id", { client_id: query_id, server_id: hashed_id});
          });
        });
      });

    });

    socket.on("new_query", function(form_data) {
      var now = parseInt(Date.now() / 1000, 10);
      var query_id = user_id + "/" + __id + "/" + now;
      var hashed_id = hashids.encrypt(user_id, __id, now);

      var query_data = marshall_query(form_data);
      socket.emit("query_ack", {
        parsed: query_data, input: form_data, id: query_id });

      handle_new_query(query_id, query_data, socket, function(results) {
        var collection = db.get("query", "results");
        // save results to db
        collection.insert({
          input: form_data,
          created: +Date.now(),
          updated: +Date.now(),
          parsed: marshall_query(form_data),
          results: results,
          hashid: hashed_id,
          clientid: query_id,
          userid: user_id,
          username: user_name
        }, function(err, item) {
          if (err) { console.log("Error saving query results:", err); }
          socket.emit("query_id", { client_id: query_id, server_id: hashed_id});
        });
      });
    });
  },
  index: auth.require_user(get_index)
};
