var time_helper = require("common/time_helper.js");
var helpers = require("common/sf_helpers.js");
var sf_shim = require("common/sf_shim.js");
var sf_marshal = require("common/marshal.js");


var presenter = {};

var TimeView = {
  initialize: function(ctx) {
    sf_shim.prepare_and_render(this, ctx);

  },
  prepare: function(data) {
    data.results = sf_marshal.marshall_time_rows({ opts: data.parsed}, data.results);
    data.parsed = data.parsed || {};

    var dataset = this.table;
    var is_compare = this.compare_query === data;
    this.max_x = data.end_ms || "";
    var fill_missing = "zero";

    var custom_params = {};
    try {
      var custom_params = this.query.query;
    } catch(e) { }

    var series = time_helper.prepare(data, {
      dataset: dataset,
      helpers: helpers,
      is_compare: is_compare,
      fill_missing: custom_params.fill_missing || fill_missing
    });

    // map the series into an array instead of a dictionary
    return _.map(series, function(s) {
      return s;
    });
  },

  finalize: function() {
    var query = this.query;
    if (this.compare_data) {
      _.each(this.compare_data, function(series) {
        var new_data = [];
        _.each(series.data, function(pt) {
          if (query.parsed.compare_delta) {
            pt.x = pt.x - query.parsed.compare_delta;

          }
        });
        series.dashStyle = "LongDash";
      });
    }

    var data = this.data.concat(this.compare_data || []);

    if (!data.length) {
      return "No samples";
    }

    console.log("CONCATED DATA", data);

    this.data = data;

  },

  getChartOptions: function() {
    var _hovered;

    var options = {
      chart: {
        zoomType: "x",
        type: this.chart_type || 'time'
      },
      helpers: helpers,
      legend: {enabled: true},
      tooltip: {
        useHTML: true,
        hideDelay: 0,
      },
      xAxis: {
        max: this.max_x
      },
      plotOptions: {
        series: {
          point: {
              events: {
                  mouseOver: function (evt) {
                      _hovered = this.series.name;
                      var chart = this.series.chart;
                      chart.tooltip.refresh(chart.hoverPoints);
                  }
              }
          }
        }
      }

    };

    return options;

  },
  // TODO: figure out rendering strategy. For now, we hold the graph until both
  // are ready
  render: function() {
    // render with this.series
    var data = this.data;

    var options = this.getChartOptions();
    var $el = this.$el;
    var table = this.table;
    var self = this;

    var custom_params = this.query.query;

    options.series = data;

    function getValue(item, key) {
      return $(item).find(key).text();
    }

    function doDrawGraph() {
      var grouped_series = { "" : self.data};

      if (custom_params.separate_series == "agg") {
        grouped_series = _.groupBy(self.data, function(s) {
          return s.field_name;
        });
      }

      if (custom_params.separate_series == "group") {
        grouped_series = _.groupBy(self.data, function(s) {
          return s.group_name;
        });
      }


      _.each(grouped_series, function(series_data, series_name) {
        $C("nvd3", {skip_client_init: true}, function(cmp) {
          // get rid of query contents...
          $el
            .append("<h1>" + series_name + "</h1>")
            .append(cmp.$el)
            .show();

          var series_options = _.clone(options);
          series_options.series = series_data;

          var annotations = $("<div class='annotations' />");
          annotations.css({
            height: "200px"
          });

          $el.append(annotations);

          // There's a little setup cost to highcharts, maybe?
          cmp.client(series_options);
        });

      });


    }

    doDrawGraph();

  }
}

module.exports = TimeView;
