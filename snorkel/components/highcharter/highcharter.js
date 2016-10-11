"use strict";

module.exports = {
  tagName: "div",
  className: "",
  defaults: {
  },

  // requires highcharts on the page (which is part of this package)
  client: function(options) {
    var chart_options = {
       plotOptions: {
        series: {
          animation: false,
          turboThreshold: 2000,
          marker: { enabled: false }
          }
        },
        chart: {
          renderTo: this.el,
          //alignTicks: false,
          type: 'line'
        },
        xAxis: {
          type: (options.xAxis && options.xAxis.type) || 'datetime'
        },
        yAxis: {
          gridLineWidth: 0,
          min: 0,
          title: {
            text: null
          }
        },
        legend: {
          enabled: false
        },
        tooltip: {
          shared: true,
          crosshairs: {
            color: "#999",
            dashStyle: "solid"
          }
        },
        title: {
          text: null
        }
    };

    // deep merge.
    $.extend(true, chart_options, options);

    // translate certain chart types!
    var CHART_TRANSLATION = {
      'bar' : 'column',
      'time' : 'line',
      'time_scatter' : 'scatter'
    };

    var tr_type = CHART_TRANSLATION[chart_options.chart.type];
    if (tr_type) {
      chart_options.chart.type = tr_type;
    }

    Highcharts.setOptions({global: { useUTC: false }});
    var chart = new Highcharts.Chart(chart_options);
  }
};
