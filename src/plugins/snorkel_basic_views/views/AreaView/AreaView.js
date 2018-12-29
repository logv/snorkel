"use strict";

var helpers = require("common/sf_helpers.js");
var TimeView = require("TimeView/TimeView");
var sf_shim = require("common/sf_shim.js");

var AreaView = _.extend({}, TimeView, {
  initialize: function(ctx) {
    this.chart_type = 'area';
    sf_shim.prepare_and_render(this, ctx);
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
    TimeView.finalize.call(this, arguments)
  },

  getChartOptions: function() {
    var options = TimeView.getChartOptions.apply(this);
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


console.log("AREA VIEW IS", AreaView);
module.exports = AreaView;
