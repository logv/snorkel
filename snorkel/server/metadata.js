"use strict";

var _ = require_vendor("underscore");
var db = require_root("server/db");
var backend = require_root("server/backend");
var context = require_root("server/context");

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
    collection.findOne({ table: table }, function(err, obj) {
      var config = _.clone(metadata_master);
      config.table = table;
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
            config.metadata.columns[name] = {};
          }

          var col_meta = config.metadata.columns[name];
          _.extend(col_meta, col);
          if (col_meta.type_str === "integer" && col_meta.groupable === "true") {
            col_meta.final_type = "string";
          } else {
            col_meta.final_type = col_meta.type_str;
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

    var collection = db.get("dataset", "metadata");
    collection.find({}, function(err, ret) {
      if (err) {
        cb([]);
      } else {
        ret.toArray(function(err, docs) {
          var grouped = _.groupBy(docs, function(d) {
            return d.table;
          });

          _.each(grouped, function(configs, key) {
            grouped[key] = configs[0];
          });

          cb(grouped);
        });
      }
    });
  }
};
