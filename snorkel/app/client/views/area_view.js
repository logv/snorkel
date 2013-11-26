"use strict";

var helpers = require("app/client/views/helpers");
var TimeView = require("app/client/views/time_view");

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


SF.trigger("view:add", "area",  {
  include: helpers.STD_INPUTS
    .concat(helpers.inputs.TIME_BUCKET)
    .concat(helpers.inputs.TIME_FIELD),
  icon: "noun/line.svg"
}, AreaView);

module.exports = AreaView;
