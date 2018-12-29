"use strict";

var filters = require("common/filters.js");
var sf_shim = require("common/sf_shim.js");
var helpers = require("common/sf_helpers.js");
var presenter = require("common/sf_presenter.js");
var sf_marshal = require("common/marshal.js");

var row_key = helpers.row_key;
var BarView = {
  initialize: function(ctx) {
    sf_shim.prepare_and_render(this, ctx);
  },
  prepare: function(data) {
    data.results = sf_marshal.marshall_table_rows({ opts: data.parsed}, data.results);
    return data;
  },
  finalize: function() {
    var that = this;
    var group_by = _.clone(this.data.parsed.dims);

    var cols = _.clone(this.data.parsed.cols);
    var col_aggs = helpers.get_col_aggs(this.table, this.data.parsed);

    if (!cols || !cols.length) {
      cols = ['count'];
      this.data.parsed.agg = '$count';
      col_aggs = ['count'];
    }

    var stacking = this.data.parsed.stacking === "stacked";

    var metric = this.data.parsed.agg || '$count';

    var categories = [];
    var serieses = {};
    var compare_series = {};
    var compare_data = this.compare_data;
    var dataset = this.table;

    _.each(col_aggs, function(col) {
      serieses[col] = {
        data: [],
        name: presenter.get_field_name(dataset, col),
        color: helpers.get_rgba(col, 1)
      };

      if (compare_data) {
        compare_series[col] = {
          data: [],
          name: presenter.get_field_name(dataset, col) + " (compare)",
          color: helpers.get_rgba(col, 0.7)
        };

        if (stacking) {
          compare_series[col].stack = 'compare';
          serieses[col].stack = 'original';
        } else { // TODO: figure this shits out
          compare_series[col].stack = col;
          serieses[col].stack = col;
        }
      }
    });

    _.each(this.data.results, function(result) {
      console.log("GETTING ROW KEY",group_by, result);
      var key = row_key(group_by, result);
      categories.push(key);
      _.each(col_aggs, function(col) {
        var agg = helpers.extract_agg(col) || metric;
        if (agg === '$count') {
          serieses[col].data.push(
            {
              y: result.count,
              samples: result.count

            });
        } else {
          serieses[col].data.push({
            y: helpers.get_field_value(result, col),
            samples: result.count
          });
        }
      });
    });

    if (compare_data) {
      stacking = true;
      _.each(compare_data.results, function(result) {
        var key = row_key(group_by, result);
        categories.push(key);
        _.each(col_aggs, function(col) {
          var agg = helpers.extract_agg(col) || metric;
          if (agg === '$count') {
            compare_series[col].data.push({
              samples: result.count,
              y: result.count
            });
          } else {
            compare_series[col].data.push({
              samples: result.count,
              y: helpers.get_field_value(result, col)
            });
          }
        });
      });
    }


    var datas = [];
    var compare_datas = [];
    _.each(col_aggs, function(col) {
      if (!serieses[col]) {
        return;
      }

      datas.push(serieses[col]);
      compare_datas.push(compare_series[col]);
    });

    this.serieses = datas;
    this.compare_serieses = compare_datas;
    this.categories = categories;
    this.stacking = stacking;
  },

  render: function() {
    console.log("RENDERING BAR VIEW", this);
    var serieses = this.serieses;
    if (this.compare_serieses && this.compare_serieses.length) {
      serieses = serieses.concat(this.compare_serieses);
    }

    var serieses = _.filter(serieses, function(s) { return s; });

    var options = {
      chart: {
        type: 'column'
      },
      legend: {enabled: true},
      tooltip: {
        shared: false,
        useHTML: true,
        formatter: function() {
          var tooltip = $("<div>");
          tooltip.append($("<b>" + this.series.name + "</b><br />"));

          tooltip.append($("<br />"));

          function label_row(label, value) {
            var div = $("<div class='clearfix' style='min-width: 200px'/>");
            var nameEl = $("<div class='lfloat' />");
            nameEl.html(label);

            var valueEl = $("<div class='rfloat'/>");
            valueEl.html(helpers.count_format(value));

            div.append(nameEl);
            div.append(valueEl);

            return div;
          }

          tooltip.append(label_row("Value", this.y));

          tooltip.append(label_row("Samples", this.point.samples));

          if (this.point.stackTotal) {
            tooltip.append(label_row("Total", this.point.stackTotal));
            tooltip.append(label_row("% of Total", this.y / this.point.stackTotal * 100));
          }

          return tooltip.html();
        }
      },

      plotOptions: {
        column: {
          stacking: this.stacking
        }
      },
      series: serieses,
      xAxis: {
        categories: this.categories
      },
      yAxis: {
      }
    };

    if (this.categories.length > 20) {
      options.xAxis.labels = {
        enabled: false
      };
      options.tooltip.formatter = function() {
        var tooltip = $("<div>");
        tooltip.append($("<b>" + this.x + "</b><br />"));
        tooltip.append($("<br />"));
        var point;
        function label_row(label, value) {
          var div = $("<div class='clearfix' style='min-width: 200px'/>");
          var nameEl = $("<div class='lfloat' />");
          nameEl.css("color", helpers.get_rgba(label, 1));
          nameEl.html(label);

          var valueEl = $("<div class='rfloat'/>");
          valueEl.html(helpers.count_format(value));

          div.append(nameEl);
          div.append(valueEl);

          return div;
        }

        _.each(this.points, function(pt) {
          point = pt;
          tooltip.append(label_row(point.series.name, point.y));

        });


        tooltip.append($("<br />"));
        tooltip.append(label_row("Samples", point.point.samples));

        return tooltip.html();
      };
      options.tooltip.shared = true;
    }

    var $el = this.$el;
    $C(this.graph_component, {skip_client_init: true}, function(cmp) {
      // get rid of query contents...
      $el
        .append(cmp.$el)
        .show();

      // There's a little setup cost to highcharts, maybe?
      cmp.client(options);
    });
  }

}

module.exports = BarView;

