"use strict";

var coefficient_table = [
  { "p" : 0.10, "co_eff" : 1.22 },
  { "p" : 0.05, "co_eff" : 1.36 },
  { "p" : 0.025, "co_eff" : 1.48 },
  { "p" : 0.01, "co_eff" : 1.63 },
  { "p" : 0.005, "co_eff" : 1.73 },
  { "p" : 0.001, "co_eff" : 1.95 }
];

// CDFs, not CSFs
function ks_test(perc_one, perc_two, len_one, len_two) {

  var dn = (len_one * len_two) / (len_one + len_two);
  var max_delta = 0;
  var at;

  for (var i = 0; i < perc_one.length; i++) {
    var d_one = perc_one[i];
    var d_two = perc_two[i];


    var delta = Math.abs(d_one[1] - d_two[1]);
    var max_delta = Math.max(delta, max_delta);
    if (max_delta === delta) {
      at = i;
    }
  }

  var one_val = perc_one[at][1];
  var two_val = perc_two[at][1];

  var high_val = Math.max(one_val, two_val);
  var low_val = Math.min(one_val, two_val);

  var low_series = low_val === one_val ? perc_one : perc_two;
  var high_series = high_val === one_val ? perc_one : perc_two;

  var it = high_series[at];
  var new_at = at;
  var delta = 0;
  var low_delta = 0, high_delta = 0;

  while (it[1] >= low_val + 1) {
    new_at -= 1;
    if (!high_series[new_at]) {
      break;
      new_at -= 1;
    }

    it = high_series[new_at];

    low_delta = Math.max(Math.abs(new_at - at), low_delta);
  }

  low_delta = Math.abs(new_at - at);

  new_at = at;
  var it = low_series[at];
  while (it[1] <= high_val - 1) {
    new_at += 1;
    if (!low_series[new_at]) {
      break;
      new_at -= 1;
    }

    it = low_series[new_at];
  }

  var high_delta = Math.abs(new_at - at);

  var max_perc_delta = Math.max(low_delta, high_delta);
  if (max_perc_delta === high_delta) {
    at = high_series[at][1];
  } else {
    at = low_series[at][1];
  }


  var ks_val = Math.sqrt(dn) * max_perc_delta / 1000;

  var p;
  _.each(coefficient_table, function(row) {
    if (row.co_eff > ks_val) {
      p = row.p;
    }
  });

  if (max_perc_delta <= 1) {
    max_perc_delta = 0;
    at = 0;
  }

  var results = {
    max: max_perc_delta / 1000,
    at: at,
    len_one: len_one,
    len_two: len_two,
    ks: ks_val,
    p: p
  };

  return results;
}

module.exports = ks_test;
