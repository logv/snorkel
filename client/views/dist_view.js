"use strict";

var helpers = require("client/views/helpers");
var BaseView = require("client/views/base_view");

function calc_cdf(sorted_hist_arr, total, w_total) {
  var sum = 0, w_sum = 0;

  var dist = [];
  var last_percentile = 0;
  var perc = [];
  var p;
  var value, count, w_count = 0;

  _.each(sorted_hist_arr, function(bin) {
    value = bin[0];
    count = bin[1];
    w_count = bin[2] || 0;

    sum += count;
    w_sum += w_count;

    var percentile;
    // we are weighting
    if (w_total) {
      percentile = parseInt(w_sum/w_total * 1000, 10);
    } else {
      percentile = parseInt(sum / total * 1000, 10);
    }

    for (p = last_percentile + 1; p < percentile; p++) {
      perc.push([p, value]);
    }

    perc.push([percentile, value]);

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
    count: sum
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

    // TODO: should cut percentiles off at p99.
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
        plotLines: plot_lines
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
    outerEl.append($("<h2>At a glance</h2>"));

    var headers = ["count"];
    var row = [];

    if (compare_percentiles) {
      row.push(helpers.build_compare_cell(this.data.count, this.compare_data.count));
    } else {
      row.push(helpers.count_format(this.data.count));
    }

    if (this.data.weighted_count) {
      headers.unshift("weighted count");
      if (compare_percentiles) {
        row.unshift(helpers.build_compare_cell(this.data.weighted_count, this.compare_data.weighted_count));
      } else {
        row.unshift(helpers.count_format(this.data.weighted_count));
      }
    }


    outerEl.append(render_stats_overview([5, 25, 50, 75, 95], headers, row));
    outerEl.append($("<h2>Outliers</h2>"));
    outerEl.append(render_stats_overview([95, 96, 97, 98, 99]));
    outerEl.append($("<h2>Cumulative Density</h2>"));

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

module.exports = DistView;
