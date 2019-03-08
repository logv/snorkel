var _labels = {};
function add_missing_values(serie, time_bucket, start, end, is_compare) {
  serie = _.sortBy(serie, function(s) { return s.x; } );

  console.log("ADD MISSING", start, end);

  var expected = start;
  var new_serie = [];
  var pt;
  var missing = 0;

  for (var i = 0; i < serie.length; i++) {
    pt = serie[i];
    expected += time_bucket * 1000;

    while (expected < pt.x) {
      missing += 1;
      new_serie.push({
        x: expected,
        y: 0
      });

      expected += time_bucket * 1000;
    }

    new_serie.push(pt);
  }

  // fills in the missing values at the end of the series
  while (!is_compare && expected < end) {
    expected += time_bucket * 1000;
    if (expected < end) {
      missing += 1;
      pt = {
        x: expected,
        y: 0
      };

      new_serie.push(pt);
    }
  }

  return new_serie;
}

function time_prepare(data, options) {
  if (!options) {
    options = {};
  }

  var dataset = options.dataset;
  var is_compare = options.is_compare;

  // dependency injection
  var presenter = options.presenter;
  var helpers = options.helpers;


  var series = {};
  var divisor = 1;
  if (data.parsed.time_divisor === "min") {
    divisor = (data.parsed.time_bucket / 60);
  } else if (data.parsed.time_divisor === "hour") {
    divisor = (data.parsed.time_bucket / 3600);
  }

  // For each column, need to record a series
  var group_by = data.parsed.dims || [];
  group_by.sort();

  _.each(data.results, function(result) {
    _.each(result, function(value, field) {
      if (field === "_id") { return; }

      if (data.parsed.agg === "$distinct") {
        if (field !== "count") { return; }
      } else if (data.parsed.agg == "$count" &&
        (data.parsed.custom_fields && !data.parsed.custom_fields.length)) {
        if (field !== "count") { return; }
      } else {
        if (field === "count") { return; }
        if (field === "weighted_count") {
          return;
        }
      }

      if (data.parsed.agg === "$count" || data.parsed.agg === "$sum") {
        value = value / divisor;
      }

      if (presenter) {
        var formatter = presenter.get_field_number_formatter(dataset, field);
        if (formatter) {
          value = formatter(value, value);
        }
      }



      var dims = _.map(group_by, function(g) {
        return result._id[g];
      });

      var group_label = dims.join(",");
      var field_label = group_label + " " + field;
      var field_name = field;
      if (presenter) {
        field_name = presenter.get_field_name(dataset, field);
        field_label = group_label + " " + presenter.get_field_name(dataset, field);
      }

      var full_label = field_label;

      _labels[full_label] = group_label || full_label;

      if (!series[field_label]) {
        var color = "#000";
        if (helpers) {
          color = helpers.get_color(group_label || full_label);
        }

        series[field_label] = {
          data: [],
          name: full_label,
          color: color,
          group_name: group_label,
          field_name: field_name
        };
      }


      // denormalize the time bucket into ms for highcharts benefit
      var pt = {
        x: result._id.time_bucket * 1000,
        y: parseInt(value, 10),
        samples: result.samples,
        compare: is_compare
      };

      if (pt.y !== null && !_.isNaN(pt.y)) {
        series[field_label].data.push(pt);
      }
    });
  });


  _.each(series, function(serie) {
    if (options.fill_missing == "zero") {
      var start_ms = data.parsed.start_ms;
      var end_ms = data.parsed.end_ms;
      if (is_compare) {
        start_ms += data.parsed.compare_delta ;
        end_ms += data.parsed.compare_delta ;
      }

      console.log("IS COMPARE", is_compare, data.parsed.compare_delta);

      serie.data = add_missing_values(serie.data, data.parsed.time_bucket,
        start_ms, end_ms, is_compare);
    }

    serie.data.sort(function(a, b) {
      return a.x - b.x;
    });
  });

  return series;
}


module.exports = {
  prepare: time_prepare,
  labels: _labels
};
