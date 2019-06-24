"use strict";

var helpers = require("snorkel$common/sf_helpers.js");
var country_codes = require("./countrycodes");
var country_lookup = {};

var sf_shim = require("snorkel$common/sf_shim.js");
var sf_marshal = require("snorkel$common/marshal.js");

var build_country_lookup = function() {
  build_country_lookup = function() {};

  _.each(country_codes, function(data) {
    country_lookup[data["name"]] = data;
    country_lookup[data["alpha-2"]] = data;
    country_lookup[data["alpha-3"]] = data;
  });


}

var row_key = helpers.row_key;
var DatamapView = {
  initialize: function(ctx) {
    sf_shim.prepare_and_render(this, ctx);
  },
  prepare: function(data) {
    data.results = sf_marshal.marshall_table_rows({ opts: data.parsed}, data.results);
    return data;
  },
  finalize: function() {
    build_country_lookup();

    var query_params = this.query.parsed;
    var group_type = query_params.group_type;

    var ips = {};
    var total_count = 0;
    var total_value = 0;
    var dims = this.query.parsed.dims;
    var col_aggs = helpers.get_col_aggs(this.table, this.query.parsed);
    if (col_aggs.length == 0) { col_aggs[0] = "$count(count)" }
    var col = col_aggs[0];

    _.each(this.data.results, function(row) {
      var key = _.map(dims, function(d) { return row._id[d] }).join(",");
      if (group_type == "ip") {
        ips[key] = 1;
      } else if (!_.isNaN(parseInt(key[0], 10))) {
        // if the key starts with a digit, its not good unless its an IP
        console.log("UNRECOGNIZED KEY FOR SVG", key);
        key = "_" + key;
      }

      if (group_type == "country2" || group_type == "country3" || group_type == "country") {
        var datum = country_lookup[key];
        if (datum) {
          key = datum["alpha-3"];
        } else {
          console.log("CANT FIND COUNTRY CODE FOR", key);
        }
      }
      row.key = key;

      var value = helpers.get_field_value(row, col);

      total_value += value;
      total_count += row.count;

      row._value = value;
      row._count = row.count;
    });



    if (group_type == "ip") {
      this.ips = ips;
    }

    this.total_count = total_count;
    this.total_value = total_value;
  },

  render: function() {
    var self = this;
    $C("nvd3", {skip_client_init: true}, function(cmp) {
      _.defer(_.bind(self.inner_render, self));
    });
  },

  inner_render: function() {
    var self = this;
    var $el = this.$el;
    var mapEl = $("<div class='mapholder' />");
    var tableEl = $("<div class='table' />");
    tableEl.css("min-height", "50px");
    tableEl.css("padding-bottom", "100px");
    tableEl.css("padding-top", "80px");

    $el.append(mapEl);
    $el.append(tableEl);

    var query_params = this.query.parsed;
    var group_type = query_params.group_type;
    var variable_radius = query_params.bubble_size == "var";
    var results = this.query.results;
    var total_count = this.total_count;
    var total_value = this.total_value;


    var bubbles = [];

    var scope = "world";
    if (group_type == "state" || query_params.scope == "usa") {
      scope = "usa";
    }

    var data = {};

    var col_aggs = helpers.get_col_aggs(this.table, this.query.parsed);
    if (col_aggs.length == 0) { col_aggs[0] = "$count(count)" }

    var col = col_aggs[0];
    var dims = this.query.parsed.dims;

    // this is an IP lookup so we get per country listing of values
    var geo_lookup = {};


    var color_interpolator = d3.interpolate("#efefff", "#00a");
    var fields = this.metadata.columns;

    var headers = [ col_aggs[0] ];
    var need_count = false;
    if (col_aggs[0].indexOf("count") == -1) {
      headers.push("count");
      need_count = true;
    }

    if (group_type == "ip") {
      headers.unshift("country");
      headers.unshift("region");
      headers.unshift("city");
      headers.unshift("ip");
    } else {
      headers.unshift("name");
    }


    function render_table(geography) {
      tableEl.empty();
      var datums = geo_lookup[geography.id];
      if (_.isArray(datums)) {
        var popupEl = $('<div class="clearfix"/>');
        popupEl.css("font-size", "12px");
        popupEl.css("padding", "4px");

        var rows = [];

        popupEl.append('<div><strong>' + geography.properties.name + '</strong></div>');
        _.each(datums, function(data) {
          var row = [];

          if (group_type == "ip") {
            row.push(data._ip);
            row.push(data._ipdata.city);
            row.push(data._ipdata.region);
            row.push(data._ipdata.country);
          } else {
            row.push(data._name);
          }

          row.push(helpers.get_field_value(data, col));

          if (need_count) {
            row.push(data._count);
          }

          rows.push(row);
        });

        var this_table = helpers.build_table(self.table, headers, rows, fields);

        tableEl.append(this_table);

      }
    }


    function render_map() {
      var map_height = 600;
			mapEl.css('height', map_height + 'px');
      mapEl.css('width', '800px');
      mapEl.css("border", "1px solid gray");
      $C("datamaps", {}, function(cmp) {
        var basic = new cmp.ZoomMap(mapEl, {
          height: map_height,
          scope: scope,
          responsive: true,
          fills: {
            defaultFill: "#efefef",
          },
          bubblesConfig: {
            borderColor: '#666',
            popupTemplate: function(geography, bubble) {
              var ret = '<div class="hoverinfo"><strong>' + bubble.name + '</strong>: ' + bubble.value;

              if (bubble.count) {
                ret += " <small>(" + bubble.count + " samples)</small>";
              }

              ret += '</div>';

              return ret;
            }
          },
          geographyConfig: {
            highlightFillColor: '#DDD',
            popupTemplate: function(geography, data) { //this function should just return a string
              return '<div class="hoverinfo"><strong>' + geography.properties.name + '</strong></div>';
            },
          },
          done: function(datamap) {
            datamap.svg.selectAll('.datamaps-subunit').on('click', function(geography) {
              render_table(geography);
              tableEl[0].scrollIntoView({
                block: "start",
                inline: "start",
              });
            });

          },
          data: data,
        });


        basic.instance.bubbles(bubbles);
        basic.instance.legend();
        mapEl.css("padding-bottom", "0px");


      });
    }

    if (group_type == "ip") {
      var template = _.template("<%= ip %>, <%= city %>, <%= region %>, <%= country %>");
      this.rpc.load_geoips(this.ips)
        .done(function(ip_lookup) {
        _.each(results, function(row) {
          var ipdata = ip_lookup[row.key];
          if (ipdata) {
            row._ll = ipdata.location;
            ipdata.city = ipdata.subdivisions[1] || "";
            ipdata.region = ipdata.subdivisions[0] || "";
          } else {
            // TODO: add this to the visualization
            console.log("NO GEOIP DATA FOR IP", row.key);
            return
          }

          row._ipdata = ipdata;

          var row_name = template({
            ip: row.key,
            country: ipdata.country,
            region: ipdata.region,
            city: ipdata.city,
          });
          row._name = row_name;
          row._ip = row.key;

          var bubble = {
            name: row_name,
            value: helpers.get_field_value(row, col),
            count: row._count || 0,
            latitude: ipdata.location[0],
            longitude: ipdata.location[1],
            fillColor: color_interpolator(row._value / (total_value / results.length) )
          };

          var country_info = country_lookup[ipdata.country];
          if (country_info) {
            var country_key = country_info['alpha-3'];
            var state_key = ipdata.region;

            geo_lookup[country_key] = geo_lookup[country_key] || [];
            geo_lookup[country_key].push(row);

            geo_lookup[state_key] = geo_lookup[state_key] || [];
            geo_lookup[state_key].push(row);
          }

          if (variable_radius) {
            bubble.radius = Math.log(parseInt(row._value * row._value / total_value * 100, 10));
            if (bubble.radius < 1) {
              bubble.radius = 1
            }
          } else {
            bubble.radius = 2;
          }

          bubble.radius = bubble.radius || 1;

          bubbles.push(bubble);

        });

        render_map();
      });
    } else {
      _.each(results, function(row) {
        var bubble = {
          name: row.key,
          value: row._value,
          count: row.count,
          centered: row.key,
          key: row.key,
          fillColor: color_interpolator((row._value / total_value) || 0)
        };


        row._name = row.key;

        geo_lookup[row.key] = geo_lookup[row.key] || [];
        geo_lookup[row.key].push(row);

        bubble.radius = Math.log(parseInt(row.count * row.count / total_count * 100, 10));
        if (bubble.radius <= 2) {
          bubble.radius = 2;
        }

        bubble.radius = bubble.radius || 2;
        if (!variable_radius) {
          bubble.radius = 2;
        }


        bubbles.push(bubble);
        data[row.key] = bubble;
      });


      render_map();
    }

  }
}

module.exports = DatamapView;

