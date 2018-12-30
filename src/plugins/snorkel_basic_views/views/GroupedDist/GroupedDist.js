"use strict";

var DistView = require("DistView/DistView.js");
var helpers = require("common/sf_helpers.js");
var sf_shim = require("common/sf_shim.js");
var sf_marshal = require("common/marshal.js");

var MultiDistView = _.extend({}, DistView, {
  initialize: function(ctx) {
    sf_shim.prepare_and_render(this, ctx);
  },
  prepare: function(data) {
    console.log("DIST DATA", data);
    data.parsed = data.query || data.parsed || {};
    data.results = sf_marshal.marshall_dist_rows({ opts: data.parsed }, data.results);

    var col = data.parsed.col || data.parsed.cols[0];
    var series = [];
    var groups = {};

    var total = 0;
    var w_total = 0;
    var datas = {};

    _.each(data.results, function(result) {
      var label = "";
      var bucket = result._id[col];

      var group_by = result._id;


      delete group_by[col];
      var group = _.keys(group_by);
      group.sort();
      group = _.map(group, function(g) { return group_by[g]; }).join(',');

      var count = result.count;
      var weighted_count = result.weighted_count;

      if (!groups[group]) {
        groups[group] = {
          total: 0,
          w_total: 0,
          group: group,
          series: []
        };
      }


      groups[group].total += count;
      groups[group].w_total += weighted_count;

      // pulled off the array above in the calc_cdf func
      groups[group].series.push([bucket, count, weighted_count]);
    });

    _.each(groups, function(group) {
      group.series.sort(function(a, b) {
        return a[0] - b[0];
      });
      group.stats = DistView.calc_cdf(group.series, group.total, group.w_total);
      group.stats.group = group.group;
    });

    return groups;
  },

  finalize: function() {
  },

  render: function() {

    var xmin = 9007199254740992, xmax = -9007199254740992;
    var not_rendered = true;
    var outerEl = $("<div class='span12 prl pll'>");
    var tabEl = $("<div>");
    outerEl.append(tabEl);

    var series = [];
    var numbersEl = $("<div />");
    var graphsEl = $("<div />");
    var tabs = {
      "Numbers" : numbersEl,
      "Graphs" : graphsEl
    };

    var self = this;
    self.$el.append(outerEl);
    function render_glance(groups) {
      var glances = {};

      var odd = true;
      _.each(groups, function(group) {
        glances[group.group] = [];
        _.each([5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95], function(p) {
          odd = !odd;
          glances[group.group].push({
            x : group.stats.percentiles[p*10][1],
            y: p,
            marker: {
              radius: odd ? 4 : 8,
              symbol: odd ? "circle" : "diamond"
            }
          });

        });
      });

      var glance_series = _.map(glances, function(values, glance) {
        return {
          data: values,
          name: glance,
          marker: {
            enabled: true,
            shape: "square"
          },
          color: helpers.get_color(glance)
        };
      });

      var glance_options = {
        height: 300,
        chart: {
          height: 100,
          type: "spline"
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

          shared: true,
          positioner: function () {
            return { x: 10, y: 0 };
          }
        },
        series: glance_series,
        yAxis: {
          enabled: true,
          reversed: false
        }
      };

      var glanceEl = $("<h2>At a glance</h2>");

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

    series = [];
    _.each(self.data, function(data) {
      xmin = Math.min(data.stats.percentiles[50][1], xmin);
      xmax = Math.max(data.stats.percentiles[960][1], xmax);

      series.push({
        data: data.stats.percentiles,
        name: data.group,
        color: helpers.get_color(data.group)
      });
    });

    function render_graphs() {

      var el = $("<div />");
      var cumDensityEl = $("<h2 class='cdf_density'>Cumulative Density Graphs</h2>");
      var cdfEl = $("<div class='span12'/>");
      var distEl = $("<div class='span12'/>");

      el.append(cumDensityEl);
      el.append(cdfEl);

      el.append($("<h2 class='mll'>Probability Density Graphs</h2>"));
      el.append(distEl);

      var options = {
        height: 500,
        chart: {
          inverted: true
        },
        series: series,
        xAxis: {
          reversed: false,
          type: "linear" // TODO: make self configurable?
        },
        yAxis: {
          min: xmin,
          max: xmax,
          reversed: false
        },
        plotOptions: {
          series: {
            lineWidth: 3
          }
        }

      };

      $C(self.graph_component, {skip_client_init: true}, function(cmp) {
        cdfEl.append(cmp.$el);
        cmp.client(options); // since we skipped client init
      });

      series = [];
      _.each(self.data, function(data) {
        series.push({
          data: data.stats.dist,
          name: data.group,
          color: helpers.get_color(data.group)
        });
      });

      var dist_options = {
        height: 500,
        chart: {
          inverted: false
        },
        series: series,
        xAxis: {
          min: xmin,
          max: xmax,
          reversed: false,
          type: "linear" // TODO: make self configurable?
        },
        yAxis: {
          reversed: false
        },
        tooltip: {
          valueSuffix: "%"
        },
        plotOptions: {
          series: {
            lineWidth: 3
          }
        }
      };

      $C(self.graph_component, {skip_client_init: true}, function(cmp) {
        // get rid of query contents...

        distEl
          .append(cmp.$el)
          .show();

        // There's a little setup cost to highcharts, maybe?
        cmp.client(dist_options);
      });

      return el;
    }


    function render_tables() {
      var dataset = self.table;

      function render_stats_overview(data, stats, headers) {

        headers = ["", "samples"];
        var rows = [];

        _.each(stats, function(p) {
          headers.push("p" + parseInt(p, 10));
        });

        _.each(data, function(summary_stats) {
          var row = [ $("<div />")
            .html(summary_stats.group)
            .css("color", helpers.get_color(summary_stats.group))
          ];

          row.push($("<div />").html(summary_stats.count));

          _.each(stats, function(p) {
            p = p * 10;
            var cell;

            cell = $("<div>").html(helpers.count_format(summary_stats.percentiles[p][1]));

            row.push(cell);
          });

          rows.push(row);
        });

        var table = helpers.build_table(dataset, headers, rows);

        // only class attr.
        table.attr("class",  "table");
        return table;
      }

      var percentiles = _.map(self.data,
        function(d) { return d.stats; });

      numbersEl.append($("<h2>Percentiles</h2>"));
      numbersEl.append(render_stats_overview(percentiles, [5, 25, 50, 75, 95]));
      numbersEl.append($("<h2>Outliers</h2>"));
      numbersEl.append(render_stats_overview(percentiles, [95, 96, 97, 98, 99]));

    }

    outerEl.prepend("<hr />");
    outerEl.prepend(render_glance(self.data));
    render_tables();
    $C("tabs", { tabs: tabs, active: "Numbers" } , function(cmp) {
      tabEl.prepend(cmp.$el);

      cmp.$el.find('a[data-toggle]').on('shown.bs.tab', function (e) {
        var tab_id = $(e.target).attr("data-target");
        if (!tab_id) { return; }

        tab_id = tab_id.replace(/^#tab_/, '');
        if (tab_id === "Graphs" && not_rendered) {
          var graphEl = render_graphs();
          cmp.getTab("Graphs").append(graphEl);
          not_rendered = false;
        }
      });
    });


  }


});

module.exports = MultiDistView;
