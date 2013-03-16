"use strict";
require("../server/globals").install();

var backend = require_root("server/backend");

var fake_data = require_root("server/fake_data");
var dataset = "test";
var subset = "data";
var querystring = require("querystring");
var http = require("http");


var num_samples = 10000;
var i, chunk_size = 10;

var pending = 1;

var delay_offset = parseInt(Math.random() * 1000 + 1000, 10);
var estimated_time = (num_samples / chunk_size) * delay_offset - delay_offset;
console.log("Creating", num_samples, "samples today");
var start = +Date.now();
function deliver_next_batch() {
  var samples = [];
  var now = +Date.now();
  console.log("Delivering batch!", num_samples, "(", now - start, "ms elapsed)");

  for (i = 0; i < chunk_size; i++) {
    samples.push(fake_data.sample());
  }

  num_samples -= chunk_size;


  var post_data = querystring.stringify({
      dataset: dataset,
      subset: subset,
      samples: JSON.stringify(samples)
    });

  var post_options = {
      host: 'localhost',
      port: '3000',
      path: '/data/import',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': post_data.length
      }

  };

  var req = http.request(post_options, function(res) {
    res.on('data', function(data) {
      console.log(data.toString());
    });
  });

  req.write(post_data);
  req.end();

  if (num_samples > 0) {
    _.delay(deliver_next_batch, delay_offset);
  } else {
    console.log(
      "DONE! Took ",
      Date.now() - start,
      "ms.",
      "Estimated time is",
      estimated_time,
      "Delta is", 
      (Date.now() - start) - estimated_time,
      "ms");
    process.exit();
  }
}

_.delay(deliver_next_batch, delay_offset + (Math.random() * 5000));
