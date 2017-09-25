"use strict";
var helpers = require("app/client/views/helpers");
var time_helper = require("app/client/views/time_helper");
var presenter = require("app/client/views/presenter");


var BaseView = require("app/client/views/base_view");
var TimeView = BaseView.extend({
  baseview: helpers.VIEWS.TIME,
  prepare: function(data) {

    var dataset = this.table;
    var is_compare = this.compare_query === data;
    this.max_x = data.parsed.end_ms;
    var fill_missing = this.fill_missing;
    var custom_params = data.parsed.custom || {};

    var series = time_helper.prepare(data, {
      dataset: dataset,
      is_compare: is_compare,
      helpers: helpers,
      presenter: presenter,
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

    this.data = data;

  },

  getChartOptions: function() {
    var _hovered;

    var options = {
      chart: {
        zoomType: "x",
        type: this.chart_type || 'time'
      },
      legend: {enabled: true},
      tooltip: {
        useHTML: true,
        formatter: function() {
          var el = $("<div><b>" + Highcharts.dateFormat('%a %d %b %H:%M:%S', this.x) + "</b></div>");
          _.each(this.points, function(point) {
            var ptDiv = $("<div class='clearfix'>");
            ptDiv.css("min-width", "400px");

            var name = point.series.name;
            if (point.point.compare) {
              name += " (compare)";
            }
            ptDiv.append(
              $("<span />")
                .css("color", helpers.get_color(time_helper.labels[point.series.name]))
                .html(name));

            if (point.series.name === _hovered) {
              ptDiv.css("font-weight", "bold");
            }

            ptDiv.append(":");
            var valDiv = $("<div class='mlm rfloat' />")
                          .html(helpers.number_format(point.y));
            ptDiv.append(valDiv);

            el.append(ptDiv);


            var samples = point.point.samples;
            if (samples) {
              var sampleDiv = $("<div class='mlm' />").html("(" + samples + "samples)");
              sampleDiv.css("display", "inline-block");
              valDiv.append(sampleDiv);

            }
          });

          return el.html();
        }
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

    options.series = data;

    function getValue(item, key) {
      return $(item).find(key).text();
    }

    function doRSSFeed(cb) {

      window.SF.socket().emit("load_annotations", table, function(annotations) {
        var feed = annotations.rss;
        var items = [];
        if (feed) {
          var parsedFeed = $.parseXML(feed);

          $(parsedFeed).find("item").each(function() {
            var timeStamp = new Date(getValue(this, 'pubDate'));
            var item = {
              title: getValue(this, 'title'),
              link: getValue(this, 'link'),
              description: getValue(this, 'description'),
              time: +timeStamp,
              timestamp: getValue(this, 'pubDate')
            };

            items.push(item);
          });
        }

        if (annotations.items) {
          items = items.concat(annotations.items);
        }

        cb(items);
      });
    }

    function doDrawGraph() {
      $C(self.graph_component, {skip_client_init: true}, function(cmp) {
        // get rid of query contents...
        $el
          .append(cmp.$el)
          .show();

        var annotations = $("<div class='annotations' />");
        annotations.css({
          height: "200px"
        });

        $el.append(annotations);

        // There's a little setup cost to highcharts, maybe?
        cmp.client(options);
      });
    }

    doRSSFeed(function(items) {
      if (items && items.length) {
        if (!options.yAxis) {
          options.yAxis = {};
        }

        if (!options.xAxis.plotLines) {
          options.xAxis.plotLines = [];
        }

        _.each(items, function(item) {
          options.xAxis.plotLines.push({
            color: "rgba(240, 240, 240, 80)",
            value: item.time,
            width: "10",
            events: {
              mouseover: function() {

                var details = $("<div />");
                details.append($("<h2>").html(item.title));
                details.append($("<a>").html(item.timestamp).attr("href", item.link));
                details.append($("<p class='mtl'>").html(item.description));

                $el.find(".annotations").html(details);
              }
            }
          });
        });
      }

      doDrawGraph();
    });

  }
}, {
  icon: "noun/line.svg"
});

function build_custom_controls() {
  var custom_controls = $("<div class='clearfix'/>");

  var custom_params = SF.controller().get_custom_params();

  $C("selector", {
    name: "fill_missing",
    options: {
      "zero" : "Treat as Zero",
      "" : "Ignore"
    },
    selected: custom_params.fill_missing,
  }, function(selector) {
    $C("query_control_row", {
      label: "Missing Data",
      component: selector.toString()
    }, function(cmp) {
      custom_controls.append("<div />");
      custom_controls.append(cmp.$el);

    });
  });

  return custom_controls;
}

TimeView.prototype.build_custom_controls = build_custom_controls;

SF.trigger("view:add", "time",  {
    custom_controls: build_custom_controls,
    include: helpers.STD_INPUTS
      .concat(helpers.inputs.TIME_BUCKET)
      .concat(helpers.inputs.COMPARE)
      .concat(helpers.inputs.SORT_BY),
    icon: "noun/line.svg"
}, TimeView);

module.exports = TimeView;
