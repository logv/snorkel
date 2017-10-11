"use strict";

var helpers = require("app/client/views/helpers");
var TimeView = require("app/client/views/time_view");

var AreaView = TimeView.extend({
  initialize: function() {
    this.chart_type = 'area';
  },

  finalize: function() {
    var total = {};
    var field_name;
    var fields = {};
    _.each(this.data, function(series) {
      field_name = series.field_name || field_name;
      var field_total = total[field_name] || {};
      total[field_name] = field_total;

      _.each(series.data, function(pt) {
        var tpt = field_total[pt.x] || { y: 0, x: pt.x, samples: 0};
        tpt.y += pt.y;
        tpt.samples += pt.samples || 0;
        field_total[pt.x] = tpt;
      });
      fields[field_name] = field_name;
    });

    var self = this;
    _.each(fields, function(field) {
      var sorted_vals = _.sortBy(_.values(total[field]), function(pt) {
        return pt.x;
      });

      self.data.push({ data: sorted_vals, name: "Total", color: "#333", field_name: field, group_name: "Total"});

    });
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
  custom_controls: TimeView.prototype.build_custom_controls,
  include: helpers.STD_INPUTS
    .concat(helpers.inputs.TIME_BUCKET)
    .concat(helpers.inputs.TIME_FIELD),
  icon: "noun/line.svg"
}, AreaView);

module.exports = AreaView;
