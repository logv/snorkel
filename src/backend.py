import os
import subprocess
import shlex
import json

SYBIL_BIN="sybil"

from collections import defaultdict

def run_query_command(cmd_args):
    init_cmd_args = ["sybil", "query", "-json"]
    init_cmd_args.extend(cmd_args)


    ret = run_command(init_cmd_args)

    return json.loads(ret)

def run_command(cmd_args):
    print "RUNNING COMMAND", cmd_args
    output = subprocess.check_output(cmd_args)

    return output


# time translation command is:
# `date -d "<str>" +%s`
def time_to_seconds(timestr):
    cmd_args = ["date", "-d", timestr, "+%s"]
    try:
        output = subprocess.check_output(cmd_args)
    except:
        raise Exception("Unknown time string: ", timestr)
    return int(output)

def time_delta_to_seconds(timedelta):
    now = time_to_seconds("now")
    then = time_to_seconds(timedelta)

    return now - then



class Backend(object):
    pass

FIELD_SEPARATOR=","
FILTER_SEPARATOR=":"

class SybilBackend(Backend):
    def list_tables(self):
        return run_query_command(["-tables"])

    def get_table_info(self, table):
        return run_query_command(["-table",  table, "-info"])

    def run_query(self, table, query_spec):
        view = query_spec.get('view')
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
        # add time filters
        start = query_spec.get('start', "-1 week")
        start_s = time_to_seconds(start)

        end = query_spec.get('end', "now")
        end_s = time_to_seconds(end)

        time_col = "time"

        # TODO: use proper field separators (\r and \t)
        # put all filters into a list and collapse later
        int_filters = defaultdict(list)
        str_filters = defaultdict(list)


        int_filters[time_col].append(("gt", start_s))
        int_filters[time_col].append(("lt", end_s))

        # TODO: add filters from query here
        for col in int_filters:
            filter_strs = []
            for f in int_filters[col]:
                filter_strs.append(FILTER_SEPARATOR.join(map(str, [col, f[0], f[1]])))

            cmd_args.extend(["-int-filter", FIELD_SEPARATOR.join(filter_strs)])

        for col in str_filters:
            filter_strs = []
            for f in str_filters[col]:
                filter_strs.append(FIELD_SEPARATOR.join(map(str, (col, f[0], f[1]))))

            cmd_args.extend(["-str-filter", FIELD_SEPARATOR.join(map(str, filter_strs))])


    def add_metrics(self, query_spec, cmd_args):
        if query_spec.get('metric', 'Avg')[0] == 'p' or query_spec.get('view') == 'dist':
            cmd_args.extend(["-op", "hist"])



    def run_table_query(self, table, query_spec):
        cmd_args = [ "-table", table ]

        self.add_group_by(query_spec, cmd_args)
        self.add_fields(query_spec, cmd_args)
        self.add_filters(query_spec, cmd_args)
        self.add_metrics(query_spec, cmd_args)

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

        time_bucket = query_spec.get("time_bucket", 300)
        if time_bucket != "auto":
            cmd_args.extend(["-time-bucket", time_bucket ])

        self.add_group_by(query_spec, cmd_args)
        self.add_fields(query_spec, cmd_args)
        self.add_filters(query_spec, cmd_args)
        self.add_metrics(query_spec, cmd_args)

        return run_query_command(cmd_args)

    def run_samples_query(self, table, query_spec):
        cmd_args = [ "-table", table, "-samples" ]
        self.add_filters(query_spec, cmd_args)
        return run_query_command(cmd_args)






if __name__ == "__main__":
    print time_to_seconds('-1 week')
    print time_delta_to_seconds('-1 week')
