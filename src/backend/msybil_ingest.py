#!/usr/bin/env python
from __future__ import print_function

import os
import pipes
import tempfile
import shutil
import sys
import random

KEEP_RESULTS=False
BASEDIR=None

# from https://stackoverflow.com/questions/5574702/how-to-print-to-stderr-in-python
def debug(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)


def debug_file(filename, title):
    return print_file(filename, title, fd=sys.stderr)

def write_to_file(filename, data):
    if isinstance(data, bytes):
        data = data.decode("utf-8")

    with open(filename, "w") as f:
        f.write(data or "")

def run_subprocess(cmd, stdin=None, wait=True):
    import subprocess
    import shlex

    # if we are pushing cmd through the shell, we quote it
    process = subprocess.Popen(shlex.split(cmd), stdout=subprocess.PIPE, stdin=subprocess.PIPE, stderr=subprocess.PIPE)

    if wait:
        if isinstance(stdin, str):
            stdin = stdin.encode("utf-8")

        stdout,stderr = process.communicate(stdin)
        return stdout.strip(), stderr
    else:
        return "", ""

def cleanup():
    if KEEP_RESULTS:
        return

    if BASEDIR:
        shutil.rmtree(BASEDIR)

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

def ingest_on_host(host, working_dir, bin, table, samples):
    check_connection(host)

    import pipes

    table = pipes.quote(table)

    full_cmd = "ssh -C %s \"cd \"%s\" && \"%s\" ingest --debug -table %s\"" % (host, working_dir, bin, table)
    out, err = run_subprocess(full_cmd, stdin=samples)
    write_to_file(os.path.join(RESULT_DIR, "%s.results" % host), out)
    write_to_file(os.path.join(OUTPUT_DIR, "%s.log" % host), err)
    print("DEBUG", err)

    debug("%s finished" % host)
    debug("Ingested %s samples" % len(samples.split('\n')))

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

def read_samples():
    return sys.stdin.read()

def _main():
    global CMD
    setup_dirs()
    table = sys.argv[1]
    debug("command to run is: sybil %s"  % table)

    read_host_info()

    samples = read_samples()
    bin="sybil"
    working_dir="~"
    line = random.choice(HOSTINFO)
    host = line[0]

    check_connection(host)

    if len(line) > 1:
        working_dir = line[1]
    if len(line) > 2:
        bin = line[2]

    ingest_on_host(host, working_dir, bin, table, samples)

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
