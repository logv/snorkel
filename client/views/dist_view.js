"use strict";

var helpers = require("client/views/helpers");
var BaseView = require("client/views/base_view");
var ks_test = require("client/js/ks_test");

function calc_cdf(sorted_hist_arr, total, w_total) {
  var sum = 0, w_sum = 0;

  var dist = [];
  var last_percentile = 0;
  var perc = [];
  var p;
  var cdf = {};
  var value, count, w_count = 0;
  var sum_total = 0, w_sum_total = 0;

  _.each(sorted_hist_arr, function(bin) {
    value = bin[0];
    count = bin[1];
    w_count = bin[2] || 0;

    sum += count;
    w_sum += w_count;

    w_sum_total += (w_count * value);
    sum_total += (count * value);

    var percentile;
    // we are weighting
    if (w_total) {
      percentile = parseInt(w_sum / w_total * 1000, 10);
    } else {
      percentile = parseInt(sum / total * 1000, 10);
    }


    for (p = last_percentile + 1; p < percentile; p++) {
      perc.push([p, value]);
    }

    perc.push([percentile, value]);
    cdf[value] = percentile;

    // we are weighting
    if (w_total) {
      dist.push([value, parseInt(w_count / w_total * 10000, 10) / 100, w_sum / w_total]);
    } else {
      dist.push([value, parseInt(count / total * 10000, 10) / 100, sum / total]);
    }

    last_percentile = percentile;

  });

  for (p = last_percentile + 1; p < 1000; p++) {
    perc.push([p, value]);
  }

  _.each(perc, function(p) {
    p[0] = p[0] / 10;
  });

  return {
    dist: dist,
    percentiles: perc,
    weighted_count: w_sum,
    cdf: cdf,
    count: sum,
    average: sum_total / sum,
    w_average: w_sum_total / w_sum
  };
}


var DistView = BaseView.extend({

  prepare: function(data) {
    var series = [];
    var col = data.parsed.col || data.parsed.cols[0];

    var total = 0;
    var w_total = 0;
    var max;
    var min;

    var running_sum = [];
    // For each column, need to record a series
    _.each(data.results, function(result) {
      var label = "";
      var bucket = result._id[col];
      var count = result.count;
      var weighted_count = result.weighted_count;
      total += count;
      w_total += weighted_count;

      // pulled off the array above in the calc_cdf func
      series.push([bucket, count, weighted_count]);
    });

    series.sort(function(a, b) {
      return a[0] - b[0];
    });

    var stats = calc_cdf(series, total, w_total);

    // copy copy copy
    stats.parsed = data.parsed;
    return stats;
  },

  finalize: function() {
    var query = this.query;
    if (this.compare_data) {
      _.each(this.compare_data.percentiles, function(series) {
        _.each(series.data, function(pt) {
          pt[0] = pt[0] + query.parsed.compare_delta;
        });
        series.dashStyle = "LongDash";
      });

      this.ks_result = ks_test(this.data.percentiles.slice(50, 950), this.compare_data.percentiles.slice(50, 950), this.data.count, this.compare_data.count);
      this.ks_low_result = ks_test(this.data.percentiles.slice(0, 250), this.compare_data.percentiles.slice(0, 250), this.data.count, this.compare_data.count);
      this.ks_high_result = ks_test(this.data.percentiles.slice(749, 999), this.compare_data.percentiles.slice(749, 999), this.data.count, this.compare_data.count);

    }

    if (!this.data.count && (!this.data || !this.data.count)) {
      return "No Samples";
    }

  },

  render: function() {


    var self = this;
    var plot_lines = [];
    _.each([5, 25, 50, 75, 95], function(p) {
      plot_lines.push({
        value : self.data.percentiles[p*10][1],
        label: {
          text: "p" + p
        },
        width: 1,
        color: "#aaa",
        dashStyle: 'dash'
      });

      if (self.compare_data) {
        plot_lines.push({
          value : self.compare_data.percentiles[p*10][1],
          label: {
            text: "p" + p
          },
          width: 1,
          dashStyle: 'dot',
          color: "#aaa"
        });
      }
    });

    var ks_line, ks_low_line, ks_high_line;
    if (this.ks_result) {
      ks_line = {
        value: this.ks_result.at,
        label: {
          text: "delta: " + helpers.count_format(this.ks_result.max * 100),
          style: {
            color: "rgba(200, 0, 0, 0.7)"
          }
        },
        width: 1,
        color: "rgba(200, 0, 0, 0.7)",
        dashStyle: "dot"
      };
      ks_low_line = {
        value: this.ks_low_result.at,
        label: {
          text: "delta: " + helpers.count_format(this.ks_low_result.max * 100),
          style: {
            color: "rgba(200, 0, 0, 0.7)"
          }
        },
        width: 1,
        color: "rgba(200, 0, 0, 0.7)",
        dashStyle: "dot"
      };
      ks_high_line = {
        value: this.ks_high_result.at,
        label: {
          text: "delta: " + helpers.count_format(this.ks_high_result.max * 100),
          style: {
            color: "rgba(200, 0, 0, 0.7)"
          }
        },
        width: 1,
        color: "rgba(200, 0, 0, 0.7)",
        dashStyle: "dot"
      };
    }

    var xmin = this.data.percentiles[50][1]; // p5
    var xmax = this.data.percentiles[950][1]; // p95

    if (this.compare_data) {
      xmin = Math.min(xmin, this.compare_data.percentiles[50][1]);
      xmax = Math.max(xmax, this.compare_data.percentiles[950][1]);
    }

    var options = {
      chart: {
        inverted: true
      },
      series: [
        {
          data: this.data.percentiles,
          name: "Query Results",
          color: helpers.get_color("cdf")
        },
        {
          data: (this.compare_data && this.compare_data.percentiles) || [],
          name: "Comparison",
          dashStyle: "LongDash",
          color: helpers.get_color("cdf")
        }
      ],
      xAxis: {
        reversed: false,
        type: "linear" // TODO: make this configurable?
      },
      yAxis: {
        min: xmin,
        max: xmax,
        reversed: false,
        plotLines: plot_lines.concat([ks_line, ks_low_line, ks_high_line])
      }
    };

    var $el = this.$el;

    // render this business
    var shortStatsEl = $el.find(".short_stats");
    var percentiles = this.data.percentiles;
    var compare_percentiles = this.compare_data && this.compare_data.percentiles;

    function render_stats_overview(stats, headers, row) {
      headers = headers || [];
      row = row || [];

      _.each(stats, function(p) {
        headers.push("p" + parseInt(p, 10));
        p = p * 10;
        var cell;

        if (compare_percentiles) {
          cell = helpers.build_compare_cell(percentiles[p][1], compare_percentiles[p][1]);
        } else {
          cell = $("<div>").html(helpers.count_format(percentiles[p][1]));
        }

        row.push(cell);
      });

      var table = helpers.build_table(headers, [row]);

      // only class attr.
      table.attr("class",  "table");
      return table;
    }

    var outerEl = $("<div class='span12 pll'>");

    var range = Math.abs(xmax - xmin);
    var bucket_count = range / this.data.parsed.hist_bucket;
    var warning;
    var hist_bucket = this.data.parsed.hist_bucket;

    if (bucket_count > 5000) {
      warning = "Your bucket size (<b>" + hist_bucket + "</b>), may be too small for the data range (<b>" + helpers.count_format(bucket_count) + "</b> buckets in the range <b>" + helpers.count_format(xmin) + " &mdash; " + helpers.count_format(xmax) + "</b>) and cause artifacts in the distribution. Try raising it to a value that creates 1,000 - 5,000 buckets.";
    } else if (bucket_count < 10) {
      warning = "Your bucket size (<b>" + hist_bucket + "</b>), may be too large for the data range (<b>" + bucket_count + "</b> buckets in the range <b>" + helpers.count_format(xmin) + " &mdash; " + helpers.count_format(xmax) + "</b>) and cause artifacts in the distribution. Try lowering it to a value that creates 1,000 - 5,000 buckets.";
    }

    if (warning) {
      var warningEl = $("<div class='alert alert-warning lfloat'> </div>");
      warningEl.html(warning);
      outerEl.append(warningEl);
    }

    outerEl.append($("<h2>At a glance</h2>"));

    var headers = ["count", "average", "trimean"];
    var row = [];

    function trimean(data) {
      return (data.percentiles[500][1] * 2 + data.percentiles[250][1] + data.percentiles[750][1]) / 4;
    }

    if (compare_percentiles) {
      row.push(helpers.build_compare_cell(this.data.count, this.compare_data.count));
      row.push(helpers.build_compare_cell(this.data.average, this.compare_data.average));

      row.push(helpers.build_compare_cell(trimean(this.data), trimean(this.compare_data)));

    } else {
      row.push(helpers.count_format(this.data.count));
      row.push(helpers.count_format(this.data.average));
      row.push(helpers.count_format(trimean(this.data)));

    }

    if (this.data.weighted_count) {
      headers.unshift("weighted average");
      headers.unshift("weighted count");
      if (compare_percentiles) {
        row.unshift(helpers.build_compare_cell(this.data.w_average, this.compare_data.w_average));
        row.unshift(helpers.build_compare_cell(this.data.weighted_count, this.compare_data.weighted_count));
      } else {
        row.unshift(helpers.count_format(this.data.w_average));
        row.unshift(helpers.count_format(this.data.weighted_count));
      }
    }



    var table = helpers.build_table(headers, [row]);
    table.attr("class",  "table");
    outerEl.append(table);
    outerEl.append($("<h2>Percentiles</h2>"));
    outerEl.append(render_stats_overview([5, 25, 50, 75, 95]));
    outerEl.append($("<h2>Outliers</h2>"));
    outerEl.append(render_stats_overview([95, 96, 97, 98, 99]));
    var cumDensityEl = $("<h2 class='cdf_density'>Cumulative Density</h2>");
    outerEl.append(cumDensityEl);

    var diffEl = $("<small class='rfloat mtl'>");

    if (this.compare_data) {
      diffEl.css("color", "rgba(200, 0, 0, 0.7)");
      if (this.ks_result.p) {
        diffEl.html("(distributions are <b>similar</b>, p-val:" + helpers.count_format(this.ks_result.p) + ")</small>");
      } else {
        diffEl.html("(distributions are <b>not similar</b>)</small>");
      }

      cumDensityEl.append(diffEl);
    }

    $el.prepend(outerEl);

    var cdfEl = $("<div class='span12'/>");
    cdfEl.css("height", "500px");

    $el.append(cdfEl);

    $C("highcharter", {skip_client_init: true}, function(cmp) {
      // get rid of query contents...

      cdfEl
        .append(cmp.$el)
        .show();

      // There's a little setup cost to highcharts, maybe?
      cmp.client(options);
    });

    var distEl = $("<div class='span12'/>");
    distEl.css("height", "500px");

    $el.append($("<h2 class='mll'>Probability Density</h2>"));
    $el.append(distEl);

    var dist_options = {
      chart: {
        inverted: false
      },
      series: [
        {
          data: this.data.dist,
          name: "Query Results",
          color: helpers.get_color("pdf")
        },
        {
          data: (this.compare_data && this.compare_data.dist) || [],
          name: "Comparison",
          dashStyle: "LongDash",
          color: helpers.get_color("pdf")
        }
      ],
      xAxis: {
        min: xmin,
        max: xmax,
        reversed: false,
        plotLines: plot_lines,
        type: "linear" // TODO: make this configurable?
      },
      yAxis: {
        reversed: false
      },
      tooltip: {
        valueSuffix: "%"
      }
    };

    $C("highcharter", {skip_client_init: true}, function(cmp) {
      // get rid of query contents...

      distEl
        .append(cmp.$el)
        .show();

      // There's a little setup cost to highcharts, maybe?
      cmp.client(dist_options);
    });



  }

}, {
  icon: "noun/dist.svg"
});

jank.trigger("view:add", "dist",  {
    include: helpers.STD_INPUTS.concat(["field", "hist_bucket", "compare"]),
    exclude: [ "group_by", "max_results", "agg", "fieldset", "time_bucket" ],
    icon: "noun/dist.svg"
}, DistView);

module.exports = DistView;
