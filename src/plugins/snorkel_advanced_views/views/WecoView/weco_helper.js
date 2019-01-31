console.log("WECO HELPER LOADER");

// runs WECO rules on our time series array and
// flags potentials
var one_day = 24 * 60 * 60 * 1000;
function check_weco(serie, options, serie_name) {
  var time_bucket = options.time_bucket;

  var start = options.start || serie[0].x;
  var end = options.end || serie[serie.length - 1].x;
  var very_start = start;
  var end_buckets = options.end_zone || 3;

  var day_cutoff = end - one_day;
  var end_cutoff = end - (time_bucket*1000*end_buckets);

  var expected = start;
  var missing_val = 0;

  var violations = [
    { time: day_cutoff, active: false, type: "marker" },
    { time: end_cutoff, active: true, early: true, type: "marker" }
  ];

  var zones = {};

  var active_violations = [];

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
      // TODO: early should be decided on many factors
      var violation = {
        time: pt.x,
        value: pt.y,
        recovery: 3,
        type: "zone_" + zone,
        active: pt.x >= day_cutoff,
        series: serie_name
      };
      violations.push(violation);
      active_violations.push(violation);
      zones[zone].count = 0;
    } else {
      // recover any active violations!
      _.each(active_violations, function(v) {
        // if we are currently in active territory
        // and the violation is still open, mark it
        // as active
        if (pt.x >= day_cutoff) {
          v.active = true;
        }

        if (pt.final) {
          return;
        }


        if (!v.recovery) {
          var recovery = {
            time: pt.x,
            type: "recover",
            // special recovery keys
            recover_time: v.time,
            recover_type: v.type,
            recover_value: v.value,
            active: pt.x >= day_cutoff,
           series: serie_name
          };

          violations.push(recovery);
        }

        v.recovery = (v.recovery || 0) - 1;
      });

      active_violations = _.filter(active_violations, function(v) {
        return (v.recovery || 0) >= 0;
      });


    }

    zones[zone].arr.push(pt);

    while (zones[zone].arr.length > (max_len || 0)) {
      var old_pt = zones[zone].arr.pop();
      if (ev(old_pt.y)) {
        zones[zone].count--;
      }
    }

    zones[zone].count = Math.max(zones[zone].count, 0);

  }

  function eval_a(val) { return Math.abs(val) >= 10; }
  function eval_b(val) { return Math.abs(val) >= 20; }
  function eval_c(val) { return Math.abs(val) >= 30; }
  function eval_d(val) { return Math.abs(val) >= 40; }

  for (var i = 0; i < serie.length; i++) {
    var pt = serie[i];
    if (pt.x >= end_cutoff) {
      break;
    }

    while (expected < pt.x) {
      expected += time_bucket * 1000;

      // we only alert on missing data not inside the early warning window
      if (expected < end_cutoff) {
        missing_val++;
      }
    }

    // 3 in a row is missing
    if (missing_val >= 3) {
      var active = false;
      if (start > day_cutoff) {
        active = true;

      }

      if (very_start === start) {
        var new_start = parseInt(start / one_day, 10) * one_day;
        // we splice to the nearest day if we can't see the start...
        start = new_start;
      }

      // if the missing val is larger than 3 days, i just want to snap it to
      // the most recent day it went missing
      var violation = {time: start, type: "missing", active: active, series: serie_name };
      violations.push(violation);
      active_violations.push(violation);
    }



    missing_val = 0;
    start = expected;

    check_point('a', pt, eval_a, 10, 9);
    check_point('b', pt, eval_b, 5, 4);
    check_point('c', pt, eval_c, 3, 2);
    check_point('d', pt, eval_d, 1, 1);
  }

  var valid_types = {
    marker: 1,
    missing: 1,
    recover: 1,
    zone_c: 1,
    zone_d: 1
  }
  return _.filter(violations, function(v) {
    if (v.type === "recover") {
      return valid_types[v.recover_type];
    }

    return valid_types[v.type];
  });

}


module.exports = {
  find_violations: function(ret, options) {
    var violations = [];
    _.each(ret, function(serie) {
      violations = violations.concat(check_weco(serie.data, options, serie.name));
    });

    return violations;
  },
  normalize_series: function(ret, options) {
    _.each(ret, function(serie) {
      var avg = 0;
      var std = 0;
      var m2 = 0;
      var delta = 0;
      var n = 0;

      _.each(serie.data, function(pt) {
        n += 1;
        var trimmed_y = pt.y;

        std = Math.sqrt(m2 / (n-1)) * 1.134;
        // huberization: trim by 1.5 std then multiply std by 1.134 at the end
        // assumes normal distribution of error
        if (std > 0) {
          trimmed_y = parseInt(Math.min(pt.y, 1.5 * std + avg), 10);
          trimmed_y = parseInt(Math.max(trimmed_y, (-1.5 * std) + avg), 10);
        }

        delta = trimmed_y - avg;

        avg += delta / n;
        m2 += delta*(pt.y - avg);
      });

      std = Math.sqrt(m2 / (n-1)) * 1.134;
      var min, max = 0;
      _.each(serie.data, function(pt) {
        pt.y = (pt.y - avg) / std * 10;

        // check which zone this point falls in
        min = Math.min(pt.y, min);
        max = Math.max(pt.y, max);
      });

      serie.data.push({ x: options.end, y: 0, final: true});
      serie.data.sort(function(a, b) {
        return a.x - b.x;
      });
    });

    return ret;
  }
};
