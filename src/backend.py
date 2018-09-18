import os
import subprocess
import shlex
import json

SYBIL_BIN="sybil"

def run_query_command(cmd_str):
    cmd_args = ["sybil", "query", "-json"]
    cmd_args.extend(shlex.split(cmd_str))


    ret = run_command(cmd_args)

    return json.loads(ret)

def run_command(cmd_args):
    print "RUNNING COMMAND", cmd_args
    output = subprocess.check_output(cmd_args)

    return output


class Backend(object):
    pass

class SybilBackend(Backend):
    def list_tables(self):
        return run_query_command("-tables")

    def get_table_info(self, table):
        return run_query_command("-table '%s' -info" % table)

    def run_query(self, query_spec):
        pass
