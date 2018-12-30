"use strict";

var helpers = require("common/sf_helpers.js");
var sf_shim = require("common/sf_shim.js");

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

    if (count === 0) {
      return;
    }

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

  var perc_dist = [];
  var count_dist = [];

  var val = 0;
  var counts = {};
  _.each(perc, function(p) {
    p[0] = p[0] / 10;

    if (p[0] % 1 === 0 || (p[0] - 0.5) % 1 === 0) {
      val = p[1];
      counts[val] = (counts[val] || 0) + 0.5;
    }
  });

  _.each(counts, function(v, k) {
    count_dist.push([k, v, v]);
  });

  return {
    dist: count_dist,
    percentiles: perc,
    weighted_count: w_sum,
    cdf: cdf,
    count: sum,
    average: sum_total / sum,
    w_average: w_sum_total / w_sum
  };
}


function marshall_dist_rows(query_spec, rows) {
  var cols = query_spec.cols;
  var dims = query_spec.dims;
  if (query_spec.field) {
    cols.push(query_spec.field);
  }

  var ret = [];
  console.log("ROWS", rows);
  _.each(rows, function(r) {
    var row = {};
    row._id = {};
    _.each(dims, function(d) {
      row._id[d] = r[d];
    });

    var col = cols[0];
    console.log("R", r, col);
    _.each(r[col].buckets, function(count, bucket) {
      var copy = _.clone(row);
      copy._id = _.clone(row._id);
      var val = parseInt(bucket, 10);
      copy._id[col] = val;
      copy[col] = val;
      copy.count = count;

      ret.push(copy);
    });
  });

  console.log("MARSHALLED", ret);

  return ret;


}

var DistView = {
  initialize: function(ctx) {
    sf_shim.prepare_and_render(this, ctx);
//    sf_shim.initialize.apply(this, [ctx]);
  },
  marshall_rows: marshall_dist_rows,
  prepare: function(data) {
    data.parsed = data.query || data.parsed || {};
    data.results = marshall_dist_rows(data.parsed, data.results);

    this.query = { results: data.results, parsed: data.parsed }
    this.table = data.parsed.table;
    var series = [];
    var col = data.parsed.col || data.parsed.cols[0];
    console.log("COL", col);

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
    return;
    console.log("FINALIZING", this.query);
    var query = this.query;
    if (this.compare_data) {
      _.each(this.compare_data.percentiles, function(series) {
        _.each(series.data, function(pt) {
          pt[0] = pt[0] + query.parsed.compare_delta;
        });
        series.dashStyle = "LongDash";
      });

//      this.ks_result = ks_test(this.data.percentiles.slice(50, 950), this.compare_data.percentiles.slice(50, 950), this.data.count, this.compare_data.count);
//      this.ks_low_result = ks_test(this.data.percentiles.slice(25, 250), this.compare_data.percentiles.slice(25, 250), this.data.count, this.compare_data.count);
//      this.ks_high_result = ks_test(this.data.percentiles.slice(749, 975), this.compare_data.percentiles.slice(749, 975), this.data.count, this.compare_data.count);

    }

    if (!this.data.count && (!this.data || !this.data.count)) {
      return "No Samples";
    }

  },

  render: function() {
    console.log("RENDERING", this);
    var self = this;
    var xmin = self.data.percentiles[0][1]; // p5
    var xzero = self.data.percentiles[0][1];
    var xmax = self.data.percentiles[960][1]; // p95
    var dataset = this.table;

    if (self.compare_data) {
      xmin = Math.min(xmin, self.compare_data.percentiles[50][1]);
      xmax = Math.max(xmax, self.compare_data.percentiles[960][1]);
    }

    function render_graphs(xmin, xmax) {

      var outerEl = $("<div>");
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

      var ks_lines = [];
      var ks_line, ks_low_line, ks_high_line;
      if (self.ks_result) {
        ks_line = {
          value: self.ks_result.at,
          label: {
            text: "delta: " + helpers.count_format(self.ks_result.max * 100),
            style: {
              color: "rgba(200, 0, 0, 0.7)"
            }
          },
          width: 1,
          color: "rgba(200, 0, 0, 0.7)",
          dashStyle: "dot"
        };

        ks_lines.push(ks_line);

        if (self.ks_low_result) {
          ks_low_line = {
            value: self.ks_low_result.at,
            label: {
              text: "delta: " + helpers.count_format(self.ks_low_result.max * 100),
              style: {
                color: "rgba(200, 0, 0, 0.7)"
              }
            },
            width: 1,
            color: "rgba(200, 0, 0, 0.7)",
            dashStyle: "dot"
          };
          ks_lines.push(ks_low_line);

        }

        if (self.ks_high_result) {
          ks_high_line = {
            value: self.ks_high_result.at,
            label: {
              text: "delta: " + helpers.count_format(self.ks_high_result.max * 100),
              style: {
                color: "rgba(200, 0, 0, 0.7)"
              }
            },
            width: 1,
            color: "rgba(200, 0, 0, 0.7)",
            dashStyle: "dot"
          };
          ks_lines.push(ks_high_line);
        }
      }

      var options = {
        height: 500,
        chart: {
          height: 500,
          inverted: true,
          type: "line",
          zoomType: "x",
        },
        series: [
          {
            data: self.data.percentiles,
            name: "Value",
            color: "rgba(0, 0, 200, 0.5)"
          },
        ],
        xAxis: {
          reversed: false,
          type: "linear" // TODO: make self configurable?
        },
        yAxis: {
          min: xmin,
          reversed: false,
          plotLines: plot_lines.concat(ks_lines)
        }
      };

      if (self.compare_data) {

        options.series.push({
          data: (self.compare_data && self.compare_data.percentiles) || [],
          name: "Comparison",
          dashStyle: "LongDash",
          color: "rgba(200, 0, 0, 0.5)"
        });
      }

      var cumDensityEl = $("<h2 class='cdf_density'>Cumulative Density Graph</h2>");
      outerEl.append(cumDensityEl);

      var cdfEl = $("<div class='span12'/>");
      cdfEl.css("height", "500px");

      outerEl.append(cdfEl);

      $C(self.graph_component, {skip_client_init: true}, function(cmp) {
        // get rid of query contents...

        cdfEl
          .append(cmp.$el)
          .show();

        // There's a little setup cost to highcharts, maybe?
        cmp.client(options);
      });

      var distEl = $("<div class='span12'/>");
      distEl.css("height", "500px");

      outerEl.append($("<h2 class='mll mtl'>Probability Density</h2>"));
      outerEl.append(distEl);

      var dist_options = {
        height: 500,
        chart: {
          inverted: false,
          type: 'line',
          zoomType: "x"
        },
        plotOptions: {
          series: {
            marker: {
              enabled: true,
            }
          },
        },
        series: [
          {
            data: self.data.dist,
            name: "Density (in %)",
            color: "rgba(0, 0, 200, 0.5)",
          },
        ],
        xAxis: {
          min: xzero,
          max: xmax,
          reversed: false,
          plotLines: plot_lines,
          type: "linear" // TODO: make self configurable?
        },
        yAxis: {
          reversed: false
        },
        tooltip: {
          valueSuffix: "%"
        }
      };

      if (self.compare_data) {
          dist_options.series.push({
            data: (self.compare_data && self.compare_data.dist) || [],
            name: "Comparison",
            dashStyle: "LongDash",
            color: "rgba(200, 0, 0, 0.5)"
          });
      }

      $C(self.graph_component, {skip_client_init: true}, function(cmp) {
        // get rid of query contents...

        distEl
          .append(cmp.$el)
          .show();

        // There's a little setup cost to highcharts, maybe?
        cmp.client(dist_options);
      });

      return outerEl;


    }

    function render_glance(xmin, xmax) {
      var glance_lines = [];
      var glance_data = [ ];
      var glance_compare_data = [ ];

      var odd = true;
      _.each([5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95], function(p) {
        odd = !odd;
        glance_data.push({
          x : self.data.percentiles[p*10][1],
          y: p,
          shape: "square",
          marker: {
            radius: odd ? 4 : 8,
            symbol: odd ? "circle" : "diamond"
          }
        });

        if (self.compare_data) {
          glance_compare_data.push({
            x : self.compare_data.percentiles[p*10][1],
            y: p,
            shape: "square",
            marker: {
              radius: odd ? 4 : 8,
              symbol: odd ? "circle" : "diamond"
            }
          });
        }
      });

      var percentiles = self.data.percentiles;
      var compare_percentiles = self.compare_data && self.compare_data.percentiles;




      var glance_options = {
        legend: {
          enabled: false,
        },
        chart: {
          height: 300,
          type: "line"
        },
        xAxis: {
          min: xmin,
          max: xmax,
          reversed: false,
          type: "linear" // TODO: make self configurable?
        },
        plotOptions: {
          series: {
            dataLabels: {
              enabled: false
            },
            marker: {
              enabled: true,
              states: {
                hover: {
                  enabled: false
                }
              }
            }
          }
        },
        tooltip: {
          backgroundColor: 'white',
          borderWidth: 0,
          borderRadius: 0,
          headerFormat: '{point.key} ',
          shared: false,
          positioner: function () {
            return { x: 10, y: 0 };
          },

          formatter: function () {

            var ret = "percentile:" + helpers.count_format(this.y) + " " +
              "value: " + helpers.count_format(this.x) + ' ';

            if (compare_percentiles) {
              var percentile = this.y;
              var delta = Math.abs(compare_percentiles[percentile*10][1] - percentiles[percentile*10][1]);

              ret += " original - compare = " + helpers.count_format(delta);
            }

            return ret;
          },
        },
        series: [
          {
            data: glance_data,
            name: "Percentile",
            marker: {
              enabled : true,
              shape: "square"
            },
            color: "rgba(0, 0, 200, 0.5)"
          },
        ],
        yAxis: {
          enabled: false,
          reversed: false
        }
      };

      if (self.compare_data) {
        glance_options.series.push({
          data: glance_compare_data,
          name: "Percentile (comparison)",
          marker: {
            enabled : true
          },
          color: "rgba(200, 0, 0, 0.5)"
        });
      }

      var glanceEl = $("<h2>At a glance</h2>")

      var samplesEl, countEl, compareCountEl;
      samplesEl = $("<span style='font-size: 80%'>");
      samplesEl.addClass("rfloat");
      samplesEl.html("Samples: ");
      countEl = $("<span />");
      countEl.html(helpers.count_format(self.data.count));
      countEl.css({color: "rgba(0, 0, 200, 0.5)"});
      samplesEl.append(countEl);
      if (self.compare_data) {
        samplesEl.append("/");
        compareCountEl = $("<span />");
        compareCountEl.html(helpers.count_format(self.compare_data.count));
        compareCountEl.css({color: "rgba(200, 0, 0, 0.5)"});
        samplesEl.append(compareCountEl);
      }
      glanceEl.append(samplesEl);

      $C(self.graph_component, {skip_client_init: true}, function(cmp) {
        // get rid of query contents...

        glanceEl
          .append(cmp.$el)
          .show();

        // There's a little setup cost to highcharts, maybe?
        cmp.client(glance_options);
      });

      return glanceEl;
    }

    function render_percentiles(xmin, xmax) {
      // render this business
      var outerEl = $("<div>");
      var shortStatsEl = $el.find(".short_stats");
      var percentiles = self.data.percentiles;
      var compare_percentiles = self.compare_data && self.compare_data.percentiles;

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

        var table = helpers.build_table(dataset, headers, [row]);

        // only class attr.
        table.attr("class",  "table percentile_table");
        return table;
      }

      outerEl.append($("<h2>Moments</h2>"));

      var headers = ["count", "average", "trimean", "", ""];
      var row = [];

      function trimean(data) {
        return (data.percentiles[500][1] * 2 + data.percentiles[250][1] + data.percentiles[750][1]) / 4;
      }

      if (self.compare_data) {
        row.push(helpers.build_compare_cell(self.data.count, self.compare_data.count));
        if (self.data.weighted_count) {
          row.push(helpers.build_compare_cell(self.data.w_average, self.compare_data.w_average));
        } else {
          row.push(helpers.build_compare_cell(self.data.average, self.compare_data.average));
        }
        row.push(helpers.build_compare_cell(trimean(self.data), trimean(self.compare_data)));

      } else {
        row.push(helpers.count_format(self.data.count));
        if (self.data.weighted_count) {
          row.push(helpers.count_format(self.data.w_average));
        } else {
          row.push(helpers.count_format(self.data.average));
        }
        row.push(helpers.count_format(trimean(self.data)));
      }

      if (self.data.weighted_count) {
        headers.unshift("weighted count");
        if (compare_percentiles) {
          row.unshift(helpers.build_compare_cell(self.data.weighted_count, self.compare_data.weighted_count));
        } else {
          row.unshift(helpers.count_format(self.data.weighted_count));
        }
      }



      var table = helpers.build_table(dataset, headers, [row]);

      // only class attr.
      table.attr("class",  "table moment_table");
      outerEl.append(table);

      outerEl.append($("<h2>Percentiles</h2>"));
      outerEl.append(render_stats_overview([5, 25, 50, 75, 95]));
      outerEl.append($("<h2>Outliers</h2>"));
      outerEl.append(render_stats_overview([95, 96, 97, 98, 99]));

      return outerEl;
    }

    function render_notices(xmin, xmax) {
      var range = Math.abs(xmax - xmin);
      var bucket_count = range / self.data.parsed.hist_bucket;
      var warning;
      var hist_bucket = self.data.parsed.hist_bucket;
      var warningEl = "";

      if (bucket_count > 5000) {
        warning = "Your bucket size (<b>" + hist_bucket + "</b>), may be too small for the data range (<b>" + helpers.count_format(bucket_count) + "</b> buckets in the range <b>" + helpers.count_format(xmin) + " &mdash; " + helpers.count_format(xmax) + "</b>) and cause artifacts in the distribution. Try raising it to a value that creates 1,000 - 5,000 buckets.";
      } else if (bucket_count < 10) {
        warning = "Your bucket size (<b>" + hist_bucket + "</b>), may be too large for the data range (<b>" + bucket_count + "</b> buckets in the range <b>" + helpers.count_format(xmin) + " &mdash; " + helpers.count_format(xmax) + "</b>) and cause artifacts in the distribution. Try lowering it to a value that creates 1,000 - 5,000 buckets.";
      }

      if (warning) {
        var warningEl = $("<div class='alert alert-warning lfloat'> </div>");
        warningEl.html(warning);
      }

      return warningEl;
    }


    var $el = self.$el;
    var outerEl = $("<div class='span12 prl pll'>");
    outerEl.append(render_glance(xmin, xmax));
    outerEl.append($("<hr />"));
    $el.append(outerEl);

    var graph_target = $("<div>");
    var tabs = {
      "Numbers" : render_percentiles(xmin, xmax),
      "Graphs" : graph_target
    };


    var diffEl = $("<div class='mtl' style='text-align: right'>");

    if (self.compare_data) {
      diffEl.css("color", "rgba(0, 0, 0, 0.7)");
      if (self.ks_result && self.ks_result.p) {
        diffEl.html("(distributions are <b>similar</b>, p-val:" + helpers.count_format(self.ks_result.p) + ")</small>");
      } else {
        diffEl.html("(distributions are <b>not similar</b>)</small>");
      }

      outerEl.append(diffEl);
    }

    var tabEl = $("<div>");
    outerEl.append(tabEl);
    outerEl.css("padding-bottom", "100px");

    var not_rendered = true;
    $C("tabs", { tabs: tabs, active: "Numbers" } , function(cmp) {
      tabEl.prepend(cmp.$el);
      cmp.$el.find('a[data-toggle]').on('shown.bs.tab', function (e) {
        var tab_id = $(e.target).attr("data-target");
        if (!tab_id) { return; }

        tab_id = tab_id.replace(/^#tab_/, '');
        if (tab_id === "Graphs" && not_rendered) {
          var graphEl = render_graphs(xmin, xmax);
          cmp.getTab("Graphs").append(graphEl);
          not_rendered = false;
        }
      })
    });

  },
  calc_cdf: calc_cdf

}
module.exports = DistView;
