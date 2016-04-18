
"use strict";

var helpers = require("app/client/views/helpers");
var TimeView = require("app/client/views/time_view");


// Data is an array of { x: , y: } values
// formula for slope (m) is:
//
// N * sum(xy) - sum(x)*sum(y)
// --------------------------
// n * sum(x^2) - sum(x)^2
//
//
// formula for intersect:
//
// (sum(y) - m*sum(x)) / n
//
function best_fit_line(data) {

  var n = data.length;

  if (!data || n === 0) {
    return;
  }

  var sumx = 0;
  var sumy = 0;
  var sumxy = 0;
  var sumxx = 0;
  var minx = data[0].x;
  var maxx = data[0].x;


  _.each(data, function(pt) {
    if (!pt) {
      return;
    }

    var x = pt.x || 0;
    var y = pt.y || 0;


    sumx += x;
    sumy += y;
    sumxy += x*y;
    sumxx += x*x;

    minx = Math.min(minx, x);
    maxx = Math.max(maxx, x);

  });

  var m = (n * sumxy) - (sumx * sumy);
  m = m / ((n * sumxx) - (sumx * sumx));


  var b = (sumy - m*sumx) / n;

  var miny = minx * m + b;
  var maxy = maxx * m + b;

  if (_.isNaN(miny) || _.isNaN(maxy)) {
    return;
  }

  // y = mx + b;
  return {
    m: m,
    b: b,
    minx: minx,
    maxx: maxx,
    miny: miny,
    maxy: maxy
  };
}

var LagView = TimeView.extend({
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
      xAxis: {
        type: "linear"
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

    var lines = [];
    _.each(series, function(serie) {
      serie.data.sort(function(a, b) {
        return a.x - b.x;
      });
  
      var prev;
      _.each(serie.data, function(pt, key) {
        var clone = _.clone(pt);
        if (prev) {
          if (pt.y) {
            pt.x = prev.y;
          }
        } else {
          pt.x = pt.y;
        }

        prev = clone;
      });

      if (regress) {
        var fit = best_fit_line(serie.data);
        if (!fit) {
          return;
        }


        var line_graph = {
          type: 'line',
          name: serie.name + ' regr.',
          data: [[fit.minx, fit.miny], [fit.maxx, fit.maxy]],
          color: serie.color,
          marker: {
            enabled: false
          },
          enableMouseTracking: false

        };

        lines.push(line_graph);
      }

      // Need to add a line to the scatter plot for this series, too, then...

    });

    this.data = this.data.concat(lines);
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

SF.trigger("view:add", "lag",  {
  include: helpers.STD_INPUTS
    .concat(helpers.inputs.TIME_BUCKET)
    .concat(helpers.inputs.TIME_FIELD),
  icon: "noun/line.svg",
  custom_controls: build_custom_controls
}, LagView);

module.exports = LagView;
