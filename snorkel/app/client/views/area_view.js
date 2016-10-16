"use strict";

var helpers = require("app/client/views/helpers");
var TimeView = require("app/client/views/time_view");

var AreaView = TimeView.extend({
  initialize: function() {
    this.chart_type = 'area';
  },

  finalize: function() {
    var total = {};
    _.each(this.data, function(series) {
      _.each(series.data, function(pt) {
        var tpt = total[pt.x] || { y: 0, x: pt.x, samples: 0};
        tpt.y += pt.y;
        tpt.samples += pt.samples || 0;
        total[pt.x] = tpt;
      });
    });

    var sorted_vals = _.sortBy(_.values(total), function(pt) {
      return pt.x;
    });

    this.data.push({ data: sorted_vals, name: "Total", color: "#333"});
    TimeView.prototype.finalize.call(this, arguments)
  },

  getChartOptions: function() {
    var options = TimeView.prototype.getChartOptions.apply(this);
    var my_options = {
      chart: {
        type: 'time'
      },
      plotOptions: {
        area: {
          stacking: "normal"
        }
      }
    };
    $.extend(true, options, my_options);

    return options;
  }
});


SF.trigger("view:add", "area",  {
  include: helpers.STD_INPUTS
    .concat(helpers.inputs.TIME_BUCKET)
    .concat(helpers.inputs.TIME_FIELD),
  icon: "noun/line.svg"
}, AreaView);

module.exports = AreaView;
