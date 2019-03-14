from __future__ import print_function
import os
from subprocess import Popen, PIPE, check_output
from flask_security import current_user

import subprocess
import shlex
import pudgy
import time

import sys

from .. import fastjson as json

from .. import presenter

USING_MSYBIL = False

# TODO: enable REMOTE_INGEST via config variable
ENABLE_REMOTE_INGEST=False
MSYBIL_BIN = os.path.join(os.path.dirname(__file__), "msybil.py")
MSYBIL_INGEST_BIN = os.path.join(os.path.dirname(__file__), "msybil_ingest.py")
SYBIL_BIN = os.path.join(os.path.dirname(__file__), "bin", "sybil")
DEBUG="DEBUG" in os.environ

if "MSYBIL" in os.environ:
    # TODO: make msybil.py read off MSYBIL environment variable instead of stdin
    print(" s Using Multisybil", file=sys.stderr)

    SYBIL_BIN = MSYBIL_BIN
    USING_MSYBIL = True



from collections import defaultdict
from .backend import Backend

from ..util import time_to_seconds, time_delta_to_seconds

import re

def enquote(s):
    return '%s' % s

def get_time_col(md):
    for c in ["time", "integer_time", "timestamp"]:
        if c in md["col_types"]:
            return c

    return "time"

# group 1 is the agg (avg, sum, etc)
# group 2 is the col name
col_re = re.compile("(.*)\((.*)\)")
def extract_field(col):
    m = col_re.match(col)
    if m:
        return m.group(2)

    return col

def run_query_command(cmd_args):
    init_cmd_args = [SYBIL_BIN, "query", "-json"]
    init_cmd_args.extend(["--read-log"])
    init_cmd_args.extend(["--cache-queries"])
    init_cmd_args.extend(["--field-separator=%s" % FIELD_SEPARATOR])
    init_cmd_args.extend(["--filter-separator=%s" % FILTER_SEPARATOR])
    init_cmd_args.extend(cmd_args)

    init_cmd_args = [str(a).encode('ascii', errors='replace') for a in init_cmd_args]

    ret = run_command(init_cmd_args)
    return json.loads(ret)

def run_command(cmd_args, stdin=b""):
    cmd_args = list(map(lambda w: w.decode("utf-8"), cmd_args))
    print("RUNNING COMMAND", " ".join(cmd_args))

    if isinstance(stdin, str):
        stdin = stdin.encode("utf-8")

    p = Popen(cmd_args, stdin=PIPE, stdout=PIPE, stderr=PIPE)
    stdout, stderr = p.communicate(stdin)
    if DEBUG:
        print(stderr)

    return stdout.decode("utf-8")

FIELD_SEPARATOR=chr(30)
FILTER_SEPARATOR=chr(31)
#FIELD_SEPARATOR=","
#FILTER_SEPARATOR=":"

def estimate_time_buckets(query_interval, buckets):
    best_bucket_count = buckets or 1000;
    min_intervals = [ 5, 10, 30, 60, 120, 360, 720, 1440 ];
    interval_ms = 0

    i = 0
    while i < len(min_intervals):
        interval = min_intervals[i] * 60 * 1000;
        interval_ms = min_intervals[i] * 60;
        if (query_interval / interval < best_bucket_count):
            break;

        i += 1

    return interval_ms;


class SybilQuery(object):
    def run_query(self, table, query_spec, metadata):
        self.metadata = metadata
        table = presenter.GetRealTable(table)

        self.table = table
        self.query = query_spec

        view = query_spec.get('viewbase') or query_spec.get('view')

        if view == 'table':
            return self.run_table_query(table, query_spec)

        elif view == 'time':
            return self.run_time_query(table, query_spec)
        elif view == 'dist':
            return self.run_dist_query(table, query_spec)
        elif view == 'samples':
            return self.run_samples_query(table, query_spec)
        else:
            raise Exception("unrecognized view", view)

    def add_op(self, query_spec, cmd_args):
        # if only one metric is specified:
        op = query_spec.get_metric() or "count"
        if op == "Distinct":
            cmd_args.extend(["-op", "distinct"])
        elif op[0].lower() == "p": # p25, p50, etc
            cmd_args.extend(["-op", "hist"])
        else: # we are doing an avg, sum or count query
            pass


    def add_weight_col(self, query_spec, cmd_args):
        weight_col = None
        for c in [ "weight" ]:
            if c in self.metadata["col_types"]:
                weight_col = c

        if weight_col:
            cmd_args.extend(["-weight-col", weight_col])
            query_spec.set('weight_col', weight_col)


    def add_group_by(self, query_spec, cmd_args):
        groupby = query_spec.get_groupby()
        if groupby:
            cmd_args.append("-group")
            cmd_args.append(FIELD_SEPARATOR.join(groupby))

    def add_fields(self, query_spec, cmd_args):
        all_fields = []

        fields = query_spec.get_fields()
        if fields:
            all_fields.extend(fields)

        custom_fields = query_spec.getlist("custom_fields[]")
        if custom_fields:
            all_fields.extend([extract_field(c) for c in custom_fields])
            cmd_args.extend(['-op', 'hist'])
            cmd_args.extend(["-loghist"])

        field = query_spec.get("field")
        if field:
            all_fields.append(field)


        if all_fields:
            cmd_args.append("-int")
            cmd_args.append(FIELD_SEPARATOR.join(all_fields))

        query_spec.set('all_fields', all_fields)

    def add_filters(self, query_spec, cmd_args):
        from ..views import get_column_types


        # add time filters
        start_ms = query_spec.get('start_ms', '')
        end_ms = query_spec.get('end_ms', '')

        if start_ms:
            start_s = int(start_ms / 1000)
        else:
            start = query_spec.get('start', "-1 week")
            start_s = time_to_seconds(start)

        if end_ms:
            end_s = int(end_ms / 1000)
        else:
            end = query_spec.get('end', "now")
            end_s = time_to_seconds(end)


        custom_end = query_spec.get('custom_end', '')
        custom_start = query_spec.get('custom_start', '')

        if custom_start:
            start_s = time_to_seconds(custom_start)

        if custom_end:
            end_s = time_to_seconds(custom_end)

        query_spec.set('start_ms', start_s * 1000)
        query_spec.set('end_ms', end_s * 1000)


        query_interval = abs(end_s - start_s) * 1000;
        time_bucket = query_spec.get("time_bucket", "")

        if not time_bucket or time_bucket == "auto":
            time_bucket = estimate_time_buckets(query_interval, 800)

        query_spec.set('time_bucket', time_bucket)



        md = self.metadata
        fields, types = get_column_types(md)

        time_col = get_time_col(md)

        filters = query_spec.get('filters')['query']

        int_filters = defaultdict(list)
        str_filters = defaultdict(list)

        for f in filters:
            col, op, val = f
            if val == "":
                continue

            if op[0] != "$":
                continue

            op = op[1:]

            if op == "regex":
                # this is for compatibility with snorkelv1 filters
                op = "re"

            if col in types:
                tp = types[col]



                if tp == "string":
                    str_filters[col].append((op, val))
                elif tp == "integer":
                    int_filters[col].append((op, val))



        int_filters[time_col].append(("gt", start_s))
        int_filters[time_col].append(("lt", end_s))

        filter_strs = []
        for col in int_filters:
            for f in int_filters[col]:
                filter_strs.append(FILTER_SEPARATOR.join(map(str, [col, f[0], f[1]])))

        if filter_strs:
            cmd_args.extend(["-int-filter", enquote(FIELD_SEPARATOR.join(filter_strs))])

        filter_strs = []
        for col in str_filters:
            for f in str_filters[col]:
                filter_strs.append(FILTER_SEPARATOR.join(map(str, (col, f[0], f[1]))))

        if filter_strs:
            cmd_args.extend(["-str-filter", enquote(FIELD_SEPARATOR.join(map(str, filter_strs)))])

    def add_limit(self, query_spec, cmd_args):
        # TODO: limit should depend on the view. time series limit defaults to 10 or 20
        limit = query_spec.get("limit", 100)
        cmd_args.extend(["-limit", limit])


    def run_table_query(self, table, query_spec):
        cmd_args = [ "-table", table ]

        self.add_op(query_spec, cmd_args)
        self.add_weight_col(query_spec, cmd_args)
        self.add_group_by(query_spec, cmd_args)
        self.add_fields(query_spec, cmd_args)
        self.add_filters(query_spec, cmd_args)
        self.add_limit(query_spec, cmd_args)

        return run_query_command(cmd_args)


    def run_dist_query(self, table, query_spec):
        cmd_args = [ "-table", table ]

        cmd_args.extend(['-op', 'hist', '-loghist'])

        self.add_weight_col(query_spec, cmd_args)
        self.add_group_by(query_spec, cmd_args)
        self.add_fields(query_spec, cmd_args)
        self.add_filters(query_spec, cmd_args)
#        self.add_hist_buckets(query_spec, cmd_args)

        return run_query_command(cmd_args)

    def run_time_query(self, table, query_spec):

        md = self.metadata
        time_col = get_time_col(md)
        cmd_args = [ "-table", table, "-time-col", time_col, "-time"]

        self.add_op(query_spec, cmd_args)
        self.add_weight_col(query_spec, cmd_args)
        self.add_group_by(query_spec, cmd_args)
        self.add_fields(query_spec, cmd_args)
        self.add_filters(query_spec, cmd_args)
        self.add_limit(query_spec, cmd_args)

        time_bucket = query_spec.get("time_bucket", 300)
        if time_bucket != "auto":
            cmd_args.extend(["-time-bucket", str(time_bucket) ])

        return run_query_command(cmd_args)

    def run_samples_query(self, table, query_spec):
        cmd_args = [ "-table", table, "-samples" ]
        self.add_filters(query_spec, cmd_args)
        self.add_limit(query_spec, cmd_args)
        return run_query_command(cmd_args)


@pudgy.util.memoize
def get_table_info(table, ts=None):
    from ..views import get_column_types
    table = presenter.GetRealTable(table)
    meta = run_query_command(["-table",  table, "-info"])
    fields, types = get_column_types(meta)
    meta["col_types"] = types
    return meta

class SybilBackend(Backend):
    def clear_cache(self, table=None):
        if table:
            if table in get_table_info.cache:
                del get_table_info.cache[table]
        else:
            get_table_info.cache.clear()

    def list_tables(self):
        tables = run_query_command(["-tables"])
        tables = map(presenter.GetTableName, tables)
        tables = list(filter(presenter.IsTableVisible, tables))
        tables.sort()
        return tables


    def get_table_info(self, table):
        return get_table_info(table)

    def log_query(self, user, query_spec):
        sample_data = {
          "start_time": query_spec.get('start_ms'),
          "end_time": query_spec.get('end_ms'),

          "weight_col": query_spec.get('weight_col') or "unspecified",
          "view": query_spec.get('view'),
          "start": query_spec.get('start') or query_spec.get('custom_start'),
          "end": query_spec.get('end') or query_spec.get('custom_end'),
          "table": query_spec.get('table'),
          "user": user,
          "time" : time.time(),
          "cols": query_spec.get_fields(),
          "dims": query_spec.get_groupby() }

        if not USING_MSYBIL or ENABLE_REMOTE_INGEST:
            self.ingest("slite@queries", [ sample_data ], log_ingest=False)

    def run_query(self, table, query_spec, metadata):
        q = SybilQuery()
        return q.run_query(table, query_spec, metadata)

    # TODO: for msybil, randomly pick a server and send samples to it
    def ingest(self, table, samples, log_ingest=True):
        if USING_MSYBIL:
            if ENABLE_REMOTE_INGEST:
                # TODO: save the samples locally. if the ingestion succeeds
                # remove the file. else we need to re-enqueue for ingestion
                cmd_args = [MSYBIL_INGEST_BIN, table]
            else:
                raise Exception("REMOTE INGESTION NOT ENABLED FOR MSYBIL")
        else:
            cmd_args = [SYBIL_BIN, "ingest", "-table", table]

        print("INGESTING %s SAMPLES INTO %s" % (len(samples), table))
        cmd_args = map(lambda w: w.encode("utf-8"), cmd_args)
        run_command(cmd_args, stdin=json.dumps(samples))

        if log_ingest:
            user = "anonymous"
            try:
                user = current_user.email
            except:
                pass
            self.ingest("slite@ingest", [{
                "table": table,
                "count" : len(samples),
                "time" : int(time.time()),
                "user" : user
            }], log_ingest=False)

if not os.path.exists(SYBIL_BIN):
    SYBIL_BIN = run_command(["which", "sybil"]).strip()

if __name__ == "__main__":
    print(time_to_seconds('-1 week'))
    print(time_delta_to_seconds('-1 week'))
