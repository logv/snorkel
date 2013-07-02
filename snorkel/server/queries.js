"use strict";

var db = require_root("server/db");
var context = require_root("server/context");

function get_query_from_db(hashid, cb) {

  var collection = db.get("query", "results");
  cb = context.wrap(cb);
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
  cb = context.wrap(cb);
  collection.find(conditions, options, function(err, cur) {
    cur.sort({ updated: -1 });
    cur.limit(options.limit || 30);
    var ret;

    cur.toArray(function(err, arr) {
      if (!options.no_dedupe) {
        _.each(arr, function(query) {
          if (visited[query.hashid]) {
            if ((visited[query.hashid].updated || 0) < query.updated) {
              visited[query.hashid] = query;
            }
          } else {
            visited[query.hashid] = query;
          }

        });
        ret = _.map(visited, function(v, k) { return v; });
      } else {
        ret = arr;
      }

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
      if (f && f.results && f.results.query && f.results.query.results && f.results.query.results.length) {
        with_results.push(f);
        accepted += 1;
      }
    });

    cb(with_results);
  });
}

function get_past_results(hashid, cb) {
  var conditions = {
    hashid: hashid
  };

  get_saved_queries(conditions, { limit: 100000, no_dedupe: true }, function(arr) {
    var ret = _.map(arr, function(r) { return {
      updated: r.updated,
      _id: r._id
    };});

    cb(ret);
  });
}


function get_saved_query(conditions, cb) {
  var collection = db.get("query", "results");
  cb = context.wrap(cb);
  collection.find(conditions, { }, function(err, cur) {
    cur.sort({ updated: -1});
    cur.limit(1);
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
  get_saved_query: get_saved_query,
  get_recent_queries_for_user: get_recent_queries_for_user,
  get_query_from_db: get_query_from_db,
  get_saved_queries: get_saved_queries,
  get_saved_for_user: get_saved_for_user,
  get_saved_for_dataset: get_saved_for_dataset,
  get_past_results: get_past_results
};
