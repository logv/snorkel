
// runs WECO rules on our time series array and
// flags potentials
var one_day = 24 * 60 * 60 * 1000;
function check_weco(serie, options) {
  var time_bucket = options.time_bucket;

  var start = options.start || serie[0].x;
  var end = options.end || serie[serie.length - 1].x;

  var day_cutoff = end - one_day;
  var end_cutoff = end - (time_bucket*1000*3);

  var expected = start;
  var missing_val = 0;

  var violations = [
    { value: day_cutoff, training: true, type: "marker" },
    { value: end_cutoff, end: true, type: "marker" } 
  ];

  var zones = {};

  console.log("CHECKING WECO", start, end);
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
      console.log("VIOLATION", pt.x, pt.x < day_cutoff, pt.x > end_cutoff);
      violations.push({ value: pt.x, type: "zone_" + zone, training: pt.x < day_cutoff, end: pt.x >= end_cutoff });
      zones[zone].count = 0;
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
    while (expected < pt.x) {
      expected += time_bucket * 1000;
      missing_val++;

      if (missing_val > 5) {
        console.log("WARNING! MULTIPLE MISSING VALUES!");
        var training = false;
        if (start < day_cutoff) {
          training = true;
          
        }
        violations.push({value: start, type: "missing", training: training });


        start = expected;
        missing_val = 0;
      }
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
    zone_c: 1,
    zone_d: 1
  }
  return _.filter(violations, function(v) {
    return valid_types[v.type];
  });

}


module.exports = {
  find_violations: function(ret, options) {
    var violations = [];
    _.each(ret, function(serie) {
      violations = violations.concat(check_weco(serie.data, options));
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

      serie.data.push({ x: options.end, y: 0});
      serie.data.sort(function(a, b) {
        return a.x - b.x;
      });
    });

    return ret;
  }
};
