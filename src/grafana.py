import flask
from . import backend, rbac

from . import fastjson as json

from .query_spec import QuerySpec
from .views import get_view_by_name
from .util import return_json
import time


import re
COL_RE = re.compile("(.*)\((.*)\)")

def extract_field(col):
    m = COL_RE.match(col)
    if m:
        return m.groups()[1]
    return col

def extract_agg(col):
    m = COL_RE.match(col)
    if m:
        return m.groups()[0].lower()
    return col

def extract_field_aggs(query):
    cols = query.get_fields()

    custom_fields = query.getlist('custom_fields[]')

    col_aggs = {};
    agg = query.get_metric()
    for col in cols:
      col_agg = agg + "(" + col + ")"
      col_aggs[col_agg] = col_agg

    for em in custom_fields:
        col_aggs[em] = em

    return col_aggs.keys()

def run_query(query):
    query = QuerySpec(query)
    table = query.get('table')
    if not rbac.check("query", table):
        return return_json({"error" : "User is not authorized to query this table"})

    d = query.__makedict__()
    bs = backend.SybilBackend()
    ti = bs.get_table_info(table)

    from urllib import unquote
    filters = unquote(query.get("filters", ""))
    if isinstance(filters, (str, unicode)):
        try:
            filters = json.loads(unquote(filters))
            query.set('filters', filters)
        except:
            query.set('filters', { "query" : [], "compare" : []})

    view = query.get('view')
    VwClass = get_view_by_name(view)
    query.set('viewbase', VwClass.BASE)

    start = time.time()
    res = bs.run_query(table, query, ti)

    # need to marshall the series to the format grafana is expecting:
    # it should be an array of objects, each object looks like:
    # { target: name,
    # datapoints: [ [val, timestamp], [val, timestamp], ... ] }

    ret = {}
    groupby = query.get_groupby()
    col_aggs = extract_field_aggs(query)
    if not col_aggs:
        col_aggs = [ "Count" ]

    start = time.time()
    series = {}
    for ts in res:
        row = res[ts]

        for obj in row:
            key = []
            for g in groupby:
                key.append(obj.get(g))
            key = ",".join(key)

            for col in col_aggs:
                kv = "%s .%s" % (key, col)
                agg = extract_agg(col)
                field = extract_field(col)

                d = obj.get(field, None)
                if isinstance(d, dict):
                    if agg[0] == "p":
                        try:
                            val = d["percentiles"][int(agg[1:])]
                        except:
                            val = None
                    else:
                        val = d.get(agg)
                else:
                    val = d

                if not kv in series:
                    series[kv] = {
                        "datapoints" : [],
                        "target" : kv
                    }

                series[kv]["datapoints"].append([val, int(ts) * 1000])

    for k in series:
        series[k]["datapoints"].sort(key=lambda w: w[1])

    return return_json(series.values())
