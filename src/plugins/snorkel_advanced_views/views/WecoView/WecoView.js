"use strict";

var weco = require("WecoView/weco_helper.js");

var helpers = require("snorkel$common/sf_helpers.js");
var TimeView = require("timeview$TimeView/TimeView.js");

var sf_shim = require("snorkel$common/sf_shim.js");

var WecoView = _.extend({}, TimeView, {
  initialize: function(ctx) {
    sf_shim.prepare_and_render(this, ctx);
  },
  finalize: function() {},
  prepare: function(data) {
    var self = this;
    self.fill_missing = true;
    this.time_bucket = data.parsed.time_bucket;
    var ret = TimeView.prepare(data);

    var options = {
      time_bucket: data.parsed.time_bucket,
      start: data.parsed.start_ms,
      end: data.parsed.end_ms
    };

    var normalized_data = weco.normalize_series(ret, options);
    var violations = weco.find_violations(normalized_data, options);


    self.violations = violations;

    return ret;
  },
  getChartOptions: function() {
    var self = this;
    var plot_lines = [];
    _.each([-30, -20, 0, 20, 30], function(p) {
      plot_lines.push({
        value : p,
        label: {
          text: p / 10
        },
        width: 1,
        color: "#aaa",
        dashStyle: 'dash'
      });
    });

    var options = TimeView.getChartOptions();
    var my_options = {};
    my_options.yAxis = {
      min: -50,
      max: 50,
      plotLines: plot_lines
    };

    my_options.xAxis = {
      plotLines: _.map(this.violations, function(v) {
        var color = "#0a0";
        if (v.type === "recover") {
          color = "#0f0";
        }
        var width = 1;
        if (v.active === true) {
          width = 1;
          color = "#f00";
          if (v.type === "recover") {
            color = "#0f0";
          }
        }

        if (v.early) {
          color = "#00f";
        }

        var label = v.type;
        if (v.type == "marker") {
          if (v.active) {
            label = "alert zone (end)";
          } else {
            label = "alert zone (start)";
          }
        }

        return {
          value: v.time,
          width: width,
          color: color,
          label: {
            text: label
          }
        };
      })
    };

    $.extend(true, options, my_options);
    return options;
  }

});


module.exports = WecoView;
