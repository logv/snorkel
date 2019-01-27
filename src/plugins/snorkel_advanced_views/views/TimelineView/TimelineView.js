
"use strict";

var helpers = require("snorkel$common/sf_helpers.js");
var sf_shim = require("snorkel$common/sf_shim.js");

var colors = ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#8085e8', '#8d4653', '#91e8e1'];

var SessionView = {
  initialize: function(ctx) {
    ctx.results = ctx.results || [];
    sf_shim.initialize.apply(this, [ctx]);

  },
  build_overview: function(rows, field, tableEl, headers) {
    var self = this;
    var plotted_vals = [];
    var grouped_series = {};

    // this is for old timeline queries sake
    var parsed = self.query.parsed;
    var color_field = parsed.event_field || parsed.custom.event_field;

    var formatter = function(w) { return w};

    _.each(rows, function(result) {
      var count = result.weighted_count || result.count || 1;
      var of_total = Math.max(count / rows.length, 0.15);
      var color = (result[color_field]) || "default";
      var value = result[field];

      if (!grouped_series[color]) {

        grouped_series[color] = { data: [], key: color, color: helpers.get_rgba(color) }
      }



      if (formatter) {
        value = parseInt(formatter(value, value), 10);
      }

      value = value * 1000; // expect the timestamp to be in seconds


      grouped_series[color].data.push({
        x: value,
        name: color,
        key: color,
        color: helpers.get_rgba(color, of_total),
        result: result,
        y: 2,
        marker: {
          radius: 10,
          fillColor: helpers.get_rgba(color, of_total)
        }
      });
    });

    var options = {
      chart: {
          type: 'time_scatter',
          zoomType: 'x',
      },
      xAxis: {
        type: "datetime",
        min: self.query.parsed.start_ms,
        max: self.query.parsed.end_ms ,
        events: {
          setExtremes: function (e) {
            var timeIndex = _.indexOf(self.data.headers, field);
            var xmin, xmax;
            if (e.min || e.max) {
              xmin = e.min / 1000;
              xmax = e.max / 1000;
            }

            var rows = tableEl.find("tbody tr");
            _.each(rows, function(row) {
                var td_stamp = $(row).find("td").get(timeIndex);
                var row_stamp = $(td_stamp).find("div[data-transform]").attr("data-transform");
                if (!row_stamp) { row_stamp = $(td_stamp).find("div[data-value]").attr("data-value"); }
                if (!row_stamp) { row_stamp = parseInt($(td_stamp).html(), 10); }

                if (!xmax || (row_stamp >= xmin && row_stamp <= xmax)) {
                  $(row).show();
                } else {
                  $(row).hide();
                }
            });
          },

        }
      },
      yAxis: {
        enabled: false,
        labels: {
          enabled: false
        }
      },
      tooltip: {
        formatter: function() {
          var el = $("<div><b>" + Highcharts.dateFormat('%a %d %b %H:%M:%S', this.x) + "</b></div>");
          el.append("<br />" + this.key);
          return el.html();
        }
      },
      plotOptions: {
        series: {
          tooltip: {
            enabled: false
          },
          point: { },
          marker: {
            enabled: true,
            states: {
              hover: {
                enabled: false
              }
            }
          }
        }
      },
      series: _.values(grouped_series),
    };

    var $el = $("<div />");
    $C(self.graph_component, {skip_client_init: true}, function(cmp) {
      $el.append(cmp.$el);

      cmp.$el.height("100px");
      cmp.$el.width("100%");
      cmp.$el.css("display", "inline-block");
      options.height = "100px";
      options.width = "100%";

      // There's a little setup cost to highcharts, maybe?
      cmp.client(options);
    });

    return $el;
  },
  prepare: function(data) {
    // Session are broken up into raw samples of
    // integer, string, set types
    var cols = {
      "integer" : {},
      "string" : {},
      "set" : {}
    };

    var lookup = {};
    var self = this;

    var fields = this.metadata.columns;

    _.each(fields, function(field) {
      lookup[field.name] = field.type_str;
      if (cols[field.type_str]) {
        cols[field.type_str][field.name] = true;
      }
    });

    var headers = [];
    var integer_cols = fields.ints;
    var string_cols = fields.strs;
    var set_cols = fields.sets;
    var dataset = this.table;

    integer_cols.sort();
    set_cols.sort();
    string_cols.sort();

    var dims = data.parsed.dims;


    var all_cols = string_cols.concat(integer_cols).concat(set_cols);
    _.each(all_cols, function(col) {
      headers.push(col);
    });

    var rows = {};
    var samples = {};
    _.each(data.results, function(result) {
      var group_by = helpers.result_key(dims, result);

      var row = [];
      _.each(all_cols, function(field) {
//        var types = result[lookup[field]];
//        if (!types) {
//          row.push("");
//          return;
//        }

        var value = result[field];

        row.push(value);
      });

      rows[group_by] = rows[group_by] || [];
      rows[group_by].push(row);
      samples[group_by] = samples[group_by] || [];
      samples[group_by].push(result);
    });

    return {
      rows: rows,
      samples: samples,
      headers: headers
    };
  },

  finalize: function() {
    if (!_.keys(this.data.rows).length) {
      return "No Timlines";
    }
  },

  render: function() {
    var self = this;
    var fields = this.metadata.columns;
    var row_names = Object.keys(self.data.rows);
    row_names = _.sortBy(row_names, function(row) {
      return -self.data.rows[row].length;
    });

    self.$el.append("Total Samples: " + self.query.results.length);
    self.$el.append("<div class='clearfix' />");

    var time_field = "time";
    _.each(fields, function(field) {
      if (field.time_col) {
        time_field = field.name;
      }
    });

    if (!time_field) {
      console.log("COULDNT FIND TIME FIELD FOR SAMPLES!");
    }


    _.each(row_names, function(group_by) {
      var rows = self.data.rows[group_by];
      var samples = self.data.samples[group_by];

      var tableEl = helpers.build_table(self.table, self.data.headers, rows, fields);
      var tableWrapper = $("<div class='session_table' />").append(tableEl);
      tableWrapper.hide();

      var overEl = self.build_overview(samples, time_field, tableEl);

      var tableName = $("<h3 class='mtl' />").html(group_by || "Timeline");
      var tableButton = $("<a class='lfloat mrl' href='#'>See Samples</div>");
      tableButton.on('click', function() {
        tableWrapper.toggle();
      });

      var sample_count = samples.length + " samples, ";
      var percent_str = parseInt(samples.length / self.query.results.length * 100, 10) + "% of total";
      var countEl = $("<div />")
        .html(sample_count + percent_str);

      self.$el
        .append(tableName)
        .append(countEl)
        .append(tableButton)
        .append(overEl)
        .append(tableWrapper)
        .append("<hr />");

    });
    self.$el.fadeIn();
  }

}


module.exports = SessionView;
