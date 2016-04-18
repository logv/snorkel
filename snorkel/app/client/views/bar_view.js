"use strict";

var filter_helper = require("app/controllers/query/filters");
var helpers = require("app/client/views/helpers");
var BaseView = require("app/client/views/base_view");
var presenter = require("app/client/views/presenter");

var row_key = helpers.row_key;
var BarView = BaseView.extend({
  baseview: helpers.VIEWS.TABLE,
  finalize: function() {
    var that = this;
    var group_by = _.clone(this.data.parsed.dims);

    var cols = _.clone(this.data.parsed.cols);

    if (!cols || !cols.length) {
      cols = ['count'];
      this.data.parsed.agg = '$count';
    }

    var stacking = this.data.parsed.stacking === "stacked";

    var metric = this.data.parsed.agg || '$count';

    var categories = [];
    var serieses = {};
    var compare_series = {};
    var compare_data = this.compare_data;
    var dataset = this.table;

    _.each(cols, function(col) {
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
      var key = row_key(group_by, result);
      categories.push(key);
      _.each(cols, function(col) {
        if (metric === '$count') {
          serieses[col].data.push(
            {
              y: result.count,
              samples: result.count

            });
        } else {
          serieses[col].data.push({
            y: result[col],
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
        _.each(cols, function(col) {
          if (metric === '$count') {
            compare_series[col].data.push({
              samples: result.count,
              y: result.count
            });
          } else {
            compare_series[col].data.push({
              samples: result.count,
              y: result[col]
            });
          }
        });
      });
    }


    var datas = [];
    var compare_datas = [];
    _.each(cols, function(col) {
      datas.push(serieses[col]);
      compare_datas.push(compare_series[col]);
    });

    this.cols = cols;
    this.serieses = datas;
    this.compare_serieses = compare_datas;
    this.categories = categories;
    this.stacking = stacking;
  },

  render: function() {
    console.log("RENDERING BAR VIEW", this);
    var serieses = this.serieses;
    if (this.compare_serieses) {
      serieses = serieses.concat(this.compare_serieses);
    }

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
    $C("highcharter", {skip_client_init: true}, function(cmp) {
      // get rid of query contents...
      $el
        .append(cmp.$el)
        .show();

      // There's a little setup cost to highcharts, maybe?
      cmp.client(options);
    });
  }

});

var excludes = _.clone(helpers.STD_EXCLUDES);
SF.trigger("view:add", "bar", {
  include: helpers.STD_INPUTS
    .concat(helpers.inputs.COMPARE)
    .concat(helpers.inputs.STACKING)
    .concat(helpers.inputs.SORT_BY),
  icon: "noun/table.svg"
}, BarView);

module.exports = BarView;

