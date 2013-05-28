"use strict";

var helpers = require("client/views/helpers");
var TimeView = require("client/views/time_view");

var AreaView = TimeView.extend({
  initialize: function() {
    this.chart_type = 'area';
  },

  getChartOptions: function() {
    var options = TimeView.prototype.getChartOptions.apply(this);
    var my_options = {
      chart: {
        type: 'area'
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


jank.trigger("view:add", "area",  {
  include: helpers.STD_INPUTS.concat(["time_bucket"]),
  exclude: ["field", "hist_bucket", "compare", "stacking", "sort_by", "max_results", "field_two"],
  icon: "noun/line.svg"
}, AreaView);

module.exports = AreaView;
