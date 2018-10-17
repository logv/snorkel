import os
from subprocess import Popen, PIPE, check_output

import subprocess
import shlex
import json
import pudgy

import sys

MSYBIL_BIN="snorkel.msybil"
SYBIL_BIN="sybil"

# TODO: dont hardcode this
MSYBIL_INPUT = """
"""

SYBIL_INPUT = ""

if "MSYBIL" in os.environ:
    print >> sys.stderr,  "s Using Multisybil"
    with open(os.environ["MSYBIL"]) as f:
        MSYBIL_INPUT = f.read()

    SYBIL_BIN = MSYBIL_BIN
    SYBIL_INPUT = MSYBIL_INPUT



from collections import defaultdict
from .backend import Backend

from ..util import time_to_seconds, time_delta_to_seconds

def run_query_command(cmd_args):
    init_cmd_args = [SYBIL_BIN, "query", "-json"]
    init_cmd_args.extend(["-read-log"])
    init_cmd_args.extend(["-cache-queries"])
    init_cmd_args.extend(["--field-separator=%s" % FIELD_SEPARATOR])
    init_cmd_args.extend(["--filter-separator=%s" % FILTER_SEPARATOR])
    init_cmd_args.extend(cmd_args)

    init_cmd_args = [a.encode('ascii', errors='replace') for a in init_cmd_args]

    ret = run_command(init_cmd_args)
    return json.loads(ret)

def run_command(cmd_args):
    print "RUNNING COMMAND", " ".join(cmd_args)
    p = Popen(cmd_args, stdin=PIPE, stdout=PIPE, stderr=PIPE)
    stdout, stderr = p.communicate(SYBIL_INPUT)
    print stderr

    return stdout

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



    def add_group_by(self, query_spec, cmd_args):
        groupby = query_spec.getlist("groupby[]")
        if groupby:
            cmd_args.append("-group")
            cmd_args.append(FIELD_SEPARATOR.join(groupby))

    def add_fields(self, query_spec, cmd_args):
        fields = query_spec.getlist("fields[]")
        if fields:
            cmd_args.append("-int")
            cmd_args.append(FIELD_SEPARATOR.join(fields))

        field = query_spec.get("field")
        if field:
            cmd_args.append("-int")
            cmd_args.append(field)

    def add_filters(self, query_spec, cmd_args):
        from ..views import get_column_types


        # add time filters
        start = query_spec.get('start', "-1 week")
        start_s = time_to_seconds(start)

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


        time_col = "time"

        md = self.metadata
        fields, types = get_column_types(md)

        # TODO: use proper field separators (\r and \t)
        # put all filters into a list and collapse later
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

            if col in types:
                tp = types[col]



                if tp == "string":
                    str_filters[col].append((op, val))
                elif tp == "integer":
                    int_filters[col].append((op, val))



        int_filters[time_col].append(("gt", start_s))
        int_filters[time_col].append(("lt", end_s))

        # TODO: add filters from query here
        filter_strs = []
        for col in int_filters:
            for f in int_filters[col]:
                filter_strs.append(FILTER_SEPARATOR.join(map(str, [col, f[0], f[1]])))

        if filter_strs:
            cmd_args.extend(["-int-filter", FIELD_SEPARATOR.join(filter_strs)])

        filter_strs = []
        for col in str_filters:
            for f in str_filters[col]:
                filter_strs.append(FILTER_SEPARATOR.join(map(str, (col, f[0], f[1]))))

        if filter_strs:
            cmd_args.extend(["-str-filter", FIELD_SEPARATOR.join(map(str, filter_strs))])

    def add_limit(self, query_spec, cmd_args):
        # TODO: limit should depend on the view. time series limit defaults to
        # 10 or 20
        limit = query_spec.get("limit", 100)
        cmd_args.extend(["-limit", limit])

    def add_metrics(self, query_spec, cmd_args):
        pass



    def run_table_query(self, table, query_spec):
        cmd_args = [ "-table", table ]

        self.add_group_by(query_spec, cmd_args)
        self.add_fields(query_spec, cmd_args)
        self.add_filters(query_spec, cmd_args)
        self.add_metrics(query_spec, cmd_args)
        self.add_limit(query_spec, cmd_args)
        cmd_args.extend(["-op", "hist"])

        # TODO: pull metric off query and determine whether to build hist or not

        return run_query_command(cmd_args)


    def run_dist_query(self, table, query_spec):
        cmd_args = [ "-table", table, "-op", "hist" ]

        self.add_group_by(query_spec, cmd_args)
        self.add_fields(query_spec, cmd_args)
        self.add_filters(query_spec, cmd_args)
#        self.add_hist_buckets(query_spec, cmd_args)
        self.add_metrics(query_spec, cmd_args)

        # TODO: pull metric off query and determine whether to build hist or not

        return run_query_command(cmd_args)

    def run_time_query(self, table, query_spec):

        time_col = "time"
        cmd_args = [ "-table", table, "-time-col", time_col, "-time"]

        self.add_group_by(query_spec, cmd_args)
        self.add_fields(query_spec, cmd_args)
        self.add_filters(query_spec, cmd_args)
        self.add_metrics(query_spec, cmd_args)
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


class SybilBackend(Backend):
    @pudgy.util.memoize
    def list_tables(self):
        return run_query_command(["-tables"])

    @pudgy.util.memoize
    def get_table_info(self, table):
        from ..views import get_column_types
        meta = run_query_command(["-table",  table, "-info"])
        fields, types = get_column_types(meta)
        meta["col_types"] = types
        return meta

    def run_query(self, table, query_spec, metadata):
        q = SybilQuery()
        return q.run_query(table, query_spec, metadata)



if __name__ == "__main__":
    print time_to_seconds('-1 week')
    print time_delta_to_seconds('-1 week')
