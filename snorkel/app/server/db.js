/**
 *
 * The DB is a simple API for grabbing collections from Mongo. It makes sure
 * that the DB connection is created before accessing the collection. In
 * general, this should not fail, but it might.
 *
 * @class db (server)
 * @module Superfluous
 * @submodule Server
 */

"use strict";

var config = require_core('server/config');
var host = "localhost";
var server_options = {
  auto_reconnect: true
};

var db_options = {
  journal: 1
};

var package_json = require_core("../package.json");
var context = require_core("server/context");
var config = require_core("server/config");
var mongodb = require("mongodb"),
    port = mongodb.Connection.DEFAULT_PORT;

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
    mongodb.connect(db_url, options, onOpened);
  } else {
    var mongoserver = new mongodb.Server(host, port, server_options);
    var db_connector = new mongodb.Db(db_name, mongoserver, db_options);
    db_connector.open(onOpened);
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

var SF_db;
module.exports = {
  install: function() {
    SF_db = collection_builder(config.db_name || package_json.name);
    module.exports.get = SF_db.get;
    module.exports.raw = SF_db.raw;
  },
  db: collection_builder
};
