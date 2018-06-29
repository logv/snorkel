"use strict";


var sqlite3 = require("sqlite3");
var driver = require_app("server/backends/driver");

var db = new sqlite3.Database('a_file.sq3');

db.serialize(function() {
  db.run("CREATE TABLE IF NOT EXISTS dev (blob TEXT)");
});

var SQLiteDriver = _.extend(driver.Base, {
  run: function(table, query_spec, unweight, cb) {
    console.log("RUNNING QUERY", table);
    cb();
  },
  get_stats: function(table, cb) {
    cb();
  },
  get_tables: function(cb) {
    db.run('SELECT * FROM dev', console.log);
    cb( [ {
      table_name: "dev" }
    ] );
  },
  get_columns: function(table, cb) {
    cb();
  },
  clear_cache: function(table, cb) {},
  drop_dataset: function(table, cb) {},
  add_samples: function(dataset, subset, samples, cb) {
    var db_name = dataset + "_" + subset;
    console.log("INSERTING SAMPLES", db_name, samples);

    db.serialize(function() {
      console.log("CREATING");
      var ret = db.run("CREATE TABLE IF NOT EXISTS " + db_name + " (blob TEXT)");
      console.log("CREATED", ret);
    });

    db.serialize(function() {
      var stmt = db.prepare("INSERT INTO " + db_name + " VALUES (?)");
      console.log("INSERTING");
      _.each(samples, function(sample) {
        stmt.run(JSON.stringify(sample));
      });
      stmt.finalize();
      console.log("INSERTED");

      console.log("SELECTING");
      db.each("SELECT * FROM '" + db_name + "'", function(err, line) {
        if (!err) {
          console.log(line);
        }
      });
    });


    cb();
  }
});

module.exports = SQLiteDriver;
