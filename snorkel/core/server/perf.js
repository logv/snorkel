"use strict";

var context = require("./context");
var Sample = require_app("./server/sample");

module.exports = {
  track: function(options) {
    var start = Date.now();
    context("__start", start);

    _.extend(options, {
      integer: {
        t_start: start
      }
    });

    var sample = Sample.create(options);
    sample
      .set_dataset("perf")
      .set_subset("pagestats");

    context("__perf_sample", sample);
  },

  annotate: function(key, duration) {
    if (!duration) {
      var start = context("__start");
      duration = Date.now() - start;
    }
    return context("__perf_sample").add_integer("t_" + key, duration);
  },

  finalize: function() {
    context("__perf_sample")
      .flush();
  }
};


