"use strict";

var helpers = require("app/client/views/helpers");
var TimeView = require("app/client/views/time_view");


var AutoCorrelationView = TimeView.extend({
  baseview: helpers.VIEWS.TIME,
  initialize: function() {
    this.chart_type = 'scatter';
  },

  getChartOptions: function() {
    var options = TimeView.prototype.getChartOptions.apply(this);
    var my_options = {
      chart: {
        type: 'scatter',
        zoomType: 'xy',
      },
      tooltip: {
        enabled: false
      },
      xAxis: {
        type: "linear"
      },
      yAxis: {
        min: -1,
        max: 1
      },
      legend: {
        enabled: false
      },
      plotOptions: {
        enableMouseTracking: true,
        series: {
          marker: {
            enabled: true
          }
        }
      }
    };
    $.extend(true, options, my_options);

    return options;
  },

  finalize: function() {
    var series = this.data;
    var dom_query = SF.controller().get_query_from_dom();
    console.log("DOM QUERY", dom_query);
    var regress = false;
    _.each(dom_query.data, function(q) {
      if (q.name === "regression" && q.value === "true") {
        regress = true;
      }
    });

    var avgs = {};
    var covars = {};
    _.each(series, function(serie) {
      var sum = 0;
      covars[serie.name] = [];
      
      _.each(serie.data, function(pt) {
        sum += pt.y;
      });

      avgs[serie.name] = sum / serie.data.length;

      var sumvar = 0;
      _.each(serie.data, function(pt) {
        sumvar += Math.pow((pt.y - avgs[serie.name]), 2) / serie.data.length;
      });

      covars[serie.name].push(sumvar);

      serie.data.sort(function(a, b) {
        return a.x - b.x;
      });
    });

    // Calculate auto-co-variance of this line
    _.each(series, function(serie) {
      for (var h = 1; h < 50; h++) {
        var sumvar = 0;
        for (var i = 0; i < serie.data.length - h; i++) {
          sumvar += (serie.data[i].y - avgs[serie.name]) * (serie.data[i+h].y - avgs[serie.name]);
        }

        sumvar /= serie.data.length;
        covars[serie.name].push([h, sumvar / covars[serie.name][0]]);
      }

      serie.data = covars[serie.name];

      // remove that initial covariance number
      serie.data.shift();

    });

    TimeView.prototype.finalize.apply(this);

  }

});

function build_custom_controls() {
  var custom_controls = $("<div />");

  $C("selector", { 
    name: "regression",
    options: {
      "false" : "Hide",
      "true" : "Show"
    }
  }, function(selector) {
    $C("query_control_row", {
      name: "regression",
      label: "Regression Lines?",
      component: selector.toString()
    }, function(cmp) {
      custom_controls.append(cmp.$el);
    });
  });

  return custom_controls;
}

SF.trigger("view:add", "autocorr",  {
  include: helpers.STD_INPUTS
    .concat(helpers.inputs.TIME_BUCKET)
    .concat(helpers.inputs.TIME_FIELD),
  icon: "noun/line.svg",
  custom_controls: build_custom_controls
}, AutoCorrelationView);

module.exports = AutoCorrelationView;
