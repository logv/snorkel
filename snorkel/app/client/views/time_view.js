"use strict";


var _labels = {};
var helpers = require("app/client/views/helpers");
var presenter = require("app/client/views/presenter");

var BaseView = require("app/client/views/base_view");
var TimeView = BaseView.extend({
  prepare: function(data) {

    var dataset = this.table;
    var series = {};
    var is_compare = this.compare_query === data;

    // For each column, need to record a series
    var group_by = data.parsed.dims;
    group_by.sort();
    _.each(data.results, function(result) {
      var label = "";

      _.each(result, function(value, field) {
        if (field === "_id") { return; }

        if (data.parsed.agg === "$count") {
          if (field !== "count") { return; }
        } else {
          if (field === "count") { return; }
          if (field === "weighted_count") {
            return;
          }
        }


        var dims = _.map(group_by, function(g) {
          return result._id[g];
        });

        var group_label = dims.join(",");
        var field_label = group_label + " " + presenter.get_field_name(dataset, field);
        var full_label = field_label;

        _labels[full_label] = group_label || full_label;

        if (!series[field_label]) {
          series[field_label] = {
            data: [],
            name: full_label,
            color: helpers.get_color(group_label || full_label)
          };
        }


        // denormalize the time bucket into ms for highcharts benefit
        var pt = {
          x: result._id.time_bucket * 1000,
          y: parseInt(value, 10),
          samples: result.count,
          compare: is_compare
        };

        series[field_label].data.push(pt);
      });
    });

    _.each(series, function(serie) {
      serie.data.sort(function(a, b) {
        return a.x - b.x;
      });
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
          pt.x = pt.x - query.parsed.compare_delta;
        });
        series.dashStyle = "LongDash";
      });
    }

    var data = this.data.concat(this.compare_data || []);

    if (!data.length) {
      return "No samples";
    }

  },

  getChartOptions: function() {
    var _hovered;

    var options = {
      chart: {
        zoomType: "x",
        type: this.chart_type || 'line'
      },
      tooltip: {
        useHTML: true,
        formatter: function() {
          var s = "";
          var now = this.x;
          var el = $("<div><b>" + Highcharts.dateFormat('%a %d %b %H:%M:%S', this.x) + "</b></div>");

          _.each(this.points, function(point) {
            var ptDiv = $("<div>");

            var name = point.series.name;
            if (point.point.compare) {
              name += " (compare)";
            }
            ptDiv.append(
              $("<span />")
                .css("color", helpers.get_color(_labels[point.series.name]))
                .html(name));

            if (point.series.name === _hovered) {
              ptDiv.css("font-weight", "bold");
            }

            ptDiv.append(":");
            var valDiv = $("<div class='pull-right mlm' />")
                          .html(helpers.number_format(point.y));
            ptDiv.append(valDiv);

            el.append(ptDiv);


            var samples = point.point.samples;
            if (samples) {
              valDiv.append($("<div class='mlm pull-right' />").html("(" + samples + "samples)"));
            }
          });

          return el.html();
        }
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
    var data = this.data.concat(this.compare_data || []);

    var options = this.getChartOptions();
    var $el = this.$el;
    var table = this.table;

    options.series = data;

    function getValue(item, key) {
      return $(item).find(key).text();
    }

    function doRSSFeed(cb) {

      window.jank.socket().emit("load_annotations", table, function(annotations) {
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
      $C("highcharter", {skip_client_init: true}, function(cmp) {
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
          options.xAxis = {};
        }

        console.log(items);

        options.xAxis.plotLines = [];
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

jank.trigger("view:add", "time",  {
    include: helpers.STD_INPUTS
      .concat(helpers.inputs.TIME_BUCKET)
      .concat(helpers.inputs.COMPARE)
      .concat(helpers.inputs.SORT_BY),
    icon: "noun/line.svg"
}, TimeView);

module.exports = TimeView;
