from __future__ import absolute_import
from __future__ import print_function
from . import main
from . import cli

import os
import sys
from subprocess import Popen, PIPE
SNORKEL_DIR=os.path.expanduser("~/.local/share/snorkel")
def shared_mode():
    print("SWITCHING TO SHARED DIR", SNORKEL_DIR, file=sys.stderr)
    try:
        os.makedirs(SNORKEL_DIR)
    except:
        pass
    os.chdir(SNORKEL_DIR)

DEBUG="DEBUG" in os.environ
def run_command(cmd_args, stdin=b""):
    cmd_args = list(map(lambda w: w.decode("utf-8"), cmd_args))
    print("RUNNING COMMAND", " ".join(cmd_args), file=sys.stderr)

    if isinstance(stdin, str):
        stdin = stdin.encode("utf-8")

    p = Popen(cmd_args, stdin=PIPE, stdout=PIPE, stderr=PIPE)
    stdout, stderr = p.communicate(stdin)
    print(stderr)

    return stdout.decode("utf-8")


