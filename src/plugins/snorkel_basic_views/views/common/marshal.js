var helpers = require("common/sf_helpers.js");

var extract_agg = helpers.extract_agg;
var extract_field = helpers.extract_field;

function fieldname(a,c) {
  return a.replace(/^\$/, "") + "(" + c + ")";
}

function extract_val(query_spec, r, c, agg) {

  var oa = agg || query_spec.opts.agg;

  agg = oa.replace(/^\$/, "");
  var percentile;
  var sum;
  var count;
  var distinct;
  var stddev;

  if (agg === "sum") {
    sum = true;
  } else if (agg === "count") {
    count = true;
  } else if (agg === "distinct") {
    distinct = true;
  } else if (agg === "stddev") {
    stddev = true;
  }

  if (agg.indexOf("p") === 0) {
    percentile = parseInt(oa.substr(1), 10);
    if (_.isNaN(percentile)) {
      percentile = null;
    }
  }

  var avg;
  var summed = 0;
  var total = 0;

  if (r[c]) {
    if (r[c].avg) {
      avg = r[c].avg;
    } else if (_.isNumber(r[c]) || _.isString(r[c])) {
      avg = parseFloat(r[c], 10);
    } else if (r[c].buckets) {
      _.each(r[c].buckets, function(count, val) {
        total += count;
        summed += (parseInt(val, 10) * count);
      });

      avg = r[c].avg = summed / total;

    }
  }

  if (percentile) {
    if (r[c] && r[c].percentiles) {
      return parseFloat(r[c].percentiles[percentile], 10);
    } else {
      return  "NA";
    }
  } else if (sum) {
    return r.Count * avg;
  } else if (count) {
    return  r.Count;
  } else if (distinct) {
    return r.Distinct || r.distinct;
  } else if (stddev) {
    return (r[c] && r[c].stddev) || 0;
  } else {
    return parseFloat(avg, 10);

  }

}
function marshall_time_rows(query_spec, time_buckets) {
  var cols = query_spec.opts.cols;
  var dims = query_spec.opts.dims;
  var agg = query_spec.opts.agg;

  var custom_fields = query_spec.opts.custom_fields;


  var ret = [];
  _.each(time_buckets, function(rows, time_bucket) {
    _.each(rows, function(r) {
      if (!r) {
        return;
      }

      var row = {};
      row._id = {};
      _.each(dims, function(d) {
        row._id[d] = r[d];
      });

      _.each(cols, function(c) {
        _.each([agg], function(agg) {
          row[fieldname(agg,c)] = extract_val(query_spec, r, c, agg);
        });
      });

      _.each(custom_fields, function(em) {
        var a = extract_agg(em);
        var c = extract_field(em);
        row[fieldname(a,c)] = extract_val(query_spec, r, c, a);

      });

      row._id.time_bucket = parseInt(time_bucket, 10);

      row.samples = r.Samples || r.Count;
      row.count = r.Count || r.Samples;
      row.weighted_count = r.Count || r.Samples;
      if (typeof r.Distinct != "undefined") {
        row.distinct = r.Distinct;
      }

      ret.push(row);
    });

  });

  return ret;

}

function marshall_table_rows(query_spec, rows) {
  var cols = query_spec.opts.cols;
  var dims = query_spec.opts.dims;
  var agg = query_spec.opts.agg;
  var custom_fields = query_spec.opts["custom_fields[]"] || [];

  var ret = [];
  _.each(rows, function(r) {
    var row = {};
    row._id = {};
    _.each(dims, function(d) {
      row._id[d] = r[d];
    });

    _.each(cols, function(c) {
      _.each([agg], function(agg) {
        row[fieldname(agg,c)] = extract_val(query_spec, r, c, agg);
      });
    });

    _.each(custom_fields, function(em) {
      var a = extract_agg(em);
      var c = extract_field(em);
      row[fieldname(a,c)] = extract_val(query_spec, r, c, a);

    });

    row.count = r.Samples || r.Count;
    row.samples = r.Samples;

    row.distinct = r.Distinct || r.distinct;
    if (typeof row.distinct == "undefined") {
      delete row["distinct"];
    }

    row.weighted_count = r.Count || r.Samples;

    if (query_spec.opts.agg === "$distinct") {
      row.count = row.distinct;
    }

    ret.push(row);
  });

  return ret;
}

function marshall_dist_rows(query_spec, rows) {
  var cols = query_spec.opts.cols;
  var dims = query_spec.opts.dims;
  var ret = [];
  _.each(rows, function(r) {
    var row = {};
    row._id = {};
    _.each(dims, function(d) {
      row._id[d] = r[d];
    });

    var col = cols[0];
    _.each(r[col].buckets, function(count, bucket) {
      var copy = _.clone(row);
      copy._id = _.clone(row._id);
      var val = parseInt(bucket, 10);
      copy._id[col] = val;
      copy[col] = val;
      copy.count = count;

      ret.push(copy);
    });
  });

  return ret;


}

module.exports = {
  marshall_table_rows: marshall_table_rows,
  marshall_time_rows: marshall_time_rows,
  marshall_dist_rows: marshall_dist_rows
}
