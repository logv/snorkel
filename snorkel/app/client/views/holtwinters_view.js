
"use strict";

var helpers = require("app/client/views/helpers");
var TimeView = require("app/client/views/time_view");

var hw_forecast = require("app/client/views/exp_smoothing_helper");

var HWView = TimeView.extend({
  prepare: function(query) {
    var data = TimeView.prototype.prepare(query);
    var ret = this.add_predictions(query, data);
    return data.concat(ret);
  },
  getChartOptions: function() {
    var options = TimeView.prototype.getChartOptions();
    var my_options = {};

    var custom_params = this.query.parsed.custom || {};
    var add_components = custom_params.componentize;
    if (add_components) {
      my_options.yAxis = [
        {title: { text: "" }, height: "50%"},
        {title: { text: "" }, height: "10%", top: "60%", offset: 0, labels: { enabled: false }},
        {title: { text: "" }, height: "10%", top: "70%", offset: 0, labels: { enabled: false }},
        {title: { text: "" }, height: "10%", top: "80%", offset: 0, labels: { enabled: false }},
        {title: { text: "" }, height: "10%", top: "90%", offset: 0, labels: { enabled: false }}
      ];
    } else {
      my_options.yAxis = [
        {title: { text: "" } },
      ];

    }

    $.extend(true, options, my_options);
    options.xAxis.max = null;
    return options;
  },
  add_predictions: function(query, data) {
    var forecast_range = 2; // assuming we are using days
    var serie = data[0]; // can only predict one time series at a time, actually
    var custom_params = query.parsed.custom || {};
    var add_components = custom_params.componentize;
    var hw = hw_forecast.make_model(query, serie);
    console.log("HW IS", hw);
    var ret = [];

    var result = _.map(hw.model.Y,
      function(__, t) { return { y: hw.model.F[t]||0, x: serie.data[t].x }; });
    // take the last element off...
    result.pop();

    // Predict the next N points
    for (var m = 1; m <= hw.model.season_size[0]*forecast_range; m++ ) {
      var pt = hw.make_forecast(m);
      result.push(pt);
    }

    var new_serie = _.clone(serie);
    var serie_name = "";
    new_serie.yAxis = 0;
    new_serie.data = result;
    new_serie.name = serie_name + " prediction";
    new_serie.linwWidth = 0.1;
    new_serie.color = helpers.get_rgba(serie.name, "0.3");
    ret.push(new_serie);

    if (add_components) {
      var level_pts = _.map(hw.model.S,
        function(level, t) { return { y: level||0, x: serie.data[t].x }; });
      new_serie = _.clone(new_serie);
      new_serie.yAxis = 1;
      new_serie.data = level_pts;
      new_serie.name = serie_name + " level";
      new_serie.color = "rgba(128, 128, 0, 0.5)";
      ret.push(new_serie);

      var trend_pts = _.map(hw.model.B,
        function(trend, t) { return { y: trend||0, x: serie.data[t].x }; });
      new_serie = _.clone(new_serie);
      new_serie.yAxis = 2;
      new_serie.data = trend_pts;
      new_serie.name = serie_name + " trend";
      new_serie.color = "rgba(0, 128, 128, 0.5)";
      ret.push(new_serie);

      var season_pts = _.map(hw.model.I[0].slice(0, serie.data.length),
        function(season, t) { return { y: season||0, x: serie.data[t].x }; });
      new_serie = _.clone(new_serie);
      new_serie.yAxis = 3;
      new_serie.data = season_pts;
      new_serie.name = serie_name + " daily cycle";
      new_serie.color = "rgba(128, 0, 128, 0.5)";
      ret.push(new_serie);

      var season_pts_2 = _.map(hw.model.I[1].slice(0, serie.data.length),
        function(season, t) { return { y: season||0, x: serie.data[t].x }; });
      new_serie = _.clone(new_serie);
      new_serie.yAxis = 4;
      new_serie.data = season_pts_2;
      new_serie.name = serie_name + " weekly cycle";
      new_serie.color = "rgba(128, 0, 0, 0.5)";
      ret.push(new_serie);
    }


    return ret;
  }

});

function build_custom_controls() {
  var custom_controls = $("<div class='clearfix'/>");

  var custom_params = SF.controller().get_custom_params();
  var model_type = custom_params.model_type;

  $C("selector", {
    name: "model_type",
    options: {
      "additive" : "additive",
      "multiplicative" : "multiplicative"
    },
    selected: model_type,
  }, function(selector) {
    $C("query_control_row", {
      label: "Model Type",
      component: selector.toString()
    }, function(cmp) {
      custom_controls.append("<div />");
      custom_controls.append(cmp.$el);

    });
  });

  $C("selector", {
    name: "iter_mode",
    options: {
      "fast" : "fast",
      "slow" : "thorough"
    },
    selected: custom_params.iter_mode,
  }, function(selector) {
    $C("query_control_row", {
      label: "Exploration",
      component: selector.toString()
    }, function(cmp) {
      custom_controls.append("<div />");
      custom_controls.append(cmp.$el);

    });
  });

  $C("selector", {
    name: "componentize",
    options: {
      "" : "hide",
      "componentize" : "show"
    },
    selected: custom_params.componentize,
  }, function(selector) {
    $C("query_control_row", {
      label: "Components",
      component: selector.toString()
    }, function(cmp) {
      custom_controls.append("<div />");
      custom_controls.append(cmp.$el);

    });
  });


  return custom_controls;
}



var excludes = helpers.inputs.GROUP_BY.concat(helpers.inputs.LIMIT);

SF.trigger("view:add", "holtwinters",  {
  custom_controls: build_custom_controls,
  include: _.difference(helpers.STD_INPUTS
    .concat(helpers.inputs.TIME_BUCKET)
    .concat(helpers.inputs.TIME_FIELD), excludes),
  icon: "noun/line.svg"
}, HWView);

module.exports = HWView;
