"use strict";

var page = require_root("server/page");
var template = require_root("server/template");
var context = require_root("server/context");
var auth = require_root("server/auth");

var fake_data = require_root("server/fake_data");
var db = require_root("server/db");
var backend = require_root("server/backend");
var Sample = require_root("server/sample");

var config = require_root("server/config");


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
              console.log("Couldnt insert samples!", err);
            } else {
              console.log("MQ: Inserted " + (samples.length) + " sample(s) into", dataset, subset);
            }
          });

        });
    });
  });
}
subscribe_to_rabbit_queue();


function setup_udp_socket() {
  if (!config.udp) {
    return;
  }

  var dgram = require("dgram");
  var s = dgram.createSocket('udp4');
  s.on("message", function(msg, rinfo) {
    var parsed_data = JSON.parse(msg.toString());
    backend.add_sample(parsed_data.dataset, parsed_data.subset, parsed_data.sample, function(err) {
      if (err) {
      } else {
        console.log("UDP: Inserted sample into", parsed_data.dataset, parsed_data.subset);
      }
    });
  });

  s.on("listening", function() {
    console.log("Listening for incoming packets on UDP");
  });

  s.bind(config.udp.port || 59036);
}
setup_udp_socket();

module.exports = {
  routes: {
    "" : "index",
    "/generate" : "generate_many"
  },

  post_routes: {
    "/import" : "add_sample"
  },

  add_sample: function() {
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

    console.log("POST: Inserting", samples.length, "into", dataset, subset);
    backend.add_samples(dataset, subset, samples, function(err, data) {
      if (err) {
        console.log("Couldnt insert samples!", err);
        res.end("ERROR");
      } else {
        res.end("INSERTED " + (samples.length) + " SAMPLE(S)");
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

  index: function() {
    var template_str = template.render("controllers/data.html.erb");
    page.render({ content: template_str});
  }
};

_.each(module.exports.routes, function(route_handler, route) {
  var old = module.exports[route_handler];
  module.exports[route_handler] = auth.require_user(old);
});
