"use strict";

var _ = require_vendor("underscore");
var db = require_app("server/db");
var backend = require_app("server/backend");
var context = require_core("server/context");

var metadata_master = {
  metadata: {
    name: '',
    description: '',
    columns: {}
  },
  table: ''
};

module.exports = {
  get: function(table, cb) {
    cb = context.wrap(cb);

    var collection = db.get("dataset", "metadata");
    var table_name = table.table_name || table;
    collection.findOne({ table: table_name }, function(err, obj) {
      var config = _.clone(metadata_master);
      config.table = table;
      config.metadata = _.clone(metadata_master.metadata);

      config.metadata.name = table;
      config.metadata.columns = {};

      if (obj) {
        _.extend(config, obj);
      }

      backend.get_columns(table, function(cols) {
        var columns = _.groupBy(cols, function(col) {
          return col.name;
        });

        _.each(columns, function(col, key) {
          columns[key] = col[0];
        });

        _.each(columns, function(col, name) {
          if (!config.metadata.columns[name]) {
            config.metadata.columns[name] = {
              description: ''
            };
          }

          var col_meta = config.metadata.columns[name];
          _.extend(col_meta, col);
          if (col_meta.type_str === "integer" && col_meta.groupable === "true") {
            col_meta.final_type = "string";
          } else {
            col_meta.final_type = col_meta.type_str;
          }

          if (col_meta.type_str === "integer" && col_meta.time_col && !config.metadata.time_col) {
            config.metadata.time_col = name;
          }

        });

        var default_time_col;
        _.each(["time", "integer_time", "integer.time", "createdAt", "timestamp", "updatedAt"], function(ts) {
          if (config.metadata.columns[ts] && !default_time_col) {
            default_time_col = ts;
          }
        });

        if (!config.metadata.time_col) {
          config.metadata.time_col = default_time_col;
        }

        _.each(cols, function(col_meta) {
          if (col_meta.name === config.metadata.time_col) {
            col_meta.time_col = true;
          }
        });

        var col_types = _.groupBy(cols, function(col_meta) {
          if (col_meta.type_str === "integer" && col_meta.groupable === "true") {
            col_meta.final_type = "string";
          } else {
            col_meta.final_type = col_meta.type_str;
          }

          return col_meta.final_type;
        });

        config.metadata.col_types = col_types;


        cb(config);
      });


    });
  },

  set: function(table, metadata, cb) {
    var collection = db.get("dataset", "metadata");

    collection.findOne({table: table}, function(err, obj) {
      if (err || !obj) {
        collection.insert({ table: table, metadata: metadata }, function(err, obj) {
          if (cb) {
            cb(obj);
          }
        });

      } else {
        _.extend(obj.metadata, metadata);
        collection.update({_id: obj._id}, obj, true);

        if (cb) {
          cb(obj);
        }
      }
    });
  },

  all: function(cb) {
    cb = context.wrap(cb);

    var results = {};
    var after = _.after(2, function() {
      cb(results);
    });

    var collection = db.get("dataset", "metadata");
    var cur = collection.find({});
    db.toArray(cur, function(err, docs) {
      if (err) {
        cb([]);
        return;
      }

      var grouped = _.groupBy(docs, function(d) {
        return d.table;
      });

      _.each(grouped, function(configs, key) {
        grouped[key] = configs[0];
      });

      _.extend(results, grouped);

      after();
    });

    backend.get_tables(function(tables) {
      var next_after = _.after(tables.length, after);
      _.each(tables, function(table) {
        module.exports.get(table, function(data) {
          results[table.table_name] = data;
          next_after();
        });
      });
    });
  }
};
