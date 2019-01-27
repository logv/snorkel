var hw_forecast = require("./exp_smoothing_helper.js");
var sf_shim = require("snorkel$common/sf_shim.js");
var helpers = require("snorkel$common/sf_helpers.js");
var TimeView = require("timeview$TimeView/TimeView");

var HWView = _.extend({}, TimeView, {
  initialize: function(ctx) {
    sf_shim.prepare_and_render(this, ctx);

  },
  prepare: function(query) {
    var data = TimeView.prepare(query);
    var ret = this.add_predictions(query, data);
    return data.concat(ret);
  },
  getChartOptions: function() {
    var options = TimeView.getChartOptions();
    var my_options = {};
    console.log("QUERY PARAMS", this.query, this.query.parsed);

    var custom_params = this.query.parsed || {};
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
    var custom_params = query.parsed || {};
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

module.exports = HWView;
