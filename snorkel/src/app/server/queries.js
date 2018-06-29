"use strict";

var db = require_app("server/db");
var context = require_core("server/context");

var trim_saved_queries = _.throttle(function() {
  var collection = db.get("query", "results");
  var one_week = 60 * 60 * 24 * 7 * 1000; // approx 7 days
  var two_weeks = one_week * 2;
  var four_weeks = one_week * 4;
  var now = new Date();
  var to_delete = {
    created: {
      $lt: now - (four_weeks*6) // 6 months of history
    },
    saved: {
      $ne: true
    }
  };

  collection.count(to_delete, function(err, res) {
    if (res > 0) {
      console.log("TRIMMING OLD QUERY RESULTS", res);
      collection.remove(to_delete, { multi: true , justOne: false }, function(err, res) {
        if (err) {
          console.log("ERR", err);
        }

        var end = +Date.now();
        try {
          collection.compactCollection();
          console.log("COMPACTING COLLECTION TOOK", end - now);
        } catch(e) {

        }
      });
    }
  });

  var anon_delete = {
    created: { $lt: now - one_week },
    username: { $eq: "anon" }
  };

  collection.remove(anon_delete, function(err, res) {
    if (err) {
      console.log("ERR", err);
    }
    console.log("COMPACTING COLLECTION");
    try {
      collection.compactCollection();
      var end = +Date.now();
      console.log("COMPACTING COLLECTION TOOK", end - now);
    } catch(e) {

    }
  });




}, 60 * 1000 * 60);

function get_query_from_db(hashid, cb) {

  var collection = db.get("query", "results");
  cb = context.wrap(cb);
  collection.findOne({ hashid: hashid }, function(err, obj) {
    if (cb) {
      cb(obj);
    }
  });
}

function cleaned_queries(ret) {
  var cleaned_ret = [];
  _.each(ret, function(a) {
    var obj = JSON.parse(JSON.stringify(a).replace(/#DOT#/g, "."));
    cleaned_ret.push(obj);
  });

  return cleaned_ret;

}

function get_saved_queries(conditions, options, cb) {
  var visited = {};
  var collection = db.get("query", "results");

  // Need to ensure indeces on any parts of this table that we are querying
  collection._addIndex("parsed.table");
  collection._addIndex("created");
  collection._addIndex("updated");
  collection._addIndex("username");
  collection._addIndex("saved");

  trim_saved_queries();

  cb = context.wrap(cb);
  options.limit = options.limit || 30;
  var start = +Date.now()
  var projection = {};
  projection["results.results"] = 0;
  projection["results"] = 0;
  var cur = collection.find(conditions, projection);

  cur.limit(options.limit || 30);
  cur.sort({ updated: -1 });
  var ret;

  db.toArray(cur, function(err, arr) {
    var end = +Date.now();
    console.log("SAVED QUERY FINDING TOOK", end - start, "RESULTS", arr.length);
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
      ret = _.map(visited, function(v) { return v; });
    } else {
      ret = arr;
    }


    if (cb) { cb(cleaned_queries(ret)); }
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

  get_saved_queries(conditions, { limit: 100, no_dedupe: true }, function(arr) {
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
  var cur = collection.find(conditions);

  cur.sort({ updated: -1});
  cur.limit(1);
  db.toArray(cur, function(err, arr) {
    if (arr && arr.length) {
      cb(null, cleaned_queries(arr)[0]);
    } else {
      cb(err);
    }
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
