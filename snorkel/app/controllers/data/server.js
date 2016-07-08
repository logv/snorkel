"use strict";

var fs = require("fs");
var page = require_core("server/page");
var template = require_core("server/template");
var context = require_core("server/context");
var db = require_app("server/db");
var config = require_core("server/config");

var auth = require_app("server/auth");
var csv = require_app("server/csv");
var fake_data = require_app("server/fake_data");
var backend = require_app("server/backend");
var Sample = require_app("server/sample");

var _collect_samples;

var _sample_insertions = {};
var _sample_errors = {};
var print_input_stats = _.throttle(function() {

  _.delay(function() {
    var tables = _.keys(_sample_insertions).concat(_.keys(_sample_errors));

    tables.sort();

    if (tables.length) {
      console.log("INSERT SUMMARY");
    }

    var samples = [];
    _.each(tables, function(table) {
      // TODO: log these to snorkel DB, too
      console.log_no_ts(table,"\n  inserts:", _sample_insertions[table] || 0, "\terrors:", _sample_errors[table] || 0);

      var now = new Date();
      var sample = {
        integer: {
          inserts: _sample_insertions[table] || 0,
          errors: _sample_errors[table] || 0,
          time: (+now) / 1000
        },
        string: {
          dataset: table,
          dayofweek: now.getDay(),
          hourofday: now.getHours()
        }
      };

      samples.push(sample);
    });

    _sample_insertions = {};
    _sample_errors = {};

    backend.add_samples("snorkel", "ingest", samples, function(){});
  }, 500);
}, 5000);


function inserted_samples(table, count, source) {
  _sample_insertions[table] = (_sample_insertions[table] || 0) + count;

  print_input_stats();
}

function errored_samples(table, count, error, source) {
  _sample_errors[table] = (_sample_errors[table] || 0) + count;
  print_input_stats();
}

function get_table(dataset, subset) {
  return dataset + "/" + subset;
}

// If the config specific rabbit options, we listen to rabbit exchange  for new
// incoming samples
var default_options = { type: 'direct', durable: true, auto_delete: false};
function subscribe_to_rabbit_queue() {
  if (!config.rabbit) {
    return;
  }


  var amqp = require('amqp');
  var connection = amqp.createConnection(config.rabbit);

  // Wait for connection to become established.
  connection.on('ready', function () {
    connection.exchange(config.rabbit.exchange, default_options);
    // Use the default 'amq.topic' exchange
    connection.queue(config.rabbit.queue, function(q){
        // Catch all messages
        q.bind(config.rabbit.exchange, config.rabbit.routing_key);

        // Receive messages
        q.subscribe(function (message) {
          // Print messages to stdout
          //
          var dataset = message.dataset,
              samples = message.samples,
              subset = message.subset;

          backend.add_samples(dataset, subset, samples, function(err, data) {
            if (err) {
              errored_samples(get_table(dataset, subset), 1, err, "MQ");
            } else {
              inserted_samples(get_table(dataset, subset), samples.length, "MQ");
            }
          });

        });
    });
  });
}

function add_annotation(body, cb) {
  var collection = db.get("dataset", "annotations");

  var annotation = {};
  annotation.title = body.title;
  if (body.description) {
    annotation.description = body.description;
  }
  annotation.dataset = body.dataset || "*";

  if (body.time) {
    annotation.time = body.time;
  }

  if (body.timestamp) {
    annotation.time = +new Date(body.timestamp);
  }

  annotation.timestamp = new Date(annotation.time).toString();
  if (!annotation.title || !annotation.time) {
    cb(null);
  } else {
    collection.insert(annotation, function(err, obj) { if (err) {
        cb(null);
      } else {
        console.log("Added annotation to", annotation.dataset, ": ", annotation.timestamp, annotation.title);
        inserted_samples("dataset/annotations", 1, "UDP");
        cb(obj);
      }
    });
  }
}




function setup_udp_socket() {
  if (!config.udp) {
    return;
  }

  var dgram = require("dgram");
  var s = dgram.createSocket('udp4');
  var msgData, parsed_data;
  s.on("message", function(msg, rinfo) {
    try {
      msgData = msg.toString();
      parsed_data = JSON.parse(msgData);
    } catch (e) {
      if (msgData) {
        console.log("UDP: Problem parsing sample data", msgData);
      } else {
        console.log("UDP: Problem receiving sample");
      }

      return;
    }

    try {

      if (parsed_data.annotation) {
        add_annotation(parsed_data.annotation, function() {
        });
      } else {
        backend.add_sample(parsed_data.dataset, parsed_data.subset, parsed_data.sample, function(err) {
          if (err) {
            errored_samples(get_table(parsed_data.dataset, parsed_data.subset), 1, null, "UDP");
          } else {
            inserted_samples(get_table(parsed_data.dataset, parsed_data.subset), 1, "UDP");
          }
        });
      }
    } catch (e) {
      errored_samples(get_table(parsed_data.dataset, parsed_data.subset), 1, null, "UDP");
    }
  });

  s.on("listening", function() {
    console.log("Listening for incoming packets on UDP port", config.udp.port || 59036);
  });

  s.bind(config.udp.port || 59036);
}


module.exports = {
  routes: {
    "" : "index",
    "/generate" : "generate_many"
  },

  post_routes: {
    "/import" : "add_sample",
    "/annotate" : "add_event",
    "/import_csv" : "read_csv"
  },

  read_csv: auth.require_user(function() {
    var req = context("req");
    var user = req.user;

    var filename = req.files.csv.path;
    var data = fs.readFileSync(filename);

    var csv_name = req.files.csv.filename;
    var username = user.username.split("@").shift();
    csv.read(username, csv_name, data.toString(), {}, function(err) {
      if (err) {
        context("res").end(err);
        return;

      }

      var dataset = username + backend.SEPARATOR + "csv" + backend.SEPARATOR + csv_name;
      context("res").redirect("/query?table=" + dataset);
    });

  }),

  add_sample: function() {
    if (!_collect_samples) {
      return;
    }

    var res = context("res");

    // TODO: validate this
    var sample_data = context("req").body.samples;
    var dataset = context("req").body.dataset;
    var subset = context("req").body.subset;

    try {
      sample_data = JSON.parse(sample_data);
    } catch(e) {
      console.log("Couldn't parse samples: ", sample_data);
      res.end("ERROR");
    }

    var samples = sample_data;
    if (!_.isArray(samples)) {
      samples = [samples];
    }

    backend.add_samples(dataset, subset, samples, function(err, data) {
      if (err) {
        errored_samples(get_table(dataset, subset), 1, err, "POST");
        res.end("ERROR");
      } else {
        inserted_samples(get_table(dataset, subset), samples.length, "POST");
        res.end("INSERTED " + (samples.length) + " SAMPLE(S)");
      }
    });

  },

  add_event: function() {
    var body = context("req").body;
    var res = context("res");

    add_annotation(body, function(obj) {
      if (!obj) {
        res.write("ERROR");
      } else {
        res.write("OK");
      }
    });

  },

  generate_many: function() {
    var req = context("req");
    var num_samples = req.query.n || 1;

    var dataset = "test";
    var subset = "data";
    var samples = [];
    var now = Date.now();
    var futures = [];

    // need to save a reference to res
    var res = context("res");

    var chunk_size = 1000;
    var inserted = 0;
    var pending = 0;
    for (var i = 0; i < num_samples / chunk_size; i++) {
      pending += 1;

      var future = function() {
        var samples = [];
        for (var j = 0; j < chunk_size && j + i < num_samples ; j+=1) {
          samples.push(fake_data.sample());
        }

        backend.add_samples(dataset, subset, samples, function(err, data) {
          if (err) {
            console.log("ERROR INSERTING DATA", err);
            res.write("ERROR:", err);
          } else {
            var sec = (Date.now() - now) / 1000;
            res.write("INSERTED " + inserted + " SAMPLES INTO THE DB IN " + sec + " SECONDS\n");
            inserted += samples.length;
            inserted_samples(get_table(dataset, subset), samples.length);
          }

          pending -= 1;

          if (pending == 0) {
            var sec = (Date.now() - now) / 1000;
            res.end("DONE IN " + sec + " SECONDS\nINSERTED " + num_samples + " DOCUMENTS");
          }
        });
      };

      futures.push(future);
    };

    _.each(futures, function(future) {
      future();
    });

  },

  setup_collector: function() {
    subscribe_to_rabbit_queue();
    setup_udp_socket();
    _collect_samples = true;
  },

  index: function() {
    var template_str = template.render("controllers/data.html.erb");
    page.render({ content: template_str});
  }
};

_.each(module.exports.routes, function(route_handler, route) {
  var old = module.exports[route_handler];
  module.exports[route_handler] = auth.require_user(old);
});
