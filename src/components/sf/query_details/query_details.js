"use strict";

module.exports = {
  tagName: "div",
  className: "",
  client: function(options) {
    var created_str = new Date(options.created).toISOString();
    var that = this;

    var view = options.query.parsed.baseview || options.query.parsed.viewbase || options.query.parsed.view;
    var count = 0;
    var w_count = 0;
    var results = options.query.results;
    if (view == "samples") {
      count = results.length;

    }

    if (view == "table" || view == "time" || view == "dist") {
      _.each(results, function(row) {
        count += row.samples || row.count;
        w_count += row.weighted_count || row.samples;
      });

    }

    if (!_.isNaN(count)) {
      that.$el.find(".count").text("Sample Count: " + count);
    }

    if (!_.isNaN(w_count)) {
      that.$el.find(".weight").text("Weighted Samples: " + w_count || count);
    }

    $C("timeago", {time: created_str }, function(cmp) {
      that.$el.find(".timestamp").append(cmp.$el);
    });
  }
};
