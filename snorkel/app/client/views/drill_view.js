"use strict";

var helpers = require("app/client/views/helpers");
var presenter = require("app/client/views/presenter");
var BaseView = require("app/client/views/base_view");
var DrillView = BaseView.extend({
  render: function() {

    var tabEl = this.$el;
    var tableEl = this.render_table();
    var chartEl = $("<div />");
    var tabs = {
      Overview: chartEl,
      Details: tableEl
    };

    var self = this;
    var not_rendered = true;
    $C("tabs", { tabs: tabs, active: "Overview" } , function(cmp) {
      tabEl.prepend(cmp.$el);

      var graphEl = self.render_charts();
      cmp.getTab("Overview").append(graphEl);
    });
  },

  render_charts: function() {
    var chartEl = $("<div />");
    var categories = [];
    var series = [];
    var chart_values = [];
    var compare_values = [];
    var delta_values = [];
    var movements = this.movements;

    var self = this;
    var dataset = self.table;
    var samplesEl = $("<h2 />");
    var first_col = _.first(_.keys(self.data));
    samplesEl.html("samples: " + self.data[first_col].count);
    if (this.compare_data) {
      samplesEl.html("samples: " +
        this.data[first_col].count + " -> " +
        this.compare_data[first_col].count);
    }

    var avgEl = $("<div />");
    _.each(self.parsed.cols, function(col) {
      var curAvgEl = $("<h2/>");
      var formatter = presenter.get_field_formatter(dataset, col);
      curAvgEl.html(col + ": "  + formatter(self.data[col].avg));
      if (self.compare_data) {
        curAvgEl.html(col + ": " +
          formatter(self.data[col].avg) + " -> " +
          formatter(self.compare_data[col].avg));
      }

      avgEl.append(curAvgEl);
    });



    chartEl.append(samplesEl);
    chartEl.append(avgEl);



    var ordered_groups;
    if (!_.isEmpty(movements)) {
      ordered_groups = _.sortBy(_.keys(this.movements), function(key) {
        return -Math.abs(movements[key]);
      });
    }

    _.each(this.data, function(stats, col) {
      ordered_groups = ordered_groups || _.keys(stats.diffs);

      _.each(ordered_groups, function(group) {
        chart_values.push({
          name: group,
          y: (stats.diffs[group] * 100)
        });
      });

    });

    _.each(this.compare_data, function(stats, col) {
      _.each(ordered_groups, function(group) {
        compare_values.push({
          name: group,
          y: (stats.diffs[group] * 100)
        });
      });
    });

    _.each(ordered_groups, function(group) {
      delta_values.push({
        name : group,
        y : movements[group]
      });
    });


    function make_chart(values, title) {
      _.each(values, function(f) {
        f.y = parseInt((f.y||0) * 100, 10) / 100;
        f.color = f.y >= 0 ? helpers.get_color("positive") : helpers.get_color("negative");
      });

      var only_values = _.map(values, function(f) { return f.y || 0; });
      var el = $("<div />");
      el.css('height', 400);
      var options = {
        chart: {
          type: 'pie'
        },
        xAxis: {
          categories: _.map(values, function(f) { return f.name; })
        },
        yAxis: {
          gridLineWidth: 1,
          min: _.min(only_values) - 5,
          max: _.max(only_values) + 5
        },
        tooltip: {
          valueSuffix: '%',
          shared: true
        },

        series: [{
          data: values,
          type: 'column',
          name: title
        }]
      };

      $C("highcharter", {skip_client_init: true}, function(cmp) {
        el
          .append(cmp.$el)
          .show();

        // There's a little setup cost to highcharts, maybe?
        cmp.client(options);

      });

      return el;
    }

    if (compare_values.length) {
      chartEl.append($("<h2/>").html("Delta Impact breakdown"));
      chartEl.append(make_chart(delta_values, 'impact'));

      chartEl.append($("<h2/>").html("After Query Avg. Impact breakdown"));
      chartEl.append(make_chart(compare_values, 'impact'));
    }

    chartEl.append($("<h2/>").html("Query Avg. Impact breakdown"));
    chartEl.append(make_chart(chart_values, 'impact'));

    return chartEl;
  },

  render_table: function() {
    var headers = ["", "samples"];
    var rows = {
      "total" : ["total"]
    };
    var compare_rows = {
      "total" : ["total"]
    };
    var dataset = this.table;
    var data = this.data;
    var compare_data = this.compare_data;
    var $el = $("<div />");

    _.each(data, function(stats, col) {
      headers.push(col + " avg");
      headers.push("avg without row");
      headers.push("delta");
      headers.push("delta / avg");

      var formatter = presenter.get_field_formatter(dataset, col);

      var compare_stats;
      if (compare_data) {
        compare_stats = compare_data[col];
      }

      function gen_el(rows, stats, diff, group) {
        var el = "";
        if (rows.total.length === 1) {
          rows.total.push(helpers.count_format(stats.count));
        }

        if (!rows[group]) {
          rows[group] = [group, helpers.count_format(stats.counts[group])];
        }
        rows[group].push(formatter(stats.values[group]));
        rows[group].push(formatter(stats.avgs[group]));
        rows[group].push(stats.deltas[group].toFixed(2));
        rows[group].push(diff.toFixed(4));
      }

      _.each(stats.diffs, function(diff, group) {
        gen_el(rows, stats, diff, group);

      });

      if (compare_data) {
        _.each(compare_stats.diffs, function(diff, group) {
          gen_el(compare_rows, compare_stats, diff, group);


        });
        compare_rows.total.push(compare_stats.avg.toFixed(2));
        compare_rows.total.push("");
        compare_rows.total.push("");
        compare_rows.total.push("");
      }

      rows.total.push(stats.avg.toFixed(2));
      rows.total.push("");
      rows.total.push("");
      rows.total.push("");
    });

    rows = _.sortBy(_.values(rows), function(row) {
      return -Math.abs(parseFloat(row[4]));
    });
    compare_rows = _.sortBy(_.values(compare_rows), function(row) {
      return -Math.abs(parseFloat(row[4]));
    });
    var table = helpers.build_table(dataset, headers, rows);
    var compare_table = helpers.build_table(dataset, headers, compare_rows);

    var self = this;

    $el.append($("<h2>after</h2>"));
    $el.append(table);

    var movements = {};
    this.movements = movements;

    if (compare_data) {
      $el.append($("<h2>before</h2>"));
      $el.append(compare_table);

      var delta_rows = {};

      var delta_headers = ["", "samples"];
      _.each(compare_data, function(stats, col) {

        delta_headers = delta_headers.concat([ col + " avg", "new avg with old row", "delta from real avg", "impact"]);
        _.each(_.keys(self.groups), function(group) {
          var new_data = data[col];
          var subtracted = new_data.total - ((new_data.counts[group] || 0) * (new_data.values[group] || 0));
          var addtracted = subtracted + ((stats.counts[group] || 0) * (stats.values[group]||0));
          var new_avg = addtracted / ((new_data.minus_counts[group] || new_data.count) + (stats.counts[group] || 0));

          var delta = new_data.avg - new_avg;
          var frac = delta / new_data.avg * 100;

          if (!delta_rows[group]) {
            delta_rows[group] = [ group, helpers.count_format((stats.counts[group] || 0)) + "->" +
              helpers.count_format((new_data.counts[group] || 0))];
          }

          delta_rows[group].push((stats.values[group]||0).toFixed(2) + "->" +
            (new_data.values[group] || 0).toFixed(2));

          delta_rows[group].push(new_avg.toFixed(2));
          delta_rows[group].push((new_data.avg - new_avg).toFixed(2));
          delta_rows[group].push(frac.toFixed(2) + "%");

          movements[group] = frac;
        });

      });

      delta_rows = _.sortBy(_.values(delta_rows), function(row) {
        return -Math.abs(parseFloat(row[4]));
      });

      var other_table = helpers.build_table(dataset, delta_headers, _.values(delta_rows));
      $el.prepend(other_table);
      $el.prepend($("<h2>delta & impact</h2>"));
    }

    return $el;
  },

  prepare: function(data) {
    var ret = {};
    var self = this;
    self.groups = self.groups || {};
    self.parsed = data.parsed;

    _.each(data.parsed.cols, function(col) {
      ret[col] = {};
      var sums = {};
      var counts = {};
      var minus_counts = {};
      var deltas = {};
      var values = {};
      var diffs = {};
      var avgs = {};

      var col_total = _.reduce(data.results, function(memo, res) {
        return memo + ((res.weighted_count  || res.count) * res[col]);
      }, 0);

      var col_count = _.reduce(data.results, function(memo, res) {
        return memo + (res.weighted_count || res.count);
      }, 0);

      var col_avg = col_total / col_count;

      _.each(data.results, function(row) {
        var group = _.keys(row._id);
        group.sort();
        group = _.map(group, function(g) { return row._id[g]; }).join(',');
        self.groups[group] = true;
        sums[group] = col_total - ((row.weighted_count || row.count) * row[col]);
        minus_counts[group] = col_count - (row.weighted_count || row.count);
        counts[group] = row.weighted_count || row.count;
        values[group] = row[col];
      });

      // Maybe compare how different it is to the real average.
      _.each(sums, function(sum, group) {
        avgs[group] = sum / minus_counts[group];
        deltas[group] = col_avg - avgs[group];
        diffs[group] = deltas[group] / col_avg;
      });

      ret[col].deltas = deltas;
      ret[col].diffs = diffs;
      ret[col].sums = sums;
      ret[col].counts = counts;
      ret[col].minus_counts = minus_counts;
      ret[col].avg = col_avg;
      ret[col].count = col_count;
      ret[col].total = col_total;
      ret[col].avgs = avgs;
      ret[col].values = values;
    });


    return ret;
  },
  supplement_inputs: function(inputs) {
    inputs.push({
      name: "baseview",
      value: "table"
    });
  }
});

var excludes = _.clone(helpers.STD_EXCLUDES);
SF.trigger("view:add", "drill", {
  include: helpers.STD_INPUTS
    .concat(helpers.inputs.COMPARE),
  icon: "noun/table.svg"
}, DrillView);

module.exports = DrillView;
