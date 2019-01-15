var d3 = require("./d3.v3.js");
window.d3 = d3;

var nvd3 = require("./nv.d3.js");
var nvd3Css = require("./nv.d3.css");

// Format function for the tooltip values column.
function makeGenerator(tooltip) {
  return function tooltipGenerator(d) {
      if (d === null) {
          return '';
      }

      var table = d3.select(document.createElement("table"));
      var theadEnter = table.selectAll("thead")
          .data([d])
          .enter().append("thead");

      theadEnter.append("tr")
          .append("td")
          .attr("colspan", 3)
          .append("strong")
          .classed("x-value", true)
          .html(tooltip.headerFormatter()(d.value));

      var tbodyEnter = table.selectAll("tbody")
          .data([d])
          .enter().append("tbody");

      var trowEnter = tbodyEnter.selectAll("tr")
              .data(function(p) { return p.series})
              .enter()
              .append("tr")
              .classed("highlight", function(p) { return p.highlight});

      trowEnter.append("td")
          .classed("legend-color-guide",true)
          .append("div")
          .style("background-color", function(p) { return p.color});

      trowEnter.append("td")
          .classed("key",true)
          .classed("total",function(p) { return !!p.total})
          .html(function(p, i) { return tooltip.keyFormatter()(p.key, i)});

      trowEnter.append("td")
          .classed("value",true)
          .html(function(p,i) {
           if (d.series.length > 15 && d.value !== p.data.x) {this.parentNode.style.display = "none";}
           return tooltip.valueFormatter()(p.value,i,p)
        });

      trowEnter.filter(function (p,i) { return p.percent !== undefined }).append("td")
          .classed("percent", true)
          .html(function(p, i) { return "(" + d3.format('%')(p.percent) + ")" });

      trowEnter.selectAll("td").each(function(p) {
          if (p.highlight) {
              var opacityScale = d3.scale.linear().domain([0,1]).range(["#fff",p.color]);
              var opacity = 0.6;
              d3.select(this)
                  .style("border-bottom-color", opacityScale(opacity))
                  .style("border-top-color", opacityScale(opacity))
              ;
          }
      });

      var html = table.node().outerHTML;
      if (d.footer !== undefined)
          html += "<div class='footer'>" + d.footer + "</div>";
      return html;

  };
}


function drawYLine(chart, svg, line) {
  var yScale = chart.yAxis.scale();
  var yValue = line.value;
  var margin = chart.margin();
  var width = $(chart.container).width();
  var height = $(chart.container).height();

  d3.select(svg).append("text")
    .attr("x", width - margin.right)
    .attr("y", margin.top + yScale(yValue))
    .classed("plotline_text", true)
    .attr("style", "font-size: 10px")
    .text(function(d) { return line.label.text});

  d3.select(svg).append("line")
      .style("stroke", line.color)
      .style("stroke-width", line.width || "2.5px")
      .classed("plotline", true)
      .on("mouseover", line.events && line.events.mouseover)
      .attr("x1", margin.left)
      .attr("y1", margin.top + yScale(yValue))
      .attr("x2", margin.left + width - margin.right)
      .attr("y2", margin.top + yScale(yValue))
      .append("text")
        .text(function(d) { return line.label&& line.label.text});



}

function drawXLine(chart, svg, line) {
  var xScale = chart.xAxis.scale();
  var xValue = line.value;
  var margin = chart.margin();
  var width = $(chart.container).width();
  var height = $(chart.container).height();

  d3.select(svg).append("text")
    .attr("x", margin.left + xScale(xValue) + 5)
    .attr("y", margin.top + 10)
    .classed("plotline_text", true)
    .attr("style", "writing-mode: tb; font-size: 10px")
    .text(function(d) { return line.label && line.label.text});

  d3.select(svg).append("line")
      .style("stroke", line.color)
      .style("stroke-width", line.width || "2.5px")
      .classed("plotline", true)
      .on("mouseover", line.events && line.events.mouseover)
      .attr("x1", margin.left + xScale(xValue))
      .attr("y1", margin.top)
      .attr("x2", margin.left + xScale(xValue))
      .attr("y2", margin.top + height - margin.bottom - 100)
      .append("text")
        .text(function(d) { return line.label && line.label.text});




}

function formatWithSampleCount(d, i, p) {
  if (p) {
    var samples = p.samples;
    if (p.data && p.data.samples) {
      samples = p.data.samples;
    }
    if (p.point && p.point.samples) {
      samples = p.point.samples;
    }

    if (_.isUndefined(samples)) {
      return parseInt(d) + " (no samples)";
    }

    return "<b>" + d + "</b>" + " <i class='light'>(" + samples + " samples)</i>";
  }

  return d;
}
module.exports = {
  tagName: "div",
  className: "",
  defaults: {
    content: "default content"
  },
  client: function(highcharts_options) {
    if (!highcharts_options) {
      return
    }

    var self = this;

    // NOTE: we are editing whole body class because we need tooltip CSS
    // applied
    $("html").addClass(nvd3Css.className);

    var chartType = highcharts_options.chart.type;
    var legend = true;
    if (!_.isUndefined(highcharts_options.legend)) {
      legend = highcharts_options.legend.enabled;
    }

    var show_x = true, show_y = true;
    var skip_zero_values = false;

    var plot_options = highcharts_options.plotOptions || {};

    if (highcharts_options.yAxis) {
      var show_y_axis = highcharts_options.yAxis.enabled;
      if (!_.isUndefined(show_y_axis)) {
        show_y = show_y_axis
      } else {
        if (highcharts_options.yAxis.labels) {
          show_y_axis = highcharts_options.yAxis.labels.enabled;
        }

        if (!_.isUndefined(show_y_axis)) {
          show_y = show_y_axis;
        }
      }
    }

    _.each(highcharts_options.series, function(s)  {
      s.values = s.data;
      if (!s.key) {
        s.key = s.name;
      }

      // customizations for display!
      s.strokeWidth = 2;
      if (s.dashStyle) {
        s.key += " (compare)";
        s.classed = 'dashed';
      }

      delete s.data;


      if (chartType == 'bar' || chartType == 'column') {
        var categories = highcharts_options.xAxis.categories;

        _.each(s.values, function(v,i) {
          v.series = i;
          v.x = categories[i];
        });

      }
    });

    var customTimeFormat = function(d) {
      return innerFormat(new Date(d));
    };

    var innerFormat = d3.time.format.multi([
      ["%I:%M", function(d) { return d.getMinutes(); }],
      ["%I %p", function(d) { return d.getHours(); }],
      ["%a %d", function(d) { return d.getDay() && d.getDate() != 1; }],
      ["%b %d", function(d) { return d.getDate() != 1; }],
      ["%B", function(d) { return d.getMonth(); }],
      ["%Y", function() { return true; }]
    ]);

    var lightFormat = d3.time.format.multi([
      ["%a %d %I:%M %p", function() { return true; }]
    ]);

    function bar_chart() {
      if (highcharts_options.series.length > 1) {
        return nv.models.multiBarChart()
          .reduceXTicks(true)
          .staggerLabels(true);
      }

      var show_labels = highcharts_options.series[0].length < 15;
      legend = false;
      return nv.models.discreteBarChart()
        .rotateLabels(70)
        .showXAxis(show_labels)

    }

    var svg = self.$el.find("svg")[0];
    // now we need to switch on chart types
    nv.addGraph(function() {
      var CHARTS = {
      'line' : function() {
        skip_zero_values = true;

        var chart;
        if (highcharts_options.chart.zoomType == 'x') {
          chart = nv.models.lineWithFocusChart()
            .useInteractiveGuideline(true)  //We want nice looking tooltips and a guideline!

          chart.dispatch.on("renderEnd", _.throttle(function() {
            drawPlotLines();
          }, 50));

        } else {
          chart = nv.models.lineChart();
        }



        chart.xAxis
          .showMaxMin(true)
          // .rotateLabels(-45) // Want longer labels? Try rotating them to fit easier.
          .ticks(10)
          .tickPadding(10);

        chart.x2Axis
          .showMaxMin(true);

        return chart;
      },
      'time' : function() {
        var chart = nv.models.lineWithFocusChart()
          .useInteractiveGuideline(true)  //We want nice looking tooltips and a guideline!
          .xScale(d3.time.scale());

        chart.dispatch.on("renderEnd", _.throttle(function() {
          drawPlotLines();
          drawFocusFilters();
        }, 50));


        chart.interactiveLayer.tooltip.valueFormatter(formatWithSampleCount);
        chart.interactiveLayer.tooltip.contentGenerator(
          makeGenerator(chart.interactiveLayer.tooltip));


        var tsFormat = d3.time.format('%b %-d, %Y %I:%M%p');
        chart.interactiveLayer.tooltip.headerFormatter(function (d) { return tsFormat(new Date(d)); });



        chart.xAxis
          .showMaxMin(false)
          // .rotateLabels(-45) // Want longer labels? Try rotating them to fit easier.
          .ticks(10)
          .tickFormat(customTimeFormat)
          .tickPadding(10);

        chart.x2Axis
          .showMaxMin(false)
          .ticks(10)
          .tickPadding(10)
          .tickFormat(customTimeFormat);

        drawFocusFilters();
        return chart;
      },
      'time_scatter' : function() {
        legend = false;
        var chart = nv.models.scatterChart()
          .interactiveUpdateDelay(0)
          .pointRange([100, 150])
          .color(function(d, i) {
            return d.color || d3.scale.category10()[(i||0) % 10] })
          .xScale(d3.time.scale())

        chart.scatter.dispatch.on("elementClick", function(e) {
          var details = "<pre class='sample_details'>" + JSON.stringify(e.point.result, null, 2) + "</pre>";
          $C("modal", {title: "Sample details", body: details}, function(modal) {
            modal.show();

            _.defer(function() {
              $("body").one("click", function(e) {
                if ($(e.target).parents(".modal").length == 0) {
                  modal.hide();
                }
              });
            });

          });
        });

        var tsFormat = d3.time.format('%b %-d, %Y %I:%M%p');
        chart.tooltip.contentGenerator(function (obj) {
          var header = $("<div />").append(tsFormat(new Date(obj.value)));

          var htmlEl = $("<div />");
          htmlEl.append(header);
          // TODO: fix to print the proper timestamp
          htmlEl.append("<b>" + obj.point.name + "</b>");
          return htmlEl.html();
        })

        chart.xAxis
          .tickFormat(customTimeFormat);
        chart.xAxis.ticks(5);
        chart.pointShape("triangle-down");

        return chart;

      },
      'scatter' : function() {
        legend = highcharts_options.legend.enabled;

        var chart = nv.models.scatterChart()
          .interactiveUpdateDelay(100)
          .duration(100)

        chart.pointShape("diamond")
          .pointRange([45, 50]);

        chart.scatter.dispatch.on("elementClick", function(e) {
          var details = "<pre class='sample_details'>" + JSON.stringify(e.point.result, null, 2) + "</pre>";
          $C("modal", {title: "Sample details", body: details}, function(modal) {
            modal.show();
          });
        });

        chart.xAxis.ticks(5);

        return chart;

      },
      'linearea' : function() {
        var chart = nv.models.stackedAreaChart()
          .useInteractiveGuideline(true);

          chart.xAxis
            .showMaxMin(false)
            // .rotateLabels(-45) // Want longer labels? Try rotating them to fit easier.
            .tickPadding(10);

        return chart;
      },
      'area' : function() {
        var chart = nv.models.stackedAreaChart()
          .xScale(d3.time.scale())
          .useInteractiveGuideline(true);

          chart.interactiveLayer.tooltip.valueFormatter(formatWithSampleCount)

          chart.xAxis
            .showMaxMin(false)
            // .rotateLabels(-45) // Want longer labels? Try rotating them to fit easier.
            .tickFormat(function(d) { return customTimeFormat(new Date(d)); })
            .tickPadding(10);

        return chart;
      },
      'bar' : bar_chart,
      'column' : bar_chart
      }
      chartCB = CHARTS[chartType] || CHARTS.line;

      var chart = chartCB();
      chart.duration(0);

      var MAX_LEGEND_ITEMS = 20;
      if (highcharts_options.series.length > MAX_LEGEND_ITEMS) {
        legend = false;
      }

      chart
        .showLegend(legend)       //Show the legend, allowing users to turn on/off line series.
        .x(function(d) {
          return d.x || d[0] || 0;
        })
        .y(function(d) {
          return d.y || d[1] || 0;
        })

      if (skip_zero_values) {
        chart
          .defined(function(d) {
            if ((d.y || d[1]) == 0) {
              return false;
            }

            return true;
          })
      }

      chart
        .showYAxis(show_y)        //Show the y-axis
        .showXAxis(show_x)        //Show the x-axis

      if (show_y) {
        chart.yAxis     //Chart y-axis settings
          .tickFormat(d3.format('.02f'));
      }


      if (highcharts_options.xAxis && highcharts_options.xAxis.min) {
        chart.forceX([highcharts_options.xAxis.min, highcharts_options.xAxis.max]);
        chart.xDomain([highcharts_options.xAxis.min, highcharts_options.xAxis.max])
      }

      var y_axis_min = 0;
      var y_axis_max = null;
      if (highcharts_options.yAxis) {
        if (highcharts_options.yAxis.min) {
          y_axis_min = highcharts_options.yAxis.min;
        }

        if (highcharts_options.yAxis.max) {
          y_axis_max = highcharts_options.yAxis.max;
        }
      }
      chart.forceY([y_axis_min, y_axis_max]);




      // here chart is your nvd3 model

      /* Done setting the chart up? Time to render it!*/
      var myData = highcharts_options.series;

      var width = 1000;
      var height = 500;
      if (highcharts_options.width || highcharts_options.chart.width) {width = highcharts_options.width || highcharts_options.chart.width;}
      if (highcharts_options.height || highcharts_options.chart.height) {height = highcharts_options.height || highcharts_options.chart.height;}

      var container_width = $(self.$el).width();
      var container_height = $(self.$el).height();

      if (container_width < width) { width = container_width; }

      if (container_height < container_height) { height = container_height; }

      d3.select(svg)
        .style({width: width, height: height});

      d3.select(svg)
        .datum(myData)
        .call(chart);

      if (plot_options.series && plot_options.series.marker && plot_options.series.marker.enabled) {
        self.$el.addClass("draw-markers");
      }

      function drawFocusFilters() {
        var focused_template = "<span <%= style_str %>'>start:</span> <b><%= start_date_str %></b><br /><span <%= style_str %>>end:</span> <b><%= end_date_str %> </b>";
        var date_template_str = "<span style='width: 80px; display: inline-block;'> <%= date.toLocaleDateString()%> </span><span style='width: 80px; display: inline-block;'> <%= date.toLocaleTimeString()%> </span>";

        var focusEl = self.$el.find(".focusfilter");
        if (!focusEl.length) {
          focusEl = $("<div class='focusfilter mtl mll box' ><div class='text lfloat' style='margin-left: 50px'/></div>");
          focusEl.css("float", "left");
          focusEl.css("font-size", "85%");

          var clickEl = $("<a href='#' class='lfloat mll btn btn-primary'>add custom time filters</a>");
          clickEl.on("click", function(e) {
            e.preventDefault();

            var extents = chart.focus.brush.extent();
            var start_date = new Date(extents[0]);
            var end_date = new Date(extents[1]);

            SF.emit("set_custom_time", start_date, end_date);

          });
          focusEl.append(clickEl);

          self.$el.append(focusEl);
        }

        if (chart && chart.focus) {
          var extents = chart.focus.brush.extent();
          var start_date = new Date(extents[0]);
          var end_date = new Date(extents[1]);


          var start_date_str = _.template(date_template_str)( { date: start_date });
          var end_date_str = _.template(date_template_str)( {date: end_date });

          if (+start_date != +end_date) {
            focusEl.find('.text').html(
              _.template(focused_template)( {
                start_date_str: start_date_str,
                end_date_str: end_date_str,
                style_str: "style='width: 80px; display: inline-block;'" }
              )
            );

            focusEl.show();
          } else {
            focusEl.hide();

          }

        }
      }

      function drawPlotLines() {
        self.$el.find(".plotline, .plotline_text").remove();
        if (highcharts_options.yAxis && highcharts_options.yAxis.plotLines) {
          _.each(highcharts_options.yAxis.plotLines, function(pl) {
            drawYLine(chart, svg, pl);
          });
        }
        if (highcharts_options.xAxis && highcharts_options.xAxis.plotLines) {
          _.each(highcharts_options.xAxis.plotLines, function(pl) {
            drawXLine(chart, svg, pl);
          });
        }
      }

      drawPlotLines();
      //Update the chart when window resizes.
      nv.utils.windowResize(function() {
        var container_width = $(self.$el).width();
        var container_height = $(self.$el).height();

        chart.width(container_width);
        chart.height(container_height);

        d3.select(svg)
          .style({width: container_width, height: container_height});

        // Draw new plot lines onto chart
        chart.update();
        drawPlotLines();
      });


      return chart;
    });

  }
};
