#!/usr/bin/env python
from __future__ import print_function

import os
import pipes
import tempfile
import shutil
import sys
import threading

KEEP_RESULTS=False
BASEDIR=None

# from https://stackoverflow.com/questions/5574702/how-to-print-to-stderr-in-python
def debug(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)


def run_subprocess(cmd, stdin=None, wait=True):
    import subprocess
    import shlex

    # if we are pushing cmd through the shell, we quote it
    process = subprocess.Popen(shlex.split(cmd), stdout=subprocess.PIPE, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    if wait:
        stdout,stderr = process.communicate(stdin)
        return stdout.strip(), stderr
    else:
        return "", ""

def cleanup():
    if KEEP_RESULTS:
        return

    if BASEDIR:
        shutil.rmtree(BASEDIR)

def setup_dirs():
    global BASEDIR, RESULT_DIR, OUTPUT_DIR
    global COMBINE_LOG, COMBINE_RESULTS

    BASEDIR = tempfile.mkdtemp()
    RESULT_DIR = os.path.join(BASEDIR, "results")
    OUTPUT_DIR = os.path.join(BASEDIR, "output")

    COMBINE_LOG = os.path.join(BASEDIR, "master.log")
    COMBINE_RESULTS = os.path.join(BASEDIR, "master.results")

    os.makedirs(RESULT_DIR)
    os.makedirs(OUTPUT_DIR)

    debug("collecting results in", BASEDIR)


def print_file(filename, title="", fd=sys.stdout, force=False):
    filetype,err = run_subprocess("file '%s'" % filename)
    filetype = filetype.lower()

    filetype = filetype.decode("utf-8")

    if filetype.find("ascii") != -1 or filetype.find("unicode") != -1 or force:
        with open(filename) as f:
            filedata = f.read().strip()
            if title:
                debug(title)
            print(filedata, file=fd)

def debug_file(filename, title):
    return print_file(filename, title, fd=sys.stderr)

def write_to_file(filename, data):
    with open(filename, "wb") as f:
        f.write(data or b"")

def run_local_commands(cmd):
    out,err = run_subprocess("%s %s" % (SYBIL_BIN, cmd))
    print(out)


def check_connection(host):
    full_cmd = "ssh -O check %s " % (host)
    out, err = run_subprocess(full_cmd)
    err = err.decode("utf-8")
    if err.find("running") != -1:
        return

    run_subprocess("ssh -O exit %s " % (host))
    debug("NO MASTER RUNNING FOR HOST %s, STARTING MASTER" % host)
    run_subprocess("ssh -C -N -n %s #master process" % host, wait=False)

    import time
    # when we check our connection, we'll wait up to a second while
    # establishing it
    incr = 0.1
    steps = int(1 / incr)
    for _ in range(steps):
        time.sleep(incr)
        out, err = run_subprocess(full_cmd)
        err = err.decode("utf-8")
        if err.find("running") != -1:
            break


def run_command_on_host(host, working_dir, bin):
    check_connection(host)

    query_flag_file = os.path.join(BASEDIR, "query_flags.gob")
    with open(query_flag_file, "rb") as f:
        query_flag_data = f.read()

    full_cmd = "ssh -C %s \"cd \"%s\" && \"%s\" query -decode-flags\"" % (host, working_dir, bin)
    out, err = run_subprocess(full_cmd, stdin=query_flag_data)
    write_to_file(os.path.join(RESULT_DIR, "%s.results" % host), out)
    write_to_file(os.path.join(OUTPUT_DIR, "%s.log" % host), err)

    debug("%s finished" % host)

def run_remote_commands(cmd):
    global HOST_FILE
    debug("*** running command on remote hosts")
    debug_file(HOST_FILE, "*** host info is")

    query_flag_data, err = run_subprocess("%s %s -encode-flags -encode-results" % (SYBIL_BIN, cmd))
    query_flag_file = os.path.join(BASEDIR, "query_flags.gob")

    write_to_file(query_flag_file, query_flag_data)

    threads = []
    for line in HOSTINFO:
        bin="sybil"
        working_dir="~"
        host = line[0]

        if len(line) > 1:
            working_dir = line[1]
        if len(line) > 2:
            bin = line[2]



        t = threading.Thread(target=run_command_on_host, args=(host, working_dir, bin))
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

def print_remote_results():
    for line in HOSTINFO:
        host = line[0]

        log_file = os.path.join(OUTPUT_DIR, "%s.log" % host)
        result_file = os.path.join(RESULT_DIR, "%s.results" % host)

        debug_file(log_file, "*** %s output" % host)
        debug_file(result_file, "*** %s output" % host)

def aggregate_remote_results():
    full_cmd = "%s aggregate \"%s\"" % (SYBIL_BIN, RESULT_DIR)
    query_flag_file = os.path.join(BASEDIR, "query_flags.gob")
    with open(query_flag_file, "rb") as f:
        query_flag_data = f.read()

    out, err = run_subprocess(full_cmd, query_flag_data)

    combine_log = os.path.join(OUTPUT_DIR, COMBINE_LOG)
    combine_results = os.path.join(RESULT_DIR, COMBINE_RESULTS)
    write_to_file(combine_results, out)
    write_to_file(combine_log, err)

    debug_file(combine_log, "*** aggregator output")
    print_file(combine_results, "***combined results", force=True)

def read_host_info():
    global HOSTINFO
    global HOST_FILE
    host_file = os.environ.get("MSYBIL")
    with open(host_file) as f:
        hostinfo = f.readlines()

    hosts = []
    for line in hostinfo:
        line = line.strip()
        if not line:
            continue

        if line[0] == '#':
            continue
        hosts.append(line.split(" "))


    HOSTINFO = hosts
    debug("host info", hosts)

    HOST_FILE = os.path.join(BASEDIR, "hosts")
    with open(HOST_FILE, "w") as f:
        for line in HOSTINFO:
            f.write(" ".join(line))
            f.write("\n")


def _main():
    global CMD
    setup_dirs()
    operator = None
    if len(sys.argv) > 1:
        operator = sys.argv[1]

    cmd = " ".join(sys.argv[1:])
    debug("command to run is: sybil %s"  % cmd)
    if operator == "query":
        read_host_info()
        run_remote_commands(cmd)
        print_remote_results()
        aggregate_remote_results()
    else:
        run_local_commands(cmd)


if "DEBUG" in os.environ:
    KEEP_RESULTS=True

SYBIL_BIN = os.path.join(os.path.dirname(__file__), "bin", "sybil")
def main():
    global SYBIL_BIN
    if not os.path.exists(SYBIL_BIN):
        SYBIL_BIN, _ = run_subprocess("which sybil")

    try:
        _main()
    finally:
        cleanup()

if __name__ == "__main__":
    main()

# vim: set syntax=python
