"use strict";

var helpers = require("app/client/views/helpers");
var TimeView = require("app/client/views/time_view");

// runs WECO rules on our time series array and
// flags potentials
function check_weco(serie, time_bucket) {
  var start = serie[0].x;

  var expected = start;
  var missing_val = 0;

  var violations = [];

  var zones = {};
  function check_point(zone, pt, ev, max_len, threshold) {
    if (!zones[zone]) {
      zones[zone] = {
        count: 0,
        arr: [],
        name: zone
      };
    }

    if (ev(pt.y)) {
      zones[zone].count++;
    }

    if (threshold <= zones[zone].count) {
      violations.push({ value: pt.x, type: "zone_" + zone});
    }

    zones[zone].arr.push(pt);

    while (zones[zone].arr.length > (max_len || 0)) {
      var old_pt = zones[zone].arr.pop();
      if (ev(old_pt.y)) {
        zones[zone].count--;
      }
    }

  }

  function eval_a(val) { return Math.abs(val) >= 10; }
  function eval_b(val) { return Math.abs(val) >= 20; }
  function eval_c(val) { return Math.abs(val) >= 30; }
  function eval_d(val) { return Math.abs(val) >= 40; }

  for (var i = 0; i < serie.length; i++) {
    var pt = serie[i];
    while (expected < pt.x) {
      expected += time_bucket * 1000;
      missing_val++;
    }


    if (missing_val > 5) {
      console.log("WARNING! MULTIPLE MISSING VALUES!");
      violations.push({value: start, type: "missing" });
    }

    missing_val = 0;
    start = expected;

    check_point('a', pt, eval_a, 10, 9);
    check_point('b', pt, eval_b, 5, 4);
    check_point('c', pt, eval_c, 3, 2);
    check_point('d', pt, eval_d, 1, 1);


  }

  return _.filter(violations, function(v) {
    return v.type === "missing" || v.type === "zone_c" || v.type === "zone_d";
  });

}

var WecoView = TimeView.extend({
  prepare: function(data) {
    this.time_bucket = data.parsed.time_bucket;
    var ret = TimeView.prototype.prepare(data);
    _.each(ret, function(serie) {
      var avg = 0;
      var std = 0;
      var m2 = 0;
      var delta = 0;
      var n = 0;

      _.each(serie.data, function(pt) {
        n += 1;
        delta = pt.y - avg;
        avg += delta / n;
        m2 += delta*(pt.y - avg);
      });

      std = Math.sqrt(m2 / (n-1));
      var min, max = 0;
      _.each(serie.data, function(pt) {
        pt.y = (pt.y - avg) / std * 10;

        // check which zone this point falls in
        min = Math.min(pt.y, min);
        max = Math.max(pt.y, max);
      });

      serie.data.sort(function(a, b) {
        return a.x - b.x;
      });
    });

    var self = this;
    var violations = [];
    _.each(ret, function(serie) {
      violations = violations.concat(check_weco(serie.data, self.time_bucket));
    });

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

    console.log("VIOLATIONS", self.violations);


    var options = TimeView.prototype.getChartOptions();
    var my_options = {};
    my_options.yAxis = {
      min: -50,
      max: 50,
      labels: {
        enabled: false
      },
      plotLines: plot_lines
    };

    my_options.xAxis = {
      plotLines: _.map(this.violations, function(v) {
        return {
          value: v.value,
          width: 1,
          color: "#f00",
          label: {
            text: v.type
          }
        };
      })
    };

    $.extend(true, options, my_options);
    return options;
  }

});


SF.trigger("view:add", "weco",  {
  include: helpers.STD_INPUTS
    .concat(helpers.inputs.TIME_BUCKET)
    .concat(helpers.inputs.TIME_FIELD),
  icon: "noun/line.svg"
}, WecoView);

module.exports = WecoView;
