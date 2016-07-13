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

  for (var i = 0; i < serie.length; i++) {
    var pt = serie[i];
    while (expected < pt.x) {
      expected += time_bucket * 1000;
      missing_val++;
    }


    if (missing_val > 5) {
      console.log("WARNING! MULTIPLE MISSING VALUES!");
      violations.push({value: start, type: "missingno" });
    }

    missing_val = 0;
    start = expected;

    var subslice = serie.slice(Math.max(0, i - 10), i);

    var zone_a = 0, zone_b = 0, zone_c = 0, zone_d = 0, total = 0;
    var top_side = 0, bot_side = 0;

    while (subslice.length > 0) {
      var el = subslice.pop();
      total++;

      var y = Math.abs(el.y);
      if (y >= 10) { zone_a++; }
      if (y >= 20) { zone_b++; }
      if (y >= 30) { zone_c++; }
      if (y >= 50) { zone_d++; }
      if (el.y > 3) { top_side++; }
      if (el.y < -3) { bot_side++; }

      if (total === 3) {
        if (zone_b >= 2) {
          console.log("FLAGGING ZONE B VIOLATION");
          violations.push({ value: pt.x, type: "zone_b" });
        }
      }

      if (total === 5) {
        if (zone_a > 4) {
          console.log("ZONE A VIOLATION!");
          violations.push({ value: pt.x, type: "zone_a" });
        }
      }

      if (zone_c > 3) {
        console.log("ZONE C VIOLATION!", zone_c, pt.x); 
        violations.push({ value: pt.x, type: "zone_c" });
        zone_c = 0;
      }

      if (zone_d >= 1 && total === 1) {
        console.log("ZONE D VIOLATION!", zone_c, pt.x); 
        violations.push({ value: pt.x, type: "zone_d" });
        zone_d = 0;
      }


      if (total > 9) {
        if (top_side > 7 || bot_side > 7) {
          console.log("ALL ON ONE SIDE VIOLATION");
          violations.push({ value: pt.x, type: "zone_0" });
        }
      }

    }

  }

  return _.filter(violations, function(v) {
    return v.type === "missingno" || v.type === "zone_c" || v.type === "zone_d"; 
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
    options.yAxis = {
      min: -50,
      max: 50,
      labels: {
        enabled: false
      },
      plotLines: plot_lines
    };

    options.xAxis = {
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
