import pudgy
from .view import ViewBase

from ..components import *

import numbers

import dotmap

TIME_SLICE_OPTIONS = [
    "auto",
    ("1 min", 60),
    ("5 min", 60 * 5),
    ("10 min", 60 * 10),
    ("30 min", 60 * 30),
    ("1 hour", 60 * 60),
    ("3 hours", 60 * 60 * 3),
    ("6 hours", 60 * 60 * 6),
    ("12 hours", 60 * 60 * 12),
    ("daily", 60 * 60 * 24),
]


#function fieldname(a,c) {
#  return a.replace(/^\$/, "") + "(" + c + ")";
#}
#
#function marshall_time_rows(query_spec, time_buckets) {
#  var cols = query_spec.opts.cols;
#  var dims = query_spec.opts.dims;
#  var agg = query_spec.opts.agg;
#
#  var custom_fields = query_spec.opts.custom_fields;
#
#  if (config.debug_driver) {
#    console.log("EXTRACTING EXTRA METRICS", custom_fields);
#  }
#
#  var ret = [];
#  _.each(time_buckets, function(rows, time_bucket) {
#    _.each(rows, function(r) {
#      if (!r) {
#        return;
#      }
#
#      var row = {};
#      row._id = {};
#      _.each(dims, function(d) {
#        row._id[d] = r[d];
#      });
#
#      _.each(cols, function(c) {
#        _.each([agg], function(agg) {
#          row[fieldname(agg,c)] = extract_val(query_spec, r, c, agg);
#        });
#      });
#
#      _.each(custom_fields, function(em) {
#        var a = extract_agg(em);
#        var c = extract_field(em);
#        row[fieldname(a,c)] = extract_val(query_spec, r, c, a);
#
#      });
#
#      row._id.time_bucket = parseInt(time_bucket, 10);
#
#      row.count = r.Count || r.Samples;
#      row.weighted_count = r.Count || r.Samples;
#      row.distinct = r.Distinct;
#
#      ret.push(row);
#    });
#
#  });
#
#  return ret;
#
#}
#
#function extract_val(query_spec, r, c, agg) {
#
#  var oa = agg || query_spec.opts.agg;
#
#  agg = oa.replace(/^\$/, "");
#  var percentile;
#  var sum;
#  var count;
#  var distinct;
#  var stddev;
#
#  if (agg === "sum") {
#    sum = true;
#  } else if (agg === "count") {
#    count = true;
#  } else if (agg === "distinct") {
#    distinct = true;
#  } else if (agg === "stddev") {
#    stddev = true;
#  }
#
#  if (agg.indexOf("p") === 0) {
#    percentile = parseInt(oa.substr(1), 10);
#    if (_.isNaN(percentile)) {
#      percentile = null;
#    }
#  }
#
#  var avg;
#  var summed = 0;
#  var total = 0;
#
#  if (r[c]) {
#    if (r[c].avg) {
#      avg = r[c].avg;
#    } else if (_.isNumber(r[c]) || _.isString(r[c])) {
#      avg = parseFloat(r[c], 10);
#    } else if (r[c].buckets) {
#      _.each(r[c].buckets, function(count, val) {
#        total += count;
#        summed += (parseInt(val, 10) * count);
#      });
#
#      avg = r[c].avg = summed / total;
#
#    }
#  }
#
#  if (percentile) {
#    if (r[c] && r[c].percentiles) {
#      return parseFloat(r[c].percentiles[percentile], 10);
#    } else {
#      return  "NA";
#    }
#  } else if (sum) {
#    return r.Count * avg;
#  } else if (count) {
#    return  r.Count;
#  } else if (distinct) {
#    return r.Distinct || r.distinct;
#  } else if (stddev) {
#    return (r[c] && r[c].stddev) || 0;
#  } else {
#    return parseFloat(avg, 10);
#
#  }
#
#}
#

class nvd3(OldSnorkelComponent):
    pass

class TimeView(ViewBase, pudgy.JSComponent):
    NAME="time"
    BASE="time"
    DISPLAY_NAME="Time View"


    def add_time_series_controls(self, controls):
        time_slice = Selector(
            name="time_bucket",
            options=TIME_SLICE_OPTIONS,
            selected=self.context.query.get("time_bucket"))

        controls.append(ControlRow("time_bucket", "Time Slice", time_slice))

        normalize = Selector(
            name="time_normalize",
            options=[ "", "hour", "minute" ],
            selected=self.context.query.get("time_normalize"))
        controls.append(ControlRow("time_normalize", "Normalize", normalize))



    def get_controls(self):
        controls = []

        self.add_go_button(controls)
        self.add_view_selector(controls)
        self.add_time_controls(controls)
#        self.add_time_comparison(controls)

        self.add_time_series_controls(controls)

        self.add_groupby_selector(controls)
        self.add_limit_selector(controls)

        self.add_metric_selector(controls)
        self.add_fields_selector(controls)
        self.add_go_button(controls)

        return controls

    def marshall_rows(self):
        query_spec = self.context.query
        cols = query_spec.getlist('fields[]')
        dims = query_spec.getlist('groupby[]')
        aggs = query_spec.getlist('metric')
        time_buckets = self.context.results

        import re
        f_regex = re.compile("^$")

        def fieldname(a, c):
            r = f_regex.sub(a, "") + "(" + c + ")";
            return r

        def extract_val(query_spec, r, c, agg):
            oa = agg or query_spec.get('metric')
            agg = agg.lower()

            sum = False
            count = False
            distinct = False
            percentile = False
            if agg == "sum":
                sum = True
            elif agg == "count":
                count = True
            elif agg == "distinct":
                distinct = True

            if agg[0] == "p":
                percentile = int(agg[1:])


            if c in r:
                if isinstance(r[c], numbers.Number):
                    avg = r[c]
                elif r[c].buckets:
                    pass

            if percentile:
                return r[c].percentiles[percentile]

            elif sum:
                return r["Count"] * avg

            elif count:
                return r["Count"]

            return avg





        ret = []
        for bucket, rows in time_buckets.iteritems():
            for r in rows:
                row = dotmap.DotMap()
                row._id = {}

                for d in dims:
                    row._id[d] = r[d]

                for c in cols:
                    for a in aggs:
                        row[fieldname(a, c)] = extract_val(query_spec, r, c, a)

                row._id['time_bucket'] = int(bucket)

                row.count = r.get('Count') or r.get('Samples')
                row.weighted_count = row.count
                distinct = r.get('Distinct')
                if distinct:
                    row.distinct = distinct

                ret.append(row)

        self.context.prepared = ret
        self.marshal(rows=ret)


    def __prepare__(self):
        self.marshall_rows()

