"use strict";

function generate_series(number, low, high) {
  var ser = [], i;

  for (i = 0; i < number; i++ ) {
    ser.push(Math.random() * (high - low) + low);
  }

  return ser;
}

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

    Highcharts.setOptions({global: { useUTC: false }});
    var chart = new Highcharts.Chart(chart_options);
  }
};
