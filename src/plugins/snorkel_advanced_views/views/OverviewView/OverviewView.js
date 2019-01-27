"use strict";

var helpers = require("snorkel$common/sf_helpers.js");
var sf_shim = require("snorkel$common/sf_shim.js");

var OverView = {
  initialize: function(ctx) {
    ctx.results = ctx.results || [];
    sf_shim.initialize.apply(this, [ctx]);

  },
  prepare: function(data) {
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

    this.integer_cols = integer_cols;
    this.set_cols = set_cols;
    this.string_cols = string_cols;


    var all_cols = string_cols.concat(integer_cols).concat(set_cols);
    _.each(all_cols, function(col) {
      headers.push(col);
    });

    var rows = [];
    var values = {};
    this.values = values;

    function insert_value(field, val) {
      if (!values[field]) {
        values[field] = [];
      }

      values[field].push(val);
    }

    _.each(data.results, function(result) {
      var row = [];
      _.each(all_cols, function(field) {
        var col_formatter = helpers.get_field_formatter(dataset, field);
        var value = result[field];
        insert_value(field, value);

        if (col_formatter) {
          value = col_formatter(value);
        }


        row.push(value);
      });

      rows.push(row);
    });

    return {
      rows: rows,
      headers: headers
    };
  },

  finalize: function() {
    if (!this.data.rows.length) {
      return "No Samples";
    }
  },

  render: function() {
    var div = $("<div />");
    var num = this.data.rows.length;
    var self = this;

    div.append($("<div>").html("The below is a quick summary of <strong>" + num + "</strong> samples pulled from the backend. "));


    var table;

    var data = this.data;
    var dataset = this.table;
    var values = this.values;

    function format(col, val) {
      return helpers.get_field_formatter(dataset, col)(val);
    }

    function prep_element(values, col) {
      var freq = values.length * 1.00 / data.rows.length * 100.0;
      var display_name = col;
      var description = "";

      var tr = $("<div class='clearfix span4' />");
      var header_div = $("<div class='clearfix'/>");
      var header = $("<h3 class='lfloat'/>").html(helpers.humanize(display_name));
      tr.append(header_div);
      var placeholder = $("<div />");
      header_div.append(header);
      header_div.append(placeholder);
      placeholder.addClass('lfloat');
      placeholder.css('margin-top', '20px');
      placeholder.css('margin-left', '5px');

      if (description) {
        var help_link = $C("helpover", { content: description }, function(cmp) {
          cmp.$el.css("margin-top", "20px");
          placeholder.append(cmp.$el);
        });
      }

      tr.append($("<div class='supplemental' />"));
      tr.append($("<small />").html("occurs in <strong>" + freq.toFixed(2) + "%</strong> of samples"));

      return tr;
    }

    function build_val_chart(col, counted_vals) {

      var plotted_vals = [];
      _.each(counted_vals, function(count, val) {
        var of_total = Math.max(count / num, 0.05);
        plotted_vals.push({
          x: parseInt(val, 10),
          y: 2,
          marker: {
            radius: 10,
            fillColor:'rgba(24,90,169,' + of_total + ')'
          }
        });
      });

      var options = {
        legend: {
          enabled: false,
        },
        chart: {
            type: 'scatter',
            zoomType: 'xy',
            height: 100
        },
        xAxis: {
          type: "linear",
        },
        yAxis: {
          labels: {
            enabled: false
          }
        },
        plotOptions: {
          series: {
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
        series: [{
          data: plotted_vals,
          marker: {
            symbol: 'triangle-down',
            lineColor:'rgba(0,0,0,0)',
            lineWidth: 1,
          }
        }]
      };

      var el = $("<div class='' style='height: 100px'/>");
      $C(self.graph_component, {skip_client_init: true}, function(cmp) {
        cmp.$el.css("display", "inline-block");
        cmp.$el.css("width", "90%");

        el.append(cmp.$el);


        // There's a little setup cost to highcharts, maybe?
        cmp.client(options);
      });

      return el;


    }

    function build_pie_chart(col, counted_vals) {
      var total = _.reduce(counted_vals, function(memo, num) { return memo + num; }, 0);
      var sorted_vals = _.sortBy(_.keys(counted_vals), function(key) {
        return -counted_vals[key];
      });

      var options = {
        legend: {
          enabled: false,
        },
        chart: {
          type: 'bar',
          plotBackgroundColor: null,
          plotBorderWidth: null,
          plotShadow: false,
          height: 200
        },

        tooltip: {
          pointFormat: 'Percent of total: <b>{point.percentage:.1f}%</b>'
        },
        plotOptions: {
          pie: {
            size: 80
          },
          format: '<b>{point.name}</b>: {point.percentage:.1f} %'

        },

        yAxis: {
          min: 0,
          max: 100
        },

        xAxis: {
          categories: _.keys(counted_vals)
        }
      };

      var top_vals_el = $("<div />");

      var shown_vals = 10;

      var values = [];
      _.each(_.first(sorted_vals, shown_vals), function(val) {
        values.push({ x: format(col, val), y: (counted_vals[val] / total * 100)});
      });

      $C(self.graph_component, {skip_client_init: true}, function(cmp) {
        // get rid of query contents...
        top_vals_el
          .append(cmp.$el)
          .show();

        if (sorted_vals.length > shown_vals) {
          top_vals_el.append("...");
          top_vals_el.append((sorted_vals.length - shown_vals) + " more");
        }

        options.series = [{
          data: values
        }];

        // There's a little setup cost to highcharts, maybe?
        cmp.client(options);
      });
      return top_vals_el;


    }

    if (this.integer_cols.length) {
      div.append($("<div class='page-header'><h1>Integer Columns</h1></div>"));
    }
    table = $("<div class='clearfix'/>");

    _.each(this.integer_cols, function(col) {
      var el = prep_element(values[col], col);
      el.addClass("expand-on-mobile");
      values[col] = _.sortBy(values[col], function(col) {
        return parseInt(col, 10);
      });
      var min = _.first(values[col]);
      var max = _.last(values[col]);
      var sum = _.reduce(values[col], function(memo, num) { return memo + num; }, 0);
      var mean = sum / values[col].length;

      var median = values[col][parseInt(values[col].length / 2, 10)];

      var sup_el = el.find(".supplemental");

      var counted_vals = _.countBy(values[col]);
      sup_el.append(build_val_chart(col, counted_vals));

      sup_el.append($("<div>").html("<strong>min</strong>: " + helpers.count_format(min)));
      sup_el.append($("<div>").html("<strong>max</strong>: " + helpers.count_format(max)));
      sup_el.append($("<div>").html("<strong>mean</strong>: " + helpers.count_format(mean)));
      sup_el.append($("<div>").html("<strong>median</strong>: " + helpers.count_format(median)));


      table.append(el);

    });
    div.append(table);

    if (this.string_cols.length) {
      div.append($("<div class='page-header'><h1>String Columns</h1></div>"));
    }

    table = $("<div class='clearfix' />");
    _.each(this.string_cols, function(col) {
      var el = prep_element(values[col], col);
      var counted_vals = _.countBy(values[col]);
      var sup_el = el.find(".supplemental");
      sup_el.append(build_pie_chart(col, counted_vals));
      table.append(el);
    });
    div.append(table);

    if (this.set_cols.length) {
      div.append($("<div class='page-header'><h1>Set Columns</h1></div>"));
    }

    table = $("<div class='clearfix'/>");
    _.each(this.set_cols, function(col) {
      var el = prep_element(values[col], col);
      table.append(el);

      var all_values = _.flatten(values[col]);
      _.each(values[col], function(col) {
        if (!col || !col.length) {
          all_values.push(null);
        }
      });
      var counted_vals = _.countBy(all_values);
      var sup_el = el.find(".supplemental");
      sup_el.append(build_pie_chart(col, counted_vals));
    });
    div.append(table);


    this.$el.css("margin-left", "10px");
    this.$el
      .append(div)
      .fadeIn();
  }
};

module.exports = OverView;
