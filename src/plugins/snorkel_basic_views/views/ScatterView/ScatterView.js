"use strict";

var helpers = require("common/sf_helpers.js");
var presenter = require("common/sf_presenter");
var sf_shim = require("common/sf_shim.js");
var SamplesView = require("SamplesView/SamplesView");

var ScatterView = _.extend({}, ScatterView, {
  initialize: function(ctx) {
    sf_shim.prepare_and_render(this, ctx);
  },
  prepare: function(data) {
    console.log("PREPARING DATA", data);
    return data;
  },

  finalize: function() {
    if (!this.data.results.length) {
      return "No Samples";
    }

    var group_by = this.data.parsed.dims,
        grouped_compare_data,
        grouped_data;

    grouped_data = _.groupBy(this.data.results, function(result) {
        return helpers.result_key(group_by, result);
      });

    this.points = grouped_data;
    if (this.compare_data) {
      grouped_compare_data = _.groupBy(this.compare_data.results,
        function(result) {
          return helpers.row_key(group_by, result);
        });
      this.compare_points = grouped_compare_data;


    }
  },

  render: function() {

    var series = [];
    var field_one = this.data.parsed.field;
    var field_two = this.data.parsed.field_two;

    var max_x = Number.MIN_SAFE_INTEGER;
    var max_y = Number.MIN_SAFE_INTEGER;
    var min_x = Number.MAX_SAFE_INTEGER;
    var min_y = Number.MAX_SAFE_INTEGER;
    var self = this;

    _.each(this.points, function(point_group, name) {
      var color_str = helpers.get_rgba(name);
      var serie = {
        data: [],
        name: (name || ""),
        color: color_str
      };
      series.push(serie);
      _.each(point_group, function(result) {
        console.log("RESULT", result);
        if (_.isFinite(result[field_one])) {
          min_x = Math.min(result[field_one], min_x);
          max_x = Math.max(result[field_one], max_x);
        }
        if (_.isFinite(result[field_two])) {
          min_y = Math.min(result[field_two], min_y);
          max_y = Math.max(result[field_two], max_y);
        }

        serie.data.push({
          x: result[field_one],
          y: result[field_two],
          result: result
        });
      });
    });


    // checking for reversed axes in scatter plot
    var custom_params = this.query.parsed.custom || {};
    var reverse_axis = custom_params.reverse_axis;

    var tmp;
    switch (reverse_axis) {
      case 'reverse_b':
        tmp = min_x;
        min_x = max_x;
        max_x = tmp;
        tmp = min_y;
        min_y = max_y;
        max_y = tmp;
        break;
      case 'reverse_x':
        tmp = min_x;
        min_x = max_x;
        max_x = tmp;
        break;
      case 'reverse_y':
        tmp = min_y;
        min_y = max_y;
        max_y = tmp;
        break;
      default:
        break
    }
    // end reversed axes

    var options = {
      chart: {
          type: 'scatter',
          zoomType: 'xy',
      },
      legend: { enabled: true },
      xAxis: {
        type: "linear",
        min: min_x,
        max: max_x,
        title: {
          text: presenter.get_field_name(this.table, field_one)
        }
      },
      tooltip: {
      shared: false,
      formatter: function () {
           return '<b>' + this.series.name + '</b><br/>' +
             field_one + ": " + helpers.number_format(this.x) + ' <br/>' +
             field_two + ": " + helpers.number_format(this.y) + '<br/>' +
             '<br /> (click for full sample details)';
         }
       },

      plotOptions: {
        series: {
          fillOpacity: 0.1,
          marker: {
            enabled: true,
          },
        }
      },
      yAxis: {
        min: min_y,
        max: max_y,
        title: {
          text: presenter.get_field_name(this.table, field_two)
        }
      },

      series: series
    };

    var $el = this.$el;
    $C(self.graph_component, {skip_client_init: true}, function(cmp) {
        // There's a little setup cost to highcharts, maybe?
      $el.append(cmp.$el);
      cmp.client(options);
    });

  }
}, {
  icon: "noun/pin.svg"
});

function build_custom_controls() {
  var custom_controls = $("<div class='clearfix'/>");

  var custom_params = SF.controller().get_custom_params();

  $C("selector", {
    name: "reverse_axis",
    options: {
      "none" : "Normal",
      "reverse_y" : "Reverse Y Axis",
      "reverse_x" : "Reverse X Axis",
      "reverse_b" : "Reverse Both Axes"
    },
    selected: custom_params.reverse_axis,
  }, function(selector) {
    $C("query_control_row", {
      label: "Reverse Axis?",
      component: selector.toString()
    }, function(cmp) {
      custom_controls.append("<div />");
      custom_controls.append(cmp.$el);

    });
  });


  return custom_controls;

}
module.exports = ScatterView;
