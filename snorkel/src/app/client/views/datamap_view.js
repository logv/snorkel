"use strict";

var filter_helper = require("app/controllers/query/filters");
var helpers = require("app/client/views/helpers");
var BaseView = require("app/client/views/base_view");
var presenter = require("app/client/views/presenter");
var country_codes = require("app/static/vendor/countrycodes");
var country_lookup = {};

function require_d3(cb) {
  cb = cb || function() { };

  if (window.d3) {
    return cb();
  }

  bootloader.require("app/static/vendor/d3.v3", function() {
    cb();
  });
}

var build_country_lookup = function() {
  build_country_lookup = function() {};

  _.each(country_codes, function(data) {
    country_lookup[data["name"]] = data;
    country_lookup[data["alpha-2"]] = data;
    country_lookup[data["alpha-3"]] = data;
  });


}

var row_key = helpers.row_key;
var DatamapView = BaseView.extend({
  baseview: helpers.VIEWS.TABLE,
  finalize: function() {
    build_country_lookup();

    var query_params = this.query.parsed.custom;
    var group_type = query_params.group_type;

    var ips = {};
    var total_count = 0;
    var total_value = 0;
    var dims = this.query.parsed.dims;
    var col_aggs = presenter.get_col_aggs(this.table, this.query.parsed);
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

      var value = presenter.get_field_value(row, col);

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
    require_d3(function() {
      self.inner_render();
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

    var query_params = this.query.parsed.custom;
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

    var col_aggs = presenter.get_col_aggs(this.table, this.query.parsed);
    var col = col_aggs[0];
    var dims = this.query.parsed.dims;

    // this is an IP lookup so we get per country listing of values
    var geo_lookup = {};

    var formatter = presenter.get_field_formatter(this.table, col);

    var color_interpolator = d3.interpolate("#efefff", "#00a");
    var fields = SF.controller().get_fields(self.table);

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

          row.push(formatter(presenter.get_field_value(data, col)));

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
      SF.socket().emit("load_geoips", this.ips, function(ip_lookup) {

        _.each(results, function(row) {
          var ipdata = ip_lookup[row.key];
          if (ipdata) {
            row._ll = ipdata.ll;
          } else {
            // TODO: add this to the visualization
            console.log("NO GEOIP DATA FOR IP", row.key);
            return
          }

          row._ipdata = ipdata;

          var row_name = _.template("<%= ip %>, <%= city %>, <%= region %>, <%= country %>", {
            ip: row.key,
            country: ipdata.country,
            region: ipdata.region,
            city: ipdata.city,
          });
          row._name = row_name;
          row._ip = row.key;

          var bubble = {
            name: row_name,
            value: $(formatter(presenter.get_field_value(row, col))).html(),
            count: row._count || 0,
            latitude: ipdata.ll[0],
            longitude: ipdata.ll[1],
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

});


function build_custom_controls(fields) {
  var custom_controls = $("<div />");

  var query_params = SF.controller().get_custom_params();

  $C("selector", {
    name: "bubble_size",
    options: {
      "var" : "Variable",
      "equal" : "Equal",
    },
    selected: query_params.bubble_size,
  }, function(selector) {
    $C("query_control_row", {
      label: "Bubble Size",
      component: selector.toString()
    }, function(cmp) {
      custom_controls.append(cmp.$el);
    });
  });

  $C("selector", {
    name: "group_type",
    options: {
      "country" : "Country Name",
      "country2" : "2 Letter Country Code",
      "country3" : "3 Letter Country Code",
      "state" : "2 Letter State Code",
      "ip" : "IP Address",
    },
    selected: query_params.group_type,
  }, function(selector) {
    $C("query_control_row", {
      label: "Group Type",
      component: selector.toString()
    }, function(cmp) {
      custom_controls.append(cmp.$el);

    });
  });

  $C("selector", {
    name: "scope",
    options: {
      "world" : "World",
      "usa" : "USA",
    },
    selected: query_params.scope,
  }, function(selector) {
    $C("query_control_row", {
      label: "Map Scope",
      component: selector.toString()
    }, function(cmp) {
      custom_controls.append(cmp.$el);
    });
  });

  return custom_controls;
}

var excludes = _.clone(helpers.STD_EXCLUDES);
SF.trigger("view:add", "datamap", {
  include: helpers.inputs.TIME_INPUTS
    .concat(helpers.inputs.GROUP_BY)
    .concat(helpers.inputs.LIMIT)
    .concat(helpers.inputs.SINGLE_AGG),
  custom_controls: build_custom_controls,
  icon: "noun/table.svg"
}, DatamapView);

module.exports = DatamapView;

